'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Activity, Sparkles, ArrowRight } from 'lucide-react';
import { SimulationSessionStore } from '@/lib/simulation/simulation-session';
import { SimulationHistory } from '@/components/simulation/SimulationHistory';
import styles from '@/components/simulation/simulation.module.css';

export default function SimulationLandingPage() {
  const router = useRouter();

  useEffect(() => {
    const sessions = SimulationSessionStore.listSessions();
    if (sessions.length > 0) {
      router.push(`/simulation/${sessions[0].id}`);
    }
  }, [router]);

  return (
    <div className={styles.wizardContainer} style={{ padding: '40px 0' }}>
      <div className={styles.wizardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Activity size={24} style={{ color: 'var(--accent)' }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Analog IC Simulation Environment</h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Configure electrical verification analyses, sweep limits, output metrics, and target specifications for parameterized analog topologies.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.wizardBody} style={{ textAlign: 'center', padding: '50px 20px' }}>
        <Sparkles size={32} style={{ color: 'var(--accent)', marginBottom: '12px' }} />
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>No Active Simulation Session</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '480px', margin: '4px auto 20px auto' }}>
          Configure an analog topology in the Design Wizard to automatically generate Cadence SKILL code and launch a dedicated simulation session.
        </p>

        <Link href="/new" className={styles.nextBtn} style={{ display: 'inline-flex' }}>
          <Sparkles size={15} />
          <span>Configure New Design in Studio</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <SimulationHistory />
    </div>
  );
}
