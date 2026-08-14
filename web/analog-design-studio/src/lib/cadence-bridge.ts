import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
  timeoutMs: number;
  sshKeyPath?: string;
};

export type CadenceExecutionStatus = 'disabled' | 'dry-run' | 'staged' | 'succeeded' | 'failed' | 'timeout';

export type CadenceExecutionResult = {
  status: CadenceExecutionStatus;
  cadenceExecuted: boolean;
  dryRun: boolean;
  topologyId: string;
  technologyId: string;
  sourceGenerator: string;
  remoteFiles: { artifact: string; wrapper: string; log: string };
  command: string[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  evidence: {
    processStarted: boolean;
    processExited: boolean;
    checkAndSaveRequested: boolean;
    checkAndSaveEvidence: boolean;
    errorDetected: boolean;
    warningDetected: boolean;
    logCaptured: boolean;
  };
};

const DEFAULT_VIRTUOSO = '/usr/local/cadence/IC617/tools/dfII/bin/virtuoso';
const DEFAULT_TIMEOUT = 180_000;
const SAFE_REMOTE = /^[A-Za-z0-9_./-]+$/;

function envBool(value: string | undefined, fallback = false) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getCadenceBridgeConfig(env: NodeJS.ProcessEnv = process.env): CadenceBridgeConfig {
  const remoteWorkdir = env.CADENCE_REMOTE_WORKDIR ?? '/home/cadence/Desktop/analog-design-studio-runs';
  const host = env.CADENCE_SSH_HOST ?? '192.168.75.217';
  const user = env.CADENCE_SSH_USER ?? 'cadence';
  const virtuosoPath = env.CADENCE_VIRTUOSO_PATH ?? DEFAULT_VIRTUOSO;
  if (![host, user, remoteWorkdir, virtuosoPath].every((v) => v && SAFE_REMOTE.test(v))) {
    throw new Error('Cadence bridge configuration contains an unsafe path or host value.');
  }
  return {
    enabled: envBool(env.CADENCE_BRIDGE_ENABLED),
    host,
    user,
    remoteWorkdir,
    virtuosoPath,
    timeoutMs: positiveInt(env.CADENCE_TIMEOUT_MS, DEFAULT_TIMEOUT),
    sshKeyPath: env.CADENCE_SSH_KEY,
  };
}

function safeName(value: string) {
  return value.replace(/[^A-Za-z0-9_-]/g, '_');
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function sshArgs(config: CadenceBridgeConfig, command: string[]) {
  const args: string[] = [];
  if (config.sshKeyPath) args.push('-i', config.sshKeyPath);
  args.push(`${config.user}@${config.host}`, command.map(shellQuote).join(' '));
  return args;
}

function scpArgs(config: CadenceBridgeConfig, local: string, remote: string) {
  const args: string[] = [];
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
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => { stderr += `${error.message}\n`; });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code, timedOut });
    });
  });
}

export function buildCadenceWrapper(artifactRemotePath: string, invocation: string) {
  if (!/^Create[A-Za-z0-9_]+\(\)$/.test(invocation)) {
    throw new Error('Generator invocation is not an approved zero-argument repository procedure.');
  }
  if (!SAFE_REMOTE.test(artifactRemotePath)) throw new Error('Unsafe remote artifact path.');
  return [
    `printf("ADS_BRIDGE_START topology generator\\n")`,
    `load(${JSON.stringify(artifactRemotePath)})`,
    `${invocation}`,
    `printf("ADS_BRIDGE_GENERATOR_DONE\\n")`,
    `printf("ADS_BRIDGE_CHECK_AND_SAVE_REQUIRED\\n")`,
    `exit()`,
    '',
  ].join('\n');
}

