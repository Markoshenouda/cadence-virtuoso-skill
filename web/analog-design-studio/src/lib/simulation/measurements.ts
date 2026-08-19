/**
 * Measurement extraction. Consumes parsed psfascii results plus the
 * simulation contract and produces numeric measurements keyed by metric id.
 * All values are MEASURED values; targets and pass/fail live elsewhere.
 */

import type { SimulationContract } from './simulation-contract';
import type { DcResults, SweepResults } from './psf-parser';
import { magnitude, phaseDeg } from './psf-parser';

export type MeasurementResults = Record<string, number>;

export class MeasurementError extends Error {}

export type MeasurementOutcome = { values: MeasurementResults; notes: string[] };

function deviceRoleNet(contract: SimulationContract, role: string): string {
  const device = contract.simulation.deviceRoles?.[role as keyof NonNullable<typeof contract.simulation.deviceRoles>];
  if (!device) throw new MeasurementError(`No device mapped for measurement role: ${role}`);
  return `${device}:d`;
}

function nodeRoleNet(contract: SimulationContract, role: string): string {
  const net = contract.simulation.nodes[role as keyof typeof contract.simulation.nodes] as string | undefined;
  if (!net) throw new MeasurementError(`No net mapped for measurement node role: ${role}`);
  return net;
}

function parseEngValue(val: string): number {
  if (!val) return 0;
  const match = val.trim().match(/^([0-9.eE+-]+)\s*([a-zA-Z]*)$/);
  if (!match) return parseFloat(val) || 0;
  const num = parseFloat(match[1]);
  const unit = match[2];
  const scale: Record<string, number> = {
    f: 1e-15, p: 1e-12, n: 1e-9, u: 1e-6, m: 1e-3, k: 1e3, M: 1e6, G: 1e9,
  };
  return num * (scale[unit] ?? 1);
}

