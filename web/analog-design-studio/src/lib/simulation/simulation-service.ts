/**
 * Simulation Service Abstraction
 *
 * Provides a clean interface for executing simulation jobs, retrieving status,
 * and handling bridge-enabled vs bridge-disabled dry runs.
 */

import { CadenceBridgeConfig } from '../cadence-bridge';
import { runSimulation, SimulationRunResult } from './sim-runner';
import { SimulationSession, SimulationSessionStore } from './simulation-session';
import { validateSimulationConfig } from './sim-validation';

export interface ISimulationRunner {
  run(session: SimulationSession, bridgeConfig: CadenceBridgeConfig): Promise<SimulationRunResult>;
  cancel(sessionId: string): Promise<void>;
}

export class SimulationService implements ISimulationRunner {
  private activeJobs: Map<string, boolean> = new Map();

  async run(session: SimulationSession, bridgeConfig: CadenceBridgeConfig): Promise<SimulationRunResult> {
    this.activeJobs.set(session.id, true);

    // Update execution status in session
    session.execution.status = 'PREPARING';
    session.execution.startedAt = new Date().toISOString();
    SimulationSessionStore.saveSession(session);

    const issues = validateSimulationConfig(session.simulation);
    const errors = issues.filter((i) => i.level === 'error');
    if (errors.length > 0) {
      session.execution.status = 'FAILED';
      session.execution.error = errors.map((e) => e.message).join(' ');
      SimulationSessionStore.saveSession(session);
      throw new Error(`Simulation configuration invalid: ${session.execution.error}`);
    }

    session.execution.status = 'GENERATING';
    SimulationSessionStore.saveSession(session);

    // Run using existing sim-runner engine
    const dryRun = !bridgeConfig.enabled;
    if (dryRun) {
      session.execution.status = 'DISABLED';
    } else {
      session.execution.status = 'RUNNING';
    }
    SimulationSessionStore.saveSession(session);

    try {
      const result = await runSimulation(session.design.designConfig, {
        dryRun,
        bridge: bridgeConfig,
      });

      session.execution.status = result.status === 'electrically-verified' || result.status === 'dry-run' || result.status === 'disabled'
        ? 'COMPLETED'
        : 'FAILED';
      session.execution.completedAt = new Date().toISOString();
      session.results = result;

      SimulationSessionStore.saveSession(session);
      this.activeJobs.delete(session.id);
      return result;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      session.execution.status = 'FAILED';
      session.execution.error = errMsg;
      session.execution.completedAt = new Date().toISOString();
      SimulationSessionStore.saveSession(session);
      this.activeJobs.delete(session.id);
      throw err;
    }
  }

  async cancel(sessionId: string): Promise<void> {
    this.activeJobs.delete(sessionId);
    const session = SimulationSessionStore.loadSession(sessionId);
    if (session) {
      session.execution.status = 'CANCELLED';
      session.execution.completedAt = new Date().toISOString();
      SimulationSessionStore.saveSession(session);
    }
  }
}

export const defaultSimulationService = new SimulationService();
