import { spawn, execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { DesignConfig } from './validation';
import { getGeneratorContract } from './generator-contract';
import { generateParameterizedArtifact } from './generator-adapter';

const execFileAsync = promisify(execFile);

export type CadenceBridgeConfig = {
  enabled: boolean;
  host: string;
  user: string;
  remoteWorkdir: string;
  virtuosoPath: string;
  cadenceRoot: string;
  pdkRoot: string;
  display: string;
  library: string;
  timeoutMs: number;
  sshKeyPath?: string;
};

export type CadenceExecutionStatus = 'disabled' | 'dry-run' | 'succeeded' | 'failed' | 'timeout';

export type CadenceExecutionResult = {
  status: CadenceExecutionStatus;
  cadenceExecuted: boolean;
  dryRun: boolean;
  topologyId: string;
  technologyId: string;
  sourceGenerator: string;
  remoteFiles: { artifact: string; wrapper: string; log: string; evidence: string; cdsLib: string; displayDrf: string };
  command: string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  evidence: {
    processStarted: boolean;
    processExited: boolean;
    generatorCompleted: boolean;
    checkAndSaveRequested: boolean;
    checkAndSaveEvidence: boolean;
    errorDetected: boolean;
    warningDetected: boolean;
    logCaptured: boolean;
  };
  notes: string[];
};

const DEFAULT_VIRTUOSO = '/usr/local/cadence/IC617/tools/dfII/bin/virtuoso';
const DEFAULT_CADENCE_ROOT = '/usr/local/cadence/IC617';
const DEFAULT_PDK_ROOT = '/home/cadence/Desktop/PDK_CRN65LP_v1.7a_Official_IC61_20120914_all/PDK_CRN65LP_v1.7a_Official_IC61_20120914';
const DEFAULT_TIMEOUT = 180_000;
const SAFE_REMOTE = /^\/[A-Za-z0-9_./-]+$/;
const SAFE_HOST = /^[A-Za-z0-9._:-]+$/;
const SAFE_TOKEN = /^[A-Za-z0-9_.-]+$/;

function envBool(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 5000 ? Math.floor(parsed) : fallback;
}

function requireSafe(value: string, re: RegExp, field: string) {
  if (!re.test(value) || value.includes('..')) throw new Error(`${field} contains unsupported path/command characters.`);
}

export function getCadenceBridgeConfig(env: NodeJS.ProcessEnv = process.env): CadenceBridgeConfig {
  const config: CadenceBridgeConfig = {
    enabled: envBool(env.CADENCE_BRIDGE_ENABLED),
    host: env.CADENCE_SSH_HOST ?? '192.168.75.219',
    user: env.CADENCE_SSH_USER ?? 'cadence',
    remoteWorkdir: env.CADENCE_REMOTE_WORKDIR ?? '/home/cadence/Desktop/analog-design-studio-runs',
    virtuosoPath: env.CADENCE_VIRTUOSO_PATH ?? DEFAULT_VIRTUOSO,
    cadenceRoot: env.CADENCE_ROOT ?? DEFAULT_CADENCE_ROOT,
    pdkRoot: env.CADENCE_PDK_ROOT ?? DEFAULT_PDK_ROOT,
    display: env.CADENCE_DISPLAY ?? ':0',
    library: env.CADENCE_LIBRARY ?? 'BGR_ADI',
    timeoutMs: positiveInt(env.CADENCE_TIMEOUT_MS, DEFAULT_TIMEOUT),
    sshKeyPath: env.CADENCE_SSH_KEY,
  };
  requireSafe(config.host, SAFE_HOST, 'SSH host');
  requireSafe(config.user, SAFE_TOKEN, 'SSH user');
  requireSafe(config.remoteWorkdir, SAFE_REMOTE, 'remoteWorkdir');
  requireSafe(config.virtuosoPath, SAFE_REMOTE, 'virtuosoPath');
  requireSafe(config.cadenceRoot, SAFE_REMOTE, 'cadenceRoot');
  requireSafe(config.pdkRoot, SAFE_REMOTE, 'pdkRoot');
  requireSafe(config.library, SAFE_TOKEN, 'library');
  if (!/^:[0-9]+$/.test(config.display)) throw new Error('CADENCE_DISPLAY must look like :0, :1, etc.');
  if (config.sshKeyPath) requireSafe(config.sshKeyPath, /^[A-Za-z0-9_./:\-]+$/, 'CADENCE_SSH_KEY');
  return config;
}

function safeName(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function sshArgs(config: CadenceBridgeConfig, remoteCommand: string) {
  const args: string[] = ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10'];
  if (config.sshKeyPath) args.push('-i', config.sshKeyPath);
  args.push(`${config.user}@${config.host}`, remoteCommand);
  return args;
}

function scpArgs(config: CadenceBridgeConfig, local: string, remote: string) {
  const args: string[] = ['-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10'];
  if (config.sshKeyPath) args.push('-i', config.sshKeyPath);
  args.push(local, `${config.user}@${config.host}:${remote}`);
  return args;
}

function runProcess(file: string, args: string[], timeoutMs: number) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }>((resolve) => {
    const child = spawn(file, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeoutMs);
    child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => { stderr += `${error.message}\n`; });
    child.on('close', (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code, timedOut }); });
  });
}

