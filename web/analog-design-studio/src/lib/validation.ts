import type { GeneratorEntry } from './repository-registry';

export type DesignConfig = {
  circuitId: string;
  topologyId: string;
  technologyId: string;
  vdd: number | null;
  temperature: number | null;
  corner: string;
  specs: Record<string, { enabled: boolean; target: number | null; unit: string; operator: string }>;
  sizingMethod: 'gmID' | 'wL' | 'manual' | 'ai';
  devices: Array<{ device: string; type: 'NMOS' | 'PMOS'; totalW: string; L: string; NF: number; M: number }>;
};

export const defaultSpecs = {
  gain: { enabled: true, target: 60, unit: 'dB', operator: '>=' },
  gbw: { enabled: true, target: 100, unit: 'MHz', operator: '>=' },
  phaseMargin: { enabled: true, target: 60, unit: 'deg', operator: '>=' },
  slewRate: { enabled: true, target: 100, unit: 'V/µs', operator: '>=' },
  load: { enabled: true, target: 1, unit: 'pF', operator: '=' },
  power: { enabled: true, target: 2, unit: 'mW', operator: '<=' },
  noise: { enabled: false, target: null, unit: 'nV/√Hz', operator: '<=' },
  psrr: { enabled: false, target: null, unit: 'dB', operator: '>=' },
  cmrr: { enabled: false, target: null, unit: 'dB', operator: '>=' },
  outputSwing: { enabled: false, target: null, unit: 'V', operator: '=' },
  icmr: { enabled: false, target: null, unit: 'V', operator: '=' },
  settling: { enabled: false, target: null, unit: 'ns', operator: '<=' },
  offset: { enabled: false, target: null, unit: 'mV', operator: '<=' },
};

export type ValidationIssue = { level: 'error' | 'warning'; field: string; message: string };

export function validateDesign(config: DesignConfig, generator?: GeneratorEntry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!config.circuitId) issues.push({ level: 'error', field: 'circuit', message: 'Select a circuit.' });
  if (!config.topologyId) issues.push({ level: 'error', field: 'topology', message: 'Select a topology.' });
  if (!config.technologyId) issues.push({ level: 'error', field: 'technology', message: 'Select a technology / PDK.' });
  if (config.vdd == null || config.vdd <= 0) issues.push({ level: 'error', field: 'vdd', message: 'VDD must be greater than 0 V.' });
  if (config.temperature == null) issues.push({ level: 'error', field: 'temperature', message: 'Temperature is required.' });
  for (const [key, spec] of Object.entries(config.specs)) {
    if (spec.enabled && spec.target == null) issues.push({ level: 'error', field: key, message: `Missing target for ${key}.` });
  }
  if (!config.sizingMethod) issues.push({ level: 'error', field: 'sizing', message: 'Select a sizing methodology.' });
  if (config.sizingMethod === 'manual') {
    config.devices.forEach((d) => {
      if (!d.totalW || !d.L || d.NF < 1 || d.M < 1) issues.push({ level: 'error', field: d.device, message: 'Manual sizing requires TotalW, L, NF >= 1 and M >= 1.' });
    });
  }
  if (!generator) issues.push({ level: 'error', field: 'generator', message: 'No repository generator is mapped to this topology.' });
  if (generator?.status === 'candidate') issues.push({ level: 'warning', field: 'generator', message: 'Mapped generator is a repository candidate and is not Cadence-verified.' });
  return issues;
}
