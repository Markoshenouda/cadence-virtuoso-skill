import { describe, expect, it } from 'vitest';
import { getTopologySimRecommendations } from './sim-recommendations';

describe('getTopologySimRecommendations', () => {
  it('returns OTA recommendations for 5T OTA', () => {
    const rec = getTopologySimRecommendations('5T_OTA_PMOS_TOTALW_V2', '5t-ota');
    expect(rec.recommendedSimTypes).toContain('AC');
    expect(rec.recommendedSimTypes).toContain('TRAN');
    expect(rec.recommendedOutputs).toContain('gain');
    expect(rec.recommendedOutputs).toContain('gbw');
    expect(rec.recommendedSpecs.some((s) => s.metric === 'gain')).toBe(true);
  });

  it('returns Current Mirror recommendations for current mirror family', () => {
    const rec = getTopologySimRecommendations('Current_Mirror_NMOS_TotalW_V1', 'current-mirror');
    expect(rec.recommendedSimTypes).toContain('DC_OP');
    expect(rec.recommendedSimTypes).toContain('DC_SWEEP');
    expect(rec.recommendedOutputs).toContain('ratio');
    expect(rec.recommendedSpecs.some((s) => s.metric === 'ratio')).toBe(true);
  });

  it('provides safe default recommendations for unknown topology', () => {
    const rec = getTopologySimRecommendations('Unknown_Topology_V1');
    expect(rec.recommendedSimTypes.length).toBeGreaterThan(0);
    expect(rec.recommendedOutputs.length).toBeGreaterThan(0);
    expect(rec.recommendedSpecs.length).toBeGreaterThan(0);
  });
});
