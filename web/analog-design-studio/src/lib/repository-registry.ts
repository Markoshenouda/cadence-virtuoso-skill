/**
 * Repository registry — the single source of truth for circuit, topology,
 * generator, contract, sizing-default, diagram, and specification metadata.
 *
 * Everything the UI and the generator contracts consume is declared here and
 * must not be duplicated in components or contract files. Canonical Cadence
 * behavior stays in the repository's canonical/ generators; this file only
 * describes and points at them.
 */

import type { TopologySimulation } from './simulation/simulation-contract';

export type GeneratorStatus = 'verified' | 'candidate' | 'unverified';
export type GeneratorEntry = { id: string; label: string; path: string; status: GeneratorStatus; runbook?: string; invocation?: string; notes?: string };
export type MosPolarity = 'NMOS' | 'PMOS';

/** Per-device placement/sizing contract anchor inside one canonical generator. */
export type ContractDevice = {
  device: string;
  type: MosPolarity;
  /** Placement procedure override; defaults to the topology placementProcedure. */
  placementProcedure?: string;
  /** Engineering starting values for the wizard; never a verified sizing. */
  defaultSizing: { totalW: string; L: string; NF: number; M: number };
};

export type TopologyContract = {
  /** Default placement procedure for devices without an explicit override. */
  placementProcedure: string;
  devices: ContractDevice[];
};

export type Topology = {
  id: string;
  name: string;
  description: string;
  inputType: string;
  deviceCount?: number;
  generator: GeneratorEntry;
  alternatives?: GeneratorEntry[];
  devices: string[];
  nets: string[];
  /** Anchor/sizing contract consumed by the generator adapter. */
  contract: TopologyContract;
  /** Diagram key rendered by the topology diagram component. */
  diagram: string;
  /** Netlist-level simulation metadata consumed by the simulation engine. */
  simulation?: TopologySimulation;
};

export type SpecDefinition = { key: string; label: string; enabled: boolean; target: number | null; unit: string; operator: string };
export type SpecGroup = { name: string; specs: SpecDefinition[] };
export type SpecRecord = Record<string, { enabled: boolean; target: number | null; unit: string; operator: string }>;

export type Circuit = { id: string; name: string; description: string; status: 'available' | 'coming-soon'; topologies: Topology[]; specGroups?: SpecGroup[] };

export const technologies = [{
  id: 'tsmcN65', name: 'TSMC N65', status: 'Supported',
  devices: ['nch', 'pch', 'nch_25', 'pch_25', 'nch_mac', 'pch_mac'],
  note: 'Repository-verified Cadence IC6.1.7 / tsmcN65 platform. Device variants still require PDK/CDF confirmation when not explicitly validated.'
}];