export function parseCadenceEvidence(log: string, stdout = '', stderr = '') {
  const combined = `${log}\n${stdout}\n${stderr}`;
  const errorDetected = /(?:^|\n).*?(?:ERROR|Error|*Error*|FATAL|fatal)/.test(combined);
  const warningDetected = /(?:WARNING|Warning|WARN)/.test(combined);
  return {
    processStarted: /ADS_BRIDGE_START/.test(combined),
    processExited: /ADS_BRIDGE_GENERATOR_DONE/.test(combined),
    checkAndSaveRequested: /ADS_BRIDGE_CHECK_AND_SAVE_REQUIRED/.test(combined),
    checkAndSaveEvidence: /(?:Check\s*(?:and|&)\s*Save|checkAndSave|CHECK_AND_SAVE)/i.test(combined),
    errorDetected,
    warningDetected,
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
  const command = [bridge.virtuosoPath, '-nograph', '-restore', remoteWrapper, '-log', remoteLog];
  const base = {
    topologyId: config.topologyId,
    technologyId: config.technologyId,
    sourceGenerator: contract.source.path,
    remoteFiles: { artifact: remoteArtifact, wrapper: remoteWrapper, log: remoteLog },
    command,
  };

  if (!bridge.enabled) return { ...base, status: options.dryRun ? 'dry-run' : 'disabled', cadenceExecuted: false, dryRun: Boolean(options.dryRun), stdout: '', stderr: '', exitCode: null, evidence: { processStarted: false, processExited: false, checkAndSaveRequested: false, checkAndSaveEvidence: false, errorDetected: false, warningDetected: false, logCaptured: false } };
  if (options.dryRun) return { ...base, status: 'dry-run', cadenceExecuted: false, dryRun: true, stdout: '', stderr: '', exitCode: null, evidence: { processStarted: false, processExited: false, checkAndSaveRequested: true, checkAndSaveEvidence: false, errorDetected: false, warningDetected: false, logCaptured: false } };

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'analog-design-studio-'));
  const localArtifact = path.join(tempDir, artifact.filename);
  const localWrapper = path.join(tempDir, 'run.restore.il');
  try {
    await writeFile(localArtifact, artifact.content, 'utf8');
    await writeFile(localWrapper, buildCadenceWrapper(remoteArtifact, contract.source.invocation), 'utf8');
    const mkdir = await runProcess('ssh', sshArgs(bridge, ['mkdir', '-p', remoteDir]), 30_000);
    if (mkdir.exitCode !== 0) throw new Error(`Remote staging directory failed: ${mkdir.stderr || mkdir.stdout}`);
    const uploadArtifact = await runProcess('scp', scpArgs(bridge, localArtifact, remoteArtifact), 60_000);
    if (uploadArtifact.exitCode !== 0) throw new Error(`Artifact upload failed: ${uploadArtifact.stderr || uploadArtifact.stdout}`);
    const uploadWrapper = await runProcess('scp', scpArgs(bridge, localWrapper, remoteWrapper), 60_000);
    if (uploadWrapper.exitCode !== 0) throw new Error(`Wrapper upload failed: ${uploadWrapper.stderr || uploadWrapper.stdout}`);
    const remoteCommand = `cd ${shellQuote(remoteDir)} && exec ${command.map(shellQuote).join(' ')}`;
    const execution = await runProcess('ssh', (() => { const args: string[] = []; if (bridge.sshKeyPath) args.push('-i', bridge.sshKeyPath); args.push(`${bridge.user}@${bridge.host}`, remoteCommand); return args; })(), bridge.timeoutMs);
    const logFetch = await runProcess('ssh', sshArgs(bridge, ['cat', remoteLog]), 30_000);
    const log = `${logFetch.stdout}${logFetch.stderr}`;
    const evidence = parseCadenceEvidence(log, execution.stdout, execution.stderr);
    const status: CadenceExecutionStatus = execution.timedOut ? 'timeout' : execution.exitCode === 0 && evidence.processStarted && evidence.processExited && !evidence.errorDetected ? 'succeeded' : 'failed';
    return { ...base, status, cadenceExecuted: true, dryRun: false, stdout: execution.stdout, stderr: execution.stderr, exitCode: execution.exitCode, evidence };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function verifyCadenceBinary(config: CadenceBridgeConfig) {
  if (!config.enabled) return { ok: false, message: 'Cadence bridge is disabled.' };
  const result = await execFileAsync('ssh', sshArgs(config, ['test', '-x', config.virtuosoPath]), { timeout: 30_000 }).catch((error: any) => ({ stdout: '', stderr: error?.message ?? String(error) }));
  return { ok: !('stderr' in result) || !result.stderr, message: ('stderr' in result && result.stderr) ? result.stderr : 'Cadence executable is reachable.' };
}
