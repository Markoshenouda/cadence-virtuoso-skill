'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, Cpu, Sliders, Target, Shield } from 'lucide-react';
import { SimulationSession } from '@/lib/simulation/simulation-session';
import { validateSimulationConfig } from '@/lib/simulation/sim-validation';
import styles from './simulation.module.css';

export type Step5ReviewProps = {
  session: SimulationSession;
};

export function Step5Review({ session }: Step5ReviewProps) {
  const { design, simulation } = session;
  const issues = validateSimulationConfig(simulation);
  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  return (
    <div>
      <div className={styles.stepTitleGroup}>
        <h3 className={styles.stepTitle}>Review Simulation Setup</h3>
        <p className={styles.stepSub}>
          Verify design topology, environmental conditions, sweep bounds, output selections, and target specs before execution.
        </p>
      </div>

      {/* Validation Status Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: errors.length > 0 ? 'var(--fail-bg)' : 'var(--success-bg)',
          border: `1px solid ${errors.length > 0 ? 'var(--fail-border)' : 'var(--success-border)'}`,
          marginBottom: '20px',
        }}
      >
        {errors.length > 0 ? (
          <AlertTriangle size={20} style={{ color: 'var(--fail)' }} />
        ) : (
          <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
        )}

        <div>
          <div style={{ fontWeight: 700, fontSize: '13px', color: errors.length > 0 ? 'var(--fail-text)' : 'var(--success-text)' }}>
            {errors.length > 0 ? `Setup Incomplete (${errors.length} errors)` : 'Ready to Run Simulation'}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
            {errors.length > 0
              ? errors.map((e) => e.message).join(' ')
              : 'All configuration parameters are valid and ready for Spectre netlisting.'}
          </div>
        </div>
      </div>

      <div className={styles.configSections}>
        {/* Design Summary Card */}
        <div className={styles.configCard}>
          <div className={styles.configCardTitle}>
            <Cpu size={14} />
            <span>DESIGN & TOPOLOGY</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Topology:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{design.topologyName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Technology:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{design.technologyId} (TSMC 65nm)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Generator SKILL:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{design.generatorPath}</span>
            </div>
          </div>
        </div>

        {/* Analysis & Environment Card */}
        <div className={styles.configCard}>
          <div className={styles.configCardTitle}>
            <Sliders size={14} />
            <span>ANALYSIS & ENVIRONMENT</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Analysis Type:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>{simulation.simulationType}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Supply VDD:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{simulation.vdd} V</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Temperature:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{simulation.temperature} °C</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Process Corner:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{simulation.corner}</span>
            </div>
          </div>
        </div>

        {/* Outputs & Specs Card */}
        <div className={styles.configCard}>
          <div className={styles.configCardTitle}>
            <Target size={14} />
            <span>MEASUREMENTS & SPECS</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Selected Outputs:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{simulation.selectedOutputs.length} metrics</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Target Specifications:</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{simulation.specs.length} specs ({simulation.specs.filter((s) => s.priority === 'Must Have').length} Must Have)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
