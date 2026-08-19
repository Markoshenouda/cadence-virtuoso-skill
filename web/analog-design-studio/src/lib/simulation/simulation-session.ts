/**
 * SimulationSession Persistence Store
 *
 * Manages simulation session state in localStorage with clean abstraction
 * (SimulationSessionStore). Isolates component code from direct storage access.
 */

import { DesignConfig } from '../validation';
import { SimulationConfigForm, SimValidationIssue } from './sim-validation';
import { SimulationRunResult } from './sim-runner';

export type SimulationJobStatus =
  | 'QUEUED'
  | 'PREPARING'
  | 'GENERATING'
  | 'STAGING'
  | 'LAUNCHING'
  | 'RUNNING'
  | 'PARSING'
  | 'EVALUATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'DISABLED';

export type SimulationSession = {
  id: string;
  createdAt: string;
  updatedAt: string;
  design: {
    circuitId: string;
    topologyId: string;
    technologyId: string;
    topologyName: string;
    generatorPath: string;
    designConfig: DesignConfig;
  };
  simulation: SimulationConfigForm;
  wizard: {
    currentStep: number;
    completedSteps: number[];
  };
  execution: {
    status: SimulationJobStatus;
    jobId: string | null;
    startedAt: string | null;
    completedAt: string | null;
    error: string | null;
    elapsedMs: number;
  };
  results: SimulationRunResult | null;
};

const STORAGE_PREFIX = 'ads_sim_session_';
const HISTORY_KEY = 'ads_sim_history';

export class SimulationSessionStore {
  /** Create a new session initialized with design config */
  static createSession(
    circuitId: string,
    topologyId: string,
    technologyId: string,
    topologyName: string,
    generatorPath: string,
    designConfig: DesignConfig
  ): SimulationSession {
    const id = `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const session: SimulationSession = {
      id,
      createdAt: now,
      updatedAt: now,
      design: {
        circuitId,
        topologyId,
        technologyId,
        topologyName,
        generatorPath,
        designConfig,
      },
      simulation: {
        simulationType: 'AC',
        fStart: 1,
        fStop: 1e9,
        pointsPerDecade: 50,
        tStop: 100,
        tStep: 0.1,
        dcSweepStart: 0,
        dcSweepStop: designConfig.vdd || 1.2,
        dcSweepStep: 0.01,
        vdd: designConfig.vdd || 1.2,
        temperature: designConfig.temperature || 27,
        corner: designConfig.corner || 'TT',
        commonModeV: (designConfig.vdd || 1.2) / 2,
        acMag: 1.0,
        selectedOutputs: ['gain', 'gbw', 'phaseMargin', 'power'],
        specs: [],
      },
      wizard: {
        currentStep: 1,
        completedSteps: [],
      },
      execution: {
        status: 'QUEUED',
        jobId: null,
        startedAt: null,
        completedAt: null,
        error: null,
        elapsedMs: 0,
      },
      results: null,
    };

    this.saveSession(session);
    return session;
  }

  /** Load session by ID */
  static loadSession(id: string): SimulationSession | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      if (!raw) return null;
      return JSON.parse(raw) as SimulationSession;
    } catch {
      return null;
    }
  }

  /** Save session to store */
  static saveSession(session: SimulationSession): void {
    if (typeof window === 'undefined') return;
    try {
      session.updatedAt = new Date().toISOString();
      localStorage.setItem(`${STORAGE_PREFIX}${session.id}`, JSON.stringify(session));

      // Append to history list if not present
      const history = this.listSessions();
      const existingIdx = history.findIndex((h) => h.id === session.id);
      if (existingIdx >= 0) {
        history[existingIdx] = session;
      } else {
        history.unshift(session);
      }
      // Cap history to 20 items
      const trimmed = history.slice(0, 20);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Failed to save simulation session to localStorage', e);
    }
  }

  /** Delete session by ID */
  static deleteSession(id: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
      const history = this.listSessions().filter((s) => s.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to delete simulation session', e);
    }
  }

  /** List all sessions in history */
  static listSessions(): SimulationSession[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SimulationSession[];
    } catch {
      return [];
    }
  }
}
