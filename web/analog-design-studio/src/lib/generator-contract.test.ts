import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { defaultSpecs, type DesignConfig } from '@/lib/validation';
import { deriveMosState, generatorContracts, getGeneratorContract, validateContractConfig } from '@/lib/generator-contract';
import { generateParameterizedArtifact, parameterizeCanonicalGenerator } from '@/lib/generator-adapter';

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

describe('Phase 3 generator contracts', () => {
  it('defines contracts for all current OTA topologies', () => {
    expect(Object.keys(generatorContracts)).toEqual(['5t-ota', 'telescopic-ota', 'folded-cascode-ota']);
    expect(generatorContracts['folded-cascode-ota'].devices.slice(2, 6).every(d => d.type === 'PMOS')).toBe(true);
    for (const contract of Object.values(generatorContracts)) expect(contract.technologyId).toBe('tsmcN65');
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
    const root = path.resolve(process.cwd(), '..', '..');
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
  it('parameterizes Telescopic V7 without changing placement, routing, or VDC code', async () => {
    const contract = getGeneratorContract('telescopic-ota', 'tsmcN65');
    const root = path.resolve(process.cwd(), '..', '..');
    const source = await fs.readFile(path.join(root, contract.source.path), 'utf8');
    const generated = parameterizeCanonicalGenerator(source, base('telescopic-ota', dTel), contract);
    expect(generated).toContain('TOTA7_PlaceMOS(cv pmos "M7" -5:10 "17u" "1u" "5" "1" "R0")');
    expect(generated).toContain('TOTA7_CreateVDC(cv vdcMaster "VDD_SRC" -15:10 "VDD" "VSS" "2")');
    expect(generated).toContain('TOTA7_LabelTerminal(cv M1 "G" "VINP")');
  });
  it('parameterizes Folded Cascode with the correct PMOS/NMOS contract', async () => {
    const contract = getGeneratorContract('folded-cascode-ota', 'tsmcN65');
    const root = path.resolve(process.cwd(), '..', '..');
    const source = await fs.readFile(path.join(root, contract.source.path), 'utf8');
    const generated = parameterizeCanonicalGenerator(source, base('folded-cascode-ota', dFolded), contract);
    expect(generated).toContain('FCW_PlaceMOS(cv pmos "M3" -5:12 "23u" "900n" "2" "1" "MX")');
    expect(generated).toContain('FCW_PlaceMOS(cv pmos "M6" 5:8 "26u" "1u" "5" "1" "MX")');
    expect(generated).toContain('FCW_PlaceMOS(cv nmos "M11" 0:-8 "31u" "1u" "6" "2" "R0")');
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
