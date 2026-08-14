import { describe, expect, it } from 'vitest';
import { buildCadenceWrapper, executeCadence, getCadenceBridgeConfig, parseCadenceEvidence, type CadenceBridgeConfig } from '@/lib/cadence-bridge';
import { defaultSpecs, type DesignConfig } from '@/lib/validation';

const config: DesignConfig = {
  circuitId: 'ota',
  topologyId: '5t-ota',
  technologyId: 'tsmcN65',
  vdd: 1.2,
  temperature: 27,
  corner: 'TT',
  specs: defaultSpecs,
  sizingMethod: 'manual',
  devices: [
    { device: 'M1', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
    { device: 'M2', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
    { device: 'M3', type: 'PMOS', totalW: '4u', L: '480n', NF: 1, M: 1 },
    { device: 'M4', type: 'PMOS', totalW: '4u', L: '480n', NF: 1, M: 1 },
    { device: 'M5', type: 'NMOS', totalW: '6u', L: '480n', NF: 1, M: 1 },
  ],
};

const bridge: CadenceBridgeConfig = {
  enabled: false,
  host: '192.168.75.217',
  user: 'cadence',
  remoteWorkdir: '/home/cadence/Desktop/analog-design-studio-runs',
  virtuosoPath: '/usr/local/cadence/IC617/tools/dfII/bin/virtuoso',
  timeoutMs: 1000,
};

describe('Phase 4 Cadence execution bridge', () => {
  it('uses the known IC617 Virtuoso path and remains disabled by default', () => {
    const value = getCadenceBridgeConfig({});
    expect(value.enabled).toBe(false);
    expect(value.user).toBe('cadence');
    expect(value.virtuosoPath).toBe('/usr/local/cadence/IC617/tools/dfII/bin/virtuoso');
  });

  it('rejects unsafe remote configuration', () => {
    expect(() => getCadenceBridgeConfig({ CADENCE_SSH_HOST: 'host;rm -rf /' })).toThrow(/unsafe/);
    expect(() => getCadenceBridgeConfig({ CADENCE_REMOTE_WORKDIR: '/tmp/a;touch' })).toThrow(/unsafe/);
  });

  it('builds a fixed wrapper from a repository invocation only', () => {
    const wrapper = buildCadenceWrapper('/home/cadence/run/artifact.il', 'Create5TOTA_PMOS_TOTALW_V2_20260812()');
    expect(wrapper).toContain('load("/home/cadence/run/artifact.il")');
    expect(wrapper).toContain('Create5TOTA_PMOS_TOTALW_V2_20260812()');
    expect(wrapper).toContain('exit()');
    expect(() => buildCadenceWrapper('/tmp/a;bad', 'Create5TOTA_PMOS_TOTALW_V2_20260812()')).toThrow(/Unsafe/);
    expect(() => buildCadenceWrapper('/tmp/a', 'system("rm -rf /")')).toThrow(/approved/);
  });

  it('parses explicit bridge evidence without treating warnings as success blockers', () => {
    const evidence = parseCadenceEvidence('ADS_BRIDGE_START\nWARNING test\nADS_BRIDGE_GENERATOR_DONE\nADS_BRIDGE_CHECK_AND_SAVE_REQUIRED\nCheck and Save completed');
    expect(evidence.processStarted).toBe(true);
    expect(evidence.processExited).toBe(true);
    expect(evidence.checkAndSaveRequested).toBe(true);
    expect(evidence.checkAndSaveEvidence).toBe(true);
    expect(evidence.warningDetected).toBe(true);
    expect(evidence.errorDetected).toBe(false);
  });

  it('detects Cadence errors', () => {
    const evidence = parseCadenceEvidence('*Error* dbCreateInst failed');
    expect(evidence.errorDetected).toBe(true);
  });

  it('supports dry-run without invoking ssh or Cadence', async () => {
    const result = await executeCadence(config, { dryRun: true, bridge });
    expect(result.status).toBe('dry-run');
    expect(result.cadenceExecuted).toBe(false);
    expect(result.evidence.checkAndSaveRequested).toBe(true);
    expect(result.command).toEqual(['/usr/local/cadence/IC617/tools/dfII/bin/virtuoso', '-nograph', '-restore', result.remoteFiles.wrapper, '-log', result.remoteFiles.log]);
  });

  it('reports disabled bridge without claiming execution', async () => {
    const result = await executeCadence(config, { bridge });
    expect(result.status).toBe('disabled');
    expect(result.cadenceExecuted).toBe(false);
    expect(result.exitCode).toBeNull();
  });
});
