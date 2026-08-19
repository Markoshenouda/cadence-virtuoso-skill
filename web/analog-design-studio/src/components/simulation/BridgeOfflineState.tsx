'use client';

import React from 'react';
import { AlertCircle, Terminal, ArrowLeft } from 'lucide-react';
import styles from './simulation.module.css';

export type BridgeOfflineStateProps = {
  onTogglePreview: () => void;
  showPreview: boolean;
  onBackToConfigure: () => void;
};

export function BridgeOfflineState({ onTogglePreview, showPreview, onBackToConfigure }: BridgeOfflineStateProps) {
  return (
    <div className={styles.configCard}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--candidate-bg)',
            border: '1px solid var(--candidate-border)',
            color: 'var(--candidate)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AlertCircle size={22} />
        </div>

        <div>
          <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Cadence Bridge Offline</h4>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
            The live SSH/SCP Cadence bridge to Virtuoso IC6.1.7 / Spectre is currently offline or disabled in this environment (<code>CADENCE_BRIDGE_ENABLED !== true</code>).
          </p>
          <p style={{ fontSize: '11.5px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            The design simulation setup can be previewed in <b>Dry-Run Mode</b>. Spectre netlist generation and expected outputs can be inspected without live execution. No fake results will be displayed.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
        <button type="button" className={styles.nextBtn} onClick={onTogglePreview}>
          <Terminal size={14} />
          <span>{showPreview ? 'Hide Dry-Run Netlist Preview' : 'Preview Dry-Run Netlist (deck.scs)'}</span>
        </button>

        <button type="button" className={styles.backBtn} onClick={onBackToConfigure}>
          <ArrowLeft size={14} />
          <span>Back to Configure</span>
        </button>
      </div>
    </div>
  );
}
