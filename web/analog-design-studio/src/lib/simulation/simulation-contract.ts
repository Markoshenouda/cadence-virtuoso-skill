/**
 * Simulation contracts - registry-driven description of how a topology is
 * electrically verified. Topology-specific data (netlist connectivity,
 * sources, node roles) lives in the repository registry; reusable analysis
 * and measurement strategies live here as profiles. The simulation engine
 * consumes resolved contracts and never switches on topology ids.
 */

import { circuits, getTopology, type Topology } from '../repository-registry';

/** One MOS instance wired into the simulation netlist (net names). */
export type SimDeviceNet = { device: string; d: string; g: string; s: string; b: string };

/** Independent source: supply, bias, or input stimulus. */
export type SimSource = {
  name: string;
  plus: string;
  minus: string;
  dc: number;
  role?: 'supply' | 'bias' | 'input';
  input?: { acMag: number; pulse?: { v0: number; v1: number; rise: string; width: string; period: string } };
};

/** Node roles used by measurement definitions. */
export type SimNodeRoles = { ground: string; out?: string; outP?: string; outN?: string; ref?: string; tail?: string };

/** Registry-declared simulation metadata attached to each topology. */
export type TopologySimulation = {
  profile: string;
  devices: SimDeviceNet[];
  sources: SimSource[];
  nodes: SimNodeRoles;
  /** Roles of specific devices for current measurements. */
  deviceRoles?: { ref?: string; out?: string; tail?: string; inP?: string; inN?: string };
  load?: { node: string; c: string };
  tranStop?: string;
};

export type AnalysisKind = 'dc' | 'ac' | 'tran';

export type MeasurementKind =
  | 'current'       // |I(device:d)| from DC
  | 'ratio'         // |I(out:d)| / |I(ref:d)| from DC
  | 'node-dc'       // DC node voltage by role
  | 'power'         // sum of supply |V*i| from DC
  | 'gain-db'       // max |v(out)|/|v(in)| in dB from AC
  | 'gbw'           // unity-gain frequency from AC
  | 'phase-margin'  // phase margin in degrees from AC
  | 'slew-rate';    // max |dv/dt| of the output from TRAN

export type MeasurementDefinition = {
  id: string;
  kind: MeasurementKind;
  analysis: AnalysisKind;
  unit: string;
  nodeRole?: string;
  deviceRole?: string;
};

export type SimulationProfile = {
  id: string;
  analyses: Array<{ kind: AnalysisKind; name: string }>;
  measurements: MeasurementDefinition[];
};

export const simulationProfiles: Record<string, SimulationProfile> = {
  'dc-mirror': {
    id: 'dc-mirror',
    analyses: [{ kind: 'dc', name: 'dcop' }],
    measurements: [
      { id: 'iref', kind: 'current', analysis: 'dc', unit: 'A', deviceRole: 'ref' },
      { id: 'iout', kind: 'current', analysis: 'dc', unit: 'A', deviceRole: 'out' },
      { id: 'ratio', kind: 'ratio', analysis: 'dc', unit: '' },
      { id: 'vref', kind: 'node-dc', analysis: 'dc', unit: 'V', nodeRole: 'ref' },
      { id: 'vout', kind: 'node-dc', analysis: 'dc', unit: 'V', nodeRole: 'out' },
    ],
  },
  'dc-diffpair': {
    id: 'dc-diffpair',
    analyses: [{ kind: 'dc', name: 'dcop' }],
    measurements: [
      { id: 'tailCurrent', kind: 'current', analysis: 'dc', unit: 'A', deviceRole: 'tail' },
      { id: 'idp', kind: 'current', analysis: 'dc', unit: 'A', deviceRole: 'inP' },
      { id: 'idn', kind: 'current', analysis: 'dc', unit: 'A', deviceRole: 'inN' },
      { id: 'voutp', kind: 'node-dc', analysis: 'dc', unit: 'V', nodeRole: 'outP' },
      { id: 'voutn', kind: 'node-dc', analysis: 'dc', unit: 'V', nodeRole: 'outN' },
    ],
  },
  'ac-amplifier': {
    id: 'ac-amplifier',
    analyses: [
      { kind: 'dc', name: 'dcop' },
      { kind: 'ac', name: 'ac1' },
      { kind: 'tran', name: 'tran1' },
    ],
    measurements: [
      { id: 'power', kind: 'power', analysis: 'dc', unit: 'W' },
      { id: 'gain', kind: 'gain-db', analysis: 'ac', unit: 'dB' },
      { id: 'gbw', kind: 'gbw', analysis: 'ac', unit: 'Hz' },
      { id: 'phaseMargin', kind: 'phase-margin', analysis: 'ac', unit: 'deg' },
      { id: 'slewRate', kind: 'slew-rate', analysis: 'tran', unit: 'V/s' },
    ],
  },
  'ota-ac-tran': {
    id: 'ota-ac-tran',
    analyses: [
      { kind: 'dc', name: 'dcop' },
      { kind: 'ac', name: 'ac1' },
      { kind: 'tran', name: 'tran1' },
    ],
    measurements: [
      { id: 'power', kind: 'power', analysis: 'dc', unit: 'W' },
      { id: 'gain', kind: 'gain-db', analysis: 'ac', unit: 'dB' },
      { id: 'gbw', kind: 'gbw', analysis: 'ac', unit: 'Hz' },
      { id: 'phaseMargin', kind: 'phase-margin', analysis: 'ac', unit: 'deg' },
      { id: 'slewRate', kind: 'slew-rate', analysis: 'tran', unit: 'V/s' },
    ],
  },
};

export type SimulationContract = {
  topologyId: string;
  technologyId: string;
  profile: SimulationProfile;
  simulation: TopologySimulation;
  sourceTopology: Topology;
};

export function getSimulationContract(topologyId: string, technologyId: string): SimulationContract {
  for (const circuit of circuits) {
    for (const topology of circuit.topologies) {
      if (topology.id !== topologyId) continue;
      const simulation = topology.simulation;
      if (!simulation) throw new Error(`Topology ${topologyId} does not declare simulation metadata.`);
      const profile = simulationProfiles[simulation.profile];
      if (!profile) throw new Error(`Unknown simulation profile: ${simulation.profile}`);
      return { topologyId, technologyId, profile, simulation, sourceTopology: topology };
    }
  }
  throw new Error(`No topology registered for simulation: ${topologyId}`);
}
