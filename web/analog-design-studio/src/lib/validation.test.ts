import { describe, expect, it } from 'vitest';
import { validateDesign, type DesignConfig } from '@/lib/validation';
import { defaultSpecsFor, getTopology } from '@/lib/repository-registry';

const defaultSpecs = defaultSpecsFor('ota');
const generator = getTopology('ota', '5t-ota')?.generator;

const configWithSpecs = (specs: DesignConfig['specs']): DesignConfig => ({
  circuitId: 'ota', topologyId: '5t-ota', technologyId: 'tsmcN65', vdd: 1.2, temperature: 27, corner: 'TT',
  specs, sizingMethod: 'manual',
  devices: [
    { device: 'M1', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
    { device: 'M2', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
  ],
});

describe('specification operator validation', () => {
  it('accepts every ASCII operator the wizard can emit', () => {
    for (const operator of ['>=', '<=', '=']) {
      const issues = validateDesign(configWithSpecs({ ...defaultSpecs, gain: { enabled: true, target: 60, unit: 'dB', operator } }), generator);
      expect(issues.some(i => i.field === 'gain' && i.level === 'error'), `operator ${operator}`).toBe(false);
    }
  });

  it('rejects Unicode operators that do not match the ASCII contract', () => {
    for (const operator of ['≥', '≤', '＝']) {
      const issues = validateDesign(configWithSpecs({ ...defaultSpecs, gain: { enabled: true, target: 60, unit: 'dB', operator } }), generator);
      expect(issues.some(i => i.field === 'gain' && i.level === 'error' && i.message.includes('operator')), `operator ${operator}`).toBe(true);
    }
  });

  it('ships defaults that already satisfy the operator contract', () => {
    for (const [key, spec] of Object.entries(defaultSpecs)) {
      expect(['>=', '<=', '='], `${key}`).toContain(spec.operator);
    }
    const issues = validateDesign(configWithSpecs(defaultSpecs), generator);
    expect(issues.filter(i => i.level === 'error')).toHaveLength(0);
  });

  it('rejects an enabled specification without a numeric target', () => {
    const issues = validateDesign(configWithSpecs({ ...defaultSpecs, gbw: { enabled: true, target: null, unit: 'MHz', operator: '>=' } }), generator);
    expect(issues.some(i => i.field === 'gbw' && i.level === 'error')).toBe(true);
  });
});
