import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Cpu,
  Layers,
  Sparkles,
  Terminal,
  ShieldCheck,
  Zap,
  Activity,
  GitBranch,
  ExternalLink,
  ChevronRight,
  FlaskConical,
  Binary,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { circuits, technologies } from '@/lib/repository-registry';
import { StatusPill } from '@/components/status-pill';
import styles from './dashboard.module.css';

export default function DashboardPage() {
  const availableFamilies = circuits.filter((c) => c.status === 'available');
  const comingSoonFamilies = circuits.filter((c) => c.status === 'coming-soon');
  const totalTopologies = circuits.reduce((sum, c) => sum + c.topologies.length, 0);

  const allGenerators = circuits.flatMap((c) => c.topologies.map((t) => t.generator));
  const verifiedCount = allGenerators.filter((g) => g.status === 'verified').length;
  const candidateCount = allGenerators.filter((g) => g.status === 'candidate').length;
  const activeTech = technologies[0];

  return (
    <div className={styles.dashboard}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroMain}>
          <div className={styles.heroKicker}>
            <span className={styles.kickerTag}>SPECIFICATION-FIRST WORKFLOW</span>
            <span className={styles.kickerDivider}>/</span>
            <span className={styles.kickerTech}>{activeTech?.name ?? 'tsmcN65'}</span>
          </div>

          <h1 className={styles.heroTitle}>
            Engineering-Grade Analog IC Design & Generation Studio
          </h1>
          <p className={styles.heroSubtitle}>
            Configure repository-backed analog topologies, synthesize parameterized Cadence
            SKILL code, and execute automated Spectre verification decks on TSMC 65nm PDK.
          </p>

          {/* Workflow Pipeline */}
          <div className={styles.flowCard}>
            <div className={styles.flowTitle}>REPUTABLE REPOSITORY WORKFLOW</div>
            <div className={styles.flowSteps}>
              <div className={styles.flowStep}>
                <span className={styles.stepNum}>01</span>
                <div className={styles.stepInfo}>
                  <strong>Specs & Circuit</strong>
                  <small>Intent & Constraints</small>
                </div>
              </div>
              <ChevronRight size={14} className={styles.flowArrow} />
              <div className={styles.flowStep}>
                <span className={styles.stepNum}>02</span>
                <div className={styles.stepInfo}>
                  <strong>MOS Sizing</strong>
                  <small>gm/ID & W/L Contract</small>
                </div>
              </div>
              <ChevronRight size={14} className={styles.flowArrow} />
              <div className={styles.flowStep}>
                <span className={styles.stepNum}>03</span>
                <div className={styles.stepInfo}>
                  <strong>SKILL Synthesis</strong>
                  <small>Canonical Generator</small>
                </div>
              </div>
              <ChevronRight size={14} className={styles.flowArrow} />
              <div className={styles.flowStep}>
                <span className={styles.stepNum}>04</span>
                <div className={styles.stepInfo}>
                  <strong>Cadence Bridge</strong>
                  <small>Virtuoso IC6.1.7</small>
                </div>
              </div>
              <ChevronRight size={14} className={styles.flowArrow} />
              <div className={styles.flowStep}>
                <span className={styles.stepNum}>05</span>
                <div className={styles.stepInfo}>
                  <strong>Spectre Sim</strong>
                  <small>Electrical Verification</small>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className={styles.heroActions}>
            <Link href="/new" className={styles.primaryAction}>
              <Sparkles size={15} />
              <span>Configure New Design</span>
              <ArrowRight size={14} />
            </Link>
            <Link href="/topologies" className={styles.secondaryAction}>
              <Layers size={15} />
              <span>Explore {totalTopologies} Topologies</span>
            </Link>
            <Link href="/cadence" className={styles.tertiaryAction}>
              <Terminal size={15} />
              <span>Virtuoso Bridge</span>
            </Link>
          </div>
        </div>

        {/* Telemetry Panel */}
        <div className={styles.telemetryPanel}>
          <div className={styles.telemetryHeader}>
            <Activity size={14} className={styles.telemetryIcon} />
            <span>STUDIO REPOSITORY METRICS</span>
          </div>

          <div className={styles.telemetryMetrics}>
            <div className={styles.metricItem}>
              <div className={styles.metricValue}>{totalTopologies}</div>
              <div className={styles.metricLabel}>REGISTERED TOPOLOGIES</div>
              <div className={styles.metricSub}>100% schematic mapped</div>
            </div>

            <div className={styles.metricItem}>
              <div className={styles.metricValue}>{availableFamilies.length}</div>
              <div className={styles.metricLabel}>ACTIVE CIRCUIT FAMILIES</div>
              <div className={styles.metricSub}>+{comingSoonFamilies.length} in roadmap</div>
            </div>

            <div className={styles.metricItem}>
              <div className={styles.metricValue}>{verifiedCount}</div>
              <div className={styles.metricLabel}>VERIFIED GENERATORS</div>
              <div className={styles.metricSub}>{candidateCount} candidate generators</div>
            </div>

            <div className={styles.metricItem}>
              <div className={styles.metricValue}>{activeTech?.name ?? 'tsmcN65'}</div>
              <div className={styles.metricLabel}>PROCESS TECHNOLOGY</div>
              <div className={styles.metricSub}>TSMC 65nm Low-Power / GP</div>
            </div>
          </div>

          <div className={styles.telemetryFooter}>
            <div className={styles.telemetryStatus}>
              <span className={styles.telemetryDot} />
              <span>EDA Engine: Online (Virtuoso IC6.1.7)</span>
            </div>
            <a
              href="https://github.com/Markoshenouda/cadence-virtuoso-skill"
              target="_blank"
              rel="noreferrer"
              className={styles.telemetryLink}
            >
              <span>Repository</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </section>

      {/* Circuit Families Matrix */}
      <section className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionEyebrow}>REPOSITORY COVERAGE</div>
            <h2 className={styles.sectionTitle}>Circuit Family Catalog</h2>
          </div>
          <div className={styles.sectionMeta}>
            <span>{availableFamilies.length} Available Families</span>
            <span className={styles.metaDivider}>•</span>
            <span>{totalTopologies} Ready Topologies</span>
          </div>
        </div>

        <div className={styles.familyGrid}>
          {availableFamilies.map((family) => {
            const familyGenerators = family.topologies.map((t) => t.generator);
            const famVerified = familyGenerators.filter((g) => g.status === 'verified').length;
            return (
              <div key={family.id} className={styles.familyCard}>
                <div className={styles.familyCardTop}>
                  <div className={styles.familyHeaderLeft}>
                    <div className={styles.familyIconWrap}>
                      <Cpu size={16} />
                    </div>
                    <div>
                      <h3 className={styles.familyName}>{family.name}</h3>
                      <span className={styles.familyCountTag}>
                        {family.topologies.length} Topologies
                      </span>
                    </div>
                  </div>
                  <StatusPill variant="verified">AVAILABLE</StatusPill>
                </div>

                <p className={styles.familyDesc}>{family.description}</p>

                <div className={styles.topologyChips}>
                  {family.topologies.slice(0, 4).map((t) => (
                    <Link
                      key={t.id}
                      href={`/topologies/${t.id}`}
                      className={styles.topologyChip}
                      title={t.description}
                    >
                      <span>{t.name}</span>
                    </Link>
                  ))}
                  {family.topologies.length > 4 && (
                    <Link
                      href={`/topologies?family=${family.id}`}
                      className={styles.topologyChipMore}
                    >
                      +{family.topologies.length - 4} more
                    </Link>
                  )}
                </div>

                <div className={styles.familyCardFooter}>
                  <div className={styles.familyStats}>
                    <span>
                      Verified: <b>{famVerified}/{family.topologies.length}</b>
                    </span>
                  </div>
                  <Link
                    href={`/topologies?family=${family.id}`}
                    className={styles.familyBrowseBtn}
                  >
                    <span>Browse Family</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}

          {/* Coming soon families */}
          {comingSoonFamilies.map((family) => (
            <div key={family.id} className={styles.familyCardSoon}>
              <div className={styles.familyCardTop}>
                <div className={styles.familyHeaderLeft}>
                  <div className={styles.familyIconWrapSoon}>
                    <Binary size={16} />
                  </div>
                  <div>
                    <h3 className={styles.familyNameSoon}>{family.name}</h3>
                    <span className={styles.familyCountTagSoon}>Roadmap Item</span>
                  </div>
                </div>
                <StatusPill variant="coming-soon">ROADMAP</StatusPill>
              </div>
              <p className={styles.familyDescSoon}>{family.description}</p>
              <div className={styles.familyCardFooter}>
                <span className={styles.roadmapNote}>
                  Canonical generators planned in future releases.
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Engineering Foundations Grid */}
      <section className={styles.sectionContainer}>
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionEyebrow}>ARCHITECTURE & INTEGRATION</div>
            <h2 className={styles.sectionTitle}>Verification & Execution Standards</h2>
          </div>
        </div>

        <div className={styles.standardsGrid}>
          <div className={styles.standardCard}>
            <div className={styles.standardHead}>
              <ShieldCheck size={18} className={styles.standardIconMint} />
              <h4>Verification Tiers</h4>
            </div>
            <p>
              Strict 4-tier qualification: Generator Verified, Schematic Verified, Simulation
              Ready, and Electrically Verified. Schematic generation is never conflated with
              electrical performance.
            </p>
            <div className={styles.standardList}>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Tier 1: Canonical SKILL generator compilation</span>
              </div>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Tier 2: Virtuoso schematic check & save clean</span>
              </div>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Tier 3: Spectre simulation deck generation</span>
              </div>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Tier 4: Target specifications measured & passed</span>
              </div>
            </div>
          </div>

          <div className={styles.standardCard}>
            <div className={styles.standardHead}>
              <Zap size={18} className={styles.standardIconCyan} />
              <h4>MOS Sizing & CDF Contract</h4>
            </div>
            <p>
              Direct mathematical contract mapping: TotalW, L, NF, M, with finger width calculation
              (W/finger = TotalW / NF) and total multiplier totalM = NF × M.
            </p>
            <div className={styles.standardList}>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Native gm/ID and W/L methodology support</span>
              </div>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>No synthetic or inferred device parameters</span>
              </div>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Accurate CDF property assignment for nch/pch</span>
              </div>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Canonical pin and terminal connectivity preserved</span>
              </div>
            </div>
          </div>

          <div className={styles.standardCard}>
            <div className={styles.standardHead}>
              <Terminal size={18} className={styles.standardIconAmber} />
              <h4>Cadence Virtuoso Bridge</h4>
            </div>
            <p>
              Headless SSH/SCP execution pipeline for Virtuoso IC6.1.7. Automatically stages
              parameterized SKILL artifacts and collects check & save evidence.
            </p>
            <div className={styles.standardList}>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Isolated staging directory in Virtuoso workspace</span>
              </div>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Automated wrapper generation & execution</span>
              </div>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Real-time exit code & log evidence collection</span>
              </div>
              <div className={styles.standardItem}>
                <Check size={12} />
                <span>Safe dry-run preview before live invocation</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
