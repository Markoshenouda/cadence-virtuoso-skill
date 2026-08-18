/**
 * Simulation Configuration Validation Engine
 *
 * Validates simulation setup parameters, frequency sweeps, bias conditions,
 * and target specification entries before execution.
 */

import { SpecDefinition, SimulationTypeId } from './sim-types';

export type SimulationConfigForm = {
  simulationType: SimulationTypeId;
  // Analysis Parameters
  fStart: number;       // Hz
  fStop: number;        // Hz
  pointsPerDecade: number;
  tStop: number;        // ns
  tStep: number;        // ns
  dcSweepStart: number; // V
  dcSweepStop: number;  // V
  dcSweepStep: number;  // V
  // Environment
  vdd: number;          // V
  temperature: number;  // C
  corner: string;       // TT, SS, FF, SF, FS
  // Stimulus
  commonModeV: number;  // V
  acMag: number;        // V
  // Outputs & Specs
  selectedOutputs: string[];
  specs: SpecDefinition[];
};

export type SimValidationIssue = {
  field: string;
  message: string;
  level: 'error' | 'warning';
};

export function validateSimulationConfig(config: SimulationConfigForm): SimValidationIssue[] {
  const issues: SimValidationIssue[] = [];

  // Environment checks
  if (config.vdd <= 0 || config.vdd > 10) {
    issues.push({ field: 'vdd', message: 'VDD must be between 0.1 V and 10 V.', level: 'error' });
  }

  if (config.temperature < -50 || config.temperature > 175) {
    issues.push({ field: 'temperature', message: 'Temperature must be between -50°C and +175°C.', level: 'error' });
  }

  if (!['TT', 'SS', 'FF', 'SF', 'FS'].includes(config.corner)) {
    issues.push({ field: 'corner', message: 'Invalid process corner selected.', level: 'error' });
  }

  // Common Mode Voltage vs VDD check
  if (config.commonModeV < 0 || config.commonModeV > config.vdd) {
    issues.push({ field: 'commonModeV', message: 'Common-mode voltage should be within [0, VDD].', level: 'warning' });
  }

  // Analysis specific checks
  if (config.simulationType === 'AC' || config.simulationType === 'NOISE' || config.simulationType === 'PSRR' || config.simulationType === 'CMRR') {
    if (config.fStart <= 0) {
      issues.push({ field: 'fStart', message: 'Start frequency must be greater than 0 Hz.', level: 'error' });
    }
    if (config.fStop <= config.fStart) {
      issues.push({ field: 'fStop', message: 'Stop frequency must be greater than start frequency.', level: 'error' });
    }
    if (config.pointsPerDecade < 1 || config.pointsPerDecade > 1000) {
      issues.push({ field: 'pointsPerDecade', message: 'Points per decade must be between 1 and 1000.', level: 'error' });
    }
  }

  if (config.simulationType === 'TRAN') {
    if (config.tStop <= 0) {
      issues.push({ field: 'tStop', message: 'Transient stop time must be greater than 0 ns.', level: 'error' });
    }
    if (config.tStep <= 0 || config.tStep >= config.tStop) {
      issues.push({ field: 'tStep', message: 'Time step must be greater than 0 and less than stop time.', level: 'error' });
    }
  }

  if (config.simulationType === 'DC_SWEEP') {
    if (config.dcSweepStart >= config.dcSweepStop) {
      issues.push({ field: 'dcSweepStop', message: 'DC sweep stop voltage must be greater than start voltage.', level: 'error' });
    }
    if (config.dcSweepStep <= 0) {
      issues.push({ field: 'dcSweepStep', message: 'DC sweep step size must be greater than 0.', level: 'error' });
    }
  }

  // Outputs check
  if (config.selectedOutputs.length === 0) {
    issues.push({ field: 'selectedOutputs', message: 'Select at least one output measurement.', level: 'error' });
  }

  // Specifications check
  const enabledSpecs = config.specs.filter((s) => s.enabled);
  if (enabledSpecs.length === 0) {
    issues.push({ field: 'specs', message: 'Enable at least one target specification.', level: 'warning' });
  }

  for (const spec of enabledSpecs) {
    if (spec.target === null || !Number.isFinite(spec.target)) {
      issues.push({ field: `spec_${spec.id}`, message: `Missing target value for specification '${spec.name}'.`, level: 'error' });
    }
    if (!['>=', '<=', '=', '>', '<'].includes(spec.operator)) {
      issues.push({ field: `spec_${spec.id}`, message: `Invalid operator '${spec.operator}' for specification '${spec.name}'.`, level: 'error' });
    }
  }

  return issues;
}
