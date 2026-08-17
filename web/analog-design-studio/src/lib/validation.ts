import { technologies, type GeneratorEntry, type SpecRecord } from './repository-registry';

export type DesignConfig = {
  circuitId: string;
  topologyId: string;
  technologyId: string;
  vdd: number | null;
  temperature: number | null;
  corner: string;
  specs: SpecRecord;
  sizingMethod: 'gmID' | 'wL' | 'manual' | 'ai';
  devices: Array<{ device: string; type: 'NMOS' | 'PMOS'; totalW: string; L: string; NF: number; M: number }>;
};

export type ValidationIssue = { level: 'error' | 'warning'; field: string; message: string };

export function validateDesign(config: DesignConfig, generator?: GeneratorEntry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!config.circuitId) issues.push({ level: 'error', field: 'circuit', message: 'Select a circuit.' });
  if (!config.topologyId) issues.push({ level: 'error', field: 'topology', message: 'Select a topology.' });
  if (!config.technologyId) issues.push({ level: 'error', field: 'technology', message: 'Select a technology / PDK.' });
  if (!technologies.some((technology) => technology.id === config.technologyId)) {
    issues.push({ level: 'error', field: 'technology', message: `This MVP currently exposes only the repository-supported ${technologies.map((technology) => technology.id).join(', ')} platform.` });
  }
  if (config.vdd == null || config.vdd <= 0) issues.push({ level: 'error', field: 'vdd', message: 'VDD must be greater than 0 V.' });
  if (config.temperature == null || !Number.isFinite(config.temperature)) issues.push({ level: 'error', field: 'temperature', message: 'Temperature is required.' });
  if (!['TT', 'SS', 'FF'].includes(config.corner)) issues.push({ level: 'error', field: 'corner', message: 'Process corner must be TT, SS, or FF.' });
  for (const [key, spec] of Object.entries(config.specs)) {
    if (spec.enabled && spec.target == null) issues.push({ level: 'error', field: key, message: `Missing target for ${key}.` });
    if (spec.enabled && !['>=', '<=', '='].includes(spec.operator)) issues.push({ level: 'error', field: key, message: `Invalid constraint operator for ${key}.` });
  }
  if (!config.sizingMethod) issues.push({ level: 'error', field: 'sizing', message: 'Select a sizing methodology.' });
  if (config.devices.length === 0) issues.push({ level: 'error', field: 'devices', message: 'No MOS sizing entries are present for the selected topology.' });
  config.devices.forEach((d) => {
    if (!d.device || !['NMOS', 'PMOS'].includes(d.type)) issues.push({ level: 'error', field: d.device || 'device', message: 'Each MOS needs a valid name and polarity.' });
    if (!d.totalW || !d.L || d.NF < 1 || d.M < 1) issues.push({ level: 'error', field: d.device, message: 'MOS sizing requires TotalW, L, NF >= 1 and M >= 1.' });
  });
  if (!generator) issues.push({ level: 'error', field: 'generator', message: 'No repository generator is mapped to this topology.' });
  if (generator?.status === 'candidate') issues.push({ level: 'warning', field: 'generator', message: 'Mapped generator is a repository candidate and is not Cadence-verified.' });
  if (generator?.status === 'verified') issues.push({ level: 'warning', field: 'generator', message: 'Verified status refers to repository evidence; this web action does not execute Cadence or verify electrical performance.' });
  return issues;
}
