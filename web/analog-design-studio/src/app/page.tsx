import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { circuits, technologies } from '@/lib/repository-registry';
import styles from './dashboard.module.css';

export default function Dashboard() {
  const available = circuits.filter((c) => c.status === 'available');
  const comingSoon = circuits.filter((c) => c.status === 'coming-soon');
  const topologyCount = circuits.reduce((count, c) => count + c.topologies.length, 0);
  const generators = circuits.flatMap((c) => c.topologies.map((t) => t.generator));
  const verifiedCount = generators.filter((g) => g.status === 'verified').length;
  const technology = technologies[0];

  return <div>
    <header className={styles.pageHeader}>
      <div>
        <div className={styles.heroKicker}>ANALOG IC DESIGN / WORKSPACE</div>
        <h1 className={styles.pageTitle}>Analog Design Studio</h1>
        <p className={styles.pageSub}>Configure repository-backed topologies before generating Cadence SKILL.</p>
      </div>
    </header>

    <section className={styles.hero}>
      <div>
        <span className={styles.heroKicker}>SPECIFICATION-FIRST</span>
        <h2 className={styles.heroTitle}>From engineering intent to a generator contract.</h2>
        <p className={styles.heroTagline}>AI-assisted analog IC design, generation, and verification.</p>
        <div className={styles.flow}>
          <span className={styles.flowStep}>DESIGN</span><ChevronRight size={13}/>
          <span className={styles.flowStep}>GENERATE</span><ChevronRight size={13}/>
          <span className={styles.flowStep}>SIMULATE</span><ChevronRight size={13}/>
          <span className={styles.flowStep}>ANALYZE</span>
        </div>
        <Link className={styles.cta} href="/new"><Sparkles size={15}/>Start a design<ArrowRight size={14}/></Link>
      </div>
      <div className={styles.telemetry}>
        <div className={styles.telemetryRow}><small>TOPOLOGIES</small><b>{String(topologyCount).padStart(2, '0')}</b></div>
        <div className={styles.telemetryRow}><small>CIRCUIT FAMILIES</small><b>{String(available.length).padStart(2, '0')}</b></div>
        <div className={styles.telemetryRow}><small>VERIFIED GENERATORS</small><b>{String(verifiedCount).padStart(2, '0')}</b></div>
      </div>
    </section>

    <div className={styles.stats}>
      <div className={styles.statTile}><small>TOPOLOGIES</small><b>{String(topologyCount).padStart(2, '0')}</b><span>repository-backed</span></div>
      <div className={styles.statTile}><small>CIRCUIT FAMILIES</small><b>{String(available.length).padStart(2, '0')}</b><span>{comingSoon.length} more coming soon</span></div>
      <div className={styles.statTile}><small>TECHNOLOGY</small><b>{technology?.name ?? '—'}</b><span>Cadence IC6.1.7</span></div>
      <div className={styles.statTile}><small>VERIFIED GENERATORS</small><b>{String(verifiedCount).padStart(2, '0')}</b><span>of {generators.length} registered</span></div>
    </div>

    <div className={styles.sectionHead}>
      <div>
        <div className={styles.heroKicker}>REPOSITORY COVERAGE</div>
        <h2>Circuit family coverage</h2>
      </div>
    </div>
    <div className={styles.coverage}>
      {available.map((c) => <div key={c.id} className={styles.familyCard}>
        <h3>{c.name}</h3>
        <p>{c.description}</p>
        <div className={styles.familyMeta}>
          <span className={styles.countChip}>{c.topologies.length} TOPOLOGIES</span>
          <Link className={styles.browseLink} href="/topologies">Browse topologies<ArrowRight size={13}/></Link>
        </div>
      </div>)}
      {comingSoon.map((c) => <div key={c.id} className={styles.familySoon} title="Planned in the repository roadmap">
        <h3>{c.name}</h3>
        <p>{c.description}</p>
        <div className={styles.familyMeta}><span className={styles.countChip}>COMING SOON</span></div>
      </div>)}
    </div>
  </div>;
}
