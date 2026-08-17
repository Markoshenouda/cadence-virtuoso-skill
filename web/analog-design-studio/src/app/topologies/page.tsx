import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { circuits, technologies } from '@/lib/repository-registry';
import { TopologyDiagram } from '@/components/topology-diagram';
import { StatusPill } from '@/components/status-pill';
import styles from './topologies.module.css';

export const metadata = { title: 'Topology Explorer - Analog Design Studio' };

export default function TopologiesPage() {
  const available = circuits.filter((c) => c.status === 'available');
  const topologyCount = circuits.reduce((count, c) => count + c.topologies.length, 0);
  const tech = technologies[0]?.name ?? '—';

  return <div>
    <header className={styles.pageHeader}>
      <div>
        <div className={styles.eyebrow}>LIBRARY / TOPOLOGIES</div>
        <h1 className={styles.pageTitle}>Topology Explorer</h1>
      </div>
      <span className={styles.metaChip}>{topologyCount} TOPOLOGIES · {tech}</span>
    </header>
    {available.map((circuit) => <section key={circuit.id} className={styles.group}>
      <div className={styles.groupHead}>
        <div>
          <div className={styles.eyebrow}>CIRCUIT FAMILY</div>
          <h2>{circuit.name}</h2>
          <p>{circuit.description}</p>
        </div>
        <span className={styles.groupCount}>{circuit.topologies.length} TOPOLOGIES</span>
      </div>
      <div className={styles.cardGrid}>
        {circuit.topologies.map((t) => <Link key={t.id} href={`/topologies/${t.id}`} className={styles.card}>
          <div className={styles.diagramArea}><TopologyDiagram diagram={t.diagram}/></div>
          <div className={styles.cardBody}>
            <div className={styles.cardHeadRow}><h3>{t.name}</h3><StatusPill variant={t.generator.status === 'verified' ? 'verified' : t.generator.status === 'candidate' ? 'candidate' : 'coming-soon'}>{t.generator.status}</StatusPill></div>
            <span className={styles.familyLabel}>{circuit.name}</span>
            <span className={styles.cardMeta}>{t.deviceCount ?? t.contract.devices.length} DEVICES · {tech}</span>
            <p className={styles.cardDesc}>{t.description}</p>
            <div className={styles.cardFooter}><span className={styles.inputChip}>{t.inputType}</span><span className={styles.viewLink}>View<ArrowRight size={13}/></span></div>
          </div>
        </Link>)}
      </div>
    </section>)}
  </div>;
}
