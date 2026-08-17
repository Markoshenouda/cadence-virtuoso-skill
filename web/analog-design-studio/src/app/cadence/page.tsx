'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  CircleAlert,
  Cpu,
  Play,
  RefreshCw,
  Terminal,
  FileCode2,
  ShieldCheck,
  FolderGit2,
  CheckCircle2,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { defaultSpecsFor } from '@/lib/repository-registry';
import type { DesignConfig } from '@/lib/validation';
import { StatusPill } from '@/components/status-pill';
import styles from './cadence.module.css';

const defaultConfig: DesignConfig = {
  circuitId: 'ota',
  topologyId: '5t-ota',
  technologyId: 'tsmcN65',
  vdd: 1.2,
  temperature: 27,
  corner: 'TT',
  specs: defaultSpecsFor('ota'),
  sizingMethod: 'manual',
  devices: [
    { device: 'M1', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
    { device: 'M2', type: 'NMOS', totalW: '2u', L: '240n', NF: 1, M: 1 },
    { device: 'M3', type: 'PMOS', totalW: '4u', L: '480n', NF: 1, M: 1 },
    { device: 'M4', type: 'PMOS', totalW: '4u', L: '480n', NF: 1, M: 1 },
    { device: 'M5', type: 'NMOS', totalW: '6u', L: '480n', NF: 1, M: 1 },
  ],
};

export default function CadenceBridgePage() {
  const [text, setText] = useState(JSON.stringify(defaultConfig, null, 2));
  const [dryRun, setDryRun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const config = useMemo(() => {
    try {
      return JSON.parse(text) as DesignConfig;
    } catch {
      return null;
    }
  }, [text]);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      if (!config) throw new Error('Configuration JSON is invalid.');
      const response = await fetch('/api/cadence/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, dryRun }),
      });
      const body = await response.json();
      if (!response.ok && !body?.status) {
        throw new Error(
          body?.message ?? body?.issues?.[0]?.message ?? 'Cadence bridge request failed.'
        );
      }
      setResult(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function formatJson() {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
    } catch {
      // Keep invalid JSON for user editing
    }
  }

  const isSuccess = result?.status === 'succeeded' || result?.status === 'dry-run';

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.eyebrow}>EXECUTION / VIRTUOSO BRIDGE</div>
          <h1 className={styles.pageTitle}>Cadence Virtuoso Execution Bridge</h1>
          <p className={styles.pageSubtitle}>
            Direct headless bridge to Cadence Virtuoso IC6.1.7. Stages synthesized SKILL
            artifacts into the remote Linux workspace and extracts check &amp; save evidence.
          </p>
        </div>

        <div className={styles.boundaryBadge}>
          <Terminal size={14} />
          <span>SSH/SCP → VIRTUOSO IC6.1.7</span>
        </div>
      </header>

      {/* Dual Workbench Grid */}
      <div className={styles.grid}>
        {/* Left: JSON Config & Controls */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <Cpu size={15} />
              <span>Design Configuration Payload</span>
            </div>
            <button type="button" onClick={formatJson} className={styles.formatBtn}>
              Format JSON
            </button>
          </div>

          <div className={styles.editorWrap}>
            <textarea
              className={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              aria-label="Design Configuration JSON"
            />
          </div>

          <div className={styles.controlsBar}>
            <label className={styles.dryRunLabel}>
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
              />
              <span>Dry Run (Preview pipeline without invoking Cadence)</span>
            </label>

            <button
              type="button"
              className={styles.runButton}
              onClick={run}
              disabled={busy || !config}
            >
              {busy ? (
                <>
                  <RefreshCw size={14} className={styles.spin} />
                  <span>Executing Bridge...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>{dryRun ? 'Preview Staging Pipeline' : 'Run in Virtuoso'}</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right: Result & Output Console */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              {result ? (
                isSuccess ? (
                  <CheckCircle2 size={15} className={styles.iconSuccess} />
                ) : (
                  <CircleAlert size={15} className={styles.iconError} />
                )
              ) : (
                <Terminal size={15} />
              )}
              <span>Bridge Execution Output</span>
            </div>
            {result && (
              <StatusPill variant={isSuccess ? 'verified' : 'fail'}>
                {result.status}
              </StatusPill>
            )}
          </div>

          {!result && !error && (
            <div className={styles.emptyConsole}>
              <Info size={20} className={styles.emptyIcon} />
              <h4>Bridge Console Idle</h4>
              <p>
                Configure the payload on the left and click &ldquo;Preview Staging Pipeline&rdquo; or
                &ldquo;Run in Virtuoso&rdquo; to execute.
              </p>
            </div>
          )}

          {error && <pre className={styles.errorOutput}>{error}</pre>}

          {result && (
            <div className={styles.resultDetails}>
              {/* Status Header */}
              <div
                className={`${styles.statusBanner} ${
                  isSuccess ? styles.statusBannerSuccess : styles.statusBannerError
                }`}
              >
                <div>
                  <strong>Status: {result.status.toUpperCase()}</strong>
                  <p>
                    {result.message ??
                      result.notes?.join(' ') ??
                      'Cadence staging pipeline finished.'}
                  </p>
                </div>
                <div className={styles.cadenceExecutedBadge}>
                  Cadence Executed: <b>{String(result.cadenceExecuted)}</b>
                </div>
              </div>

              {/* Execution Metadata Table */}
              <div className={styles.metadataTable}>
                <Row k="Generator" v={result.sourceGenerator} />
                <Row k="Remote Artifact" v={result.remoteFiles?.artifact} />
                <Row k="Remote Wrapper" v={result.remoteFiles?.wrapper} />
                <Row k="Remote Log" v={result.remoteFiles?.log} />
                <Row k="Exit Code" v={String(result.exitCode ?? '0')} />
              </div>

              {/* Evidence Payload */}
              {result.evidence && (
                <div className={styles.evidenceBlock}>
                  <div className={styles.evidenceTitle}>EVIDENCE DATA</div>
                  <pre className={styles.codeBlock}>
                    {JSON.stringify(result.evidence, null, 2)}
                  </pre>
                </div>
              )}

              {/* Stdout / Stderr Log Console */}
              {(result.stdout || result.stderr) && (
                <div className={styles.consoleOutputWrap}>
                  <div className={styles.consoleTitle}>VIRTUOSO LOG STDOUT / STDERR</div>
                  <pre className={styles.codeBlock}>
                    {`${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim()}
                  </pre>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className={styles.metadataRow}>
      <span>{k}</span>
      <code>{v}</code>
    </div>
  );
}
