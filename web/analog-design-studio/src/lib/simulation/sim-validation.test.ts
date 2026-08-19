import { describe, expect, it } from 'vitest';
import { validateSimulationConfig, SimulationConfigForm } from './sim-validation';
import { SpecDefinition } from './sim-types';

describe('validateSimulationConfig', () => {
  const baseConfig: SimulationConfigForm = {
    simulationType: 'AC',
    fStart: 1,
    fStop: 1e9,
    pointsPerDecade: 50,
    tStop: 100,
    tStep: 0.1,
    dcSweepStart: 0,
    dcSweepStop: 1.2,
    dcSweepStep: 0.01,
    vdd: 1.2,
    temperature: 27,
    corner: 'TT',
    commonModeV: 0.6,
    acMag: 1.0,
    selectedOutputs: ['gain', 'gbw'],
    specs: [
      { id: 'gain', name: 'DC Gain', metric: 'gain', target: 60, operator: '>=', unit: 'dB', priority: 'Must Have', enabled: true },
    ],
  };

  it('validates a correct AC configuration without errors', () => {
    const issues = validateSimulationConfig(baseConfig);
    const errors = issues.filter((i) => i.level === 'error');
    expect(errors).toHaveLength(0);
  });

  it('catches fStop <= fStart in AC mode', () => {
    const invalidConfig = { ...baseConfig, fStart: 1e9, fStop: 1e3 };
    const issues = validateSimulationConfig(invalidConfig);
    const errors = issues.filter((i) => i.level === 'error');
    expect(errors.some((e) => e.field === 'fStop')).toBe(true);
  });

  it('catches VDD <= 0', () => {
    const invalidConfig = { ...baseConfig, vdd: -1 };
    const issues = validateSimulationConfig(invalidConfig);
    expect(issues.some((e) => e.field === 'vdd')).toBe(true);
  });

  it('catches invalid temperature', () => {
    const invalidConfig = { ...baseConfig, temperature: 300 };
    const issues = validateSimulationConfig(invalidConfig);
    expect(issues.some((e) => e.field === 'temperature')).toBe(true);
  });

  it('catches empty selected outputs', () => {
    const invalidConfig = { ...baseConfig, selectedOutputs: [] };
    const issues = validateSimulationConfig(invalidConfig);
    expect(issues.some((e) => e.field === 'selectedOutputs')).toBe(true);
  });

  it('catches enabled specs missing target value', () => {
    const invalidSpec: SpecDefinition = {
      id: 'gain',
      name: 'DC Gain',
      metric: 'gain',
      target: null,
      operator: '>=',
      unit: 'dB',
      priority: 'Must Have',
      enabled: true,
    };
    const invalidConfig = { ...baseConfig, specs: [invalidSpec] };
    const issues = validateSimulationConfig(invalidConfig);
    expect(issues.some((e) => e.field === 'spec_gain')).toBe(true);
  });
});
