/**
 * Generator contracts — validation logic plus derivation from the repository
 * registry. All topology metadata (generator entry, devices, placement
 * procedures) is owned by repository-registry.ts; this module derives
 * contracts from it so the two can never drift.
 */

import type { DesignConfig } from './validation';
import { circuits, technologies, type ContractDevice, type GeneratorEntry, type Topology } from './repository-registry';

export type GeneratorDeviceContract = ContractDevice;

export type GeneratorContract = {
  topologyId: string;
  technologyId: string;
  source: GeneratorEntry;
  placementProcedure: string;
  devices: GeneratorDeviceContract[];
  parameterFields: readonly ['TotalW', 'L', 'NF', 'M'];
  derivations: { wPerFinger: 'TotalW / NF'; totalM: 'NF * M' };
};

const SUPPORTED_TECHNOLOGY_IDS = technologies.map((technology) => technology.id);
const DEFAULT_TECHNOLOGY_ID = SUPPORTED_TECHNOLOGY_IDS[0] ?? '';

function buildContract(topology: Topology): GeneratorContract {
  return {
    topologyId: topology.id,
    technologyId: DEFAULT_TECHNOLOGY_ID,
    source: topology.generator,
    placementProcedure: topology.contract.placementProcedure,
    devices: topology.contract.devices,
    parameterFields: ['TotalW', 'L', 'NF', 'M'],
    derivations: { wPerFinger: 'TotalW / NF', totalM: 'NF * M' },
  };
}

export const generatorContracts: Record<string, GeneratorContract> = Object.fromEntries(
  circuits.flatMap((circuit) => circuit.topologies.map((topology) => [topology.id, buildContract(topology)])),
);

export function getGeneratorContract(topologyId: string, technologyId: string): GeneratorContract {
  const result = generatorContracts[topologyId];
  if (!result) throw new Error(`No parameterized generator contract for topology: ${topologyId}`);
  if (result.technologyId !== technologyId || !SUPPORTED_TECHNOLOGY_IDS.includes(technologyId)) {
    throw new Error(`Topology ${topologyId} is not supported on technology ${technologyId}`);
  }
  return result;
}

function isSafeScalar(value: string) {
  return /^(?:\d+(?:\.\d+)?|\.\d+)(?:[fpnumkMGT])?$/.test(value.trim());
}

export function validateContractConfig(config: DesignConfig, contract: GeneratorContract): void {
  if (config.topologyId !== contract.topologyId) throw new Error('Design topology does not match the generator contract.');
  if (config.technologyId !== contract.technologyId) throw new Error('Design technology does not match the generator contract.');
  const expected = new Map(contract.devices.map((d) => [d.device, d.type]));
  if (config.devices.length !== contract.devices.length) throw new Error(`Expected ${contract.devices.length} devices; received ${config.devices.length}.`);
  const seen = new Set<string>();
  for (const device of config.devices) {
    if (!expected.has(device.device)) throw new Error(`Unsupported device in ${contract.topologyId}: ${device.device}`);
    if (seen.has(device.device)) throw new Error(`Duplicate device in ${contract.topologyId}: ${device.device}`);
    seen.add(device.device);
    if (!device.totalW.trim() || !isSafeScalar(device.totalW)) throw new Error(`${device.device} has an invalid TotalW scalar.`);
    if (!device.L.trim() || !isSafeScalar(device.L)) throw new Error(`${device.device} has an invalid L scalar.`);
    if (!Number.isInteger(device.NF) || device.NF < 1) throw new Error(`${device.device} requires integer NF >= 1.`);
    if (!Number.isInteger(device.M) || device.M < 1) throw new Error(`${device.device} requires integer M >= 1.`);
  }
  if (seen.size !== expected.size) throw new Error('The design configuration is missing one or more contract devices.');
}

export function deriveMosState(totalW: string, nf: number, m: number) {
  if (!Number.isInteger(nf) || nf < 1) throw new Error('NF must be an integer >= 1.');
  if (!Number.isInteger(m) || m < 1) throw new Error('M must be an integer >= 1.');
  if (!isSafeScalar(totalW)) throw new Error('TotalW must be a simple Cadence scalar such as 8u or 0.5u.');
  return { totalW: totalW.trim(), nf, m, wPerFingerExpression: `(${totalW.trim()})/${nf}`, totalM: nf * m };
}
