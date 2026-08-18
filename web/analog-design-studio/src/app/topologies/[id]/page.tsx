import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CircuitBoard,
  ExternalLink,
  Sparkles,
  Cpu,
  Layers,
  FileCode2,
  GitBranch,
  ShieldCheck,
  Zap,
  Activity,
  Terminal,
  CheckCircle2,
  Clock,
  FlaskConical,
} from 'lucide-react';
import { findTopology, technologies } from '@/lib/repository-registry';
import { TopologyDiagram } from '@/components/topology-diagram';
import { StatusPill } from '@/components/status-pill';
import shell from '@/components/shell.module.css';
import styles from '../topologies.module.css';

const GITHUB_BASE =
  'https://github.com/Markoshenouda/cadence-virtuoso-skill/blob/feature/topology-registry-integration/';

export default function TopologyDetailPage({ params }: { params: { id: string } }) {
  const found = findTopology(params.id);

  if (!found) {
    return (
      <div className={shell.emptyState}>
        <div className={shell.emptyIcon}>
          <CircuitBoard size={22} />
        </div>
        <div className={shell.emptyTitle}>Topology Not Found</div>
        <div className={shell.emptyLine}>
          The requested circuit topology &ldquo;{params.id}&rdquo; is not registered in the
          repository registry.
        </div>
        <Link className={shell.btnPrimary} href="/topologies">
          Back to Topology Explorer
        </Link>
      </div>
    );
  }

  const { circuit, topology } = found;
  const specGroups = circuit.specGroups ?? [];
  const runbookUrl = topology.generator.runbook
    ? `${GITHUB_BASE}${topology.generator.runbook}`
    : null;
  const generatorUrl = topology.generator.path
    ? `${GITHUB_BASE}${topology.generator.path}`
    : null;
  const activeTech = technologies[0]?.name ?? 'tsmcN65';
  const isVerified = topology.generator.status === 'verified';

  return (
    <div className={styles.container}>
      {/* Navigation Breadcrumb & Back Link */}
      <Link className={styles.backLink} href="/topologies">
        <ArrowLeft size={14} />
        <span>Back to Topology Explorer</span>
      </Link>

      {/* Header */}
      <header className={styles.detailHeader}>
        <div className={styles.eyebrow}>
          CIRCUIT LIBRARY / {circuit.name.toUpperCase()} / {topology.name.toUpperCase()}
        </div>
        <div className={styles.detailTitleRow}>
          <h1 className={styles.pageTitle}>{topology.name}</h1>
          <StatusPill variant={isVerified ? 'verified' : 'candidate'}>
            {topology.generator.status}
          </StatusPill>
        </div>
        <p className={shell.pageSub}>{topology.description}</p>
      </header>

      {/* Main Two-Column Layout */}
      <div className={styles.detailColumns}>
        {/* Left Column: Schematic Diagram */}
        <div className={styles.diagramPanel}>
          <div className={styles.infoPanel}>
            <h2>Engineering Circuit Schematic</h2>
            <TopologyDiagram diagram={topology.diagram} />
          </div>
        </div>

        {/* Right Column: Specifications & Technical Stack */}
        <div className={styles.detailStack}>
          {/* Devices Summary */}
          <section className={styles.infoPanel}>
            <h2>Device Breakdown & Placement Anchors</h2>
            <div className={styles.deviceTable}>
              {topology.contract.devices.map((d) => (
                <div key={d.device} className={styles.deviceRow}>
                  <code className={styles.deviceName}>{d.device}</code>
                  <span className={`${styles.typeTag} ${d.type === 'NMOS' ? styles.typeN : styles.typeP}`}>
                    {d.type}
                  </span>
                </div>
              ))}
            </div>
            {topology.devices.length > 0 && (
              <ul className={styles.deviceNotes}>
                {topology.devices.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Nets & Terminals */}
          <section className={styles.infoPanel}>
            <h2>Schematic Nets & Terminals</h2>
            <div className={styles.netChips}>
              {topology.nets.map((net) => (
                <span key={net}>{net}</span>
              ))}
            </div>
          </section>

          {/* Generator & Cadence Mapping */}
          <section className={styles.infoPanel}>
            <h2>Canonical SKILL Generator</h2>
            <p className={styles.generatorLabel}>{topology.generator.label}</p>
            <div className={shell.sunken}>{topology.generator.path}</div>
            <p className={styles.invocation}>
              SKILL Entrypoint: <code>{topology.generator.invocation}</code>
            </p>
            <div className={styles.generatorMeta}>
              <StatusPill variant={isVerified ? 'verified' : 'candidate'}>
                {topology.generator.status}
              </StatusPill>
              {runbookUrl && (
                <a className={styles.runbookLink} href={runbookUrl} target="_blank" rel="noreferrer">
                  <span>View Runbook</span>
                  <ExternalLink size={11} />
                </a>
              )}
              {generatorUrl && (
                <a className={styles.runbookLink} href={generatorUrl} target="_blank" rel="noreferrer">
                  <span>Canonical Source</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          </section>

          {/* Performance Envelope Specs */}
          <section className={styles.infoPanel}>
            <h2>Design Targets & Constraint Envelope</h2>
            <div className={styles.specGroups}>
              {specGroups.map((group) => (
                <div key={group.name}>
                  <div className={shell.microLabel} style={{ marginBottom: 6 }}>
                    {group.name}
                  </div>
                  <div className={styles.specTable}>
                    <div className={styles.specHead}>
                      <span>Metric</span>
                      <span>Op</span>
                      <span>Target</span>
                      <span>Unit</span>
                    </div>
                    {group.specs.map((spec) => (
                      <div
                        key={spec.key}
                        className={`${styles.specRow} ${!spec.enabled ? styles.specOff : ''}`}
                      >
                        <span>{spec.label}</span>
                        <span>{spec.operator === '>=' ? '≥' : spec.operator === '<=' ? '≤' : '='}</span>
                        <code>{spec.enabled && spec.target != null ? spec.target : '—'}</code>
                        <em>{spec.unit}</em>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Action Bar */}
      <div className={styles.actionBar}>
        <span className={styles.actionBarHint}>
          Ready to size devices and synthesize parameterized Cadence SKILL?
        </span>
        <div className={styles.actionButtons}>
          <Link
            className={styles.primaryBtn}
            href={`/new?circuit=${circuit.id}&topology=${topology.id}`}
          >
            <Sparkles size={15} />
            <span>Open in Design Wizard</span>
          </Link>
          {runbookUrl && (
            <a className={styles.secondaryBtn} href={runbookUrl} target="_blank" rel="noreferrer">
              <ExternalLink size={13} />
              <span>Runbook</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
