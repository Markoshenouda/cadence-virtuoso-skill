'use client';

import React from 'react';
import Link from 'next/link';
import { History, ChevronRight, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { SimulationSessionStore } from '@/lib/simulation/simulation-session';
import styles from './simulation.module.css';

export function SimulationHistory() {
  const sessions = SimulationSessionStore.listSessions();

  if (!sessions || sessions.length === 0) {
    return null;
  }

  return (
    <div className={styles.configCard}>
      <div className={styles.configCardTitle}>
        <History size={14} />
        <span>SIMULATION HISTORY</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sessions.slice(0, 5).map((sess) => {
          const isPassed = sess.results?.stages?.specsPassed === true;
          const isFailed = sess.results?.stages?.specsPassed === false;

          return (
            <Link
              key={sess.id}
              href={`/simulation/${sess.id}/results`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xs)',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isPassed ? (
                  <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />
                ) : isFailed ? (
                  <XCircle size={13} style={{ color: 'var(--fail)' }} />
                ) : (
                  <AlertCircle size={13} style={{ color: 'var(--candidate)' }} />
                )}
                <div>
                  <div style={{ fontWeight: 600 }}>{sess.design.topologyName}</div>
                  <div style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                    {sess.simulation.simulationType} | {sess.simulation.corner} | {new Date(sess.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <ChevronRight size={12} style={{ color: 'var(--text-tertiary)' }} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
