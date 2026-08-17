import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultSpecsFor } from '@/lib/repository-registry';
import type { DesignConfig } from '@/lib/validation';
import { deriveMosState, generatorContracts, getGeneratorContract, validateContractConfig } from '@/lib/generator-contract';
import { generateParameterizedArtifact, parameterizeCanonicalGenerator } from '@/lib/generator-adapter';
import { repositoryRoot } from '@/lib/repository-root';

const defaultSpecs = defaultSpecsFor('ota');

const base = (topologyId: DesignConfig['topologyId'], devices: DesignConfig['devices']): DesignConfig => ({
  circuitId: 'ota', topologyId, technologyId: 'tsmcN65', vdd: 1.2, temperature: 27, corner: 'TT', specs: defaultSpecs, sizingMethod: 'manual', devices,
});
const devices = (entries: Array<[string, 'NMOS' | 'PMOS', string, string, number, number]>): DesignConfig['devices'] => entries.map(([device, type, totalW, L, NF, M]) => ({ device, type, totalW, L, NF, M }));
const d5t = devices([
  ['M1','NMOS','10u','300n',2,2], ['M2','NMOS','12u','320n',3,1], ['M3','PMOS','8u','600n',2,1], ['M4','PMOS','10u','600n',5,2], ['M5','NMOS','14u','700n',7,1],
]);
const dTel = devices([
  ['M1','NMOS','11u','900n',2,1], ['M2','NMOS','12u','900n',3,2], ['M3','NMOS','13u','900n',4,1], ['M4','NMOS','14u','900n',2,3], ['M5','PMOS','15u','1u',3,1], ['M6','PMOS','16u','1u',4,2], ['M7','PMOS','17u','1u',5,1], ['M8','PMOS','18u','1u',6,2], ['M9','NMOS','19u','1u',7,1],
]);
const dFolded = devices([
  ['M1','NMOS','21u','500n',2,1], ['M2','NMOS','22u','500n',3,2], ['M3','PMOS','23u','900n',2,1], ['M4','PMOS','24u','900n',3,1], ['M5','PMOS','25u','1u',4,2], ['M6','PMOS','26u','1u',5,1], ['M7','NMOS','27u','1u',2,3], ['M8','NMOS','28u','1u',3,1], ['M9','NMOS','29u','1u',4,2], ['M10','NMOS','30u','1u',5,1], ['M11','NMOS','31u','1u',6,2],
]);
const dMirror = devices([
  ['M1','NMOS','5u','360n',2,1], ['M2','NMOS','10u','360n',4,1],
]);
const mirrorBase: DesignConfig = {
  circuitId: 'current-mirror', topologyId: 'simple-current-mirror', technologyId: 'tsmcN65', vdd: 1.2, temperature: 27, corner: 'TT', specs: {}, sizingMethod: 'manual', devices: dMirror,
};

