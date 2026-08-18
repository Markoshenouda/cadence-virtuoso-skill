'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cpu,
  Layers,
  Sparkles,
  Terminal,
  Activity,
  GitFork,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Menu,
  X,
  FlaskConical,
} from 'lucide-react';
import { circuits, technologies } from '@/lib/repository-registry';
import { BridgeStatus } from './bridge-status';
import { ThemeToggle } from './theme-toggle';
import styles from './shell.module.css';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Cpu, badge: null },
  { href: '/topologies', label: 'Topology Explorer', icon: Layers, badge: '44' },
  { href: '/new', label: 'Design Wizard', icon: Sparkles, badge: 'New' },
  { href: '/simulation', label: 'Simulation Workspace', icon: FlaskConical, badge: 'Spectre' },
  { href: '/cadence', label: 'Cadence Bridge', icon: Terminal, badge: null },
];

const viewMeta: Record<string, { eyebrow: string; title: string }> = {
  '/': { eyebrow: 'SYSTEM / OVERVIEW', title: 'Analog IC Design Dashboard' },
  '/topologies': { eyebrow: 'LIBRARY / TOPOLOGIES', title: 'Analog Topology Explorer' },
  '/new': { eyebrow: 'STUDIO / CONFIGURATOR', title: 'Design & Sizing Wizard' },
  '/simulation': { eyebrow: 'VERIFICATION / SPECTRE', title: 'Analog Simulation Workspace' },
  '/cadence': { eyebrow: 'BRIDGE / EXECUTION', title: 'Virtuoso & Spectre Bridge' },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Derive current view info
  const currentKey = Object.keys(viewMeta).find((k) =>
    k === '/' ? pathname === '/' : pathname.startsWith(k)
  ) || '/';
  const currentView = viewMeta[currentKey] || {
    eyebrow: 'ENGINEERING WORKSPACE',
    title: 'Analog Design Studio',
  };

  // Real registry data
  const availableCircuits = circuits.filter((c) => c.status === 'available');
  const comingSoonCircuits = circuits.filter((c) => c.status === 'coming-soon');
  const totalTopologies = circuits.reduce((acc, c) => acc + c.topologies.length, 0);
  const allGenerators = circuits.flatMap((c) => c.topologies.map((t) => t.generator));
  const verifiedCount = allGenerators.filter((g) => g.status === 'verified').length;
  const activeTech = technologies[0]?.name ?? 'tsmcN65';

  const isNavActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <div className={styles.shellContainer}>
      {/* Mobile Top Bar */}
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className={styles.mobileBrand}>
          <div className={styles.brandEmblem}>
            <Cpu size={16} />
          </div>
          <span className={styles.mobileBrandText}>Analog Design Studio</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Sidebar Overlay for Mobile */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}
        aria-label="Primary Navigation"
      >
        {/* Brand */}
        <div className={styles.brandSection}>
          <Link href="/" className={styles.brandLink} onClick={() => setMobileOpen(false)}>
            <div className={styles.brandEmblem}>
              <Cpu size={18} className={styles.brandIcon} />
            </div>
            <div className={styles.brandMeta}>
              <span className={styles.brandName}>ANALOG DESIGN STUDIO</span>
              <span className={styles.brandSub}>Cadence Virtuoso IC6.1.7</span>
            </div>
          </Link>
        </div>

        {/* Navigation items */}
        <div className={styles.navSection}>
          <div className={styles.navHeader}>WORKSPACE NAVIGATION</div>
          <nav className={styles.navList}>
            {navItems.map(({ href, label, icon: Icon, badge }) => {
              const active = isNavActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={16} className={styles.navIcon} />
                  <span className={styles.navLabel}>{label}</span>
                  {badge && href === '/topologies' ? (
                    <span className={styles.navBadge}>{totalTopologies}</span>
                  ) : badge ? (
                    <span className={`${styles.navBadge} ${styles.navBadgeNew}`}>{badge}</span>
                  ) : null}
                  {active && <span className={styles.activePillIndicator} />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Circuit Family Explorer Quick Links */}
        <div className={styles.familyNavSection}>
          <div className={styles.navHeader}>
            <span>CIRCUIT FAMILIES</span>
            <span className={styles.familyHeaderCount}>{availableCircuits.length}</span>
          </div>
          <div className={styles.familyList}>
            {availableCircuits.map((fam) => (
              <Link
                key={fam.id}
                href={`/topologies?family=${fam.id}`}
                className={styles.familyItem}
                onClick={() => setMobileOpen(false)}
              >
                <div className={styles.familyDot} />
                <span className={styles.familyName}>{fam.name}</span>
                <span className={styles.familyCount}>{fam.topologies.length}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar Footer telemetry */}
        <div className={styles.sidebarFooter}>
          <div className={styles.repoCard}>
            <div className={styles.repoCardHead}>
              <GitFork size={12} />
              <span>REPOSITORY</span>
            </div>
            <div className={styles.repoName}>cadence-virtuoso-skill</div>
            <div className={styles.repoDetails}>
              <span>PDK: {activeTech}</span>
              <span className={styles.repoDivider}>•</span>
              <span>{verifiedCount}/{allGenerators.length} Verified</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainWrapper}>
        {/* Global Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <div className={styles.breadcrumb}>
              <span className={styles.eyebrow}>{currentView.eyebrow}</span>
              <ChevronRight size={12} className={styles.breadcrumbSep} />
              <span className={styles.currentTitle}>{currentView.title}</span>
            </div>
          </div>

          <div className={styles.topbarRight}>
            <BridgeStatus />
            <div className={styles.divider} />
            <ThemeToggle />
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className={styles.mainContent}>{children}</main>

        {/* Professional Engineering Status Bar */}
        <footer className={styles.statusbar}>
          <div className={styles.statusLeft}>
            <div className={styles.statusItem}>
              <span className={styles.statusIndicatorOnline} />
              <span>REGISTRY READY</span>
            </div>
            <span className={styles.statusSep}>|</span>
            <span className={styles.statusData}>
              <b>{totalTopologies}</b> TOPOLOGIES
            </span>
            <span className={styles.statusSep}>•</span>
            <span className={styles.statusData}>
              <b>{availableCircuits.length}</b> ACTIVE FAMILIES
            </span>
            <span className={styles.statusSep}>•</span>
            <span className={styles.statusData}>
              <b>{comingSoonCircuits.length}</b> ROADMAP
            </span>
          </div>

          <div className={styles.statusRight}>
            <span className={styles.statusData}>
              TECHNOLOGY: <b>{activeTech}</b> (TSMC 65nm GP)
            </span>
            <span className={styles.statusSep}>|</span>
            <span className={styles.statusData}>
              GENERATORS: <b>{verifiedCount}</b>/<b>{allGenerators.length}</b> VERIFIED
            </span>
            <span className={styles.statusSep}>|</span>
            <span className={styles.versionTag}>EDA v0.1.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
