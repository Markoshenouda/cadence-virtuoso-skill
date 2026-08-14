import type { DesignConfig } from './validation';
import type { GeneratorEntry } from './repository-registry';

export type GeneratorDeviceContract = {
  device: string;
  type: 'NMOS' | 'PMOS';
  placementProcedure?: string;
};

export type GeneratorContract = {
  topologyId: string;
  technologyId: string;
  source: GeneratorEntry;
  placementProcedure: string;
  devices: GeneratorDeviceContract[];
  parameterFields: readonly ['TotalW', 'L', 'NF', 'M'];
  derivations: { wPerFinger: 'TotalW / NF'; totalM: 'NF * M' };
};

const contract = (
  topologyId: string,
  source: GeneratorEntry,
  placementProcedure: string,
  devices: GeneratorDeviceContract[],
): GeneratorContract => ({
  topologyId,
  technologyId: 'tsmcN65',
  source,
  placementProcedure,
  devices,
  parameterFields: ['TotalW', 'L', 'NF', 'M'],
  derivations: { wPerFinger: 'TotalW / NF', totalM: 'NF * M' },
});

export const generatorContracts: Record<string, GeneratorContract> = {
  '5t-ota': contract(
    '5t-ota',
    {
      id: '5t-totalw-v2',
      label: '5T_OTA_PMOS_TOTALW_V2_20260812.il',
      path: 'canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il',
      status: 'candidate',
      runbook: 'runbooks/RUN_5T_OTA_TOTALW_V2_20260812.md',
      invocation: 'Create5TOTA_PMOS_TOTALW_V2_20260812()',
    },
    'T5TW_Place',
    [
      { device: 'M1', type: 'NMOS' },
      { device: 'M2', type: 'NMOS' },
      { device: 'M3', type: 'PMOS', placementProcedure: 'T5TW_PlaceVerifiedPMOS' },
      { device: 'M4', type: 'PMOS', placementProcedure: 'T5TW_PlaceVerifiedPMOS' },
      { device: 'M5', type: 'NMOS' },
    ],
  ),
  'telescopic-ota': contract(
    'telescopic-ota',
    {
      id: 'telescopic-v8',
      label: 'Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il',
      path: 'canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il',
      status: 'candidate',
      runbook: 'runbooks/RUN_telescopic_ota_v8_20260813.md',
      invocation: 'CreateTelescopicOTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813()',
    },
    'TOTA8_PlaceMOS',
    [
      { device: 'M1', type: 'NMOS' },
      { device: 'M2', type: 'NMOS' },
      { device: 'M3', type: 'NMOS' },
      { device: 'M4', type: 'NMOS' },
      { device: 'M5', type: 'PMOS' },
      { device: 'M6', type: 'PMOS' },
      { device: 'M7', type: 'PMOS' },
      { device: 'M8', type: 'PMOS' },
      { device: 'M9', type: 'NMOS' },
    ],
  ),
  'folded-cascode-ota': contract(
    'folded-cascode-ota',
    {
      id: 'folded-totalw-v1',
      label: 'Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il',
      path: 'canonical/folded-cascode-ota/Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il',
      status: 'candidate',
      runbook: 'runbooks/RUN_Folded_Cascode_OTA_TotalW_V1_20260814.md',
      invocation: 'CreateFoldedCascodeOTA_NMOS_TotalW_V1_20260814()',
    },
    'FCW_PlaceMOS',
    [
      { device: 'M1', type: 'NMOS' },
      { device: 'M2', type: 'NMOS' },
      { device: 'M3', type: 'PMOS' },
      { device: 'M4', type: 'PMOS' },
      { device: 'M5', type: 'PMOS' },
      { device: 'M6', type: 'PMOS' },
      { device: 'M7', type: 'NMOS' },
      { device: 'M8', type: 'NMOS' },
      { device: 'M9', type: 'NMOS' },
      { device: 'M10', type: 'NMOS' },
      { device: 'M11', type: 'NMOS' },
    ],
  ),
};

export function getGeneratorContract(topologyId: string, technologyId: string): GeneratorContract {
  const result = generatorContracts[topologyId];
  if (!result) throw new Error(`No parameterized generator contract for topology: ${topologyId}`);
  if (result.technologyId !== technologyId) throw new Error(`Topology ${topologyId} is not supported on technology ${technologyId}`);
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
