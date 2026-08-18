'use client';

import React from 'react';
import { Terminal, FileCode } from 'lucide-react';
import { SimulationSession } from '@/lib/simulation/simulation-session';
import { buildSpectreDeck } from '@/lib/simulation/spectre-deck';
import { getSimulationContract } from '@/lib/simulation/simulation-contract';
import styles from './simulation.module.css';

export type DryRunPreviewProps = {
  session: SimulationSession;
};

export function DryRunPreview({ session }: DryRunPreviewProps) {
  const { design, simulation } = session;

  let generatedDeck = '// Spectre netlist preview generation...';
  try {
    const contract = getSimulationContract(design.topologyId, design.technologyId);
    generatedDeck = buildSpectreDeck(design.designConfig, contract, {
      spectreModel: 'tsmcN65/models/spectre/tsmcN65.scs',
      corner: simulation.corner,
    });
  } catch (err) {
    generatedDeck = `// Spectre deck preview fallback\n// Topology: ${design.topologyId}\n// Analysis: ${simulation.simulationType}\n// VDD: ${simulation.vdd} V, Temp: ${simulation.temperature} C, Corner: ${simulation.corner}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--candidate-bg)',
          border: '1px solid var(--candidate-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--candidate-text)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          fontWeight: 700,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} />
          <span>DRY RUN - NO SPECTRE EXECUTION</span>
        </div>
        <span>PREVIEW MODE</span>
      </div>

      <div className={styles.configCard}>
        <div className={styles.configCardTitle}>
          <FileCode size={14} />
          <span>GENERATED SPECTRE SIMULATION DECK (deck.scs)</span>
        </div>

        <pre
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            backgroundColor: 'var(--bg-sunken)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            color: 'var(--text-secondary)',
            maxHeight: '320px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
          }}
        >
          {generatedDeck}
        </pre>
      </div>
    </div>
  );
}