type BatchSpec = {
  topologyId: string;
  circuitId: string;
  devices: Array<[string, 'NMOS' | 'PMOS', string, string, number, number]>;
  expect: string[];
  absent?: string[];
};
const batchTopologies: BatchSpec[] = [
  { topologyId: 'differential-pair-nmos', circuitId: 'differential-pair',
    devices: [['M1','NMOS','5u','360n',2,1],['M2','NMOS','6u','360n',3,1],['M3','NMOS','8u','700n',2,1]],
    expect: ['CDP_PlaceMOS(cv nmos "M1" -3:0 "5u" "360n" "2" "1" "R0")', 'CDP_PlaceMOS(cv nmos "M3" 0:-6 "8u" "700n" "2" "1" "R0")', 'CDP_LabelMOSTerminal(cv M1 "G" "VIP")'],
    absent: ['CDP_PlaceMOS(cv nmos "M1" -3:0 "4u" "240n" "1" "1" "R0")'] },
  { topologyId: 'common-source', circuitId: 'amplifier',
    devices: [['M1','NMOS','5u','360n',2,1],['M2','PMOS','12u','600n',4,2]],
    expect: ['CCS_PlaceMOS(cv nmos "M1" 0:0 "5u" "360n" "2" "1" "R0")', 'CCS_PlacePMOSAuto(cv pmos "M2" 0:6 "12u" "600n" "4" "2")', 'CCS_LabelMOSTerminal(cv M2 "S" "VDD")'],
    absent: ['CCS_PlaceMOS(cv nmos "M1" 0:0 "4u" "240n" "1" "1" "R0")'] },
  { topologyId: 'source-follower', circuitId: 'amplifier',
    devices: [['M1','NMOS','5u','360n',2,1],['M2','NMOS','9u','700n',3,1]],
    expect: ['CSF_PlaceMOS(cv nmos "M1" 0:3 "5u" "360n" "2" "1" "R0")', 'CSF_PlaceMOS(cv nmos "M2" 0:-3 "9u" "700n" "3" "1" "R0")'],
    absent: ['CSF_PlaceMOS(cv nmos "M1" 0:3 "4u" "240n" "1" "1" "R0")'] },
  { topologyId: 'cascode-amplifier', circuitId: 'amplifier',
    devices: [['M1','NMOS','5u','360n',2,1],['M2','NMOS','6u','500n',2,1],['M3','PMOS','12u','600n',4,2]],
    expect: ['CCA_PlaceMOS(cv nmos "M2" 0:3 "6u" "500n" "2" "1" "R0")', 'CCA_PlacePMOSAuto(cv pmos "M3" 0:9 "12u" "600n" "4" "2")'],
    absent: ['CCA_PlaceMOS(cv nmos "M1" 0:-3 "4u" "240n" "1" "1" "R0")'] },
  { topologyId: 'cascode-current-mirror', circuitId: 'current-mirror',
    devices: [['M1','NMOS','5u','360n',2,1],['M2','NMOS','6u','360n',3,1],['M3','NMOS','7u','500n',2,1],['M4','NMOS','8u','500n',4,1]],
    expect: ['CCM_PlaceMOS(cv nmos "M1" 0:-3 "5u" "360n" "2" "1" "R0")', 'CCM_PlaceMOS(cv nmos "M4" 6:3 "8u" "500n" "4" "1" "R0")', 'CCM_LabelMOSTerminal(cv M1 "D" "NB")'],
    absent: ['CCM_PlaceMOS(cv nmos "M1" 0:-3 "4u" "480n" "1" "1" "R0")'] },
  { topologyId: 'pmos-current-mirror', circuitId: 'current-mirror',
    devices: [['M1','PMOS','9u','500n',2,1],['M2','PMOS','14u','500n',4,1]],
    expect: ['CPM_PlacePMOSAuto(cv pmos "M1" -3:0 "9u" "500n" "2" "1")', 'CPM_PlacePMOSAuto(cv pmos "M2" 3:0 "14u" "500n" "4" "1")', 'CPM_LabelMOSTerminal(cv M2 "D" "IOUT")'],
    absent: ['CPM_PlacePMOSAuto(cv pmos "M1" -3:0 "8u" "480n" "1" "1")'] },
];

