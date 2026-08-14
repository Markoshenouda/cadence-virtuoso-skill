import { describe, expect, it } from 'vitest';
import { getTopology } from './repository-registry';
import { defaultSpecs, type DesignConfig } from './validation';
import { generateRepositoryArtifact, readRepositoryGenerator } from './generator-adapter';

const config: DesignConfig = {
  circuitId: 'ota',
  topologyId: '5t-ota',
  technologyId: 'tsmcN65',
  vdd: 1.2,
  temperature: 27,
  corner: 'TT',
  specs: defaultSpecs,
  sizingMethod: 'gmID',
  devices: [
    { device: 'M1', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
    { device: 'M2', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
    { device: 'M3', type: 'PMOS', totalW: '4u', L: '480n', NF: 1, M: 1 },
    { device: 'M4', type: 'PMOS', totalW: '4u', L: '480n', NF: 1, M: 1 },
    { device: 'M5', type: 'NMOS', totalW: '6u', L: '480n', NF: 1, M: 1 },
  ],
};

describe('repository generator adapter', () => {
  it('reads the actual repository generator source', async () => {
    const topology = getTopology('ota', '5t-ota')!;
    const source = await readRepositoryGenerator(topology.generator);
    expect(source).toContain('Create5TOTA_PMOS_TOTALW_V2_20260812');
    expect(source).toContain('cdf->totalM->value');
  });

  it('exports the repository generator with configuration provenance', async () => {
    const topology = getTopology('ota', '5t-ota')!;
    const artifact = await generateRepositoryArtifact(config, topology.generator);
    expect(artifact.status).toBe('generated');
    expect(artifact.cadencesExecuted).toBe(false);
    expect(artifact.content).toContain('; Topology      : 5t-ota');
    expect(artifact.content).toContain(topology.generator.path);
    expect(artifact.content).toContain('Create5TOTA_PMOS_TOTALW_V2_20260812');
    expect(artifact.filename.endsWith('.il')).toBe(true);
  });
});
