'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SimulationSession, SimulationSessionStore } from '@/lib/simulation/simulation-session';
import { SimulationResults } from '@/components/simulation/SimulationResults';
import styles from '@/components/simulation/simulation.module.css';

export default function SimulationResultsPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const [session, setSession] = useState<SimulationSession | null>(null);

  useEffect(() => {
    const loaded = SimulationSessionStore.loadSession(params.sessionId);
    if (loaded) {
      setSession(loaded);
    }
  }, [params.sessionId]);

  if (!session) {
    return (
      <div className={styles.wizardContainer} style={{ padding: '60px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Results Not Found</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
          Simulation session <code>{params.sessionId}</code> could not be loaded.
        </p>
        <button
          type="button"
          className={styles.nextBtn}
          onClick={() => router.push('/simulation')}
          style={{ marginTop: '16px', display: 'inline-flex' }}
        >
          <span>Back to Simulation Workspace →</span>
        </button>
      </div>
    );
  }

  return <SimulationResults session={session} />;
}
