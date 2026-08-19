'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { SpecResult } from '@/lib/simulation/spec-evaluator';
import styles from './simulation.module.css';

export type SpecResultsTableProps = {
  specResults: SpecResult[];
  unmatchedSpecs?: string[];
};

export function SpecResultsTable({ specResults, unmatchedSpecs = [] }: SpecResultsTableProps) {
  if (!specResults || specResults.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        No specification evaluations recorded for this run.
      </div>
    );
  }

  // Sort failures first
  const sorted = [...specResults].sort((a, b) => (a.pass === b.pass ? 0 : a.pass ? 1 : -1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>SPECIFICATION METRIC</th>
            <th>MEASURED VALUE</th>
            <th>TARGET CONSTRAINT</th>
            <th>MARGIN</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((res, idx) => (
            <tr key={idx} style={{ backgroundColor: res.pass ? 'transparent' : 'var(--fail-bg)' }}>
              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {res.metric} <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>({res.sourceAnalysis})</span>
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                {res.value.toFixed(2)} {res.unit}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>
                {res.operator} {res.target} {res.unit}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)', color: res.margin >= 0 ? 'var(--success-text)' : 'var(--fail-text)' }}>
                {res.margin >= 0 ? `+${res.margin.toFixed(2)}` : res.margin.toFixed(2)} {res.unit}
              </td>
              <td>
                {res.pass ? (
                  <span className={styles.passTag}>
                    <CheckCircle2 size={14} />
                    <span>PASS</span>
                  </span>
                ) : (
                  <span className={styles.failTag}>
                    <XCircle size={14} />
                    <span>FAIL</span>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {unmatchedSpecs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--candidate-text)', backgroundColor: 'var(--candidate-bg)', padding: '8px 12px', borderRadius: 'var(--radius-xs)' }}>
          <AlertTriangle size={14} />
          <span>Enabled specs without matching simulation output: <b>{unmatchedSpecs.join(', ')}</b></span>
        </div>
      )}
    </div>
  );
}
