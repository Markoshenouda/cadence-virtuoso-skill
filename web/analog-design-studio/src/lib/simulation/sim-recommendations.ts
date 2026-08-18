/**
 * Topology Simulation Recommendations Engine
 *
 * Provides declarative, topology-aware recommendations for:
 * 1. Recommended simulation types per circuit family/topology
 * 2. Recommended output measurements
 * 3. Default target specifications with reasonable engineering defaults
 */

import { SpecDefinition, SimulationTypeId } from './sim-types';

export type TopologySimRecommendation = {
  topologyId: string;
  familyId: string;
  recommendedSimTypes: SimulationTypeId[];
  recommendedOutputs: string[];
  recommendedSpecs: SpecDefinition[];
};

/** Category defaults used when topology is not specifically matched */
export const DEFAULT_OTA_SPECS: SpecDefinition[] = [
  { id: 'gain', name: 'DC Open-Loop Gain', metric: 'gain', target: 60, operator: '>=', unit: 'dB', priority: 'Must Have', enabled: true },
  { id: 'gbw', name: 'Gain-Bandwidth Product', metric: 'gbw', target: 100, operator: '>=', unit: 'MHz', priority: 'Must Have', enabled: true },
  { id: 'phaseMargin', name: 'Phase Margin', metric: 'phaseMargin', target: 60, operator: '>=', unit: 'deg', priority: 'Must Have', enabled: true },
  { id: 'slewRate', name: 'Slew Rate', metric: 'slewRate', target: 100, operator: '>=', unit: 'V/us', priority: 'Important', enabled: true },
  { id: 'power', name: 'Power Dissipation', metric: 'power', target: 2, operator: '<=', unit: 'mW', priority: 'Must Have', enabled: true },
];

export const DEFAULT_MIRROR_SPECS: SpecDefinition[] = [
  { id: 'ratio', name: 'Current Mirroring Ratio', metric: 'ratio', target: 1.0, operator: '=', unit: '', priority: 'Must Have', enabled: true },
  { id: 'iout', name: 'Output Branch Current', metric: 'iout', target: 100, operator: '>=', unit: 'uA', priority: 'Important', enabled: true },
  { id: 'vout', name: 'Min Output Compliance V', metric: 'vout', target: 0.2, operator: '>=', unit: 'V', priority: 'Important', enabled: true },
  { id: 'power', name: 'Power Dissipation', metric: 'power', target: 0.5, operator: '<=', unit: 'mW', priority: 'Optional', enabled: true },
];

export const DEFAULT_DIFFPAIR_SPECS: SpecDefinition[] = [
  { id: 'tailCurrent', name: 'Tail Bias Current', metric: 'tailCurrent', target: 200, operator: '>=', unit: 'uA', priority: 'Must Have', enabled: true },
  { id: 'voutp', name: 'Output Positive DC', metric: 'voutp', target: 0.6, operator: '>=', unit: 'V', priority: 'Important', enabled: true },
  { id: 'power', name: 'Power Dissipation', metric: 'power', target: 1.0, operator: '<=', unit: 'mW', priority: 'Important', enabled: true },
];

