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

/* ========================================================================
 * OTA / Op-Amp topologies
 * ======================================================================== */

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

const twoStageMillerOta: Topology = {
  id: 'two-stage-miller-ota', name: 'Two-Stage Miller OTA',
  description: 'NMOS differential input with PMOS mirror load, common-source second stage, and Miller compensation. Schematic only — compensation capacitor not yet netlistable.',
  inputType: 'NMOS differential input', deviceCount: 7,
  generator: {
    id: 'two-stage-miller-v1', label: 'TwoStageMiller_OTA_TotalW_V1_20260817.il',
    path: 'canonical/ota/TwoStageMiller_OTA_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_TwoStage_Miller_OTA_TotalW_V1_20260817.md',
    invocation: 'CreateTwoStageMiller_OTA_TotalW_V1_20260817()',
    notes: 'Schematic-only: Miller compensation capacitor cannot be netlisted by the current simulation infrastructure. Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3/M4: PMOS current-mirror load', 'M5: NMOS tail', 'M6: NMOS second-stage', 'M7: PMOS second-stage load'],
  nets: ['VINP', 'VINN', 'MIRROR', 'VOUT', 'TAIL', 'VDD', 'VSS', 'VBN_TAIL'],
  diagram: 'two-stage-miller-ota',
  contract: {
    placementProcedure: 'TSM_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'TSM_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'TSM_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M6', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M7', type: 'PMOS', placementProcedure: 'TSM_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
};

const symmetricalOta: Topology = {
  id: 'symmetrical-ota', name: 'Symmetrical OTA',
  description: 'Fully differential symmetrical OTA with NMOS input pair, NMOS cascode loads, and PMOS tail. Simulation-ready with ota-ac-tran profile.',
  inputType: 'NMOS differential input', deviceCount: 8,
  generator: {
    id: 'symmetrical-ota-v1', label: 'Symmetrical_OTA_TotalW_V1_20260817.il',
    path: 'canonical/ota/Symmetrical_OTA_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Symmetrical_OTA_TotalW_V1_20260817.md',
    invocation: 'CreateSymmetrical_OTA_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ota-ac-tran). Schematic candidate; not Cadence-verified; electrical performance unverified.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3/M4: NMOS diode cascodes', 'M5/M6: NMOS output cascodes', 'M7: NMOS tail', 'M8: PMOS current-source load'],
  nets: ['VIP', 'VIN', 'NA', 'NB', 'VOUT', 'TAIL', 'VDD', 'VSS', 'VBN_TAIL', 'VBP'],
  diagram: 'symmetrical-ota',
  contract: {
    placementProcedure: 'SYM_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '2u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '2u', L: '480n', NF: 1, M: 1 } },
      { device: 'M6', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M7', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M8', type: 'PMOS', placementProcedure: 'SYM_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ota-ac-tran',
    devices: [
      { device: 'M1', d: 'NA', g: 'VIP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'NB', g: 'VIN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'NA', g: 'NA', s: 'VSS', b: 'VSS' },
      { device: 'M4', d: 'VOUT', g: 'NA', s: 'VSS', b: 'VSS' },
      { device: 'M5', d: 'NB', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M6', d: 'VOUT', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M7', d: 'TAIL', g: 'VBN_TAIL', s: 'VSS', b: 'VSS' },
      { device: 'M8', d: 'VOUT', g: 'VBP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VIP', plus: 'VIP', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.6, v1: 0.9, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 0 } },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const threeStageOta: Topology = {
  id: 'three-stage-ota', name: 'Three-Stage OTA',
  description: 'Three-stage uncompensated OTA with NMOS differential input, PMOS mirror, and two gain stages. Schematic only — no compensation network.',
  inputType: 'NMOS differential input', deviceCount: 9,
  generator: {
    id: 'three-stage-ota-v1', label: 'ThreeStage_OTA_TotalW_V1_20260817.il',
    path: 'canonical/ota/ThreeStage_OTA_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_ThreeStage_OTA_TotalW_V1_20260817.md',
    invocation: 'CreateThreeStage_OTA_TotalW_V1_20260817()',
    notes: 'Schematic-only: no compensation network for multi-stage stability. Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3/M4: PMOS current-mirror load', 'M5: NMOS tail', 'M6/M7: gain stage 2', 'M8/M9: gain stage 3'],
  nets: ['VINP', 'VINN', 'MIRROR', 'VOUT', 'TAIL', 'VDD', 'VSS', 'VBN_TAIL'],
  diagram: 'three-stage-ota',
  contract: {
    placementProcedure: 'THS_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'THS_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'THS_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M6', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M7', type: 'PMOS', placementProcedure: 'THS_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M8', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M9', type: 'PMOS', placementProcedure: 'THS_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
};

const currentMirrorOta: Topology = {
  id: 'current-mirror-ota', name: 'Current-Mirror OTA',
  description: 'NMOS differential input with active NMOS current-mirror load and PMOS output stage. Simulation-ready with ota-ac-tran profile.',
  inputType: 'NMOS differential input', deviceCount: 8,
  generator: {
    id: 'current-mirror-ota-v1', label: 'CurrentMirror_OTA_TotalW_V1_20260817.il',
    path: 'canonical/ota/CurrentMirror_OTA_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_CurrentMirror_OTA_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_OTA_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ota-ac-tran). Schematic candidate; not Cadence-verified; electrical performance unverified.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3/M4: PMOS mirror load', 'M5/M6: NMOS current-mirror active load', 'M7: NMOS tail', 'M8: PMOS output load'],
  nets: ['VIP', 'VIN', 'NA', 'NB', 'VOUT', 'TAIL', 'VDD', 'VSS', 'VBN_TAIL', 'VBP'],
  diagram: 'current-mirror-ota',
  contract: {
    placementProcedure: 'CMO_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'CMO_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'CMO_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '2u', L: '480n', NF: 1, M: 1 } },
      { device: 'M6', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M7', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M8', type: 'PMOS', placementProcedure: 'CMO_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ota-ac-tran',
    devices: [
      { device: 'M1', d: 'NA', g: 'VIP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'NB', g: 'VIN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'NA', g: 'NA', s: 'VDD', b: 'VDD' },
      { device: 'M4', d: 'NB', g: 'NA', s: 'VDD', b: 'VDD' },
      { device: 'M5', d: 'NB', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M6', d: 'VOUT', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M7', d: 'TAIL', g: 'VBN_TAIL', s: 'VSS', b: 'VSS' },
      { device: 'M8', d: 'VOUT', g: 'VBP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VIP', plus: 'VIP', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.6, v1: 0.9, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 0 } },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const fullyDiffFoldedCascodeOta: Topology = {
  id: 'fully-diff-folded-cascode-ota', name: 'Fully-Differential Folded Cascode OTA',
  description: 'Fully-differential folded cascode OTA with 11 MOS devices. Schematic only — CMFB not yet implemented.',
  inputType: 'NMOS differential input', deviceCount: 11,
  generator: {
    id: 'fully-diff-folded-v1', label: 'FoldedCascode_OTA_FullyDiff_TotalW_V1_20260817.il',
    path: 'canonical/ota/FoldedCascode_OTA_FullyDiff_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_FoldedCascode_OTA_FullyDiff_TotalW_V1_20260817.md',
    invocation: 'CreateFoldedCascode_OTA_FullyDiff_TotalW_V1_20260817()',
    notes: 'Schematic-only: common-mode feedback (CMFB) not implemented. Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS input pair', 'M3/M4: PMOS top pair', 'M5/M6: PMOS folded pair', 'M7/M8: NMOS folded pair', 'M9/M10: NMOS sinks', 'M11: NMOS tail'],
  nets: ['VINP', 'VINN', 'VOUTP', 'VOUTN', 'NLEFT', 'NRIGHT', 'LEFT_SINK', 'RIGHT_SINK', 'TAIL', 'VDD', 'VSS', 'VBP1', 'VBP2', 'VBN1', 'VBN2', 'VBN_TAIL'],
  diagram: 'fully-diff-folded-cascode-ota',
  contract: {
    placementProcedure: 'FDF_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'FDF_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'FDF_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'PMOS', placementProcedure: 'FDF_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M6', type: 'PMOS', placementProcedure: 'FDF_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M7', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M8', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M9', type: 'NMOS', defaultSizing: { totalW: '6u', L: '1u', NF: 1, M: 1 } },
      { device: 'M10', type: 'NMOS', defaultSizing: { totalW: '6u', L: '1u', NF: 1, M: 1 } },
      { device: 'M11', type: 'NMOS', defaultSizing: { totalW: '8u', L: '1u', NF: 1, M: 1 } },
    ],
  },
};

/* ========================================================================
 * Current Mirror / Current Source / Bias topologies
 * ======================================================================== */

const simpleCurrentMirror: Topology = {
  id: 'simple-current-mirror', name: 'Simple Current Mirror',
  description: 'Diode-connected NMOS reference with NMOS output device; label-based 1:1 mirroring, ratio set by TotalW/NF/M.',
  inputType: 'Current reference input', deviceCount: 2,
  generator: {
    id: 'current-mirror-totalw-v1', label: 'Current_Mirror_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/Current_Mirror_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Current_Mirror_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_NMOS_TotalW_V1_20260817()',
    notes: 'Bridge-run 2026-08-17; schematic-gen verified; partially electrically verified (ratio 1.016).'
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

const cascodePmosCurrentMirror: Topology = {
  id: 'cascode-pmos-current-mirror', name: 'Cascode PMOS Current Mirror',
  description: 'PMOS cascode current mirror with diode-connected bottom pair and cascode top pair; VDD-referenced.',
  inputType: 'Current reference input', deviceCount: 4,
  generator: {
    id: 'current-mirror-cascode-pmos-v1', label: 'Current_Mirror_Cascode_PMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/Current_Mirror_Cascode_PMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Current_Mirror_Cascode_PMOS_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_Cascode_PMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-mirror). Schematic candidate only.'
  },
  devices: ['M1/M2: diode-connected PMOS reference/output', 'M3/M4: PMOS cascodes'],
  nets: ['IREF', 'IOUT', 'NB', 'VBC', 'VDD', 'VSS'],
  diagram: 'cascode-pmos-current-mirror',
  contract: {
    placementProcedure: 'CPM2_PlacePMOSAuto',
    devices: [
      { device: 'M1', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'NB', g: 'NB', s: 'VDD', b: 'VDD' },
      { device: 'M2', d: 'IOUT', g: 'NB', s: 'VDD', b: 'VDD' },
      { device: 'M3', d: 'IREF', g: 'VBC', s: 'NB', b: 'VDD' },
      { device: 'M4', d: 'IOUT', g: 'VBC', s: 'NB', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBC', plus: 'VBC', minus: 'VSS', dc: 0.5, role: 'bias' },
      { name: 'V_IREF', plus: 'IREF', minus: 'VSS', dc: 0.8, role: 'supply' },
      { name: 'V_ILOAD', plus: 'IOUT', minus: 'VSS', dc: 0.4, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUT', ref: 'IREF' },
    deviceRoles: { ref: 'M3', out: 'M4' },
  },
};

const wilsonCurrentMirror: Topology = {
  id: 'wilson-current-mirror', name: 'Wilson Current Mirror',
  description: 'Wilson NMOS current mirror with 3 devices for improved output impedance and accuracy.',
  inputType: 'Current reference input', deviceCount: 3,
  generator: {
    id: 'current-mirror-wilson-v1', label: 'Current_Mirror_Wilson_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/Current_Mirror_Wilson_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Current_Mirror_Wilson_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_Wilson_NMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-mirror). Schematic candidate only.'
  },
  devices: ['M1: diode-connected NMOS reference', 'M2: NMOS cascode', 'M3: NMOS output device'],
  nets: ['IREF', 'IOUT', 'A', 'B', 'VSS'],
  diagram: 'wilson-current-mirror',
  contract: {
    placementProcedure: 'CWM_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'A', g: 'A', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'B', g: 'A', s: 'VSS', b: 'VSS' },
      { device: 'M3', d: 'IOUT', g: 'A', s: 'B', b: 'VSS' },
    ],
    sources: [
      { name: 'V_IREF', plus: 'IREF', minus: 'VSS', dc: 1.0, role: 'supply' },
      { name: 'V_ILOAD', plus: 'IOUT', minus: 'VSS', dc: 1.0, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUT', ref: 'IREF' },
    deviceRoles: { ref: 'M1', out: 'M3' },
  },
};

const regulatedCascodeMirror: Topology = {
  id: 'regulated-cascode-mirror', name: 'Regulated Cascode Mirror',
  description: 'NMOS regulated cascode current mirror with auxiliary amplifier (M5) driving cascode gates for very high output impedance.',
  inputType: 'Current reference input', deviceCount: 5,
  generator: {
    id: 'current-mirror-regcascode-v1', label: 'Current_Mirror_RegCascode_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/Current_Mirror_RegCascode_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Current_Mirror_RegCascode_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_RegCascode_NMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-mirror). Schematic candidate only.'
  },
  devices: ['M1/M2: diode-connected NMOS reference/output pair', 'M3/M4: NMOS cascodes', 'M5: NMOS auxiliary amplifier'],
  nets: ['IREF', 'IOUT', 'NB', 'NA', 'VSS'],
  diagram: 'regulated-cascode-mirror',
  contract: {
    placementProcedure: 'CRM_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '2u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'NB', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'IOUT', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M3', d: 'IREF', g: 'NA', s: 'NB', b: 'VSS' },
      { device: 'M4', d: 'IOUT', g: 'NA', s: 'VSS', b: 'VSS' },
      { device: 'M5', d: 'NA', g: 'NB', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_IREF', plus: 'IREF', minus: 'VSS', dc: 1.2, role: 'supply' },
      { name: 'V_ILOAD', plus: 'IOUT', minus: 'VSS', dc: 1.2, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUT', ref: 'IREF' },
    deviceRoles: { ref: 'M3', out: 'M4' },
  },
};

const wideSwingCascodeMirror: Topology = {
  id: 'wide-swing-cascode-mirror', name: 'Wide-Swing Cascode Mirror',
  description: 'NMOS wide-swing cascode current mirror with bias triplers (M5/M6) for optimal cascode gate biasing. 6 devices.',
  inputType: 'Current reference input', deviceCount: 6,
  generator: {
    id: 'current-mirror-wideswing-v1', label: 'Current_Mirror_WideSwing_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/Current_Mirror_WideSwing_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Current_Mirror_WideSwing_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_WideSwing_NMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-mirror). Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS reference/output', 'M3/M4: NMOS cascodes', 'M5/M6: NMOS bias triplers'],
  nets: ['IREF', 'IOUT', 'NB', 'NBIAS', 'VSS'],
  diagram: 'wide-swing-cascode-mirror',
  contract: {
    placementProcedure: 'WSC_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M6', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'IREF', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'IOUT', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M3', d: 'IREF', g: 'NBIAS', s: 'VSS', b: 'VSS' },
      { device: 'M4', d: 'IOUT', g: 'NBIAS', s: 'VSS', b: 'VSS' },
      { device: 'M5', d: 'NB', g: 'NB', s: 'VSS', b: 'VSS' },
      { device: 'M6', d: 'IREF', g: 'NBIAS', s: 'NB', b: 'VSS' },
    ],
    sources: [
      { name: 'V_IREF', plus: 'IREF', minus: 'VSS', dc: 1.2, role: 'supply' },
      { name: 'V_ILOAD', plus: 'IOUT', minus: 'VSS', dc: 1.2, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUT', ref: 'IREF' },
    deviceRoles: { ref: 'M3', out: 'M4' },
  },
};

const dualOutputCurrentMirror: Topology = {
  id: 'dual-output-current-mirror', name: 'Dual-Output NMOS Mirror',
  description: 'NMOS current mirror with one diode-connected reference and two output devices sharing the same gate bias.',
  inputType: 'Current reference input', deviceCount: 3,
  generator: {
    id: 'current-mirror-dualoutput-v1', label: 'Current_Mirror_DualOutput_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/Current_Mirror_DualOutput_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Current_Mirror_DualOutput_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_DualOutput_NMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-mirror). Schematic candidate only.'
  },
  devices: ['M1: diode-connected NMOS reference', 'M2/M3: NMOS output devices'],
  nets: ['IREF', 'IOUT1', 'IOUT2', 'VSS'],
  diagram: 'dual-output-current-mirror',
  contract: {
    placementProcedure: 'DOM_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'IREF', g: 'IREF', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'IOUT1', g: 'IREF', s: 'VSS', b: 'VSS' },
      { device: 'M3', d: 'IOUT2', g: 'IREF', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_IREF', plus: 'IREF', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_ILOAD1', plus: 'IOUT1', minus: 'VSS', dc: 0.9, role: 'bias' },
      { name: 'V_ILOAD2', plus: 'IOUT2', minus: 'VSS', dc: 0.9, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUT1', ref: 'IREF' },
    deviceRoles: { ref: 'M1', out: 'M2' },
  },
};

const complementaryCurrentMirror: Topology = {
  id: 'complementary-current-mirror', name: 'Complementary Current Mirror',
  description: 'Complementary NMOS+PMOS current mirror producing matched sourcing and sinking outputs from a single reference.',
  inputType: 'Current reference input', deviceCount: 4,
  generator: {
    id: 'current-mirror-complementary-v1', label: 'Current_Mirror_Complementary_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/Current_Mirror_Complementary_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Current_Mirror_Complementary_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentMirror_Complementary_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-mirror). Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS reference/output pair', 'M3/M4: PMOS reference/output pair'],
  nets: ['IREF', 'IOUTN', 'IOUTP', 'VDD', 'VSS'],
  diagram: 'complementary-current-mirror',
  contract: {
    placementProcedure: 'CCMP_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'CCMP_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'CCMP_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'IREF', g: 'IREF', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'IOUTN', g: 'IREF', s: 'VSS', b: 'VSS' },
      { device: 'M3', d: 'IREF', g: 'IREF', s: 'VDD', b: 'VDD' },
      { device: 'M4', d: 'IOUTP', g: 'IREF', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_IREF', plus: 'IREF', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_ILOAD_N', plus: 'IOUTN', minus: 'VSS', dc: 0.9, role: 'bias' },
      { name: 'V_ILOAD_P', plus: 'IOUTP', minus: 'VSS', dc: 0.5, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUTN', ref: 'IREF' },
    deviceRoles: { ref: 'M1', out: 'M2' },
  },
};

const cascodeCurrentSourceNmos: Topology = {
  id: 'cascode-current-source-nmos', name: 'NMOS Cascode Current Source',
  description: 'Two-device NMOS cascode current source with external gate bias. No VDD connection; VSS-referenced.',
  inputType: 'Current bias input', deviceCount: 2,
  generator: {
    id: 'currentsource-cascode-nmos-v1', label: 'CurrentSource_Cascode_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/CurrentSource_Cascode_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_CurrentSource_Cascode_NMOS_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentSource_Cascode_NMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-mirror). Schematic candidate only.'
  },
  devices: ['M1: NMOS cascode device', 'M2: NMOS output device'],
  nets: ['IOUT', 'NC', 'VSS', 'VBN_CAS'],
  diagram: 'cascode-current-source-nmos',
  contract: {
    placementProcedure: 'NCS_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'NC', g: 'VBN_CAS', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'IOUT', g: 'VBN_CAS', s: 'NC', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VBN_CAS', plus: 'VBN_CAS', minus: 'VSS', dc: 0.9, role: 'bias' },
      { name: 'V_ILOAD', plus: 'IOUT', minus: 'VSS', dc: 1.2, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUT' },
    deviceRoles: { out: 'M2' },
  },
};

const cascodeCurrentSourcePmos: Topology = {
  id: 'cascode-current-source-pmos', name: 'PMOS Cascode Current Source',
  description: 'Two-device PMOS cascode current source with external gate bias. VDD-referenced.',
  inputType: 'Current bias input', deviceCount: 2,
  generator: {
    id: 'currentsource-cascode-pmos-v1', label: 'CurrentSource_Cascode_PMOS_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/CurrentSource_Cascode_PMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_CurrentSource_Cascode_PMOS_TotalW_V1_20260817.md',
    invocation: 'CreateCurrentSource_Cascode_PMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-mirror). Schematic candidate only.'
  },
  devices: ['M1: PMOS cascode device', 'M2: PMOS output device'],
  nets: ['IOUT', 'NC', 'VDD', 'VSS', 'VBP_CAS'],
  diagram: 'cascode-current-source-pmos',
  contract: {
    placementProcedure: 'PCS_PlacePMOSAuto',
    devices: [
      { device: 'M1', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: 'NC', g: 'VBP_CAS', s: 'VDD', b: 'VDD' },
      { device: 'M2', d: 'IOUT', g: 'VBP_CAS', s: 'NC', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBP_CAS', plus: 'VBP_CAS', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_ILOAD', plus: 'IOUT', minus: 'VSS', dc: 0.5, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'IOUT' },
    deviceRoles: { out: 'M2' },
  },
};

const cascodeBiasStack: Topology = {
  id: 'cascode-bias-stack', name: 'Cascode Bias Generator Stack',
  description: 'Three-device NMOS cascode bias stack generating VBN_CAS and VBN from a reference current. VSS-referenced.',
  inputType: 'Current reference input', deviceCount: 3,
  generator: {
    id: 'biasgen-cascode-stack-v1', label: 'BiasGen_CascodeStack_TotalW_V1_20260817.il',
    path: 'canonical/current-mirror/BiasGen_CascodeStack_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_BiasGen_CascodeStack_TotalW_V1_20260817.md',
    invocation: 'CreateBiasGen_CascodeStack_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-mirror). Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS diode-connected stack', 'M3: NMOS output (IREF terminal)'],
  nets: ['IREF', 'VSS'],
  diagram: 'cascode-bias-stack',
  contract: {
    placementProcedure: 'CBG_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-mirror',
    devices: [
      { device: 'M1', d: '0', g: '0', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: '0', g: '0', s: 'VSS', b: 'VSS' },
      { device: 'M3', d: 'IREF', g: '0', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_IREF', plus: 'IREF', minus: 'VSS', dc: 1.2, role: 'supply' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', ref: 'IREF' },
    deviceRoles: { ref: 'M3' },
  },
};

/* ========================================================================
 * Differential Pair topologies
 * ======================================================================== */

const differentialPair: Topology = {
  id: 'differential-pair-nmos', name: 'Differential Pair',
  description: 'NMOS differential input pair with NMOS tail source; drain outputs VOUTP/VOUTN.',
  inputType: 'Differential input', deviceCount: 3,
  generator: {
    id: 'differential-pair-totalw-v1', label: 'Differential_Pair_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/differential-pair/Differential_Pair_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Differential_Pair_TotalW_V1_20260817.md',
    invocation: 'CreateDiffPair_NMOS_TotalW_V1_20260817()',
    notes: 'Bridge-run; schematic-gen verified; partially electrically verified (50/50 tail split).'
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

const pmosDifferentialPair: Topology = {
  id: 'pmos-differential-pair', name: 'PMOS Differential Pair',
  description: 'PMOS differential input pair with PMOS tail source hung from VDD; drain outputs VOUTP/VOUTN.',
  inputType: 'PMOS differential input', deviceCount: 3,
  generator: {
    id: 'diff-pair-pmos-v1', label: 'Diff_Pair_PMOS_TotalW_V1_20260817.il',
    path: 'canonical/differential-pair/Diff_Pair_PMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Diff_Pair_PMOS_TotalW_V1_20260817.md',
    invocation: 'CreateDiffPair_PMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-diffpair). Schematic candidate only.'
  },
  devices: ['M1/M2: PMOS differential input pair', 'M3: PMOS tail current source'],
  nets: ['VIP', 'VIN', 'VOUTP', 'VOUTN', 'TAIL', 'VDD', 'VSS', 'VBP_TAIL'],
  diagram: 'pmos-differential-pair',
  contract: {
    placementProcedure: 'PDP_PlacePMOSAuto',
    devices: [
      { device: 'M1', type: 'PMOS', defaultSizing: { totalW: '8u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', defaultSizing: { totalW: '8u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-diffpair',
    devices: [
      { device: 'M1', d: 'VOUTP', g: 'VIP', s: 'TAIL', b: 'VDD' },
      { device: 'M2', d: 'VOUTN', g: 'VIN', s: 'TAIL', b: 'VDD' },
      { device: 'M3', d: 'TAIL', g: 'VBP_TAIL', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBP_TAIL', plus: 'VBP_TAIL', minus: 'VDD', dc: 0.9, role: 'bias' },
      { name: 'V_VIP', plus: 'VIP', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_LP', plus: 'VSS', minus: 'VOUTP', dc: 0, role: 'bias' },
      { name: 'V_LN', plus: 'VSS', minus: 'VOUTN', dc: 0, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', outP: 'VOUTP', outN: 'VOUTN', tail: 'TAIL' },
    deviceRoles: { tail: 'M3', inP: 'M1', inN: 'M2' },
  },
};

const pmosLoadDifferentialPair: Topology = {
  id: 'pmos-load-differential-pair', name: 'Diff Pair with PMOS Mirror Load',
  description: 'NMOS differential pair with PMOS current-mirror active load; single-ended output at VOUTN.',
  inputType: 'Differential input', deviceCount: 5,
  generator: {
    id: 'diff-pair-pmosload-v1', label: 'Diff_Pair_PMOSLoad_TotalW_V1_20260817.il',
    path: 'canonical/differential-pair/Diff_Pair_PMOSLoad_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Diff_Pair_PMOSLoad_TotalW_V1_20260817.md',
    invocation: 'CreateDiffPair_PMOSLoad_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-diffpair). Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3: NMOS tail', 'M4/M5: PMOS current-mirror load'],
  nets: ['VIP', 'VIN', 'VOUTP', 'VOUTN', 'TAIL', 'VDD', 'VSS', 'VBN_TAIL', 'VBP'],
  diagram: 'pmos-load-differential-pair',
  contract: {
    placementProcedure: 'DPL_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'DPL_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'PMOS', placementProcedure: 'DPL_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-diffpair',
    devices: [
      { device: 'M1', d: 'VOUTP', g: 'VIP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'VOUTN', g: 'VIN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'TAIL', g: 'VBN_TAIL', s: 'VSS', b: 'VSS' },
      { device: 'M4', d: 'VOUTP', g: 'VOUTP', s: 'VDD', b: 'VDD' },
      { device: 'M5', d: 'VOUTN', g: 'VOUTP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 0.95, role: 'bias' },
      { name: 'V_VIP', plus: 'VIP', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_LP', plus: 'VDD', minus: 'VOUTP', dc: 0, role: 'bias' },
      { name: 'V_LN', plus: 'VDD', minus: 'VOUTN', dc: 0, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', outP: 'VOUTP', outN: 'VOUTN', tail: 'TAIL' },
    deviceRoles: { tail: 'M3', inP: 'M1', inN: 'M2' },
  },
};

const foldedDifferentialPair: Topology = {
  id: 'folded-differential-pair', name: 'Folded Differential Pair',
  description: 'NMOS differential pair with PMOS folded loads; folded nodes NFOLD1/NFOLD2 from drains to PMOS sources.',
  inputType: 'Differential input', deviceCount: 5,
  generator: {
    id: 'diff-pair-folded-v1', label: 'Diff_Pair_Folded_TotalW_V1_20260817.il',
    path: 'canonical/differential-pair/Diff_Pair_Folded_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Diff_Pair_Folded_TotalW_V1_20260817.md',
    invocation: 'CreateDiffPair_Folded_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-diffpair). Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3: NMOS tail', 'M4/M5: PMOS folded loads'],
  nets: ['VIP', 'VIN', 'NFOLD1', 'NFOLD2', 'TAIL', 'VDD', 'VSS', 'VBN_TAIL', 'VBP'],
  diagram: 'folded-differential-pair',
  contract: {
    placementProcedure: 'FDP_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'FDP_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'PMOS', placementProcedure: 'FDP_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-diffpair',
    devices: [
      { device: 'M1', d: 'NFOLD1', g: 'VIP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'NFOLD2', g: 'VIN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'TAIL', g: 'VBN_TAIL', s: 'VSS', b: 'VSS' },
      { device: 'M4', d: 'NFOLD1', g: 'VBP', s: 'VDD', b: 'VDD' },
      { device: 'M5', d: 'NFOLD2', g: 'VBP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 0.95, role: 'bias' },
      { name: 'V_VIP', plus: 'VIP', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_L1', plus: 'VDD', minus: 'NFOLD1', dc: 0, role: 'bias' },
      { name: 'V_L2', plus: 'VDD', minus: 'NFOLD2', dc: 0, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', outP: 'NFOLD1', outN: 'NFOLD2', tail: 'TAIL' },
    deviceRoles: { tail: 'M3', inP: 'M1', inN: 'M2' },
  },
};

const cascodeTailDifferentialPair: Topology = {
  id: 'cascode-tail-differential-pair', name: 'Diff Pair with Cascoded Tail',
  description: 'NMOS differential pair with a two-device NMOS cascode tail (M3/M4) for improved tail current source output impedance.',
  inputType: 'Differential input', deviceCount: 4,
  generator: {
    id: 'diff-pair-cascodetail-v1', label: 'Diff_Pair_CascodeTail_TotalW_V1_20260817.il',
    path: 'canonical/differential-pair/Diff_Pair_CascodeTail_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Diff_Pair_CascodeTail_TotalW_V1_20260817.md',
    invocation: 'CreateDiffPair_CascodeTail_TotalW_V1_20260817()',
    notes: 'Simulation-ready (dc-diffpair). Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3: NMOS tail cascode', 'M4: NMOS tail current source'],
  nets: ['VIP', 'VIN', 'VOUTP', 'VOUTN', 'TAIL', 'TAILN', 'VSS', 'VBN_TAIL', 'VBN_CAS'],
  diagram: 'cascode-tail-differential-pair',
  contract: {
    placementProcedure: 'DCT_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'dc-diffpair',
    devices: [
      { device: 'M1', d: 'VOUTP', g: 'VIP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'VOUTN', g: 'VIN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'TAILN', g: 'VBN_CAS', s: 'VSS', b: 'VSS' },
      { device: 'M4', d: 'TAIL', g: 'VBN_TAIL', s: 'TAILN', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VBN_CAS', plus: 'VBN_CAS', minus: 'VSS', dc: 0.9, role: 'bias' },
      { name: 'V_VIP', plus: 'VIP', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'supply' },
      { name: 'V_LP', plus: 'VDD', minus: 'VOUTP', dc: 0, role: 'bias' },
      { name: 'V_LN', plus: 'VDD', minus: 'VOUTN', dc: 0, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', outP: 'VOUTP', outN: 'VOUTN', tail: 'TAIL' },
    deviceRoles: { tail: 'M4', inP: 'M1', inN: 'M2' },
  },
};

/* ========================================================================
 * Amplifier topologies
 * ======================================================================== */

const commonSource: Topology = {
  id: 'common-source', name: 'Common-Source Amplifier',
  description: 'NMOS input device with PMOS current-source load; single-ended VOUT.',
  inputType: 'Voltage input', deviceCount: 2,
  generator: {
    id: 'common-source-totalw-v1', label: 'CommonSource_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/CommonSource_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_CommonSource_Amp_TotalW_V1_20260817.md',
    invocation: 'CreateCommonSource_NMOS_TotalW_V1_20260817()',
    notes: 'Bridge-run; schematic-gen verified; simulated with known gain spec failure (default bias outside high-gain region).'
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

const diodeLoadCommonSource: Topology = {
  id: 'diode-load-common-source', name: 'CS with Diode-Connected Load',
  description: 'NMOS input device with diode-connected PMOS load providing reduced gain but improved linearity.',
  inputType: 'Voltage input', deviceCount: 2,
  generator: {
    id: 'cs-diodeload-v1', label: 'CommonSource_DiodeLoad_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/CommonSource_DiodeLoad_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_CommonSource_DiodeLoad_TotalW_V1_20260817.md',
    invocation: 'CreateCommonSource_DiodeLoad_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: NMOS input device', 'M2: PMOS diode-connected load'],
  nets: ['VIN', 'VOUT', 'VDD', 'VSS'],
  diagram: 'diode-load-common-source',
  contract: {
    placementProcedure: 'CDL_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', placementProcedure: 'CDL_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'VOUT', g: 'VIN', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'VOUT', g: 'VOUT', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.62, role: 'input', input: { acMag: 1, pulse: { v0: 0.54, v1: 0.7, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
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
    notes: 'Bridge-run; best verified topology: gain -1.37 dB PASS, power PASS, slew 227 V/us PASS.'
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

const pmosSourceFollower: Topology = {
  id: 'pmos-source-follower', name: 'PMOS Source Follower',
  description: 'PMOS follower with PMOS current source load hung from VDD; buffered output at the source node.',
  inputType: 'Voltage input', deviceCount: 2,
  generator: {
    id: 'source-follower-pmos-v1', label: 'SourceFollower_PMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/SourceFollower_PMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Source_Follower_PMOS_TotalW_V1_20260817.md',
    invocation: 'CreateSourceFollower_PMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: PMOS follower device', 'M2: PMOS current source load'],
  nets: ['VIN', 'VOUT', 'VBP', 'VDD', 'VSS'],
  diagram: 'pmos-source-follower',
  contract: {
    placementProcedure: 'PSF_PlacePMOSAuto',
    devices: [
      { device: 'M1', type: 'PMOS', defaultSizing: { totalW: '8u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'VSS', g: 'VIN', s: 'VOUT', b: 'VDD' },
      { device: 'M2', d: 'VOUT', g: 'VBP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 1.0, role: 'input', input: { acMag: 1, pulse: { v0: 0.8, v1: 1.2, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const superSourceFollower: Topology = {
  id: 'super-source-follower', name: 'Super Source Follower',
  description: 'NMOS source follower with NMOS auxiliary level-shifter (M2) and PMOS current source (M4) for very low output impedance.',
  inputType: 'Voltage input', deviceCount: 4,
  generator: {
    id: 'source-follower-super-v1', label: 'SourceFollower_Super_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/SourceFollower_Super_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Source_Follower_Super_TotalW_V1_20260817.md',
    invocation: 'CreateSourceFollower_Super_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: NMOS main follower', 'M2: NMOS auxiliary level-shifter', 'M3: NMOS current sink', 'M4: PMOS current source'],
  nets: ['VIN', 'VOUT', 'VA', 'VBN', 'VBP', 'VDD', 'VSS'],
  diagram: 'super-source-follower',
  contract: {
    placementProcedure: 'SSF_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'SSF_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'VDD', g: 'VIN', s: 'VA', b: 'VSS' },
      { device: 'M2', d: 'VOUT', g: 'VA', s: 'VSS', b: 'VSS' },
      { device: 'M3', d: 'VA', g: 'VBN', s: 'VSS', b: 'VSS' },
      { device: 'M4', d: 'VOUT', g: 'VBP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 1.0, role: 'input', input: { acMag: 1, pulse: { v0: 0.8, v1: 1.2, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBN', plus: 'VBN', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 0.95, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const complementarySourceFollower: Topology = {
  id: 'complementary-source-follower', name: 'Complementary Source Follower',
  description: 'Complementary NMOS+PMOS source follower with both gates tied to VIN for rail-to-rail output swing.',
  inputType: 'Voltage input', deviceCount: 2,
  generator: {
    id: 'source-follower-complementary-v1', label: 'SourceFollower_Complementary_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/SourceFollower_Complementary_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Source_Follower_Complementary_TotalW_V1_20260817.md',
    invocation: 'CreateSourceFollower_Complementary_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: NMOS follower device', 'M2: PMOS follower device'],
  nets: ['VIN', 'VOUT', 'VDD', 'VSS'],
  diagram: 'complementary-source-follower',
  contract: {
    placementProcedure: 'CSB_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', placementProcedure: 'CSB_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'VDD', g: 'VIN', s: 'VOUT', b: 'VSS' },
      { device: 'M2', d: 'VSS', g: 'VIN', s: 'VOUT', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.5, v1: 1.0, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const cascodeAmplifier: Topology = {
  id: 'cascode-amplifier', name: 'Cascode Amplifier',
  description: 'NMOS input with NMOS cascode and PMOS current-source load; single-ended VOUT.',
  inputType: 'Voltage input', deviceCount: 3,
  generator: {
    id: 'cascode-amp-totalw-v1', label: 'CascodeAmp_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/CascodeAmp_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Cascode_Amp_TotalW_V1_20260817.md',
    invocation: 'CreateCascodeAmp_NMOS_TotalW_V1_20260817()',
    notes: 'Bridge-run; schematic-gen verified; simulated with known gain spec failure (default bias outside high-gain region).'
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

const pmosCascodeAmplifier: Topology = {
  id: 'pmos-cascode-amplifier', name: 'PMOS-Input Cascode Amplifier',
  description: 'PMOS input with PMOS cascode and NMOS current-source load; single-ended VOUT.',
  inputType: 'Voltage input', deviceCount: 3,
  generator: {
    id: 'cascode-amp-pmos-v1', label: 'CascodeAmp_PMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/CascodeAmp_PMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Cascode_Amp_PMOS_TotalW_V1_20260817.md',
    invocation: 'CreateCascodeAmp_PMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: PMOS input device', 'M2: PMOS cascode device', 'M3: NMOS current-source load'],
  nets: ['VIN', 'VOUT', 'PCAS', 'VBP_CAS', 'VBN', 'VDD', 'VSS'],
  diagram: 'pmos-cascode-amplifier',
  contract: {
    placementProcedure: 'PCA_PlacePMOSAuto',
    devices: [
      { device: 'M1', type: 'PMOS', defaultSizing: { totalW: '8u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'PCAS', g: 'VIN', s: 'VDD', b: 'VDD' },
      { device: 'M2', d: 'VOUT', g: 'VBP_CAS', s: 'PCAS', b: 'VDD' },
      { device: 'M3', d: 'VOUT', g: 'VBN', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.9, role: 'input', input: { acMag: 1, pulse: { v0: 0.8, v1: 1.0, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBP_CAS', plus: 'VBP_CAS', minus: 'VSS', dc: 0.5, role: 'bias' },
      { name: 'V_VBN', plus: 'VBN', minus: 'VSS', dc: 0.7, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const foldedCascodeAmplifier: Topology = {
  id: 'folded-cascode-amplifier', name: 'Folded Cascode Amplifier',
  description: 'NMOS input with folded cascode (PMOS top + NMOS cascode) and PMOS current source; single-ended VOUT.',
  inputType: 'Voltage input', deviceCount: 4,
  generator: {
    id: 'folded-cascode-amp-v1', label: 'FoldedCascodeAmp_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/FoldedCascodeAmp_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_FoldedCascode_Amp_TotalW_V1_20260817.md',
    invocation: 'CreateFoldedCascodeAmp_NMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: NMOS input device', 'M2: PMOS top load', 'M3: PMOS folded device', 'M4: NMOS cascode/sink'],
  nets: ['VIN', 'VOUT', 'NFOLD', 'VBP', 'VBP2', 'VBN', 'VDD', 'VSS'],
  diagram: 'folded-cascode-amplifier',
  contract: {
    placementProcedure: 'FCA_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', placementProcedure: 'FCA_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'FCA_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'NFOLD', g: 'VIN', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'NFOLD', g: 'VBP2', s: 'VDD', b: 'VDD' },
      { device: 'M3', d: 'VOUT', g: 'VBP', s: 'NFOLD', b: 'VDD' },
      { device: 'M4', d: 'VOUT', g: 'VBN', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.6, v1: 0.9, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 0.9, role: 'bias' },
      { name: 'V_VBP2', plus: 'VBP2', minus: 'VSS', dc: 1.2, role: 'bias' },
      { name: 'V_VBN', plus: 'VBN', minus: 'VSS', dc: 0.65, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const pmosFoldedCascodeAmplifier: Topology = {
  id: 'pmos-folded-cascode-amplifier', name: 'PMOS-Input Folded Cascode Amplifier',
  description: 'PMOS input with folded cascode (NMOS top + NMOS folded + PMOS load) for PMOS-input gain stage.',
  inputType: 'Voltage input', deviceCount: 4,
  generator: {
    id: 'folded-cascode-amp-pmos-v1', label: 'FoldedCascodeAmp_PMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/FoldedCascodeAmp_PMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_FoldedCascodeAmp_PMOS_TotalW_V1_20260817.md',
    invocation: 'CreateFoldedCascodeAmp_PMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: PMOS input device', 'M2: NMOS top/cascode', 'M3: NMOS folded device', 'M4: PMOS current-source load'],
  nets: ['VIN', 'VOUT', 'PFOLD', 'VBP', 'VBN', 'VBN2', 'VDD', 'VSS'],
  diagram: 'pmos-folded-cascode-amplifier',
  contract: {
    placementProcedure: 'PFA_PlacePMOSAuto',
    devices: [
      { device: 'M1', type: 'PMOS', defaultSizing: { totalW: '8u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'PFOLD', g: 'VIN', s: 'VDD', b: 'VDD' },
      { device: 'M2', d: 'VOUT', g: 'VBN', s: 'PFOLD', b: 'VSS' },
      { device: 'M3', d: 'PFOLD', g: 'VBN2', s: 'VSS', b: 'VSS' },
      { device: 'M4', d: 'VOUT', g: 'VBP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.9, role: 'input', input: { acMag: 1, pulse: { v0: 0.8, v1: 1.0, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VBN', plus: 'VBN', minus: 'VSS', dc: 0.7, role: 'bias' },
      { name: 'V_VBN2', plus: 'VBN2', minus: 'VSS', dc: 0.5, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const commonGateNmos: Topology = {
  id: 'common-gate-nmos', name: 'Common-Gate Amplifier',
  description: 'NMOS common-gate amplifier with PMOS current-source load; input at source terminal, output at drain.',
  inputType: 'Current/voltage input', deviceCount: 2,
  generator: {
    id: 'common-gate-nmos-v1', label: 'CommonGate_NMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/CommonGate_NMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_CommonGate_NMOS_TotalW_V1_20260817.md',
    invocation: 'CreateCommonGate_NMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: NMOS common-gate device', 'M2: PMOS current-source load'],
  nets: ['VIN', 'VOUT', 'VBN', 'VBP', 'VDD', 'VSS'],
  diagram: 'common-gate-nmos',
  contract: {
    placementProcedure: 'NCG_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', placementProcedure: 'NCG_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'VOUT', g: 'VBN', s: 'VIN', b: 'VSS' },
      { device: 'M2', d: 'VOUT', g: 'VBP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.6, v1: 0.9, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBN', plus: 'VBN', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 0.95, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const commonGatePmos: Topology = {
  id: 'common-gate-pmos', name: 'Common-Gate Amplifier (PMOS)',
  description: 'PMOS common-gate amplifier with NMOS current-source load; input at source terminal, output at drain.',
  inputType: 'Current/voltage input', deviceCount: 2,
  generator: {
    id: 'common-gate-pmos-v1', label: 'CommonGate_PMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/CommonGate_PMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_CommonGate_PMOS_TotalW_V1_20260817.md',
    invocation: 'CreateCommonGate_PMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: PMOS common-gate device', 'M2: NMOS current-source load'],
  nets: ['VIN', 'VOUT', 'VBP', 'VBN', 'VDD', 'VSS'],
  diagram: 'common-gate-pmos',
  contract: {
    placementProcedure: 'PCG_PlacePMOSAuto',
    devices: [
      { device: 'M1', type: 'PMOS', defaultSizing: { totalW: '8u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'VOUT', g: 'VBP', s: 'VIN', b: 'VDD' },
      { device: 'M2', d: 'VOUT', g: 'VBN', s: 'VSS', b: 'VSS' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.6, v1: 0.9, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 0.9, role: 'bias' },
      { name: 'V_VBN', plus: 'VBN', minus: 'VSS', dc: 0.7, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const inverterAmplifier: Topology = {
  id: 'inverter-amplifier', name: 'CMOS Inverter Amplifier',
  description: 'CMOS inverter as a single-stage amplifier; complementary NMOS+PMOS with common VIN and VOUT.',
  inputType: 'Voltage input', deviceCount: 2,
  generator: {
    id: 'inverter-amp-v1', label: 'Inverter_Amplifier_CMOS_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/Inverter_Amplifier_CMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Inverter_Amp_CMOS_TotalW_V1_20260817.md',
    invocation: 'CreateInverter_Amplifier_CMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: NMOS pull-down', 'M2: PMOS pull-up'],
  nets: ['VIN', 'VOUT', 'VDD', 'VSS'],
  diagram: 'inverter-amplifier',
  contract: {
    placementProcedure: 'CIA_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', placementProcedure: 'CIA_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'VOUT', g: 'VIN', s: 'VSS', b: 'VSS' },
      { device: 'M2', d: 'VOUT', g: 'VIN', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VIN', plus: 'VIN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.5, v1: 1.0, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const tiaCommonGate: Topology = {
  id: 'tia-common-gate', name: 'Common-Gate TIA',
  description: 'Common-gate transimpedance amplifier with NMOS input and PMOS diode-connected load; current input at source.',
  inputType: 'Current input', deviceCount: 2,
  generator: {
    id: 'tia-common-gate-v1', label: 'TIA_CommonGate_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/TIA_CommonGate_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_TIA_CommonGate_TotalW_V1_20260817.md',
    invocation: 'CreateTIA_CommonGate_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ac-amplifier). Schematic candidate only.'
  },
  devices: ['M1: NMOS common-gate device', 'M2: PMOS diode-connected load'],
  nets: ['IIN', 'VOUT', 'VBN', 'VDD', 'VSS'],
  diagram: 'tia-common-gate',
  contract: {
    placementProcedure: 'CGT_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', placementProcedure: 'CGT_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ac-amplifier',
    devices: [
      { device: 'M1', d: 'VOUT', g: 'VBN', s: 'IIN', b: 'VSS' },
      { device: 'M2', d: 'VOUT', g: 'VOUT', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_IIN', plus: 'IIN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.6, v1: 0.9, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VBN', plus: 'VBN', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const classABOutputStage: Topology = {
  id: 'class-ab-output-stage', name: 'Class-AB Output Stage',
  description: 'Push-pull Class-AB output stage with NMOS pull-down (M1) and PMOS pull-up (M2), driven by NMOS/PMOS bias pairs (M3/M4). Schematic only — needs large-signal transient.',
  inputType: 'Voltage input', deviceCount: 4,
  generator: {
    id: 'class-ab-v1', label: 'OutputStage_ClassAB_TotalW_V1_20260817.il',
    path: 'canonical/amplifier/OutputStage_ClassAB_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_OutputStage_ClassAB_TotalW_V1_20260817.md',
    invocation: 'CreateOutputStage_ClassAB_TotalW_V1_20260817()',
    notes: 'Schematic-only: requires large-signal transient simulation not yet supported. Schematic candidate only.'
  },
  devices: ['M3: NMOS diode bias (NB node)', 'M4: PMOS diode bias (NP node)', 'M1: NMOS pull-down output', 'M2: PMOS pull-up output'],
  nets: ['VOUT', 'NB', 'NP', 'VDD', 'VSS'],
  diagram: 'class-ab-output-stage',
  contract: {
    placementProcedure: 'CAB_PlaceMOS',
    devices: [
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '2u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'CAB_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '8u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'PMOS', placementProcedure: 'CAB_PlacePMOSAuto', defaultSizing: { totalW: '16u', L: '240n', NF: 1, M: 1 } },
    ],
  },
};

/* ========================================================================
 * Comparator topologies
 * ======================================================================== */

const cmosComparator: Topology = {
  id: 'cmos-comparator', name: 'CMOS Comparator',
  description: '5T OTA front-end with NMOS differential pair, PMOS mirror load, and NMOS common-source output stage. Simulation-ready with ota-ac-tran profile.',
  inputType: 'Differential input', deviceCount: 7,
  generator: {
    id: 'comparator-cmos-v1', label: 'Comparator_CMOS_TotalW_V1_20260817.il',
    path: 'canonical/comparator/Comparator_CMOS_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Comparator_CMOS_TotalW_V1_20260817.md',
    invocation: 'CreateComparator_CMOS_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ota-ac-tran). Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3/M4: PMOS current-mirror load', 'M5: NMOS tail', 'M6: NMOS output stage', 'M7: PMOS output load'],
  nets: ['VINP', 'VINN', 'MIRROR', 'VOUT', 'TAIL', 'VDD', 'VSS', 'VBN_TAIL'],
  diagram: 'cmos-comparator',
  contract: {
    placementProcedure: 'CMP_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'CMP_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'CMP_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M6', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M7', type: 'PMOS', placementProcedure: 'CMP_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '240n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ota-ac-tran',
    devices: [
      { device: 'M1', d: 'MIRROR', g: 'VINP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'VOUTN', g: 'VINN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'MIRROR', g: 'MIRROR', s: 'VDD', b: 'VDD' },
      { device: 'M4', d: 'VOUTN', g: 'MIRROR', s: 'VDD', b: 'VDD' },
      { device: 'M5', d: 'TAIL', g: 'VBN_TAIL', s: 'VSS', b: 'VSS' },
      { device: 'M6', d: 'VOUT', g: 'MIRROR', s: 'VSS', b: 'VSS' },
      { device: 'M7', d: 'VOUT', g: 'MIRROR', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VINP', plus: 'VINP', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.6, v1: 0.9, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VINN', plus: 'VINN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 0 } },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const twoStageComparator: Topology = {
  id: 'two-stage-comparator', name: 'Two-Stage Comparator',
  description: '5T OTA front-end with larger second-stage gain; NMOS input pair, PMOS mirror, and CS output with PMOS load.',
  inputType: 'Differential input', deviceCount: 7,
  generator: {
    id: 'comparator-two-stage-v1', label: 'Comparator_TwoStage_TotalW_V1_20260817.il',
    path: 'canonical/comparator/Comparator_TwoStage_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Comparator_TwoStage_TotalW_V1_20260817.md',
    invocation: 'CreateComparator_TwoStage_TotalW_V1_20260817()',
    notes: 'Simulation-ready (ota-ac-tran). Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3/M4: PMOS current-mirror load', 'M5: NMOS tail', 'M6: NMOS second stage', 'M7: PMOS second-stage load'],
  nets: ['VINP', 'VINN', 'MIRROR', 'VOUT', 'TAIL', 'VDD', 'VSS', 'VBN_TAIL', 'VBP'],
  diagram: 'two-stage-comparator',
  contract: {
    placementProcedure: 'TSC_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'TSC_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'TSC_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M6', type: 'NMOS', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M7', type: 'PMOS', placementProcedure: 'TSC_PlacePMOSAuto', defaultSizing: { totalW: '8u', L: '480n', NF: 1, M: 1 } },
    ],
  },
  simulation: {
    profile: 'ota-ac-tran',
    devices: [
      { device: 'M1', d: 'MIRROR', g: 'VINP', s: 'TAIL', b: 'VSS' },
      { device: 'M2', d: 'VOUTN', g: 'VINN', s: 'TAIL', b: 'VSS' },
      { device: 'M3', d: 'MIRROR', g: 'MIRROR', s: 'VDD', b: 'VDD' },
      { device: 'M4', d: 'VOUTN', g: 'MIRROR', s: 'VDD', b: 'VDD' },
      { device: 'M5', d: 'TAIL', g: 'VBN_TAIL', s: 'VSS', b: 'VSS' },
      { device: 'M6', d: 'VOUT', g: 'MIRROR', s: 'VSS', b: 'VSS' },
      { device: 'M7', d: 'VOUT', g: 'VBP', s: 'VDD', b: 'VDD' },
    ],
    sources: [
      { name: 'V_VDD', plus: 'VDD', minus: 'VSS', dc: 1.5, role: 'supply' },
      { name: 'V_VSS', plus: 'VSS', minus: 'VSS', dc: 0, role: 'supply' },
      { name: 'V_VBN_TAIL', plus: 'VBN_TAIL', minus: 'VSS', dc: 0.6, role: 'bias' },
      { name: 'V_VBP', plus: 'VBP', minus: 'VSS', dc: 0.95, role: 'bias' },
      { name: 'V_VINP', plus: 'VINP', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 1, pulse: { v0: 0.6, v1: 0.9, rise: '1n', width: '2u', period: '4u' } } },
      { name: 'V_VINN', plus: 'VINN', minus: 'VSS', dc: 0.75, role: 'input', input: { acMag: 0 } },
    ],
    nodes: { ground: 'VSS', out: 'VOUT' },
    load: { node: 'VOUT', c: '1p' },
    tranStop: '4u',
  },
};

const strongarmComparator: Topology = {
  id: 'strongarm-comparator', name: 'StrongARM Latch Comparator',
  description: 'Clocked StrongARM latch comparator with NMOS input pair, cross-coupled NMOS/PMOS latches, and clocked tail switch. Schematic only — needs clocked transient.',
  inputType: 'Differential input', deviceCount: 7,
  generator: {
    id: 'comparator-strongarm-v1', label: 'Comparator_StrongARM_TotalW_V1_20260817.il',
    path: 'canonical/comparator/Comparator_StrongARM_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_Comparator_StrongARM_TotalW_V1_20260817.md',
    invocation: 'CreateComparator_StrongARM_TotalW_V1_20260817()',
    notes: 'Schematic-only (DYNAMIC): requires clocked transient simulation not yet supported. Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3/M4: NMOS cross-coupled latch', 'M5: NMOS clocked tail switch', 'M6/M7: PMOS clocked reset pairs'],
  nets: ['VINP', 'VINN', 'CLK', 'TAIL', 'VDD', 'VSS'],
  diagram: 'strongarm-comparator',
  contract: {
    placementProcedure: 'SAC_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M4', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
      { device: 'M6', type: 'PMOS', placementProcedure: 'SAC_PlacePMOSAuto', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M7', type: 'PMOS', placementProcedure: 'SAC_PlacePMOSAuto', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
    ],
  },
};

/* ========================================================================
 * gm-C topology
 * ======================================================================== */

const gmcIntegrator: Topology = {
  id: 'gmc-integrator', name: 'gm-C Integrator',
  description: '5T OTA-like front-end with gm-C integration capacitor. Schematic only — integration capacitor not yet netlistable.',
  inputType: 'NMOS differential input', deviceCount: 5,
  generator: {
    id: 'gmc-integrator-v1', label: 'GmC_Integrator_TotalW_V1_20260817.il',
    path: 'canonical/gm-c/GmC_Integrator_TotalW_V1_20260817.il', status: 'candidate',
    runbook: 'runbooks/RUN_GmC_Integrator_TotalW_V1_20260817.md',
    invocation: 'CreateGmC_Integrator_TotalW_V1_20260817()',
    notes: 'Schematic-only: integration capacitor cannot be netlisted by the current simulation infrastructure. Schematic candidate only.'
  },
  devices: ['M1/M2: NMOS differential input pair', 'M3/M4: PMOS current-mirror load', 'M5: NMOS tail'],
  nets: ['VINP', 'VINN', 'MIRROR', 'VOUT', 'TAIL', 'VDD', 'VSS', 'VBN_TAIL'],
  diagram: 'gmc-integrator',
  contract: {
    placementProcedure: 'GMC_PlaceMOS',
    devices: [
      { device: 'M1', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M2', type: 'NMOS', defaultSizing: { totalW: '2u', L: '240n', NF: 1, M: 1 } },
      { device: 'M3', type: 'PMOS', placementProcedure: 'GMC_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M4', type: 'PMOS', placementProcedure: 'GMC_PlacePMOSAuto', defaultSizing: { totalW: '4u', L: '480n', NF: 1, M: 1 } },
      { device: 'M5', type: 'NMOS', defaultSizing: { totalW: '6u', L: '480n', NF: 1, M: 1 } },
    ],
  },
};

/* ========================================================================
 * Specification groups per circuit family
 * ======================================================================== */

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

const comparatorSpecGroups: SpecGroup[] = [
  {
    name: 'Decision performance',
    specs: [
      { key: 'gain', label: 'Preamp Gain', enabled: true, target: 40, unit: 'dB', operator: '>=' },
      { key: 'offset', label: 'Input Offset', enabled: true, target: 5, unit: 'mV', operator: '<=' },
      { key: 'power', label: 'Power', enabled: true, target: 2, unit: 'mW', operator: '<=' },
    ],
  },
  {
    name: 'Advanced',
    specs: [
      { key: 'decisionTime', label: 'Decision Time', enabled: false, target: 10, unit: 'ns', operator: '<=' },
      { key: 'sensitivity', label: 'Sensitivity', enabled: false, target: 0.1, unit: 'mV', operator: '<=' },
    ],
  },
];

const gmcSpecGroups: SpecGroup[] = [
  {
    name: 'gm-C performance',
    specs: [
      { key: 'gm', label: 'Transconductance', enabled: true, target: 2, unit: 'mS', operator: '>=' },
      { key: 'gain', label: 'DC Gain', enabled: true, target: 40, unit: 'dB', operator: '>=' },
      { key: 'power', label: 'Power', enabled: true, target: 2, unit: 'mW', operator: '<=' },
    ],
  },
];

/* ========================================================================
 * Circuit registry — the authoritative circuit family list
 * ======================================================================== */

export const circuits: Circuit[] = [
  { id: 'ota', name: 'OTA', description: 'Operational Transconductance Amplifier', status: 'available', topologies: [fiveT, telescopic, folded, twoStageMillerOta, symmetricalOta, threeStageOta, currentMirrorOta, fullyDiffFoldedCascodeOta], specGroups: otaSpecGroups },
  { id: 'current-mirror', name: 'Current Mirror', description: 'Bias and current generation', status: 'available', topologies: [simpleCurrentMirror, cascodeCurrentMirror, pmosCurrentMirror, cascodePmosCurrentMirror, wilsonCurrentMirror, regulatedCascodeMirror, wideSwingCascodeMirror, dualOutputCurrentMirror, complementaryCurrentMirror, cascodeCurrentSourceNmos, cascodeCurrentSourcePmos, cascodeBiasStack], specGroups: currentMirrorSpecGroups },
  { id: 'differential-pair', name: 'Differential Pair', description: 'Input differential stage', status: 'available', topologies: [differentialPair, pmosDifferentialPair, pmosLoadDifferentialPair, foldedDifferentialPair, cascodeTailDifferentialPair], specGroups: differentialPairSpecGroups },
  { id: 'amplifier', name: 'Amplifier', description: 'Single-stage voltage amplifiers', status: 'available', topologies: [commonSource, diodeLoadCommonSource, sourceFollower, pmosSourceFollower, superSourceFollower, complementarySourceFollower, cascodeAmplifier, pmosCascodeAmplifier, foldedCascodeAmplifier, pmosFoldedCascodeAmplifier, commonGateNmos, commonGatePmos, inverterAmplifier, tiaCommonGate, classABOutputStage], specGroups: amplifierSpecGroups },
  { id: 'comparator', name: 'Comparator', description: 'Decision circuit', status: 'available', topologies: [cmosComparator, twoStageComparator, strongarmComparator], specGroups: comparatorSpecGroups },
  { id: 'gm-c', name: 'gm-C', description: 'Transconductance-capacitance filter', status: 'available', topologies: [gmcIntegrator], specGroups: gmcSpecGroups },
  { id: 'bandgap', name: 'Bandgap Reference', description: 'Precision voltage reference', status: 'coming-soon', topologies: [] },
  { id: 'ldo', name: 'LDO', description: 'Low-dropout regulator', status: 'coming-soon', topologies: [] },
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