const fiveT: Topology = {
  id: '5t-ota', name: '5T OTA',
  description: 'NMOS differential pair with PMOS current-mirror active load and NMOS tail source.',
  inputType: 'NMOS differential input', deviceCount: 5,
  generator: {
    id: '5t-totalw-v2', label: '5T_OTA_PMOS_TOTALW_V2_20260812.il',
    path: 'canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il', status: 'candidate',
    runbook: 'runbooks/RUN_5T_OTA_TOTALW_V2_20260812.md',
    invocation: 'Create5TOTA_PMOS_TOTALW_V2_20260812()',
    notes: 'Current TotalW-first artifact. Repository marks it current, but this does not imply electrical-performance verification.'
  },
  alternatives: [{
    id: '5t-pmos-mac-v1', label: '5T_OTA_PMOS_INPUT_MAC_V1_20260814.il',
    path: 'canonical/5t-ota/5T_OTA_PMOS_INPUT_MAC_V1_20260814.il', status: 'candidate',
    runbook: 'skills/5t-ota-pmos-mac/SKILL.md', invocation: 'Create5TOTA_PMOSIN_MAC_V1_20260814()',
    notes: 'PMOS-input pch_mac/nch_mac flow. User-run topology/CDF checks are recorded; electrical performance is unverified.'
  }],
  devices: ['M1/M2: differential input pair', 'M3/M4: PMOS current-mirror load', 'M5: NMOS tail current source'],
  nets: ['VINP', 'VINN', 'MIRROR', 'VOUT', 'TAIL', 'VDD', 'VSS', 'VBN_TAIL'],
  diagram: '5t-ota',
  contract: {
    placementProcedure: 'T5TW_Place',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'T5TW_PlaceVerifiedPMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'T5TW_PlaceVerifiedPMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
    ],
  },

  simulation: {
    profile: 'ota-ac-tran',
    devices: [
      { device: 'M1', d: 'MIRROR', g: 'VINP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'VOUT', g: 'VINN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'MIRROR', g: 'MIRROR', s: 'VDD', b: 'VDD' },
      { device: 'M4', d: 'VOUT', g: 'MIRROR', s: 'VDD', b: 'VDD' },
      { device: 'M5', d: 'TAIL', g: 'VBN_TAIL', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VINP', plus: 'VINP', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.5, v1: 1.0, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VINN', plus: 'VINN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 0 } },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const telescopic: Topology = {
  id: 'telescopic-ota', name: 'Telescopic OTA',
  description: 'NMOS differential input with cascoding and differential outputs; VDC bias is generated by the canonical V8 flow.',
  inputType: 'NMOS differential input', deviceCount: 9,
  generator: {
    id: 'telescopic-v8', label: 'Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il',
    path: 'canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il', status: 'candidate',
    runbook: 'runbooks/RUN_telescopic_ota_v8_20260813.md',
    invocation: 'CreateTelescopicOTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813()',
    notes: 'Promoted from the user-provided V8 reference. VDC PLUS/MINUS handling is canonicalized; electrical performance is not verified.'
  },
  devices: ['M1/M2: input pair', 'M3/M4: lower cascodes', 'M5/M6: folded/top devices', 'M7/M8: PMOS load pair', 'M9: tail/sink'],
  nets: ['VINP', 'VINN', 'VOUTP', 'VOUTN', 'VDD', 'VSS', 'VBN_TAIL', 'VBN_CAS', 'VBP_CAS', 'VBP_LOAD'],
  diagram: 'telescopic-ota',
  contract: {
    placementProcedure: 'TOTA8_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '10u', L: '1u', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '10u', L: '1u', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '6u', L: '1u', NF: 1, M: 1 } },
      { device: 'M4', type: 'NMOS', defaultSizing: { totalW: '6u', L: '1u', NF: 1, M: 1 } },
      { device: 'M5', type: 'PMOS', defaultSizing: { totalW: '8u', L: '1u', NF: 1, M: 1 } },
      { device: 'M6', type: 'PMOS', defaultSizing: { totalW: '8u', L: '1u', NF: 1, M: 1 } },
      { device: 'M7', type: 'PMOS', defaultSizing: { totalW: '10u', L: '1u', NF: 1, M: 1 } },
      { device: 'M8', type: 'PMOS', defaultSizing: { totalW: '10u', L: '1u', NF: 1, M: 1 } },
      { device: 'M9', type: 'NMOS', defaultSizing: { totalW: '12u', L: '1u', NF: 1, M: 1 } },
    ],
  },

  simulation: {
    profile: 'ota-ac-tran',
    devices: [
      { device: 'M1', d: 'NLEFT', g: 'VINP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'NRIGHT', g: 'VINN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'VOUTP', g: 'VBN_CAS', s: 'NLEFT', b: 'VSS' },
      { device: 'M4', d: 'VOUTN', g: 'VBN_CAS', s: 'NRIGHT', b: 'VSS' },
      { device: 'M5', d: 'VOUTP', g: 'VBP_CAS', s: 'PLEFT', b: 'VDD' },
      { device: 'M6', d: 'VOUTN', g: 'VBP_CAS', s: 'PRIGHT', b: 'VDD' },
      { device: 'M7', d: 'PLEFT', g: 'VBP_LOAD', s: 'VDD', b: 'VDD' },
      { device: 'M8', d: 'PRIGHT', g: 'VBP_LOAD', s: 'VDD', b: 'VDD' },
      { device: 'M9', d: 'TAIL', g: 'VBN_TAIL', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 2.0, role: 'supply' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VBN_CAS', plus: 'VBN_CAS', minus: 'VSS', dc: 1.05, role: 'bias' },
      { name: 'V_VBP_CAS', plus: 'VBP_CAS', minus: 'VSS', dc: 1.25, role: 'bias' },
      { name: 'V_VBP_LOAD', plus: 'VBP_LOAD', minus: 'VSS', dc: 1.0, role: 'bias' },
      { name: 'V_VINP', plus: 'VINP', minus: 'VSS', dc: 0.8, role: 'input', input: { acMag: 1, pulse: { v0: 0.6, v1: 1.0, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VINN', plus: 'VINN', minus: 'VSS', dc: 0.8, role: 'input', input: { acMag: 0 } },
    ],
    nodes: { ground: 'VSS', out: 'VOUTP', outP: 'VOUTP', outN: 'VOUTN' },
    load: { node: 'VOUTP', c: '1p' },
    tranStop: '4u',
  },
};

const folded: Topology = {
  id: 'folded-cascode-ota', name: 'Folded Cascode OTA',
  description: 'NMOS input pair with PMOS top/folded devices and NMOS lower sinks; single-ended output on the right branch.',
  inputType: 'NMOS differential input', deviceCount: 11,
  generator: {
    id: 'folded-totalw-v1', label: 'Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il',
    path: 'canonical/folded-cascode-ota/Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il', status: 'verified',
    runbook: 'runbooks/RUN_Folded_Cascode_OTA_TotalW_V1_20260814.md',
    invocation: 'CreateFoldedCascodeOTA_NMOS_TotalW_V1_20260814()',
    notes: 'User-confirmed working in the target Cadence Virtuoso IC6.1.7 / tsmcN65 environment. Schematic generation is verified; electrical performance remains unverified.'
  },
  devices: ['M1/M2: input pair', 'M3/M4: PMOS top pair', 'M5/M6: PMOS folded pair', 'M7/M8: NMOS folded pair', 'M9/M10: NMOS sinks', 'M11: NMOS tail'],
  nets: ['VINP', 'VINN', 'VOUT', 'NLEFT', 'NRIGHT', 'FOLD_L', 'VDD', 'VSS', 'VBP1', 'VBP2', 'VBN1', 'VBN2', 'VBN_TAIL'],
  diagram: 'folded-cascode-ota',
  contract: {
    placementProcedure: 'FCW_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 2, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 2, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'FCW_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '1u', NF: 2, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'FCW_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '1u', NF: 2, M: 1 } },
      { device: 'M5', type: 'PMOS', placementProcedure: 'FCW_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '1u', NF: 2, M: 1 } },
      { device: 'M6', type: 'PMOS', placementProcedure: 'FCW_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '1u', NF: 2, M: 1 } },
      { device: 'M7', type: 'NMOS', defaultSizing: { totalW: '8u', L: '1u', NF: 2, M: 1 } },
      { device: 'M8', type: 'NMOS', defaultSizing: { totalW: '8u', L: '1u', NF: 2, M: 1 } },
      { device: 'M9', type: 'NMOS', defaultSizing: { totalW: '6u', L: '1u', NF: 2, M: 1 } },
      { device: 'M10', type: 'NMOS', defaultSizing: { totalW: '6u', L: '1u', NF: 2, M: 1 } },
      { device: 'M11', type: 'NMOS', defaultSizing: { totalW: '8u', L: '1u', NF: 2, M: 1 } },
    ],
  },

  simulation: {
    profile: 'ota-ac-tran',
    devices: [
      { device: 'M1', d: 'NLEFT', g: 'VINP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'NRIGHT', g: 'VINN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'NLEFT', g: 'VBP2', s: 'VDD', b: 'VDD' },
      { device: 'M4', d: 'NRIGHT', g: 'VBP2', s: 'VDD', b: 'VDD' },
      { device: 'M5', d: 'FOLD_L', g: 'VBP1', s: 'NLEFT', b: 'VDD' },
      { device: 'M6', d: 'VOUT', g: 'VBP1', s: 'NRIGHT', b: 'VDD' },
      { device: 'M7', d: 'FOLD_L', g: 'VBN1', s: 'LEFT_SINK', b: 'VSS' },
      { device: 'M8', d: 'VOUT', g: 'VBN1', s: 'RIGHT_SINK', b: 'VSS' },
      { device: 'M9', d: 'LEFT_SINK', g: 'VBN2', s: 'VSS', b: 'VSS' },
      { device: 'M10', d: 'RIGHT_SINK', g: 'VBN2', s: 'VSS', b: 'VSS' },
      { device: 'M11', d: 'TAIL', g: 'VBN_TAIL', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 2.0, role: 'supply' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
      { name: 'V_VBP2', plus: 'VBP2', minus: 'VSS', dc: 1.55, role: 'bias' },
      { name: 'V_VBP1', plus: 'VBP1', minus: 'VSS', dc: 1.3, role: 'bias' },
      { name: 'V_VBN1', plus: 'VBN1', minus: 'VSS', dc: 0.65, role: 'bias' },
      { name: 'V_VBN2', plus: 'VBN2', minus: 'VSS', dc: 0.45, role: 'bias' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.65, role: 'bias' },
      { name: 'V_VINP', plus: 'VINP', minus: 'VSS', dc: 1.0, role: 'input', input: { acMag: 1, pulse: { v0: 0.8, v1: 1.2, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VINN', plus: 'VINN', minus: 'VSS', dc: 1.0, role: 'input', input: { acMag: 0 } },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '5p' },
    tranStop: '4u',
  },
};

const simpleCurrentMirror: Topology = {
  id: 'simple-current-mirror', name: 'Simple Current Mirror',
  description: 'Diode-connected NMOS reference with NMOS output device; label-based 1:1 mirroring, ratio set by TotalW/NF/M.',
  inputType: 'Current reference input', deviceCount: 2,
  generator: {
    id: 'current-mirror-totalw-v1', label: 'Current_Mirror_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/Current_Mirror_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Current_Mirror_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_NMOS_TotalW_V1_20260817()',
    notes: 'First TotalW-first current-mirror artifact following the Folded Cascode V1 generator pattern (tsmcN65/nch). Schematic candidate; not Cadence-verified; electrical performance unverified.'
  },
  devices: ['M1: diode-connected NMOS reference (gate tied to drain on IREF)', 'M2: NMOS output device (drain on IOUT)'],
  nets: ['IREF', 'IOUT', 'VSS'],
  diagram: 'simple-current-mirror',
  contract: {
    placementProcedure: 'CMW_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
    ],
  },

  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'IREF', g: 'IREF', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'IOUT', g: 'IREF', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_IREF', plus: 'IREF', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_ILOAD', plus: 'IOUT', minus: 'VSS', dc: 0.9, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUT', ref: 'IREF' },
    deviceRoles: { ref: 'M1', out: 'M2' },
  },
};

const differentialPair: Topology = {
  id: 'differential-pair-nmos', name: 'Differential Pair',
  description: 'NMOS differential input pair with NMOS tail source; drain outputs VOUTP/VOUTN.',
  inputType: 'Differential input', deviceCount: 3,
  generator: {
    id: 'differential-pair-totalw-v1', label: 'Differential_Pair_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/differential-pair/Differential_Pair_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Differential_Pair_TotalW_V1_20260817.md',
    invocation: 'CreateDiffPair_NMOS_TotalW_V1_20260817()',
    notes: 'TotalW-first differential pair stage (tsmcN65/nch) following the Current Mirror V1 generator pattern. Schematic candidate; not Cadence-verified; electrical performance unverified.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3: NMOS tail current source'],
  nets: ['VIP', 'VIN', 'VOUTP', 'VOUTN', 'TAIL', 'VBN_TAIL', 'VSS'],
  diagram: 'differential-pair-nmos',
  contract: {
    placementProcedure: 'CDP_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
    ],
  },

  simulation: {
    profile: 'dc-diffpair',
    devices: [
      { device: 'M1', d: 'VOUTP', g: 'VIP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'VOUTN', g: 'VIN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'TAIL', g: 'VBN_TAIL', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VIP', plus: 'VIP', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_LP', plus: 'VDD', minus: 'VOUTP', dc: 0, role: 'bias' },
      { name: 'V_LN', plus: 'VDD', minus: 'VOUTN', dc: 0, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', outP: 'VOUTP', outN: 'VOUTN', tail: 'TAIL' },
    deviceRoles: { tail: 'M3', inP: 'M1', inN: 'M2' },
  },
};

const commonSource: Topology = {
  id: 'common-source', name: 'Common-Source Amplifier',
  description: 'NMOS input device with PMOS current-source load; single-ended VOUT.',
  inputType: 'Voltage input', deviceCount: 2,
  generator: {
    id: 'common-source-totalw-v1', label: 'CommonSource_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/CommonSource_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_CommonSource_Amp_TotalW_V1_20260817.md',
    invocation: 'CreateCommonSource_NMOS_TotalW_V1_20260817()',
    notes: 'TotalW-first common-source stage (nch + pch with geometry-verified PMOS orientation). Schematic candidate; not Cadence-verified; electrical performance unverified.'
  },
  devices: ['M1: NMOS input device', 'M2: PMOS current-source load'],
  nets: ['VIN', 'VOUT', 'VBP', 'VDD', 'VSS'],
  diagram: 'common-source',
  contract: {
    placementProcedure: 'CCS_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', placementProcedure: 'CCS_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },

  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'VOUT', g: 'VIN', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'VOUT', g: 'VBP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.62, role: 'input', input: { acMag: 1, pulse: { v0: 0.54, v1: 0.7, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 0.95, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const sourceFollower: Topology = {
  id: 'source-follower', name: 'Source Follower',
  description: 'NMOS follower with NMOS current sink; buffered output at the source node.',
  inputType: 'Voltage input', deviceCount: 2,
  generator: {
    id: 'source-follower-totalw-v1', label: 'SourceFollower_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/SourceFollower_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Source_Follower_TotalW_V1_20260817.md',
    invocation: 'CreateSourceFollower_NMOS_TotalW_V1_20260817()',
    notes: 'TotalW-first source follower (tsmcN65/nch). Schematic candidate; not Cadence-verified; electrical performance unverified.'
  },
  devices: ['M1: NMOS follower device', 'M2: NMOS current sink'],
  nets: ['VIN', 'VOUT', 'VBN', 'VDD', 'VSS'],
  diagram: 'source-follower',
  contract: {
    placementProcedure: 'CSF_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
    ],
  },

  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'VDD', g: 'VIN', s: 'VOUT', b: 'VSS' },
      { device: 'M2', d: 'VOUT', g: 'VBN', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 1.0, role: 'input', input: { acMag: 1, pulse: { v0: 0.8, v1: 1.2, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBN', plus: 'VBN', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const cascodeAmp: Topology = {
  id: 'cascode-amplifier', name: 'Cascode Amplifier',
  description: 'NMOS input with NMOS cascode and PMOS current-source load; single-ended VOUT.',
  inputType: 'Voltage input', deviceCount: 3,
  generator: {
    id: 'cascode-amp-totalw-v1', label: 'CascodeAmp_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/CascodeAmp_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Cascode_Amp_TotalW_V1_20260817.md',
    invocation: 'CreateCascodeAmp_NMOS_TotalW_V1_20260817()',
    notes: 'TotalW-first cascode stage (nch cascode + pch load with geometry-verified orientation). Schematic candidate; not Cadence-verified; electrical performance unverified.'
  },
  devices: ['M1: NMOS input device', 'M2: NMOS cascode device', 'M3: PMOS current-source load'],
  nets: ['VIN', 'VOUT', 'NCAS', 'VBN_CAS', 'VBP', 'VDD', 'VSS'],
  diagram: 'cascode-amplifier',
  contract: {
    placementProcedure: 'CCA_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'CCA_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },

  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'NCAS', g: 'VIN', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'VOUT', g: 'VBN_CAS', s: 'NCAS', b: 'VSS' },
      { device: 'M3', d: 'VOUT', g: 'VBP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.5, v1: 1.0, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 2.0, role: 'supply' },
      { name: 'V_VBN_CAS', plus: 'VBN_CAS', minus: 'VSS', dc: 1.05, role: 'bias' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 1.35, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const cascodeCurrentMirror: Topology = {
  id: 'cascode-current-mirror', name: 'Cascode Current Mirror',
  description: 'Diode-connected NMOS reference and output device with NMOS cascodes on both branches.',
  inputType: 'Current reference input', deviceCount: 4,
  generator: {
    id: 'current-mirror-cascode-totalw-v1', label: 'Current_Mirror_Cascode_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/Current_Mirror_Cascode_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Current_Mirror_Cascode_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_Cascode_NMOS_TotalW_V1_20260817()',
    notes: 'TotalW-first cascode current mirror (tsmcN65/nch). Schematic candidate; not Cadence-verified; electrical performance unverified.'
  },
  devices: ['M1: diode-connected NMOS reference', 'M2: NMOS output device', 'M3/M4: NMOS cascodes'],
  nets: ['IREF', 'IOUT', 'NB', 'NB2', 'VBC', 'VSS'],
  diagram: 'cascode-current-mirror',
  contract: {
    placementProcedure: 'CCM_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
    ],
  },

  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'NB', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'NB2', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M3', d: 'IREF', g: 'VBC', s: 'NB', b: 'VSS' },
      { device: 'M4', d: 'IOUT', g: 'VBC', s: 'NB2', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VBC', plus: 'VBC', minus: 'VSS', dc: 0.9, role: 'bias' },
      { name: 'V_IREF', plus: 'IREF', minus: 'VSS', dc: 1.2, role: 'supply' },
      { name: 'V_ILOAD', plus: 'IOUT', minus: 'VSS', dc: 1.2, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUT', ref: 'IREF' },
    deviceRoles: { ref: 'M3', out: 'M4' },
  },
};

const pmosCurrentMirror: Topology = {
  id: 'pmos-current-mirror', name: 'PMOS Current Mirror',
  description: 'Diode-connected PMOS reference with PMOS output device; VDD-referenced mirroring.',
  inputType: 'Current reference input', deviceCount: 2,
  generator: {
    id: 'current-mirror-pmos-totalw-v1', label: 'Current_Mirror_PMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/Current_Mirror_PMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Current_Mirror_PMOS_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_PMOS_TotalW_V1_20260817()',
    notes: 'TotalW-first PMOS mirror (tsmcN65/pch) with geometry-verified PMOS orientation. Schematic candidate; not Cadence-verified; electrical performance unverified.'
  },
  devices: ['M1: diode-connected PMOS reference', 'M2: PMOS output device'],
  nets: ['IREF', 'IOUT', 'VDD', 'VSS'],
  diagram: 'pmos-current-mirror',
  contract: {
    placementProcedure: 'CPM_PlacePMOSAuto',
    devices: [
      { device: 'M1', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },

  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'IREF', g: 'IREF', s: 'VDD', b: 'VDD' },
      { device: 'M2', d: 'IOUT', g: 'IREF', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_IREF', plus: 'IREF', minus: 'VSS', dc: 0.8, role: 'supply' },
      { name: 'V_ILOAD', plus: 'IOUT', minus: 'VSS', dc: 0.4, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUT', ref: 'IREF' },
    deviceRoles: { ref: 'M1', out: 'M2' },
  },
};

const otaSpecGroups: SpecGroup[] = [
  {
    name: 'Core performance',
    specs: [
      { key: 'gain', label: 'DC Gain', enabled: true, target: 60, unit: 'dB', operator: '>=' },
      { key: 'gbw', label: 'GBW', enabled: true, target: 100, unit: 'MHz', operator: '>=' },
      { key: 'phaseMargin', label: 'Phase Margin', enabled: true, target: 60, unit: 'deg', operator: '>=' },
      { key: 'slewRate', label: 'Slew Rate', enabled: true, target: 100, unit: 'V/µs', operator: '>=' },
      { key: 'load', label: 'Load Capacitance', enabled: true, target: 1, unit: 'pF', operator: '=' },
      { key: 'power', label: 'Power', enabled: true, target: 2, unit: 'mW', operator: '<=' },
    ],
  },
  {
    name: 'Advanced',
    specs: [
      { key: 'noise', label: 'Input-Referred Noise', enabled: false, target: null, unit: 'nV/√Hz', operator: '<=' },
      { key: 'psrr', label: 'PSRR', enabled: false, target: null, unit: 'dB', operator: '>=' },
      { key: 'cmrr', label: 'CMRR', enabled: false, target: null, unit: 'dB', operator: '>=' },
      { key: 'outputSwing', label: 'Output Swing', enabled: false, target: null, unit: 'V', operator: '=' },
      { key: 'icmr', label: 'Input Common-Mode Range', enabled: false, target: null, unit: 'V', operator: '=' },
      { key: 'settling', label: 'Settling Time', enabled: false, target: null, unit: 'ns', operator: '<=' },
      { key: 'offset', label: 'Offset', enabled: false, target: null, unit: 'mV', operator: '<=' },
    ],
  },
];

const currentMirrorSpecGroups: SpecGroup[] = [
  {
    name: 'Mirror performance',
    specs: [
      { key: 'iref', label: 'Reference Current', enabled: true, target: 100, unit: 'µA', operator: '=' },
      { key: 'iout', label: 'Output Current', enabled: true, target: 100, unit: 'µA', operator: '=' },
      { key: 'ratio', label: 'Mirror Ratio (M2:M1)', enabled: true, target: 1, unit: ':', operator: '=' },
    ],
  },
  {
    name: 'Output characteristics',
    specs: [
      { key: 'rout', label: 'Output Resistance', enabled: true, target: 10, unit: 'MΩ', operator: '>=' },
      { key: 'compliance', label: 'Output Compliance Range', enabled: true, target: 0.5, unit: 'V', operator: '>=' },
      { key: 'matching', label: 'Current Matching Error', enabled: false, target: 2, unit: '%', operator: '<=' },
    ],
  },
];

const differentialPairSpecGroups: SpecGroup[] = [
  {
    name: 'Pair performance',
    specs: [
      { key: 'gm', label: 'Transconductance', enabled: true, target: 2, unit: 'mS', operator: '>=' },
      { key: 'tailCurrent', label: 'Tail Current', enabled: true, target: 100, unit: 'µA', operator: '=' },
      { key: 'icmr', label: 'Input Common-Mode Range', enabled: true, target: 0.4, unit: 'V', operator: '>=' },
    ],
  },
  {
    name: 'Matching',
    specs: [
      { key: 'offset', label: 'Input Offset', enabled: false, target: 5, unit: 'mV', operator: '<=' },
    ],
  },
];

const amplifierSpecGroups: SpecGroup[] = [
  {
    name: 'Amplifier performance',
    specs: [
      { key: 'gain', label: 'DC Gain', enabled: true, target: 20, unit: 'dB', operator: '>=' },
      { key: 'gbw', label: 'GBW', enabled: true, target: 100, unit: 'MHz', operator: '>=' },
      { key: 'outputSwing', label: 'Output Swing', enabled: true, target: 1, unit: 'V', operator: '>=' },
      { key: 'power', label: 'Power', enabled: true, target: 2, unit: 'mW', operator: '<=' },
    ],
  },
  {
    name: 'Advanced',
    specs: [
      { key: 'noise', label: 'Input-Referred Noise', enabled: false, target: 10, unit: 'nV/√Hz', operator: '<=' },
    ],
  },
];

export const circuits: Circuit[] = [
  { id: 'ota', name: 'OTA', description: 'Operational Transconductance Amplifier', status: 'available', topologies: [fiveT, telescopic, folded], specGroups: otaSpecGroups },
  { id: 'current-mirror', name: 'Current Mirror', description: 'Bias and current generation', status: 'available', topologies: [simpleCurrentMirror, cascodeCurrentMirror, pmosCurrentMirror], specGroups: currentMirrorSpecGroups },
  { id: 'differential-pair', name: 'Differential Pair', description: 'Input differential stage', status: 'available', topologies: [differentialPair], specGroups: differentialPairSpecGroups },
  { id: 'amplifier', name: 'Amplifier', description: 'Single-stage voltage amplifiers', status: 'available', topologies: [commonSource, sourceFollower, cascodeAmp], specGroups: amplifierSpecGroups },
  { id: 'bandgap', name: 'Bandgap Reference', description: 'Precision voltage reference', status: 'coming-soon', topologies: [] },
  { id: 'ldo', name: 'LDO', description: 'Low-dropout regulator', status: 'coming-soon', topologies: [] },
  { id: 'comparator', name: 'Comparator', description: 'Decision circuit', status: 'coming-soon', topologies: [] }
];

export const getCircuit = (id: string) => circuits.find((c) => c.id === id);
export const getTopology = (circuitId: string, topologyId: string) => getCircuit(circuitId)?.topologies.find((t) => t.id === topologyId);

/** Find a topology and its owning circuit by scanning every circuit family. */
export const findTopology = (topologyId: string): { circuit: Circuit; topology: Topology } | undefined => {
  for (const circuit of circuits) {
    const topology = circuit.topologies.find((t) => t.id === topologyId);
    if (topology) return { circuit, topology };
  }
  return undefined;
};

/** Initial spec record for a circuit, derived from the registry spec definitions. */
export function defaultSpecsFor(circuitId: string): SpecRecord {
  const groups = getCircuit(circuitId)?.specGroups ?? [];
  return Object.fromEntries(groups.flatMap((group) => group.specs.map((spec) => [spec.key, { enabled: spec.enabled, target: spec.target, unit: spec.unit, operator: spec.operator }])));
}