const FAMILY_RECOMMENDATION_MAP: Record<string, { simTypes: SimulationTypeId[]; outputs: string[]; specs: SpecDefinition[] }> = {
  '5t-ota': {
    simTypes: ['AC', 'TRAN', 'DC_OP', 'NOISE', 'PSRR', 'CMRR'],
    outputs: ['gain', 'gbw', 'phaseMargin', 'slewRate', 'power', 'vn_in'],
    specs: DEFAULT_OTA_SPECS,
  },
  'folded-cascode-ota': {
    simTypes: ['AC', 'TRAN', 'DC_OP', 'NOISE', 'PSRR', 'CMRR', 'CORNER'],
    outputs: ['gain', 'gbw', 'phaseMargin', 'slewRate', 'power', 'vn_in'],
    specs: [
      { id: 'gain', name: 'DC Open-Loop Gain', metric: 'gain', target: 70, operator: '>=', unit: 'dB', priority: 'Must Have', enabled: true },
      { id: 'gbw', name: 'Gain-Bandwidth Product', metric: 'gbw', target: 150, operator: '>=', unit: 'MHz', priority: 'Must Have', enabled: true },
      { id: 'phaseMargin', name: 'Phase Margin', metric: 'phaseMargin', target: 60, operator: '>=', unit: 'deg', priority: 'Must Have', enabled: true },
      { id: 'slewRate', name: 'Slew Rate', metric: 'slewRate', target: 120, operator: '>=', unit: 'V/us', priority: 'Important', enabled: true },
      { id: 'power', name: 'Power Dissipation', metric: 'power', target: 3.5, operator: '<=', unit: 'mW', priority: 'Must Have', enabled: true },
    ],
  },
  'telescopic-ota': {
    simTypes: ['AC', 'TRAN', 'DC_OP', 'NOISE', 'CORNER'],
    outputs: ['gain', 'gbw', 'phaseMargin', 'slewRate', 'power'],
    specs: [
      { id: 'gain', name: 'DC Open-Loop Gain', metric: 'gain', target: 75, operator: '>=', unit: 'dB', priority: 'Must Have', enabled: true },
      { id: 'gbw', name: 'Gain-Bandwidth Product', metric: 'gbw', target: 200, operator: '>=', unit: 'MHz', priority: 'Must Have', enabled: true },
      { id: 'phaseMargin', name: 'Phase Margin', metric: 'phaseMargin', target: 65, operator: '>=', unit: 'deg', priority: 'Must Have', enabled: true },
      { id: 'power', name: 'Power Dissipation', metric: 'power', target: 2.0, operator: '<=', unit: 'mW', priority: 'Must Have', enabled: true },
    ],
  },
  'amplifier': {
    simTypes: ['AC', 'TRAN', 'DC_OP', 'DC_SWEEP', 'NOISE'],
    outputs: ['gain', 'gbw', 'phaseMargin', 'slewRate', 'power'],
    specs: DEFAULT_OTA_SPECS,
  },
  'current-mirror': {
    simTypes: ['DC_OP', 'DC_SWEEP', 'CORNER', 'MONTE_CARLO'],
    outputs: ['iref', 'iout', 'ratio', 'vout', 'power'],
    specs: DEFAULT_MIRROR_SPECS,
  },
  'differential-pair': {
    simTypes: ['DC_OP', 'AC', 'DC_SWEEP', 'CMRR'],
    outputs: ['tailCurrent', 'idp', 'idn', 'voutp', 'voutn'],
    specs: DEFAULT_DIFFPAIR_SPECS,
  },
  'comparator': {
    simTypes: ['TRAN', 'DC_OP', 'DC_SWEEP'],
    outputs: ['slewRate', 'settlingTime', 'power'],
    specs: [
      { id: 'slewRate', name: 'Slew Rate', metric: 'slewRate', target: 200, operator: '>=', unit: 'V/us', priority: 'Must Have', enabled: true },
      { id: 'power', name: 'Power Dissipation', metric: 'power', target: 1.5, operator: '<=', unit: 'mW', priority: 'Must Have', enabled: true },
    ],
  },
  'gm-c': {
    simTypes: ['AC', 'TRAN', 'DC_OP'],
    outputs: ['gain', 'gbw', 'bandwidth', 'power'],
    specs: DEFAULT_OTA_SPECS,
  },
  'ota': {
    simTypes: ['AC', 'TRAN', 'DC_OP', 'NOISE', 'PSRR', 'CMRR'],
    outputs: ['gain', 'gbw', 'phaseMargin', 'slewRate', 'power'],
    specs: DEFAULT_OTA_SPECS,
  },
};

export function getTopologySimRecommendations(topologyId: string, familyId?: string): TopologySimRecommendation {
  const famKey = familyId || topologyId.split('_')[0].toLowerCase();
  const rec = FAMILY_RECOMMENDATION_MAP[famKey] || FAMILY_RECOMMENDATION_MAP['5t-ota'] || {
    simTypes: ['AC', 'TRAN', 'DC_OP'],
    outputs: ['gain', 'gbw', 'phaseMargin', 'power'],
    specs: DEFAULT_OTA_SPECS,
  };

  return {
    topologyId,
    familyId: famKey,
    recommendedSimTypes: rec.simTypes,
    recommendedOutputs: rec.outputs,
    recommendedSpecs: rec.specs,
  };
}
