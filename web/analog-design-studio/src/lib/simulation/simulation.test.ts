import { describe, expect, it } from 'vitest';
import { circuits, defaultSpecsFor } from '@/lib/repository-registry';
import type { DesignConfig } from '@/lib/validation';
import { getSimulationContract, simulationProfiles } from '@/lib/simulation/simulation-contract';
import { buildSpectreDeck, modelSectionFor } from '@/lib/simulation/spectre-deck';
import { parsePsfDc, parsePsfSweep, magnitude, phaseDeg } from '@/lib/simulation/psf-parser';
import { extractMeasurements, MeasurementError } from '@/lib/simulation/measurements';
import { evaluateSpecifications, evaluateOperator } from '@/lib/simulation/spec-evaluator';
import { runSimulation } from '@/lib/simulation/sim-runner';
import { getCadenceBridgeConfig, type CadenceBridgeConfig } from '@/lib/cadence-bridge';

const mirrorConfig: DesignConfig = {
  circuitId: 'current-mirror', topologyId: 'simple-current-mirror', technologyId: 'tsmcN65', vdd: 1.2, temperature: 27, corner: 'TT',
  specs: defaultSpecsFor('current-mirror'), sizingMethod: 'manual',
  devices: [
    { device: 'M1', type: 'NMOS', totalW: '4u', L: '480n', NF: 1, M: 1 },
    { device: 'M2', type: 'NMOS', totalW: '4u', L: '480n', NF: 1, M: 1 },
  ],
};

const ampConfig: DesignConfig = {
  circuitId: 'amplifier', topologyId: 'common-source', technologyId: 'tsmcN65', vdd: 1.5, temperature: 27, corner: 'TT',
  specs: defaultSpecsFor('amplifier'), sizingMethod: 'manual',
  devices: [
    { device: 'M1', type: 'NMOS', totalW: '4u', L: '240n', NF: 1, M: 1 },
    { device: 'M2', type: 'PMOS', totalW: '8u', L: '480n', NF: 1, M: 1 },
  ],
};

describe('simulation contract (registry-driven)', () => {
  it('resolves a simulation contract for every registered topology', () => {
    for (const circuit of circuits) {
      for (const topology of circuit.topologies) {
        const contract = getSimulationContract(topology.id, 'tsmcN65');
        expect(contract.profile.id, topology.id).toBeTruthy();
        expect(contract.simulation.devices.length, topology.id).toBeGreaterThan(0);
        expect(contract.simulation.nodes.ground, topology.id).toBeTruthy();
      }
    }
  });

  it('keeps simulation device lists consistent with the generator contract', () => {
    for (const circuit of circuits) {
      for (const topology of circuit.topologies) {
        const contract = getSimulationContract(topology.id, 'tsmcN65');
        const generatorDevices = topology.contract.devices.map(d => d.device).sort();
        const simulationDevices = contract.simulation.devices.map(d => d.device).sort();
        expect(simulationDevices, topology.id).toEqual(generatorDevices);
      }
    }
  });

  it('rejects unknown topologies and requires simulation metadata', () => {
    expect(() => getSimulationContract('not-a-topology', 'tsmcN65')).toThrow(/No topology registered for simulation/);
    expect(simulationProfiles['dc-mirror'].analyses).toHaveLength(1);
  });
});

describe('spectre deck generation', () => {
  it('emits the verified include/section, devices, analyses, and saves for a mirror', () => {
    const contract = getSimulationContract('simple-current-mirror', 'tsmcN65');
    const deck = buildSpectreDeck(mirrorConfig, contract, { spectreModel: '/pdk/models/spectre/toplevel.scs', corner: 'TT' });
    expect(deck).toContain('include "/pdk/models/spectre/toplevel.scs" section=tt_lib');
    expect(deck).toContain('M1 (IREF IREF VSS VSS) nch w=4u l=480n nf=1 m=1');
    expect(deck).toContain('V_IREF (IREF 0) vsource dc=0.75');
    expect(deck).toContain('dcop dc');
    expect(deck).not.toContain('ac1 ac');
    expect(deck).toContain('save');
    expect(deck).toContain('M1:d');
  });

  it('emits ac and transient analyses with input stimulus for an amplifier', () => {
    const contract = getSimulationContract('common-source', 'tsmcN65');
    const deck = buildSpectreDeck(ampConfig, contract, { spectreModel: '/pdk/models/spectre/toplevel.scs', corner: 'SS' });
    expect(deck).toContain('section=ss_lib');
    expect(deck).toContain('M2 (VOUT VBP VDD VDD) pch w=8u l=480n nf=1 m=1');
    expect(deck).toContain('V_VIN (VIN 0) vsource dc=0.62 mag=1 type=pulse');
    expect(deck).toContain('CL (VOUT 0) capacitor c=1p');
    expect(deck).toContain('ac1 ac start=1 stop=1e12 dec=20');
    expect(deck).toContain('tran1 tran stop=4u errpreset=moderate');
  });

  it('maps process corners to PDK model sections and rejects unknown corners', () => {
    expect(modelSectionFor('TT')).toBe('tt_lib');
    expect(modelSectionFor('FF')).toBe('ff_lib');
    expect(() => modelSectionFor('XX')).toThrow(/Unsupported process corner/);
  });
});

