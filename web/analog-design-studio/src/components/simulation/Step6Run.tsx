'use client';

import React, { useEffect, useState } from 'react';
import { Play, CheckCircle2, Clock, Loader2, XCircle, AlertTriangle, Terminal } from 'lucide-react';
import { SimulationSession, SimulationJobStatus } from '@/lib/simulation/simulation-session';
import { BridgeOfflineState } from './BridgeOfflineState';
import { DryRunPreview } from './DryRunPreview';
import styles from './simulation.module.css';

export type Step6RunProps = {
  session: SimulationSession;
  onRunSimulation: () => Promise<void>;
  onCancelSimulation: () => void;
  onViewResults: () => void;
  onBackToConfigure: () => void;
};

const EXECUTION_PIPELINE_STEPS: Array<{ id: SimulationJobStatus; label: string }> = [
  { id: 'QUEUED', label: 'Preparing simulation environment' },
  { id: 'GENERATING', label: 'Synthesizing Spectre netlist deck (deck.scs)' },
  { id: 'STAGING', label: 'Staging simulation directory via SSH/SCP' },
  { id: 'RUNNING', label: 'Executing Spectre solver on Cadence VM' },
  { id: 'PARSING', label: 'Parsing binary PSF/ASCII results' },
  { id: 'EVALUATING', label: 'Evaluating target specifications & PASS/FAIL' },
];

export function Step6Run({ session, onRunSimulation, onCancelSimulation, onViewResults, onBackToConfigure }: Step6RunProps) {
  const [bridgeEnabled, setBridgeEnabled] = useState<boolean | null>(null);
  const [showDryRun, setShowDryRun] = useState<boolean>(false);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  useEffect(() => {
    async function checkBridge() {
      try {
        const res = await fetch('/api/simulation/run');
        const data = await res.json();
        setBridgeEnabled(data.enabled);
      } catch {
        setBridgeEnabled(false);
      }
    }
    checkBridge();
  }, []);

  const currentStatus = session.execution.status;
  const isRunning = ['PREPARING', 'GENERATING', 'STAGING', 'LAUNCHING', 'RUNNING', 'PARSING', 'EVALUATING'].includes(currentStatus);
  const isCompleted = currentStatus === 'COMPLETED';
  const isFailed = currentStatus === 'FAILED';
  const isDisabled = currentStatus === 'DISABLED' || bridgeEnabled === false;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      timer = setInterval(() => setElapsedSec((prev) => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning]);

  return (
    <div>
      <div className={styles.stepTitleGroup}>
        <h3 className={styles.stepTitle}>Run Simulation</h3>
        <p className={styles.stepSub}>
          Execute Spectre simulation job on Cadence Virtuoso server or preview dry-run setup.
        </p>
      </div>

      {bridgeEnabled === false && (
        <div style={{ marginBottom: '20px' }}>
          <BridgeOfflineState
            onTogglePreview={() => setShowDryRun(!showDryRun)}
            showPreview={showDryRun}
            onBackToConfigure={onBackToConfigure}
          />
          {showDryRun && <div style={{ marginTop: '16px' }}><DryRunPreview session={session} /></div>}
        </div>
      )}

      {bridgeEnabled !== false && (
        <div className={styles.configCard}>
          <div className={styles.configCardTitle}>
            <Terminal size={14} />
            <span>SPECTRE EXECUTION PIPELINE</span>
          </div>

          {!isRunning && !isCompleted && !isFailed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Click <b>Launch Spectre Simulation</b> below to stage netlist artifacts and execute the solver on the Cadence Virtuoso workstation.
              </p>
              <button type="button" className={styles.nextBtn} onClick={onRunSimulation} style={{ alignSelf: 'flex-start' }}>
                <Play size={15} />
                <span>Launch Spectre Simulation</span>
              </button>
            </div>
          )}

          {isRunning && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>SIMULATION IN PROGRESS... ({currentStatus})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} />
                  <span>{elapsedSec}s elapsed</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {EXECUTION_PIPELINE_STEPS.map((step) => {
                  return (
                    <div
                      key={step.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        padding: '6px 10px',
                        backgroundColor: 'var(--bg-sunken)',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      <Loader2 size={12} className="animate-spin" style={{ color: 'var(--accent)' }} />
                      <span>{step.label}</span>
                    </div>
                  );
                })}
              </div>

              <button type="button" className={styles.backBtn} onClick={onCancelSimulation} style={{ alignSelf: 'flex-start', color: 'var(--fail)' }}>
                <span>Cancel Simulation</span>
              </button>
            </div>
          )}

          {isCompleted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success-text)', backgroundColor: 'var(--success-bg)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--success-border)' }}>
                <CheckCircle2 size={20} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>Simulation Completed Successfully</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>All analyses and measurement extractions finished cleanly.</div>
                </div>
              </div>
              <button type="button" className={styles.nextBtn} onClick={onViewResults} style={{ alignSelf: 'flex-start' }}>
                <span>View Results Dashboard →</span>
              </button>
            </div>
          )}

          {isFailed && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--fail-text)', backgroundColor: 'var(--fail-bg)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--fail-border)' }}>
                <XCircle size={20} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>Simulation Execution Failed</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{session.execution.error || 'An error occurred during Spectre execution or measurement extraction.'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
