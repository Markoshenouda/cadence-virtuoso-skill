import { ArrowLeft, CircuitBoard, ExternalLink, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { findTopology } from '@/lib/repository-registry';
import { TopologyDiagram } from '@/components/topology-diagram';
import { StatusPill } from '@/components/status-pill';
import shell from '@/components/shell.module.css';
import styles from '../topologies.module.css';

const GITHUB_BASE = 'https://github.com/Markoshenouda/cadence-virtuoso-skill/blob/feature/topology-registry-integration/';

export default function TopologyDetailPage({ params }: { params: { id: string } }) {
  const found = findTopology(params.id);
  if (!found) return <div className={shell.emptyState}>
    <div className={shell.emptyIcon}><CircuitBoard size={22}/></div>
    <div className={shell.emptyTitle}>Topology not found</div>
    <div className={shell.emptyLine}>This topology is not registered in the repository.</div>
    <Link className={shell.btnPrimary} href="/topologies">Back to topologies</Link>
  </div>;

  const { circuit, topology } = found;
  const specGroups = circuit.specGroups ?? [];
  const runbookUrl = topology.generator.runbook ? `${GITHUB_BASE}${topology.generator.runbook}` : null;

  return <div>
    <Link className={styles.backLink} href="/topologies"><ArrowLeft size={14}/>Back to topologies</Link>
    <header className={styles.detailHeader}>
      <div className={styles.eyebrow}>LIBRARY / {circuit.name.toUpperCase()} / {topology.name.toUpperCase()}</div>
      <div className={styles.detailTitleRow}>
        <h1 className={styles.pageTitle}>{topology.name}</h1>
        <StatusPill variant={topology.generator.status === 'verified' ? 'verified' : topology.generator.status === 'candidate' ? 'candidate' : 'coming-soon'}>{topology.generator.status}</StatusPill>
      </div>
      <p className={shell.pageSub}>{topology.description}</p>
    </header>

    <div className={styles.detailColumns}>
      <div className={styles.diagramPanel}><TopologyDiagram diagram={topology.diagram}/></div>
      <div className={styles.detailStack}>
        <section className={styles.infoPanel}>
          <h2>Device Summary</h2>
          <div className={styles.deviceTable}>
            {topology.contract.devices.map((d) => <div key={d.device} className={styles.deviceRow}>
              <code className={styles.deviceName}>{d.device}</code>
              <span className={`${styles.typeTag} ${d.type === 'NMOS' ? styles.typeN : styles.typeP}`}>{d.type}</span>
            </div>)}
          </div>
          <ul className={styles.deviceNotes}>
            {topology.devices.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>

        <section className={styles.infoPanel}>
          <h2>Nets</h2>
          <div className={styles.netChips}>{topology.nets.map((net) => <span key={net}>{net}</span>)}</div>
        </section>

        <section className={styles.infoPanel}>
          <h2>Generator</h2>
          <p className={styles.generatorLabel}>{topology.generator.label}</p>
          <div className={shell.sunken}>{topology.generator.path}</div>
          <p className={styles.invocation}>invocation: {topology.generator.invocation}</p>
          <div className={styles.generatorMeta}>
            <StatusPill variant={topology.generator.status === 'verified' ? 'verified' : topology.generator.status === 'candidate' ? 'candidate' : 'coming-soon'}>{topology.generator.status}</StatusPill>
            {runbookUrl && <a className={styles.runbookLink} href={runbookUrl} target="_blank" rel="noreferrer">View Runbook<ExternalLink size={12}/></a>}
          </div>
        </section>

        <section className={styles.infoPanel}>
          <h2>Spec Definitions</h2>
          <div className={styles.specGroups}>
            {specGroups.map((group) => <div key={group.name}>
              <div className={shell.microLabel} style={{ marginBottom: 8 }}>{group.name}</div>
              <div className={styles.specTable}>
                <div className={styles.specHead}><span>Specification</span><span>Op</span><span>Target</span><span>Unit</span></div>
                {group.specs.map((spec) => <div key={spec.key} className={`${styles.specRow} ${!spec.enabled ? styles.specOff : ''}`}>
                  <span>{spec.label}</span>
                  <span>{spec.operator === '>=' ? '≥' : spec.operator === '<=' ? '≤' : '='}</span>
                  <code>{spec.enabled && spec.target != null ? spec.target : '—'}</code>
                  <em>{spec.unit}</em>
                </div>)}
              </div>
            </div>)}
          </div>
        </section>
      </div>
    </div>

    <div className={styles.actionBar}>
      <span className={styles.actionBarHint}>Open this topology in the design wizard with {circuit.name} defaults preselected.</span>
      <div className={styles.actionButtons}>
        <Link className={styles.primaryBtn} href={`/new?circuit=${circuit.id}&topology=${topology.id}`}><Sparkles size={15}/>Generate Design</Link>
        {runbookUrl && <a className={styles.secondaryBtn} href={runbookUrl} target="_blank" rel="noreferrer">View Runbook<ExternalLink size={13}/></a>}
      </div>
    </div>
  </div>;
}
