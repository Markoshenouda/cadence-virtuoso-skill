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
  remoteFiles: { artifact: string; wrapper: string; log: string; evidence: string };
  command: string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  evidence: {
    processStarted: boolean;
    processExited: boolean;
    generatorCompleted: boolean;
    checkAndSaveEvidence: boolean;
    errorDetected: boolean;
    warningDetected: boolean;
    logCaptured: boolean;
  };
  notes: string[];
};

const DEFAULT_VIRTUOSO = '/usr/local/cadence/IC617/tools/dfII/bin/virtuoso';
const DEFAULT_CADENCE_ROOT = '/usr/local/cadence/IC617';
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
  requireSafe(config.library, SAFE_TOKEN, 'library');
  if (!/^:[0-9]+$/.test(config.display)) throw new Error('CADENCE_DISPLAY must look like :0, :1, etc.');
  if (config.sshKeyPath) requireSafe(config.sshKeyPath, /^[A-Za-z0-9_./:\\-]+$/, 'CADENCE_SSH_KEY');
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
    '; Analog Design Studio — Cadence Execution Bridge',
    '; GUI execution wrapper. Canonical generator remains read-only.',
    'let((cv win result evidence)',
    `    cv = dbOpenCellViewByType("${library}" "${cell}" "${view}" "schematic" "a")`,
    '    unless(cv error("ADS_BRIDGE: could not create/open target schematic database.\\n"))',
    `    win = deOpenCellView("${library}" "${cell}" "${view}" "schematic" nil "a")`,
    '    unless(win error("ADS_BRIDGE: could not open target schematic window.\\n"))',
    '    hiSetCurrentWindow(win)',
    `    printf("ADS_BRIDGE_START topology=${cell}\\n")`,
    `    load(${JSON.stringify(artifactRemotePath)})`,
    '    unless(geGetEditCellView() error("ADS_BRIDGE: no editable cellView is active.\\n"))',
    `    result = ${invocation}`,
    '    unless(result error("ADS_BRIDGE: repository generator returned nil.\\n"))',
    '    cv = geGetEditCellView()',
    '    unless(cv error("ADS_BRIDGE: editable cellView disappeared after generation.\\n"))',
    '    dbSave(cv)',
    `    evidence = outfile(${JSON.stringify(evidencePath)} "w")`,
    '    fprintf(evidence "ADS_BRIDGE_STATUS=SUCCEEDED\\n")',
    `    fprintf(evidence "LIBRARY=${library}\\nCELL=${cell}\\nVIEW=${view}\\n")`,
    '    fprintf(evidence "GENERATOR_COMPLETED=true\\n")',
    '    fprintf(evidence "CHECK_AND_SAVE=dbSave_completed\\n")',
    '    close(evidence)',
    '    printf("ADS_BRIDGE_GENERATOR_DONE\\n")',
    '    printf("ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED\\n")',
    '    exit()',
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
    checkAndSaveEvidence: /ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED|CHECK_AND_SAVE=dbSave_completed/.test(combined),
    errorDetected: /(?:\*Error\*|\bFATAL\b|\bERROR\b)/.test(combined),
    warningDetected: /(?:\*WARNING\*|\bWARNING\b)/.test(combined),
    logCaptured: log.length > 0,
  };
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
  const targetCell = `${safeName(config.topologyId)}_ADS_${Date.now()}`;
  const command = [bridge.virtuosoPath, '-restore', remoteWrapper];
  const emptyEvidence = { processStarted: false, processExited: false, generatorCompleted: false, checkAndSaveEvidence: false, errorDetected: false, warningDetected: false, logCaptured: false };
  const base = { topologyId: config.topologyId, technologyId: config.technologyId, sourceGenerator: contract.source.path, remoteFiles: { artifact: remoteArtifact, wrapper: remoteWrapper, log: remoteLog, evidence: remoteEvidence }, command };

  if (!bridge.enabled) return { ...base, status: options.dryRun ? 'dry-run' : 'disabled', cadenceExecuted: false, dryRun: Boolean(options.dryRun), stdout: '', stderr: '', exitCode: null, evidence: emptyEvidence, notes: ['Bridge is disabled. Set CADENCE_BRIDGE_ENABLED=true to allow local execution.'] };
  if (options.dryRun) return { ...base, status: 'dry-run', cadenceExecuted: false, dryRun: true, stdout: '', stderr: '', exitCode: null, evidence: emptyEvidence, notes: ['Dry-run: no SSH/SCP/Virtuoso process was started.', `Target cell would be ${bridge.library}/${targetCell}/${config.topologyId ? 'schematic' : 'schematic'}.`] };

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'analog-design-studio-'));
  const localArtifact = path.join(tempDir, artifact.filename);
  const localWrapper = path.join(tempDir, 'run.restore.il');
  try {
    await writeFile(localArtifact, artifact.content, 'utf8');
    await writeFile(localWrapper, buildCadenceWrapper({ artifactRemotePath: remoteArtifact, invocation: contract.source.invocation, library: bridge.library, cell: targetCell, view: 'schematic', evidencePath: remoteEvidence }), 'utf8');

    const mkdir = await runProcess('ssh', sshArgs(bridge, `mkdir -p ${shellQuote(remoteDir)}`), 30_000);
    if (mkdir.exitCode !== 0) throw new Error(`Remote staging directory failed: ${mkdir.stderr || mkdir.stdout}`);
    const uploadArtifact = await runProcess('scp', scpArgs(bridge, localArtifact, remoteArtifact), 60_000);
    if (uploadArtifact.exitCode !== 0) throw new Error(`Artifact upload failed: ${uploadArtifact.stderr || uploadArtifact.stdout}`);
    const uploadWrapper = await runProcess('scp', scpArgs(bridge, localWrapper, remoteWrapper), 60_000);
    if (uploadWrapper.exitCode !== 0) throw new Error(`Wrapper upload failed: ${uploadWrapper.stderr || uploadWrapper.stdout}`);

    const remoteCommand = `export DISPLAY=${shellQuote(bridge.display)}; export CDS_ROOT=${shellQuote(bridge.cadenceRoot)}; cd ${shellQuote(remoteDir)}; ${shellQuote(bridge.virtuosoPath)} -restore ${shellQuote(remoteWrapper)} > ${shellQuote(remoteLog)} 2>&1`;
    const execution = await runProcess('ssh', sshArgs(bridge, remoteCommand), bridge.timeoutMs);
    const logFetch = await runProcess('ssh', sshArgs(bridge, `cat ${shellQuote(remoteLog)} 2>/dev/null || true`), 30_000);
    const evidenceFetch = await runProcess('ssh', sshArgs(bridge, `cat ${shellQuote(remoteEvidence)} 2>/dev/null || true`), 30_000);
    const log = `${logFetch.stdout}\n${evidenceFetch.stdout}`;
    const evidence = parseCadenceEvidence(log, execution.stdout, execution.stderr);
    const status: CadenceExecutionStatus = execution.timedOut ? 'timeout' : execution.exitCode === 0 && evidence.generatorCompleted && evidence.checkAndSaveEvidence && !evidence.errorDetected ? 'succeeded' : 'failed';
    return { ...base, status, cadenceExecuted: true, dryRun: false, stdout: `${execution.stdout}\n${evidenceFetch.stdout}`, stderr: execution.stderr, exitCode: execution.exitCode, evidence, notes: status === 'succeeded' ? ['Virtuoso exited cleanly and the bridge captured generator completion plus dbSave evidence.'] : ['Cadence was started, but success was not proven by the required evidence markers.'] };
  } catch (error) {
    return { ...base, status: 'failed', cadenceExecuted: false, dryRun: false, stdout: '', stderr: error instanceof Error ? error.message : String(error), exitCode: null, evidence: emptyEvidence, notes: ['Cadence execution was not confirmed.'] };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function verifyCadenceBinary(config: CadenceBridgeConfig) {
  if (!config.enabled) return { ok: false, message: 'Cadence bridge is disabled.' };
  try {
    await execFileAsync('ssh', sshArgs(config, `test -x ${shellQuote(config.virtuosoPath)} && ${shellQuote(config.virtuosoPath)} -W 2>&1 | head -n 1`), { timeout: 30_000 });
    return { ok: true, message: 'Cadence executable is reachable and executable.' };
  } catch (error: any) {
    return { ok: false, message: error?.stderr || error?.message || 'Cadence executable check failed.' };
  }
}