const DC_FIXTURE = `HEADER
"PSFversion" "1.00"
VALUE
"M1:d" "I" 8.622449385481507e-08 PROP(
"units" "A"
)
"M2:d" "I" -8.500000000000000e-08 PROP(
"units" "A"
)
"IREF" "V" 7.500000000000000e-01
"IOUT" "V" 9.800000000000000e-01
"V_IREF:i" -8.622449385481507e-08
"V_VDD:v" 1.500000000000000e+00 PROP(
"units" "V"
)
"V_VDD:i" -8.622449385481507e-08 PROP(
"units" "A"
)
"V_VSS:v" 0.000000000000000e+00
"V_VSS:i" 8.622449385481507e-08
END
`;

function acFixture(): string {
  const lines = ['TRACE', '"VOUT" "V"', '"VIN" "V"', 'VALUE'];
  const points = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8];
  points.forEach((freq, index) => {
    const gain = Math.pow(10, 1 - index / 5); // 10 at 1 Hz, unity (-0 dB) at 1e5 Hz
    lines.push(`"freq" ${freq.toExponential(15)}`);
    lines.push(`"VOUT" (${gain.toExponential(6)} 0.000000e+00)`);
    lines.push(`"VIN" (1.000000e+00 0.000000e+00)`);
  });
  return lines.join('\n') + '\n';
}

const TRAN_FIXTURE = ['TRACE', '"VOUT" "V"', 'VALUE',
  '"time" 0.0000000e+00', '"VOUT" 0.1000000e+01',
  '"time" 1.0000000e-06', '"VOUT" 0.3000000e+01',
  '"time" 2.0000000e-06', '"VOUT" 0.3000000e+01',
].join('\n') + '\n';

describe('psfascii parsing', () => {
  it('parses DC values and skips PROP blocks', () => {
    const dc = parsePsfDc(DC_FIXTURE);
    expect(dc['M1:d']).toBeCloseTo(8.6224e-8, 10);
    expect(dc['IREF']).toBeCloseTo(0.75, 10);
    expect(dc['V_IREF:i']).toBeCloseTo(-8.6224e-8, 10);
  });

  it('parses AC complex sweeps and transient scalar sweeps', () => {
    const ac = parsePsfSweep(acFixture());
    expect(ac.sweep).toBe('freq');
    expect(ac.points).toHaveLength(9);
    expect(magnitude(ac.points[0].values.VOUT)).toBeCloseTo(10, 6);
    expect(phaseDeg(ac.points[0].values.VOUT)).toBeCloseTo(0, 6);
    const tran = parsePsfSweep(TRAN_FIXTURE);
    expect(tran.sweep).toBe('time');
    expect(tran.points[1].values.VOUT.re).toBeCloseTo(3.0, 6);
  });

  it('rejects malformed result text', () => {
    expect(() => parsePsfDc('HEADER\nTYPE\nno value section')).toThrow();
    expect(() => parsePsfSweep('VALUE\n"garbage" 1\n')).toThrow();
  });
});

