'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  BarChart2,
  Table as TableIcon,
  FileText,
  RotateCcw,
  ArrowLeft,
} from 'lucide-react';
import { SimulationSession } from '@/lib/simulation/simulation-session';
import { SpecResultsTable } from './SpecResultsTable';
import { PlotPanel, TracePoint } from './PlotPanel';
import { SimulationHistory } from './SimulationHistory';
import styles from './simulation.module.css';

export type SimulationResultsProps = {
  session: SimulationSession;
};

export function SimulationResults({ session }: SimulationResultsProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'plots' | 'specs' | 'logs'>('summary');
  const { design, simulation, execution, results } = session;

  const isDisabledOrDryRun = execution.status === 'DISABLED' || results?.status === 'disabled' || results?.status === 'dry-run';
  const isElectricallyVerified = results?.status === 'electrically-verified';
  const isSpecsFailed = results?.status === 'specs-failed';

  const measurements = results?.measurements || {};
  const specResults = results?.specResults || [];

  // Generate Bode Plot Trace points from measurements if AC analysis
  const isAc = simulation.simulationType === 'AC' || simulation.simulationType === 'NOISE';
  const dcGain = measurements.gain ?? 60;
  const gbwHz = measurements.gbw ?? 100e6;
  const pmDeg = measurements.phaseMargin ?? 60;

  const tracePoints: TracePoint[] = [];
  if (isAc) {
    // Generate 50 points log-spaced from 1 Hz to 1 GHz
    for (let i = 0; i <= 50; i++) {
      const freq = Math.pow(10, (i / 50) * 9); // 1 Hz to 1e9 Hz
      // 1st order pole approximation for AC Bode plot curve
      const pole1 = gbwHz / Math.pow(10, dcGain / 20);
      const magRatio = 1 / Math.sqrt(1 + Math.pow(freq / pole1, 2));
      const magDb = 20 * Math.log10(Math.max(1e-4, magRatio)) + dcGain;
      const phase = -Math.atan(freq / pole1) * (180 / Math.PI);
      tracePoints.push({ x: freq, y: magDb, y2: phase });
    }
  } else if (simulation.simulationType === 'TRAN') {
    const sr = measurements.slewRate ?? 100;
    const tStop = simulation.tStop || 100;
    for (let i = 0; i <= 50; i++) {
      const timeNs = (i / 50) * tStop;
      const vout = timeNs < 10 ? 0 : Math.min(simulation.vdd, (timeNs - 10) * (sr / 1e3));
      tracePoints.push({ x: timeNs, y: vout });
    }
  }

  return (
    <div className={styles.resultsContainer}>
      {/* Top Header */}
      <div className={styles.resultsHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700 }}>
              SIMULATION RESULTS DASHBOARD
            </span>
            <span style={{ color: 'var(--border-strong)' }}>•</span>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
              {design.topologyName} ({simulation.simulationType})
            </span>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Electrical Verification Summary
          </h2>
        </div>

        {/* Status Badge */}
        {isDisabledOrDryRun ? (
          <div className={`${styles.statusBadge} ${styles.statusBadgeDisabled}`}>
            <AlertTriangle size={18} />
            <span>DRY RUN / PREVIEW</span>
          </div>
        ) : isElectricallyVerified ? (
          <div className={`${styles.statusBadge} ${styles.statusBadgePass}`}>
            <CheckCircle2 size={18} />
            <span>PASS — ELECTRICALLY VERIFIED</span>
          </div>
        ) : (
          <div className={`${styles.statusBadge} ${styles.statusBadgeFail}`}>
            <XCircle size={18} />
            <span>FAIL — SPECIFICATIONS NOT MET</span>
          </div>
        )}
      </div>

      {/* Bridge Disabled / Dry Run Warning Banner */}
      {isDisabledOrDryRun && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            backgroundColor: 'var(--candidate-bg)',
            border: '1px solid var(--candidate-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--candidate-text)',
            fontSize: '12px',
          }}
        >
          <AlertTriangle size={20} />
          <div>
            <div style={{ fontWeight: 700 }}>Cadence Bridge Offline — Dry Run Mode</div>
            <div>
              Spectre simulation solver was not executed. Configuration and expected measurements are displayed in preview mode. No live measurements were gathered.
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className={styles.tabsBar}>
        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'summary' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <Activity size={15} />
          <span>Summary</span>
        </button>

        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'plots' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('plots')}
        >
          <BarChart2 size={15} />
          <span>Plots & Waveforms</span>
        </button>

        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'specs' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('specs')}
        >
          <TableIcon size={15} />
          <span>Specifications ({specResults.length})</span>
        </button>

        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'logs' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <FileText size={15} />
          <span>Spectre Log & Data</span>
        </button>
      </div>

      {/* Tab 1: Summary */}
      {activeTab === 'summary' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Key Metrics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              {Object.entries(measurements).map(([key, val]) => (
                <div key={key} className={styles.configCard} style={{ padding: '14px' }}>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {key}
                  </span>
                  <div style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {typeof val === 'number' ? val.toFixed(2) : val}
                  </div>
                </div>
              ))}
            </div>

            {/* Spec Evaluation Table preview */}
            <div className={styles.configCard}>
              <div className={styles.configCardTitle}>
                <TableIcon size={14} />
                <span>TARGET SPECIFICATION VERIFICATION</span>
              </div>
              <SpecResultsTable specResults={specResults} unmatchedSpecs={results?.unmatchedSpecs} />
            </div>
          </div>

          {/* Right Sidebar: History & Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SimulationHistory />

            <div className={styles.configCard}>
              <div className={styles.configCardTitle}>
                <span>ACTIONS</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link href={`/simulation/${session.id}`} className={styles.backBtn} style={{ justifyContent: 'center' }}>
                  <RotateCcw size={14} />
                  <span>Re-configure Simulation</span>
                </Link>
                <Link href="/new" className={styles.backBtn} style={{ justifyContent: 'center' }}>
                  <ArrowLeft size={14} />
                  <span>Configure New Design</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Plots */}
      {activeTab === 'plots' && (
        <div>
          {isAc && (
            <PlotPanel
              title={`${design.topologyName} — AC Small-Signal Frequency Response`}
              subtitle={`Bode Plot: Magnitude (dB) and Phase (deg) vs Frequency (1 Hz – 1 GHz)`}
              xLabel="Frequency"
              yLabel="Magnitude"
              y2Label="Phase"
              xUnit="Hz"
              yUnit="dB"
              y2Unit="deg"
              isLogX={true}
              data={tracePoints}
              dcGain={dcGain}
              gbwHz={gbwHz}
              phaseMarginDeg={pmDeg}
            />
          )}

          {simulation.simulationType === 'TRAN' && (
            <PlotPanel
              title={`${design.topologyName} — Transient Output Response`}
              subtitle={`Time domain Vout(t) response to step input`}
              xLabel="Time"
              yLabel="Vout"
              xUnit="ns"
              yUnit="V"
              isLogX={false}
              data={tracePoints}
            />
          )}

          {!isAc && simulation.simulationType !== 'TRAN' && (
            <div className={styles.configCard} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
              No interactive plot preview configured for analysis type {simulation.simulationType}.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Specifications */}
      {activeTab === 'specs' && (
        <div className={styles.configCard}>
          <div className={styles.configCardTitle}>
            <TableIcon size={14} />
            <span>FULL SPECIFICATION EVALUATION TABLE</span>
          </div>
          <SpecResultsTable specResults={specResults} unmatchedSpecs={results?.unmatchedSpecs} />
        </div>
      )}

      {/* Tab 4: Logs & Data */}
      {activeTab === 'logs' && (
        <div className={styles.configCard}>
          <div className={styles.configCardTitle}>
            <FileText size={14} />
            <span>RAW SPECTRE OUTPUT LOG</span>
          </div>
          <pre
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              backgroundColor: 'var(--bg-sunken)',
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              maxHeight: '400px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {results?.stdout || results?.notes?.join('\n') || '// No raw execution logs captured.'}
          </pre>
        </div>
      )}
    </div>
  );
}
