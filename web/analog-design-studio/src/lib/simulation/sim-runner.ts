/**
 * Spectre simulation runner. Stages a generated deck on the Cadence VM
 * through the existing bridge SSH/SCP machinery, runs netlist-mode Spectre,
 * fetches psfascii results, extracts measurements, and evaluates specs.
 * Every stage is reported separately; nothing is collapsed into one boolean.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { DesignConfig } from '../validation';
import { getSimulationContract, type SimulationContract } from './simulation-contract';
import { buildSpectreDeck } from './spectre-deck';
import { parsePsfDc, parsePsfSweep, type DcResults, type SweepResults } from './psf-parser';
import { extractMeasurements, MeasurementError } from './measurements';
import { evaluateSpecifications, type SpecResult } from './spec-evaluator';
import { runProcess, scpArgs, shellQuote, sshArgs, type CadenceBridgeConfig } from '../cadence-bridge';

export type SimulationStatus =
  | 'dry-run' | 'disabled'
  | 'staging-failed' | 'sim-failed' | 'timeout'
  | 'measurement-failed' | 'specs-failed' | 'electrically-verified';

export type SimulationRunResult = {
  status: SimulationStatus;
  topologyId: string;
  technologyId: string;
  profile: string;
  stages: {
    deckGenerated: boolean;
    staged: boolean;
    launched: boolean;
    exitCode: number | null;
    analysesCompleted: string[];
    measurementsExtracted: boolean;
    specEvaluationCompleted: boolean;
    specsPassed: boolean | null;
  };
  deck: string;
  measurements: Record<string, number> | null;
  specResults: SpecResult[];
  unmatchedSpecs: string[];
  evidence: Record<string, string | boolean>;
  remoteFiles: { deck: string; log: string; rawDir: string };
  stdout: string;
  stderr: string;
  notes: string[];
};

function buildEvidence(stages: SimulationRunResult['stages'], status: SimulationStatus): Record<string, string | boolean> {
  const ok = status === 'electrically-verified';
  return {
    SIMULATION_STATUS: ok ? 'SUCCEEDED' : status === 'dry-run' || status === 'disabled' ? 'NOT_RUN' : 'FAILED',
    ANALYSIS_DC: stages.analysesCompleted.includes('dc') ? 'COMPLETED' : 'MISSING',
    ANALYSIS_AC: stages.analysesCompleted.includes('ac') ? 'COMPLETED' : 'MISSING',
    ANALYSIS_TRAN: stages.analysesCompleted.includes('tran') ? 'COMPLETED' : 'MISSING',
    MEASUREMENTS_EXTRACTED: stages.measurementsExtracted,
    SPEC_EVALUATION_COMPLETED: stages.specEvaluationCompleted,
    ELECTRICALLY_VERIFIED: ok,
  };
}

function baseResult(contract: SimulationContract, deck: string, stem: string): SimulationRunResult {
  return {
    status: 'dry-run',
    topologyId: contract.topologyId,
    technologyId: contract.technologyId,
    profile: contract.profile.id,
    stages: { deckGenerated: true, staged: false, launched: false, exitCode: null, analysesCompleted: [], measurementsExtracted: false, specEvaluationCompleted: false, specsPassed: null },
    deck,
    measurements: null,
    specResults: [],
    unmatchedSpecs: [],
    evidence: {},
    remoteFiles: { deck: `${stem}/deck.scs`, log: `${stem}/spectre.log`, rawDir: `${stem}/raw` },
    stdout: '',
    stderr: '',
    notes: [],
  };
}

export async function runSimulation(
  config: DesignConfig,
  options: { dryRun?: boolean; bridge: CadenceBridgeConfig },
): Promise<SimulationRunResult> {
  const contract = getSimulationContract(config.topologyId, config.technologyId);
  const deck = buildSpectreDeck(config, contract, { spectreModel: options.bridge.spectreModel, corner: config.corner });
  const stem = `${options.bridge.remoteWorkdir}/sim/${contract.topologyId}_${Date.now()}`;
  const result = baseResult(contract, deck, stem);

  if (!options.bridge.enabled) {
    result.status = 'disabled';
    result.notes.push('Simulation bridge is disabled. Set CADENCE_BRIDGE_ENABLED=true or use dryRun=true.');
    result.evidence = buildEvidence(result.stages, result.status);
    return result;
  }
  if (options.dryRun) {
    result.notes.push('Dry-run: deck generated; no SSH/SCP/Spectre process was started.');
    result.evidence = buildEvidence(result.stages, result.status);
    return result;
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'ads-sim-'));
  const localDeck = path.join(tempDir, 'deck.scs');
  try {
    await writeFile(localDeck, deck, 'utf8');
    const mkdir = await runProcess('ssh', sshArgs(options.bridge, `mkdir -p ${shellQuote(stem)}`), 30_000);
    if (mkdir.exitCode !== 0) throw new Error(`Remote simulation directory failed: ${mkdir.stderr || mkdir.stdout}`);
    const upload = await runProcess('scp', scpArgs(options.bridge, localDeck, `${stem}/deck.scs`), 60_000);
    if (upload.exitCode !== 0) throw new Error(`Deck upload failed: ${upload.stderr || upload.stdout}`);
    result.stages.staged = true;

    // Env assignment must PREFIX the spectre command: a standalone assignment
    // between && segments is not exported to the child process.
    const runCommand = `cd ${shellQuote(stem)} && LD_LIBRARY_PATH=${shellQuote(options.bridge.spectreLdLibraryPath)} ${shellQuote(options.bridge.spectreBin)} deck.scs -format=psfascii -raw raw +log spectre.log`;
    const run = await runProcess('ssh', sshArgs(options.bridge, runCommand), Math.max(options.bridge.timeoutMs, 30_000));
    result.stages.launched = true;
    result.stages.exitCode = run.exitCode;
    result.stdout = run.stdout;
    result.stderr = run.stderr;

    const logFetch = await runProcess('ssh', sshArgs(options.bridge, `cat ${shellQuote(`${stem}/spectre.log`)} 2>/dev/null || true`), 30_000);
    result.stdout = `${run.stdout}\n${logFetch.stdout}`;

    if (run.exitCode !== 0) {
      result.status = run.timedOut ? 'timeout' : 'sim-failed';
      result.notes.push(run.timedOut ? 'Spectre did not finish before the timeout.' : 'Spectre reported a nonzero exit status.');
      result.evidence = buildEvidence(result.stages, result.status);
      return result;
    }

    const analyses: { dc?: DcResults; ac?: SweepResults; tran?: SweepResults } = {};
    for (const analysis of contract.profile.analyses) {
      const file = analysis.kind === 'dc' ? 'raw/dcop.dc' : analysis.kind === 'ac' ? 'raw/ac1.ac' : 'raw/tran1.tran';
      const fetch = await runProcess('ssh', sshArgs(options.bridge, `cat ${shellQuote(`${stem}/${file}`)} 2>/dev/null || true`), 30_000);
      if (!fetch.stdout.trim()) continue;
      try {
        if (analysis.kind === 'dc') analyses.dc = parsePsfDc(fetch.stdout);
        else analyses[analysis.kind === 'ac' ? 'ac' : 'tran'] = parsePsfSweep(fetch.stdout);
        result.stages.analysesCompleted.push(analysis.kind);
      } catch {
        result.notes.push(`Result parsing failed for ${analysis.kind}.`);
      }
    }
    const missing = contract.profile.analyses.filter(a => !result.stages.analysesCompleted.includes(a.kind));
    if (missing.length > 0) {
      result.status = 'sim-failed';
      result.notes.push(`Analyses did not complete: ${missing.map(a => a.kind).join(', ')}.`);
      result.evidence = buildEvidence(result.stages, result.status);
      return result;
    }

    try {
      const outcome = extractMeasurements(contract, analyses);
      result.measurements = outcome.values;
      result.notes.push(...outcome.notes);
      result.stages.measurementsExtracted = true;
    } catch (error) {
      result.status = 'measurement-failed';
      result.notes.push(error instanceof Error ? error.message : String(error));
      result.evidence = buildEvidence(result.stages, result.status);
      return result;
    }

    const evaluation = evaluateSpecifications(config, result.measurements);
    result.specResults = evaluation.results;
    result.unmatchedSpecs = evaluation.unmatched;
    result.stages.specEvaluationCompleted = true;
    const allPass = evaluation.results.length > 0 && evaluation.results.every(r => r.pass);
    result.stages.specsPassed = allPass;
    result.status = allPass ? 'electrically-verified' : 'specs-failed';
    if (evaluation.unmatched.length > 0) result.notes.push(`Enabled specs without a matching measurement: ${evaluation.unmatched.join(', ')}.`);
    result.evidence = buildEvidence(result.stages, result.status);
    return result;
  } catch (error) {
    result.status = 'staging-failed';
    result.stderr = error instanceof Error ? error.message : String(error);
    result.notes.push('Simulation staging or execution failed.');
    result.evidence = buildEvidence(result.stages, result.status);
    return result;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
