import { describe, expect, it } from 'vitest';
import { buildCadenceWrapper, buildDetachedCadenceCommand, executeCadence, getCadenceBridgeConfig, parseCadenceEvidence, type CadenceBridgeConfig } from '@/lib/cadence-bridge';
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
  host: '192.168.75.219',
  user: 'cadence',
  remoteWorkdir: '/home/cadence/Desktop/analog-design-studio-runs',
  virtuosoPath: '/usr/local/cadence/IC617/tools/dfII/bin/virtuoso',
  cadenceRoot: '/usr/local/cadence/IC617',
  pdkRoot: '/home/cadence/Desktop/PDK_CRN65LP_v1.7a_Official_IC61_20120914_all/PDK_CRN65LP_v1.7a_Official_IC61_20120914',
  display: ':0',
  library: 'BGR_ADI',
  timeoutMs: 5000,
};

describe('Phase 4 Cadence execution bridge', () => {
  it('uses the known IC617 Virtuoso path and PDK runtime defaults', () => {
    const value = getCadenceBridgeConfig({});
    expect(value.enabled).toBe(false);
    expect(value.user).toBe('cadence');
    expect(value.virtuosoPath).toBe('/usr/local/cadence/IC617/tools/dfII/bin/virtuoso');
    expect(value.cadenceRoot).toBe('/usr/local/cadence/IC617');
    expect(value.pdkRoot).toContain('/PDK_CRN65LP_v1.7a_Official_IC61_20120914');
  });

  it('rejects unsafe remote configuration', () => {
    expect(() => getCadenceBridgeConfig({ CADENCE_SSH_HOST: 'host;rm -rf /' })).toThrow(/unsupported|unsafe/);
    expect(() => getCadenceBridgeConfig({ CADENCE_REMOTE_WORKDIR: '/tmp/a;touch' })).toThrow(/unsupported|unsafe/);
    expect(() => getCadenceBridgeConfig({ CADENCE_PDK_ROOT: '/tmp/a;touch' })).toThrow(/unsupported|unsafe/);
  });

  it('builds a fixed wrapper from a repository invocation only', () => {
    const wrapper = buildCadenceWrapper({
      artifactRemotePath: '/home/cadence/run/artifact.il',
      invocation: 'Create5TOTA_PMOS_TOTALW_V2_20260812()',
      library: 'BGR_ADI',
      cell: 'test_cell',
      view: 'schematic',
      evidencePath: '/home/cadence/run/evidence.txt',
    });
    expect(wrapper).toContain('load("/home/cadence/run/artifact.il")');
    expect(wrapper).toContain('Create5TOTA_PMOS_TOTALW_V2_20260812()');
    expect(wrapper).toContain('ADS_BRIDGE_CHECK_AND_SAVE_REQUIRED');
    expect(wrapper).toContain('ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED');
    expect(wrapper).toContain('exit()');
    expect(() => buildCadenceWrapper({
      artifactRemotePath: '/tmp/a;bad',
      invocation: 'Create5TOTA_PMOS_TOTALW_V2_20260812()',
      library: 'BGR_ADI',
      cell: 'test_cell',
      view: 'schematic',
      evidencePath: '/tmp/evidence.txt',
    })).toThrow(/unsupported|unsafe/i);
    expect(() => buildCadenceWrapper({
      artifactRemotePath: '/tmp/a',
      invocation: 'system("rm -rf /")',
      library: 'BGR_ADI',
      cell: 'test_cell',
      view: 'schematic',
      evidencePath: '/tmp/evidence.txt',
    })).toThrow(/approved/);
  });

  it('parses explicit bridge evidence without treating warnings as success blockers', () => {
    const evidence = parseCadenceEvidence('ADS_BRIDGE_START\nWARNING test\nADS_BRIDGE_CHECK_AND_SAVE_REQUIRED\nADS_BRIDGE_GENERATOR_DONE\nADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED\nCheck and Save completed');
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

  it('builds a GUI detached launch command with the runtime cds.lib environment', () => {
    const command = buildDetachedCadenceCommand(
      bridge,
      '/home/cadence/Desktop/analog-design-studio-runs/test_run',
      '/home/cadence/Desktop/analog-design-studio-runs/test_run/run.restore.il',
      '/home/cadence/Desktop/analog-design-studio-runs/test_run/virtuoso.log',
    );
    expect(command).toContain('export DISPLAY=\':0\'');
    expect(command).toContain('export CDS_ROOT=\'/usr/local/cadence/IC617\'');
    expect(command).toContain('export CDSHOME=\'/usr/local/cadence/IC617\'');
    expect(command).toContain('export CDS_LIB_PATH=\'/home/cadence/Desktop/analog-design-studio-runs/test_run/cds.lib\'');
    expect(command).toContain("virtuoso' -restore");
    expect(command).not.toContain('-nograph');
  });

  it('supports dry-run without invoking ssh or Cadence', async () => {
    const result = await executeCadence(config, { dryRun: true, bridge });
    expect(result.status).toBe('dry-run');
    expect(result.cadenceExecuted).toBe(false);
    expect(result.evidence.checkAndSaveRequested).toBe(true);
    expect(result.remoteFiles.cdsLib).toContain('/cds.lib');
    expect(result.command).toEqual(['/usr/local/cadence/IC617/tools/dfII/bin/virtuoso', '-restore', result.remoteFiles.wrapper]);
  });

  it('reports disabled bridge without claiming execution', async () => {
    const result = await executeCadence(config, { bridge });
    expect(result.status).toBe('disabled');
    expect(result.cadenceExecuted).toBe(false);
    expect(result.exitCode).toBeNull();
  });
});
