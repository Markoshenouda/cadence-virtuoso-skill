import { describe, expect, it } from 'vitest';
import { generatorContracts } from '@/lib/generator-contract';
import { parameterizeCanonicalGenerator } from '@/lib/generator-adapter';
import type { DesignConfig } from '@/lib/validation';

type TestConfig = DesignConfig;

const config: TestConfig = {
  circuitId: 'ota',
  topologyId: '5t-ota',
  technologyId: 'tsmcN65',
  vdd: 1.2,
  temperature: 27,
  corner: 'TT',
  specs: [],
  sizingMethod: 'gmID',
  devices: [
    { device: 'M1', type: 'NMOS', totalW: '3u', L: '240n', NF: 2, M: 1 },
    { device: 'M2', type: 'NMOS', totalW: '4u', L: '240n', NF: 2, M: 1 },
    { device: 'M3', type: 'PMOS', totalW: '6u', L: '480n', NF: 3, M: 2 },
    { device: 'M4', type: 'PMOS', totalW: '8u', L: '480n', NF: 4, M: 1 },
    { device: 'M5', type: 'NMOS', totalW: '10u', L: '480n', NF: 2, M: 1 },
  ],
};

describe('parameterized generator adapter', () => {
  it('parameterizes 5T devices using both placement procedures', () => {
    const source = [
      'M1=T5TW_Place(cv nmos "M1" 0:6 "2u" "240n" "1" "1" "R0")',
      'M2=T5TW_Place(cv nmos "M2" 6:6 "2u" "240n" "1" "1" "R0")',
      'M5=T5TW_Place(cv nmos "M5" 3:2 "6u" "480n" "1" "1" "R0")',
      'M3=T5TW_PlaceVerifiedPMOS(cv pmos "M3" 0:10 "4u" "480n" "1" "1")',
      'M4=T5TW_PlaceVerifiedPMOS(cv pmos "M4" 6:10 "4u" "480n" "1" "1")',
    ].join('\n');

    const generated = parameterizeCanonicalGenerator(source, config, generatorContracts['5t-ota']);

    expect(generated).toContain('M1=T5TW_Place(cv nmos "M1" 0:6 "3u" "240n" "2" "1" "R0")');
    expect(generated).toContain('M2=T5TW_Place(cv nmos "M2" 6:6 "4u" "240n" "2" "1" "R0")');
    expect(generated).toContain('M3=T5TW_PlaceVerifiedPMOS(cv pmos "M3" 0:10 "6u" "480n" "3" "2")');
    expect(generated).toContain('M4=T5TW_PlaceVerifiedPMOS(cv pmos "M4" 6:10 "8u" "480n" "4" "1")');
    expect(generated).toContain('M5=T5TW_Place(cv nmos "M5" 3:2 "10u" "480n" "2" "1" "R0")');
  });

  it('rejects a missing placement anchor instead of silently generating partial output', () => {
    const source = 'M1=T5TW_Place(cv nmos "M1" 0:6 "2u" "240n" "1" "1" "R0")';
    expect(() => parameterizeCanonicalGenerator(source, config, generatorContracts['5t-ota']))
      .toThrow(/M2|M3|M4|M5/);
  });
});
