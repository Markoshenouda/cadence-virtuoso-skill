import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { circuits, defaultSpecsFor, getTopology, type GeneratorEntry } from '@/lib/repository-registry';
import { generatorContracts } from '@/lib/generator-contract';
import { repositoryRoot } from '@/lib/repository-root';
import { validateDesign, type DesignConfig } from '@/lib/validation';

const defaultSpecs = defaultSpecsFor('ota');

const validConfig: DesignConfig = {
  circuitId: 'ota', topologyId: '5t-ota', technologyId: 'tsmcN65', vdd: 1.2, temperature: 27, corner: 'TT',
  specs: defaultSpecs, sizingMethod: 'gmID', devices: [
    { device: 'M1', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
    { device: 'M2', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
  ],
};

describe('Analog Design Studio repository model', () => {
  it('exposes OTA as a supported circuit', () => expect(circuits.find(c => c.id === 'ota')?.status).toBe('available'));
  it('exposes the Current Mirror as an available circuit with its topology', () => {
    const circuit = circuits.find(c => c.id === 'current-mirror');
    expect(circuit?.status).toBe('available');
    expect(circuit?.topologies.map(t => t.id)).toEqual(['simple-current-mirror', 'cascode-current-mirror', 'pmos-current-mirror']);
    expect(circuit?.topologies[0].generator.status).toBe('candidate');
    expect(circuit?.topologies[0].generator.path).toContain('Current_Mirror_NMOS_TotalW_V1_20260817.il');
    expect(circuit?.topologies[0].generator.invocation).toBe('CreateCurrentMirror_NMOS_TotalW_V1_20260817()');
  });
  it('exposes the Differential Pair and Amplifier circuits as available', () => {
    const diffPair = circuits.find(c => c.id === 'differential-pair');
    expect(diffPair?.status).toBe('available');
    expect(diffPair?.topologies.map(t => t.id)).toEqual(['differential-pair-nmos']);
    const amplifier = circuits.find(c => c.id === 'amplifier');
    expect(amplifier?.status).toBe('available');
    expect(amplifier?.topologies.map(t => t.id)).toEqual(['common-source', 'source-follower', 'cascode-amplifier']);
    expect(Object.keys(defaultSpecsFor('differential-pair')).sort()).toEqual(['gm', 'icmr', 'offset', 'tailCurrent']);
    expect(Object.keys(defaultSpecsFor('amplifier')).sort()).toEqual(['gain', 'gbw', 'noise', 'outputSwing', 'power']);
  });
  it('resolves the 5T OTA to the current repository path', () => {
    const t = getTopology('ota', '5t-ota');
    expect(t?.generator.path).toBe('canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il');
    expect(t?.generator.invocation).toContain('Create5TOTA_PMOS_TOTALW_V2_20260812');
  });
  it('resolves the canonical Telescopic V8 generator', () => {
    const t = getTopology('ota', 'telescopic-ota');
    expect(t?.generator.status).toBe('candidate');
    expect(t?.generator.path).toContain('Telescopic_OTA_NMOS_Diff_TotalW_V8');
    expect(t?.generator.invocation).toContain('CreateTelescopicOTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813');
  });
  it('maps the Folded Cascode V1 as verified for schematic generation', () => {
    const t = getTopology('ota', 'folded-cascode-ota');
    expect(t?.generator.status).toBe('verified');
    expect(t?.generator.path).toContain('Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il');
    expect(t?.generator.invocation).toContain('CreateFoldedCascodeOTA_NMOS_TotalW_V1_20260814');
  });
  it('rejects missing VDD', () => {
    const issues = validateDesign({ ...validConfig, vdd: null }, getTopology('ota', '5t-ota')?.generator);
    expect(issues.some(i => i.field === 'vdd' && i.level === 'error')).toBe(true);
  });
  it('rejects unsupported technology', () => {
    const issues = validateDesign({ ...validConfig, technologyId: 'gpdk45' }, getTopology('ota', '5t-ota')?.generator);
    expect(issues.some(i => i.field === 'technology' && i.level === 'error')).toBe(true);
  });
  it('rejects an invalid process corner', () => {
    const issues = validateDesign({ ...validConfig, corner: 'XX' }, getTopology('ota', '5t-ota')?.generator);
    expect(issues.some(i => i.field === 'corner' && i.level === 'error')).toBe(true);
  });
  it('rejects incomplete MOS sizing', () => {
    const issues = validateDesign({ ...validConfig, devices: [{ device: 'M1', type: 'NMOS', totalW: '', L: '', NF: 0, M: 0 }] }, getTopology('ota', '5t-ota')?.generator);
    expect(issues.some(i => i.field === 'M1' && i.level === 'error')).toBe(true);
  });
  it('accepts a complete configuration except for repository status warning', () => {
    const issues = validateDesign(validConfig, getTopology('ota', '5t-ota')?.generator);
    expect(issues.filter(i => i.level === 'error')).toHaveLength(0);
    expect(issues.some(i => i.level === 'warning')).toBe(true);
  });
});

describe('registry and contract artifact integrity', () => {
  const repoRoot = repositoryRoot();
  const referencedGenerators: Array<{ source: string; entry: GeneratorEntry }> = [];
  for (const circuit of circuits) {
    for (const topology of circuit.topologies) {
      referencedGenerators.push({ source: `${circuit.id}/${topology.id}`, entry: topology.generator });
      for (const alternative of topology.alternatives ?? []) referencedGenerators.push({ source: `${circuit.id}/${topology.id} alternative`, entry: alternative });
    }
  }
  for (const [topologyId, contract] of Object.entries(generatorContracts)) {
    referencedGenerators.push({ source: `contract ${topologyId}`, entry: contract.source });
  }

  it('references only generator and runbook files that exist in the repository', () => {
    expect(referencedGenerators.length).toBeGreaterThanOrEqual(4);
    for (const { source, entry } of referencedGenerators) {
      expect(fs.existsSync(path.join(repoRoot, entry.path)), `${source}: generator file missing: ${entry.path}`).toBe(true);
      if (entry.runbook) {
        expect(fs.existsSync(path.join(repoRoot, entry.runbook)), `${source}: runbook file missing: ${entry.runbook}`).toBe(true);
      }
    }
  });

  it('gives every registered topology a documented invocation procedure', () => {
    for (const { source, entry } of referencedGenerators) {
      expect(entry.invocation, `${source}: missing invocation`).toMatch(/^Create[A-Za-z0-9_]+\(\)$/);
    }
  });
});

describe('registry topology metadata consistency', () => {
  it('keeps device counts, contracts, sizing defaults, and diagrams internally consistent', () => {
    for (const circuit of circuits) {
      for (const topology of circuit.topologies) {
        expect(topology.contract.devices.length, `${circuit.id}/${topology.id}: deviceCount mismatch`).toBe(topology.deviceCount);
        expect(topology.diagram, `${circuit.id}/${topology.id}: diagram key missing`).toBeTruthy();
        for (const device of topology.contract.devices) {
          expect(['NMOS', 'PMOS'], `${circuit.id}/${topology.id}/${device.device}: polarity`).toContain(device.type);
          expect(device.defaultSizing.totalW, `${device.device}: default TotalW`).toBeTruthy();
          expect(device.defaultSizing.L, `${device.device}: default L`).toBeTruthy();
          expect(device.defaultSizing.NF, `${device.device}: default NF`).toBeGreaterThanOrEqual(1);
          expect(device.defaultSizing.M, `${device.device}: default M`).toBeGreaterThanOrEqual(1);
        }
        const contract = generatorContracts[topology.id];
        expect(contract?.source.path, `${topology.id}: contract source must be the registry generator`).toBe(topology.generator.path);
        expect(contract?.source.status, `${topology.id}: contract status drifted from registry`).toBe(topology.generator.status);
      }
    }
  });

  it('derives spec defaults from the circuit spec definitions', () => {
    const ota = circuits.find(c => c.id === 'ota');
    const defined = ota?.specGroups?.flatMap(g => g.specs) ?? [];
    expect(defined.length).toBeGreaterThanOrEqual(13);
    const defaults = defaultSpecsFor('ota');
    expect(Object.keys(defaults).sort()).toEqual(defined.map(s => s.key).sort());
    expect(defaults.gain).toEqual({ enabled: true, target: 60, unit: 'dB', operator: '>=' });
    expect(defaultSpecsFor('bandgap')).toEqual({});
  });

  it('derives current-mirror spec defaults from the registry', () => {
    const defaults = defaultSpecsFor('current-mirror');
    expect(Object.keys(defaults).sort()).toEqual(['compliance', 'iout', 'iref', 'matching', 'ratio', 'rout']);
    expect(defaults.iref).toEqual({ enabled: true, target: 100, unit: 'µA', operator: '=' });
    expect(defaults.matching).toEqual({ enabled: false, target: 2, unit: '%', operator: '<=' });
  });
});