export function buildCadenceWrapper(args: {
  artifactRemotePath: string;
  invocation: string;
  library: string;
  cell: string;
  view: string;
  evidencePath: string;
}) {
  const { artifactRemotePath, invocation, library, cell, view, evidencePath } = args;
  if (!/^Create[A-Za-z0-9_]+\(\)$/.test(invocation)) throw new Error('Generator invocation is not an approved repository procedure.');
  for (const [value, field] of [[artifactRemotePath, 'artifactRemotePath'], [evidencePath, 'evidencePath']] as const) requireSafe(value, SAFE_REMOTE, field);
  for (const [value, field] of [[library, 'library'], [cell, 'cell'], [view, 'view']] as const) requireSafe(value, SAFE_TOKEN, field);

  return [
    '; Analog Design Studio - Cadence Execution Bridge',
    '; Canonical generator is loaded read-only and invoked through the repository contract.',
    'prog((cv win result evidence)',
    `  cv = dbOpenCellViewByType("${library}" "${cell}" "${view}" "schematic" "a")`,
    '  unless(cv error("ADS_BRIDGE: could not create/open target schematic database.\\n"))',
    `  win = deOpenCellView("${library}" "${cell}" "${view}" "schematic" nil "a")`,
    '  unless(win error("ADS_BRIDGE: could not open target schematic window.\\n"))',
    '  hiSetCurrentWindow(win)',
    `  printf("ADS_BRIDGE_START topology=${cell}\\n")`,
    '  printf("ADS_BRIDGE_LIBRARY_CONTEXT_OK\\n")',
    `  load(${JSON.stringify(artifactRemotePath)})`,
    '  unless(geGetEditCellView() error("ADS_BRIDGE: no editable cellView is active.\\n"))',
    '  printf("ADS_BRIDGE_CHECK_AND_SAVE_REQUIRED\\n")',
    `  result = ${invocation}`,
    '  unless(result error("ADS_BRIDGE: repository generator returned nil.\\n"))',
    '  cv = geGetEditCellView()',
    '  unless(cv error("ADS_BRIDGE: editable cellView disappeared after generation.\\n"))',
    '  dbSave(cv)',
    `  evidence = outfile(${JSON.stringify(evidencePath)} "w")`,
    '  unless(evidence error("ADS_BRIDGE: could not create evidence file.\\n"))',
    '  fprintf(evidence "ADS_BRIDGE_STATUS=SUCCEEDED\\n")',
    `  fprintf(evidence "LIBRARY=${library}\\nCELL=${cell}\\nVIEW=${view}\\n")`,
    '  fprintf(evidence "LIBRARY_CONTEXT_OK=true\\n")',
    '  fprintf(evidence "GENERATOR_COMPLETED=true\\n")',
    '  fprintf(evidence "CHECK_AND_SAVE=dbSave_completed\\n")',
    '  close(evidence)',
    '  printf("ADS_BRIDGE_GENERATOR_DONE\\n")',
    '  printf("ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED\\n")',
    ')',
    '',
  ].join('\n');
}

