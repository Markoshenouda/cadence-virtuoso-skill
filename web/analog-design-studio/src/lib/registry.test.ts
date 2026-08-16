import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { circuits, getTopology, type GeneratorEntry } from '@/lib/repository-registry';
import { generatorContracts } from '@/lib/generator-contract';
import { defaultSpecs, validateDesign, type DesignConfig } from '@/lib/validation';

const validConfig: DesignConfig = {
  circuitId: 'ota', topologyId: '5t-ota', technologyId: 'tsmcN65', vdd: 1.2, temperature: 27, corner: 'TT',
  specs: defaultSpecs, sizingMethod: 'gmID', devices: [
    { device: 'M1', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
    { device: 'M2', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
  ],
};

describe('Analog Design Studio repository model', () => {
  it('exposes OTA as a supported circuit', () => expect(circuits.find(c => c.id === 'ota')?.status).toBe('available'));
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
  const repoRoot = path.resolve(process.cwd(), '..', '..');
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