/**
 * Specification evaluation: compares MEASURED values against design TARGET
 * specifications. Keeps TARGET, MEASURED, PASS/FAIL, and VERIFIED strictly
 * separate. Operators are the repository-standard ASCII forms.
 */

import type { DesignConfig } from '../validation';
import type { MeasurementResults } from './measurements';

export type SpecOperator = '>=' | '<=' | '=' | '>';

export type SpecResult = {
  metric: string;
  value: number;
  unit: string;
  operator: SpecOperator;
  target: number;
  pass: boolean;
  margin: number;
  sourceAnalysis: string;
};

export const SUPPORTED_OPERATORS: SpecOperator[] = ['>=', '<=', '=', '>'];

export function evaluateOperator(value: number, operator: string, target: number): boolean {
  switch (operator) {
    case '>=': return value >= target;
    case '<=': return value <= target;
    case '=': return Math.abs(value - target) <= 1e-9 * Math.max(1, Math.abs(target));
    case '>': return value > target;
    default: throw new Error(`Invalid specification operator: ${operator}`);
  }
}

function marginFor(value: number, operator: string, target: number): number {
  switch (operator) {
    case '>=': case '>': return value - target;
    case '<=': return target - value;
    case '=': return Math.abs(value - target);
    default: return 0;
  }
}

/** Unit conversion between registry spec units and raw simulator units. */
const UNIT_SCALES: Record<string, number> = { uA: 1e6, mS: 1e3, MHz: 1e-6, 'V/us': 1e-6, mW: 1e3 };

const METRIC_UNITS: Record<string, string> = {
  power: 'W', gain: 'dB', gbw: 'Hz', phaseMargin: 'deg', slewRate: 'V/s',
  iref: 'A', iout: 'A', tailCurrent: 'A', ratio: '',
};

function analysisForMetric(metric: string): string {
  if (['power', 'iref', 'iout', 'ratio', 'tailCurrent', 'idp', 'idn', 'vref', 'vout', 'voutp', 'voutn'].includes(metric)) return 'dc';
  if (['gain', 'gbw', 'phaseMargin'].includes(metric)) return 'ac';
  if (metric === 'slewRate') return 'tran';
  return 'unknown';
}

/**
 * Evaluate every ENABLED spec whose key has a matching measurement.
 * Returns results plus the list of enabled specs that had no measurement.
 */
export function evaluateSpecifications(config: DesignConfig, measurements: MeasurementResults): { results: SpecResult[]; unmatched: string[] } {
  const results: SpecResult[] = [];
  const unmatched: string[] = [];
  for (const [key, spec] of Object.entries(config.specs)) {
    if (!spec.enabled || spec.target == null) continue;
    const measured = measurements[key];
    if (measured === undefined) { unmatched.push(key); continue; }
    const unit = spec.unit || METRIC_UNITS[key] || '';
    const scale = UNIT_SCALES[spec.unit] ?? 1;
    const value = measured * scale;
    const operator = spec.operator as SpecOperator;
    if (!SUPPORTED_OPERATORS.includes(operator)) throw new Error(`Invalid specification operator: ${operator}`);
    results.push({
      metric: key,
      value,
      unit,
      operator,
      target: spec.target,
      pass: evaluateOperator(value, operator, spec.target),
      margin: marginFor(value, operator, spec.target),
      sourceAnalysis: analysisForMetric(key),
    });
  }
  return { results, unmatched };
}