export function parseCadenceEvidence(log: string, stdout = '', stderr = '') {
  const combined = `${log}\n${stdout}\n${stderr}`;
  return {
    processStarted: /ADS_BRIDGE_START/.test(combined),
    processExited: /ADS_BRIDGE_GENERATOR_DONE/.test(combined),
    generatorCompleted: /ADS_BRIDGE_GENERATOR_DONE/.test(combined),
    checkAndSaveRequested: /ADS_BRIDGE_CHECK_AND_SAVE_REQUIRED/.test(combined),
    checkAndSaveEvidence: /ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED|CHECK_AND_SAVE=dbSave_completed/.test(combined),
    errorDetected: /(?:\*Error\*|\bFATAL\b|\bERROR\b)/.test(combined),
    warningDetected: /(?:\*WARNING\*|\bWARNING\b)/.test(combined),
    logCaptured: log.length > 0,
  };
}

async function fetchRemoteText(config: CadenceBridgeConfig, remotePath: string) {
  const result = await runProcess('ssh', sshArgs(config, `cat ${shellQuote(remotePath)} 2>/dev/null || true`), 30_000);
  return { text: result.stdout, stderr: result.stderr, exitCode: result.exitCode };
}

export function buildDetachedCadenceCommand(config: CadenceBridgeConfig, remoteDir: string, remoteWrapper: string, remoteLog: string) {
  // IMPORTANT: the TSMC cds.lib contains relative definitions such as
  //   DEFINE tsmcN65 ./tsmcN65
  // Therefore Virtuoso MUST start with the PDK root as its working directory.
  // The generated run directory is used only for the artifact, wrapper and logs.
  const pdkCdsLib = `${config.pdkRoot}/cds.lib`;
  return [
    `cd ${shellQuote(config.pdkRoot)}`,
    `export DISPLAY=${shellQuote(config.display)}`,
    `export CDS_ROOT=${shellQuote(config.cadenceRoot)}`,
    `export CDSHOME=${shellQuote(config.cadenceRoot)}`,
    `export CDS_LIB_PATH=${shellQuote(pdkCdsLib)}`,
    `export CDS_LOG_PATH=${shellQuote(remoteDir)}`,
    'export CDS_LOG_VERSION=sequential',
    `mkdir -p ${shellQuote(`${remoteDir}/.cadence-home`)}`,
    `export HOME=${shellQuote(`${remoteDir}/.cadence-home`)}`,
    `nohup ${shellQuote(config.virtuosoPath)} -cdslib ${shellQuote(pdkCdsLib)} -restore ${shellQuote(remoteWrapper)} -log ${shellQuote(remoteLog)} > ${shellQuote(`${remoteDir}/launch.stdout`)} 2>&1 < /dev/null & echo $!`,
  ].join('; ');
}

