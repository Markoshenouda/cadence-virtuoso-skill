'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, LayoutDashboard, Network, Sparkles, Terminal } from 'lucide-react';
import { circuits, technologies } from '@/lib/repository-registry';
import { BridgeStatus } from './bridge-status';
import styles from './shell.module.css';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/topologies', label: 'Topologies', icon: Network },
  { href: '/new', label: 'New Design', icon: Sparkles },
  { href: '/cadence', label: 'Cadence Bridge', icon: Terminal },
];

const views = [
  { prefix: '/', eyebrow: 'ANALOG IC DESIGN / WORKSPACE', name: 'Dashboard' },
  { prefix: '/topologies', eyebrow: 'LIBRARY / TOPOLOGIES', name: 'Topology Explorer' },
  { prefix: '/new', eyebrow: 'DESIGN WORKSPACE / NEW DESIGN', name: 'Design Wizard' },
  { prefix: '/cadence', eyebrow: 'EXECUTION / BRIDGE', name: 'Cadence Bridge' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const view = views.find((v) => (v.prefix === '/' ? pathname === '/' : pathname.startsWith(v.prefix))) ?? { eyebrow: 'WORKSPACE', name: 'Analog Design Studio' };
  const available = circuits.filter((c) => c.status === 'available');
  const comingSoon = circuits.filter((c) => c.status === 'coming-soon');
  const topologyCount = circuits.reduce((count, c) => count + c.topologies.length, 0);
  const generators = circuits.flatMap((c) => c.topologies.map((t) => t.generator));
  const verifiedCount = generators.filter((g) => g.status === 'verified').length;
  const technology = technologies[0]?.name ?? '—';
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><div className={styles.brandLogo}>A</div><div className={styles.brandText}><strong>Analog Design Studio</strong><span>Repository-backed workspace</span></div></div>
      <nav className={styles.navGroup}>
        {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} title={label} className={`${styles.navItem} ${isActive(href) ? styles.navActive : ''}`}><Icon size={16}/><span>{label}</span></Link>)}
      </nav>
      <div className={styles.navDivider}/>
      <div className={styles.soonHead}>COMING SOON</div>
      <div className={styles.navGroup}>
        {comingSoon.map((c) => <button key={c.id} className={styles.soonItem} disabled title="Planned in the repository roadmap"><Clock size={15}/><span>{c.name}</span></button>)}
      </div>
      <div className={styles.sidebarBottom}>
        <div className={styles.repoCard}>REPOSITORY<b>cadence-virtuoso-skill</b><small>source of truth</small></div>
      </div>
    </aside>
    <div className={styles.main}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}><span className={styles.topbarEyebrow}>{view.eyebrow}</span><span className={styles.topbarDivider}>/</span><span className={styles.topbarView}>{view.name}</span></div>
        <BridgeStatus/>
      </header>
      <main className={styles.content}>{children}</main>
      <footer className={styles.statusbar}>
        <div className={styles.statusLeft}><span>{topologyCount} TOPOLOGIES · {circuits.length} CIRCUIT FAMILIES · {comingSoon.length} COMING SOON</span></div>
        <div><span>TECHNOLOGY <b>{technology}</b></span><span className={styles.statusGen}>GENERATORS <b>{verifiedCount}</b> VERIFIED / <b>{generators.length}</b> REGISTERED</span></div>
        <div><span>v0.1.0</span><span>REGISTRY-DRIVEN</span></div>
      </footer>
    </div>
  </div>;
}