describe('Phase 3 generator contracts', () => {
  it('derives a contract for every registered topology, sourced from the registry', () => {
    for (const [topologyId, contract] of Object.entries(generatorContracts)) {
      expect(contract.source.path, topologyId).toBeTruthy();
      expect(contract.devices.length, topologyId).toBeGreaterThan(0);
      expect(contract.technologyId, topologyId).toBeTruthy();
    }
    expect(generatorContracts['folded-cascode-ota'].source.status).toBe('verified');
    expect(generatorContracts['folded-cascode-ota'].devices.slice(2, 6).every(d => d.type === 'PMOS')).toBe(true);
    expect(generatorContracts['folded-cascode-ota'].devices.slice(2, 6).every(d => d.placementProcedure === 'FCW_PlacePMOSAuto')).toBe(true);
    expect(() => getGeneratorContract('not-a-topology', 'tsmcN65')).toThrow(/No parameterized generator contract/);
    expect(() => getGeneratorContract('5t-ota', 'gpdk45')).toThrow(/not supported on technology/);
  });
  it('derives W/finger and totalM from the design-level contract', () => {
    expect(deriveMosState('10u', 4, 3)).toEqual({ totalW: '10u', nf: 4, m: 3, wPerFingerExpression: '(10u)/4', totalM: 12 });
  });
  it('rejects wrong device count and unsafe scalar input before touching source', () => {
    const contract = getGeneratorContract('folded-cascode-ota', 'tsmcN65');
    expect(() => validateContractConfig(base('folded-cascode-ota', dFolded.slice(0, 2)), contract)).toThrow(/Expected 11 devices/);
    expect(() => validateContractConfig(base('folded-cascode-ota', dFolded.map((d, i) => i === 2 ? { ...d, totalW: '8u" evil' } : d)), contract)).toThrow(/invalid TotalW scalar/);
  });
  it('parameterizes only exact placement anchors and leaves canonical source unchanged', async () => {
    const root = repositoryRoot();
    const contract = getGeneratorContract('5t-ota', 'tsmcN65');
    const sourcePath = path.join(root, contract.source.path);
    const before = await fs.readFile(sourcePath, 'utf8');
    const generated = parameterizeCanonicalGenerator(before, base('5t-ota', d5t), contract);
    const after = await fs.readFile(sourcePath, 'utf8');
    expect(after).toBe(before);
    expect(generated).not.toBe(before);
    expect(generated).toContain('T5TW_Place(cv nmos "M1" 0:6 "10u" "300n" "2" "2" "R0")');
    expect(generated).toContain('T5TW_PlaceVerifiedPMOS(cv pmos "M4" 6:10 "10u" "600n" "5" "2"');
    expect(generated).not.toContain('T5TW_Place(cv nmos "M1" 0:6 "2u" "240n" "1" "1" "R0")');
  });
  it('parameterizes Telescopic V8 without changing placement, routing, or VDC code', async () => {
    const contract = getGeneratorContract('telescopic-ota', 'tsmcN65');
    const root = repositoryRoot();
    const source = await fs.readFile(path.join(root, contract.source.path), 'utf8');
    const generated = parameterizeCanonicalGenerator(source, base('telescopic-ota', dTel), contract);
    expect(generated).toContain('TOTA8_PlaceMOS(cv pmos "M7" -5:10 "17u" "1u" "5" "1" "R0")');
    expect(generated).toContain('TOTA8_CreateVDC(cv vdcMaster "VDD_SRC" -15:10 "VDD" "VSS" "2")');
    expect(generated).toContain('TOTA8_LabelTerminal(cv M1 "G" "VINP")');
    expect(generated).toContain('TOTA8_LabelVDCTerminal(cv inst "PLUS" plusNet)');
  });
  it('parameterizes Folded Cascode with the PDK-aware PMOS/NMOS contract', async () => {
    const contract = getGeneratorContract('folded-cascode-ota', 'tsmcN65');
    const root = repositoryRoot();
    const source = await fs.readFile(path.join(root, contract.source.path), 'utf8');
    const generated = parameterizeCanonicalGenerator(source, base('folded-cascode-ota', dFolded), contract);
    expect(generated).toContain('FCW_PlacePMOSAuto(cv pmos "M3" -5:12 "23u" "900n" "2" "1")');
    expect(generated).toContain('FCW_PlacePMOSAuto(cv pmos "M6" 5:8 "26u" "1u" "5" "1")');
    expect(generated).toContain('FCW_PlaceMOS(cv nmos "M11" 0:-8 "31u" "1u" "6" "2" "R0")');
  });
  it('parameterizes the Current Mirror with the CMW contract and preserves routing, VDC, and pin code', async () => {
    const contract = getGeneratorContract('simple-current-mirror', 'tsmcN65');
    const root = repositoryRoot();
    const sourcePath = path.join(root, contract.source.path);
    const before = await fs.readFile(sourcePath, 'utf8');
    const generated = parameterizeCanonicalGenerator(before, mirrorBase, contract);
    expect(generated).toContain('CMW_PlaceMOS(cv nmos "M1" -3:0 "5u" "360n" "2" "1" "R0")');
    expect(generated).toContain('CMW_PlaceMOS(cv nmos "M2" 3:0 "10u" "360n" "4" "1" "R0")');
    expect(generated).not.toContain('CMW_PlaceMOS(cv nmos "M1" -3:0 "4u" "480n" "1" "1" "R0")');
    expect(generated).toContain('CMW_LabelMOSTerminal(cv M1 "G" "IREF")');
    expect(generated).toContain('CMW_LabelMOSTerminal(cv M2 "D" "IOUT")');
    expect(generated).toContain('CMW_CreateVDC(cv vdcMaster "V_IREF_SRC" -8:6 "0.75" "IREF" "VSS")');
    expect(generated).toContain('CMW_CreatePin(cv pinMaster "IOUT" "output" 8:-4)');
    expect(await fs.readFile(sourcePath, 'utf8')).toBe(before);
  });
  it('parameterizes each new batch topology against its real canonical generator and leaves it unchanged on disk', async () => {
    const root = repositoryRoot();
    for (const spec of batchTopologies) {
      const contract = getGeneratorContract(spec.topologyId, 'tsmcN65');
      const sourcePath = path.join(root, contract.source.path);
      const before = await fs.readFile(sourcePath, 'utf8');
      const config: DesignConfig = {
        circuitId: spec.circuitId, topologyId: spec.topologyId, technologyId: 'tsmcN65', vdd: 1.2, temperature: 27, corner: 'TT', specs: {}, sizingMethod: 'manual',
        devices: devices(spec.devices),
      };
      const generated = parameterizeCanonicalGenerator(before, config, contract);
      for (const expected of spec.expect) expect(generated, `${spec.topologyId}: missing ${expected}`).toContain(expected);
      for (const missing of spec.absent ?? []) expect(generated, `${spec.topologyId}: stale anchor ${missing}`).not.toContain(missing);
      expect(await fs.readFile(sourcePath, 'utf8'), `${spec.topologyId}: canonical changed`).toBe(before);
    }
  });
  it('produces a generated artifact with explicit provenance and no Cadence execution claim', async () => {
    const artifact = await generateParameterizedArtifact(base('5t-ota', d5t));
    expect(artifact.status).toBe('generated');
    expect(artifact.parameterized).toBe(true);
    expect(artifact.cadencesExecuted).toBe(false);
    expect(artifact.content).toContain('; Source        : canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il');
    expect(artifact.content).toContain('; Cadence execution: false');
  });
});