describe('measurement extraction', () => {
  it('extracts mirror currents, ratio, and node voltages from DC results', () => {
    const contract = getSimulationContract('simple-current-mirror', 'tsmcN65');
    const measurements = extractMeasurements(contract, { dc: parsePsfDc(DC_FIXTURE) }).values;
    expect(measurements.iref).toBeCloseTo(8.6224e-8, 10);
    expect(measurements.iout).toBeCloseTo(8.5e-8, 10);
    expect(measurements.ratio).toBeCloseTo(8.5e-8 / 8.622449385481507e-08, 4);
    expect(measurements.vref).toBeCloseTo(0.75, 6);
  });

  it('extracts gain, GBW, and phase margin from an AC sweep', () => {
    const contract = getSimulationContract('common-source', 'tsmcN65');
    const dc = { power: 0 };
    const measurements = extractMeasurements(contract, { dc: parsePsfDc(DC_FIXTURE), ac: parsePsfSweep(acFixture()), tran: parsePsfSweep(TRAN_FIXTURE) }).values;
    expect(measurements.gain).toBeCloseTo(20, 1);
    expect(measurements.gbw).toBeGreaterThan(9e4);
    expect(measurements.gbw).toBeLessThan(1.1e5);
    expect(measurements.slewRate).toBeCloseTo(2e6, 1);
  });

  it('fails clearly when a required analysis result is missing', () => {
    const contract = getSimulationContract('common-source', 'tsmcN65');
    expect(() => extractMeasurements(contract, { dc: parsePsfDc(DC_FIXTURE) })).toThrow(MeasurementError);
  });
});

describe('specification evaluation', () => {
  const measured = { gain: 61.2, gbw: 1.2e8, slewRate: 9e5, power: 1.2e-3, iref: 1.0e-4 };

  it('evaluates operators with margins in the spec display units', () => {
    const config: DesignConfig = { ...mirrorConfig, specs: {
      gain: { enabled: true, target: 60, unit: 'dB', operator: '>=' },
      gbw: { enabled: true, target: 100, unit: 'MHz', operator: '>=' },
      power: { enabled: true, target: 2, unit: 'mW', operator: '<=' },
      iref: { enabled: true, target: 100, unit: 'uA', operator: '=' },
      slewRate: { enabled: true, target: 0.5, unit: 'V/us', operator: '>' },
      noise: { enabled: false, target: 5, unit: 'nV/√Hz', operator: '<=' },
    } };
    const { results, unmatched } = evaluateSpecifications(config, measured);
    expect(unmatched).toEqual([]);
    const byMetric = Object.fromEntries(results.map(r => [r.metric, r]));
    expect(byMetric.gain.pass).toBe(true);
    expect(byMetric.gain.margin).toBeCloseTo(1.2, 6);
    expect(byMetric.gbw.value).toBeCloseTo(120, 6);
    expect(byMetric.gbw.pass).toBe(true);
    expect(byMetric.power.value).toBeCloseTo(1.2, 6);
    expect(byMetric.power.pass).toBe(true);
    expect(byMetric.iref.value).toBeCloseTo(100, 6);
    expect(byMetric.iref.pass).toBe(true);
    expect(byMetric.slewRate.value).toBeCloseTo(0.9, 6);
    expect(byMetric.slewRate.pass).toBe(true);
    expect(byMetric.gain.sourceAnalysis).toBe('ac');
  });

  it('reports enabled specs without measurements as unmatched and rejects invalid operators', () => {
    const { unmatched } = evaluateSpecifications(mirrorConfig, { iref: 1e-4 });
    expect(unmatched).toContain('iout');
    expect(() => evaluateOperator(1, '≥', 2)).toThrow(/Invalid specification operator/);
  });
});

describe('simulation runner state machine', () => {
  const bridge: CadenceBridgeConfig = { ...getCadenceBridgeConfig({}), enabled: false };

  it('dry-run generates the deck without SSH and reports NOT_RUN evidence', async () => {
    const enabledBridge = { ...bridge, enabled: true };
    const result = await runSimulation(mirrorConfig, { dryRun: true, bridge: enabledBridge });
    expect(result.status).toBe('dry-run');
    expect(result.stages.deckGenerated).toBe(true);
    expect(result.stages.launched).toBe(false);
    expect(result.evidence.SIMULATION_STATUS).toBe('NOT_RUN');
    expect(result.evidence.ELECTRICALLY_VERIFIED).toBe(false);
    expect(result.deck).toContain('dcop dc');
  });

  it('reports disabled without claiming any execution', async () => {
    const result = await runSimulation(mirrorConfig, { dryRun: false, bridge });
    expect(result.status).toBe('disabled');
    expect(result.evidence.ELECTRICALLY_VERIFIED).toBe(false);
  });

  it('rejects unknown topologies before any staging', async () => {
    await expect(runSimulation({ ...mirrorConfig, topologyId: 'not-a-topology' }, { dryRun: true, bridge: { ...bridge, enabled: true } }))
      .rejects.toThrow(/No topology registered for simulation/);
  });
});