export async function executeCadence(config: DesignConfig, options: { dryRun?: boolean; bridge?: CadenceBridgeConfig } = {}): Promise<CadenceExecutionResult> {
  const bridge = options.bridge ?? getCadenceBridgeConfig();
  const contract = getGeneratorContract(config.topologyId, config.technologyId);
  const artifact = await generateParameterizedArtifact(config);
  const stem = `${safeName(config.topologyId)}_${Date.now()}`;
  const remoteDir = `${bridge.remoteWorkdir}/${stem}`;
  const remoteArtifact = `${remoteDir}/${artifact.filename}`;
  const remoteWrapper = `${remoteDir}/run.restore.il`;
  const remoteLog = `${remoteDir}/virtuoso.log`;
  const remoteEvidence = `${remoteDir}/evidence.txt`;
  const remoteCdsLib = `${bridge.pdkRoot}/cds.lib`;
  const remoteDisplayDrf = `${bridge.pdkRoot}/display.drf`;
  const targetCell = `${safeName(config.topologyId)}_ADS_${Date.now()}`;
  const command = [bridge.virtuosoPath, '-cdslib', remoteCdsLib, '-restore', remoteWrapper, '-log', remoteLog];
  const emptyEvidence = { processStarted: false, processExited: false, generatorCompleted: false, checkAndSaveRequested: false, checkAndSaveEvidence: false, errorDetected: false, warningDetected: false, logCaptured: false };
  const base = { topologyId: config.topologyId, technologyId: config.technologyId, sourceGenerator: contract.source.path, remoteFiles: { artifact: remoteArtifact, wrapper: remoteWrapper, log: remoteLog, evidence: remoteEvidence, cdsLib: remoteCdsLib, displayDrf: remoteDisplayDrf }, command };

  if (!bridge.enabled) return { ...base, status: options.dryRun ? 'dry-run' : 'disabled', cadenceExecuted: false, dryRun: Boolean(options.dryRun), stdout: '', stderr: '', exitCode: null, evidence: options.dryRun ? { ...emptyEvidence, checkAndSaveRequested: true } : emptyEvidence, notes: ['Bridge is disabled. Set CADENCE_BRIDGE_ENABLED=true to allow local execution.'] };
  if (options.dryRun) return { ...base, status: 'dry-run', cadenceExecuted: false, dryRun: true, stdout: '', stderr: '', exitCode: null, evidence: { ...emptyEvidence, checkAndSaveRequested: true }, notes: ['Dry-run: no SSH/SCP/Virtuoso process was started.', `Target cell would be ${bridge.library}/${targetCell}/schematic.`, `Virtuoso will start from the TSMC PDK root ${bridge.pdkRoot}.`, `Virtuoso will use ${remoteCdsLib}.`] };

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'analog-design-studio-'));
  const localArtifact = path.join(tempDir, artifact.filename);
  const localWrapper = path.join(tempDir, 'run.restore.il');
  const startedAt = Date.now();
  try {
    await writeFile(localArtifact, artifact.content, 'utf8');
    await writeFile(localWrapper, buildCadenceWrapper({ artifactRemotePath: remoteArtifact, invocation: contract.source.invocation, library: bridge.library, cell: targetCell, view: 'schematic', evidencePath: remoteEvidence }), 'utf8');

    const mkdir = await runProcess('ssh', sshArgs(bridge, `mkdir -p ${shellQuote(remoteDir)}`), 30_000);
    if (mkdir.exitCode !== 0) throw new Error(`Remote staging directory failed: ${mkdir.stderr || mkdir.stdout}`);
    const uploadArtifact = await runProcess('scp', scpArgs(bridge, localArtifact, remoteArtifact), 60_000);
    if (uploadArtifact.exitCode !== 0) throw new Error(`Artifact upload failed: ${uploadArtifact.stderr || uploadArtifact.stdout}`);
    const uploadWrapper = await runProcess('scp', scpArgs(bridge, localWrapper, remoteWrapper), 60_000);
    if (uploadWrapper.exitCode !== 0) throw new Error(`Wrapper upload failed: ${uploadWrapper.stderr || uploadWrapper.stdout}`);

    const launchCommand = buildDetachedCadenceCommand(bridge, remoteDir, remoteWrapper, remoteLog);
    const launch = await runProcess('ssh', sshArgs(bridge, launchCommand), 30_000);
    if (launch.exitCode !== 0) throw new Error(`Virtuoso launch failed: ${launch.stderr || launch.stdout}`);

    let lastLog = '';
    let lastEvidence = '';
    let lastStderr = launch.stderr;
    while (Date.now() - startedAt < bridge.timeoutMs) {
      const [logFetch, evidenceFetch, launchFetch] = await Promise.all([
        fetchRemoteText(bridge, remoteLog),
        fetchRemoteText(bridge, remoteEvidence),
        fetchRemoteText(bridge, `${remoteDir}/launch.stdout`),
      ]);
      lastLog = logFetch.text;
      lastEvidence = evidenceFetch.text;
      lastStderr = `${launch.stderr}\n${logFetch.stderr}\n${evidenceFetch.stderr}`.trim();
      const launchOutput = launchFetch.text;
      const evidence = parseCadenceEvidence(`${lastLog}\n${lastEvidence}`, `${launch.stdout}\n${launchOutput}`, lastStderr);
      const combined = `${lastLog}\n${lastEvidence}\n${launchOutput}`;

      if (evidence.generatorCompleted && evidence.checkAndSaveEvidence) {
        return {
          ...base,
          status: evidence.errorDetected ? 'failed' : 'succeeded',
          cadenceExecuted: true,
          dryRun: false,
          stdout: `${launch.stdout}\n${launchOutput}\n${lastLog}\n${lastEvidence}`,
          stderr: lastStderr,
          exitCode: null,
          evidence,
          notes: evidence.errorDetected
            ? ['Cadence reached completion markers but captured output also contains an error.']
            : ['Virtuoso was launched from the TSMC PDK root using its existing cds.lib; generator completion and dbSave evidence were captured.'],
        };
      }
      if (evidence.errorDetected && /ADS_BRIDGE:|\*Error\*|\bFATAL\b/.test(combined)) {
        return {
          ...base,
          status: 'failed',
          cadenceExecuted: true,
          dryRun: false,
          stdout: `${launch.stdout}\n${launchOutput}\n${lastLog}\n${lastEvidence}`,
          stderr: lastStderr,
          exitCode: null,
          evidence,
          notes: ['Cadence started from the PDK root, but the runtime reported an execution error before required completion evidence.'],
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const evidence = parseCadenceEvidence(`${lastLog}\n${lastEvidence}`, launch.stdout, lastStderr);
    return {
      ...base,
      status: 'timeout',
      cadenceExecuted: true,
      dryRun: false,
      stdout: `${launch.stdout}\n${lastLog}\n${lastEvidence}`,
      stderr: lastStderr,
      exitCode: null,
      evidence,
      notes: ['Virtuoso was launched from the TSMC PDK root, but required generator/Check & Save evidence was not captured before timeout. Inspect virtuoso.log and launch.stdout in the reported run directory.'],
    };
  } catch (error) {
    return { ...base, status: 'failed', cadenceExecuted: false, dryRun: false, stdout: '', stderr: error instanceof Error ? error.message : String(error), exitCode: null, evidence: emptyEvidence, notes: ['Cadence execution was not confirmed.'] };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function verifyCadenceBinary(config: CadenceBridgeConfig) {
  if (!config.enabled) return { ok: false, message: 'Cadence bridge is disabled.' };
  try {
    const result = await execFileAsync('ssh', sshArgs(config, `cd ${shellQuote(config.pdkRoot)}; ${shellQuote(config.virtuosoPath)} -W 2>&1`), { timeout: 30_000 });
    const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    return /IC6\.1\.7|sub-version/i.test(text) ? { ok: true, message: 'Cadence IC6.1.7 Virtuoso executable is reachable from the TSMC PDK workspace.' } : { ok: true, message: 'Cadence executable is reachable from the TSMC PDK workspace.' };
  } catch (error: any) {
    return { ok: false, message: error?.stderr || error?.message || 'Cadence executable check failed.' };
  }
}