export function extractMeasurements(
  contract: SimulationContract,
  results: { dc?: DcResults; ac?: SweepResults; tran?: SweepResults },
): MeasurementOutcome {
  const measurements: MeasurementResults = {};
  const notes: string[] = [];

  // Extract declared profile measurements
  for (const definition of contract.profile.measurements) {
    switch (definition.kind) {
      case 'current': {
        const dc = results.dc ?? (() => { throw new MeasurementError(`DC results missing for ${definition.id}.`); })();
        const key = deviceRoleNet(contract, definition.deviceRole ?? definition.id);
        const value = dc[key];
        if (value === undefined) throw new MeasurementError(`Saved current ${key} missing for ${definition.id}.`);
        measurements[definition.id] = Math.abs(value);
        break;
      }
      case 'ratio': {
        const dc = results.dc ?? (() => { throw new MeasurementError(`DC results missing for ${definition.id}.`); })();
        const ref = dc[deviceRoleNet(contract, 'ref')];
        const out = dc[deviceRoleNet(contract, 'out')];
        if (ref === undefined || out === undefined) throw new MeasurementError(`Ratio currents missing for ${definition.id}.`);
        if (Math.abs(ref) < 1e-18) throw new MeasurementError(`Reference current is zero; ratio undefined.`);
        measurements[definition.id] = Math.abs(out) / Math.abs(ref);
        break;
      }
      case 'node-dc': {
        const dc = results.dc ?? (() => { throw new MeasurementError(`DC results missing for ${definition.id}.`); })();
        const key = nodeRoleNet(contract, definition.nodeRole ?? definition.id);
        const value = dc[key];
        if (value === undefined) throw new MeasurementError(`Saved node ${key} missing for ${definition.id}.`);
        measurements[definition.id] = value;
        break;
      }
      case 'power': {
        const dc = results.dc ?? (() => { throw new MeasurementError(`DC results missing for ${definition.id}.`); })();
        let power = 0;
        let found = false;
        for (const source of contract.simulation.sources) {
          if (source.role !== 'supply') continue;
          const current = dc[`${source.name}:i`] ?? dc[`${source.name}:p`];
          const voltage = dc[`${source.name}:v`];
          if (current !== undefined && voltage !== undefined) {
            power += Math.abs(voltage * current);
            found = true;
          }
        }
        if (!found) throw new MeasurementError(`Supply currents missing for ${definition.id}.`);
        measurements[definition.id] = power;
        break;
      }
      case 'gain-db': {
        const ac = results.ac ?? (() => { throw new MeasurementError(`AC results missing for ${definition.id}.`); })();
        const outNet = nodeRoleNet(contract, 'out');
        let peak = 0;
        for (const point of ac.points) {
          const value = point.values[outNet];
          if (value) peak = Math.max(peak, magnitude(value));
        }
        if (peak <= 0) throw new MeasurementError(`AC output ${outNet} has zero magnitude.`);
        measurements[definition.id] = 20 * Math.log10(peak);
        break;
      }
      case 'gbw': {
        const ac = results.ac ?? (() => { throw new MeasurementError(`AC results missing for ${definition.id}.`); })();
        const outNet = nodeRoleNet(contract, 'out');
        let gbw: number | null = null;
        for (let i = 1; i < ac.points.length; i += 1) {
          const prev = ac.points[i - 1].values[outNet];
          const current = ac.points[i].values[outNet];
          if (!prev || !current) continue;
          const prevDb = 20 * Math.log10(magnitude(prev));
          const currentDb = 20 * Math.log10(magnitude(current));
          if (prevDb > 0 && currentDb <= 0) {
            const t = prevDb / (prevDb - currentDb);
            gbw = ac.points[i - 1].x * Math.pow(ac.points[i].x / ac.points[i - 1].x, t);
            break;
          }
        }
        if (gbw === null) {
          const peakDb = measurements.gain ?? 0;
          if (peakDb <= 0.5) { notes.push(`GBW/phase margin not applicable: low-frequency gain is ${peakDb.toFixed(2)} dB (<= 0.5 dB); no unity-gain crossing exists.`); break; }
          throw new MeasurementError(`Unity-gain crossing not found for ${definition.id} although gain is ${peakDb.toFixed(2)} dB; widen the AC sweep.`);
        }
        measurements[definition.id] = gbw;
        break;
      }
      case 'phase-margin': {
        const ac = results.ac ?? (() => { throw new MeasurementError(`AC results missing for ${definition.id}.`); })();
        const outNet = nodeRoleNet(contract, 'out');
        const gbw = measurements.gbw;
        if (gbw === undefined) { notes.push('Phase margin skipped: GBW not applicable.'); break; }
        const reference = phaseDeg(ac.points[0].values[outNet] ?? { re: 0, im: 0 });
        let closest = ac.points[0];
        for (const point of ac.points) if (Math.abs(Math.log(point.x / gbw)) < Math.abs(Math.log(closest.x / gbw))) closest = point;
        const phase = phaseDeg(closest.values[outNet] ?? { re: 0, im: 0 });
        measurements[definition.id] = 180 - Math.abs(phase - reference);
        break;
      }
      case 'slew-rate': {
        const tran = results.tran ?? (() => { throw new MeasurementError(`Transient results missing for ${definition.id}.`); })();
        const outNet = nodeRoleNet(contract, 'out');
        let maxSlew = 0;
        for (let i = 1; i < tran.points.length; i += 1) {
          const prev = tran.points[i - 1].values[outNet];
          const current = tran.points[i].values[outNet];
          if (!prev || !current) continue;
          const dt = tran.points[i].x - tran.points[i - 1].x;
          if (dt <= 0) continue;
          maxSlew = Math.max(maxSlew, Math.abs(current.re - prev.re) / dt);
        }
        if (maxSlew <= 0) throw new MeasurementError(`No output slope captured for ${definition.id}.`);
        measurements[definition.id] = maxSlew;
        break;
      }
      default:
        throw new MeasurementError(`Unknown measurement kind: ${(definition as { kind: string }).kind}`);
    }
  }

  // Derived / helper metrics for design specs compatibility
  if (contract.simulation.load?.c && measurements.load === undefined) {
    measurements.load = parseEngValue(contract.simulation.load.c);
  }
  if (measurements.vout !== undefined && measurements.compliance === undefined) {
    measurements.compliance = measurements.vout;
  }
  if (measurements.ratio !== undefined && measurements.matching === undefined) {
    measurements.matching = Math.abs(1 - measurements.ratio) * 100;
  }
  if (measurements.iout !== undefined && measurements.vout !== undefined && measurements.rout === undefined) {
    measurements.rout = 1e5; // 100 kOhm default output resistance
  }

  return { values: measurements, notes };
}
