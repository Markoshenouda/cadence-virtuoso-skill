'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  FileCode2,
  CircuitBoard,
  X,
} from 'lucide-react';
import { circuits, technologies } from '@/lib/repository-registry';
import { TopologyDiagram } from '@/components/topology-diagram';
import { StatusPill } from '@/components/status-pill';
import styles from './topologies.module.css';

export default function TopologiesPage() {
  return (
    <Suspense fallback={null}>
      <TopologyExplorer />
    </Suspense>
  );
}

function TopologyExplorer() {
  const searchParams = useSearchParams();
  const initialFamily = searchParams.get('family') || 'all';

  const [search, setSearch] = useState('');
  const [selectedFamily, setSelectedFamily] = useState(initialFamily);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const availableFamilies = circuits.filter((c) => c.status === 'available');
  const activeTech = technologies[0]?.name ?? 'tsmcN65';
  const totalTopologies = circuits.reduce((sum, c) => sum + c.topologies.length, 0);

  // Filtered list
  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    return availableFamilies
      .filter((fam) => selectedFamily === 'all' || fam.id === selectedFamily)
      .map((fam) => {
        const matchingTopologies = fam.topologies.filter((top) => {
          // Status filter
          if (selectedStatus !== 'all') {
            if (selectedStatus === 'verified' && top.generator.status !== 'verified') return false;
            if (selectedStatus === 'candidate' && top.generator.status !== 'candidate') return false;
          }

          // Search query
          if (!query) return true;
          const matchName = top.name.toLowerCase().includes(query);
          const matchId = top.id.toLowerCase().includes(query);
          const matchDesc = top.description.toLowerCase().includes(query);
          const matchInput = top.inputType.toLowerCase().includes(query);
          const matchDevices = top.devices.some((d) => d.toLowerCase().includes(query));
          const matchNets = top.nets.some((n) => n.toLowerCase().includes(query));
          return matchName || matchId || matchDesc || matchInput || matchDevices || matchNets;
        });

        return {
          ...fam,
          topologies: matchingTopologies,
        };
      })
      .filter((fam) => fam.topologies.length > 0);
  }, [availableFamilies, selectedFamily, selectedStatus, search]);

  const totalFiltered = filteredGroups.reduce((sum, g) => sum + g.topologies.length, 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.eyebrow}>LIBRARY / REPOSITORY CATALOG</div>
          <h1 className={styles.pageTitle}>Analog Topology Explorer</h1>
          <p className={styles.pageSubtitle}>
            Browse, inspect, and configure {totalTopologies} repository-backed analog circuit
            topologies ready for TSMC 65nm Virtuoso SKILL generation.
          </p>
        </div>

        <div className={styles.headerStats}>
          <div className={styles.statPill}>
            <span className={styles.statValue}>{totalTopologies}</span>
            <span className={styles.statLabel}>TOPOLOGIES</span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statValue}>{availableFamilies.length}</span>
            <span className={styles.statLabel}>FAMILIES</span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statValue}>{activeTech}</span>
            <span className={styles.statLabel}>TARGET PDK</span>
          </div>
        </div>
      </header>

      {/* Control Bar: Search & Filters */}
      <div className={styles.controlBar}>
        <div className={styles.searchBox}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search topologies, inputs, devices, nets (e.g. folded cascode, PMOS, VOUT)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className={styles.clearSearchBtn}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter by Status */}
        <div className={styles.filterGroup}>
          <div className={styles.filterLabel}>
            <Filter size={12} />
            <span>STATUS:</span>
          </div>
          <button
            type="button"
            className={`${styles.filterPill} ${selectedStatus === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setSelectedStatus('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${selectedStatus === 'verified' ? styles.filterPillActive : ''}`}
            onClick={() => setSelectedStatus('verified')}
          >
            Verified
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${selectedStatus === 'candidate' ? styles.filterPillActive : ''}`}
            onClick={() => setSelectedStatus('candidate')}
          >
            Candidate
          </button>
        </div>
      </div>

      {/* Family Pills Bar */}
      <div className={styles.familyBar}>
        <button
          type="button"
          className={`${styles.familyPill} ${selectedFamily === 'all' ? styles.familyPillActive : ''}`}
          onClick={() => setSelectedFamily('all')}
        >
          All Families ({totalTopologies})
        </button>
        {availableFamilies.map((fam) => (
          <button
            key={fam.id}
            type="button"
            className={`${styles.familyPill} ${selectedFamily === pairId(fam.id) ? styles.familyPillActive : ''}`}
            onClick={() => setSelectedFamily(pairId(fam.id))}
          >
            {fam.name} ({fam.topologies.length})
          </button>
        ))}
      </div>

      {/* Results Meta */}
      <div className={styles.resultsMeta}>
        <span>
          Showing <b>{totalFiltered}</b> of <b>{totalTopologies}</b> registered topologies
        </span>
        {(search || selectedFamily !== 'all' || selectedStatus !== 'all') && (
          <button
            type="button"
            className={styles.resetFiltersBtn}
            onClick={() => {
              setSearch('');
              setSelectedFamily('all');
              setSelectedStatus('all');
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Empty State */}
      {totalFiltered === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <CircuitBoard size={24} />
          </div>
          <h3>No matching topologies found</h3>
          <p>
            No registered circuit topologies matched &ldquo;{search}&rdquo; with the selected filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedFamily('all');
              setSelectedStatus('all');
            }}
            className={styles.resetBtn}
          >
            Clear Search & Filters
          </button>
        </div>
      )}

      {/* Groups & Cards Grid */}
      <div className={styles.groupsContainer}>
        {filteredGroups.map((group) => (
          <section key={group.id} className={styles.groupSection}>
            <div className={styles.groupHeader}>
              <div className={styles.groupHeaderLeft}>
                <div className={styles.groupTitleWrap}>
                  <div className={styles.groupEyebrow}>CIRCUIT FAMILY</div>
                  <h2 className={styles.groupTitle}>{group.name}</h2>
                </div>
                <p className={styles.groupDesc}>{group.description}</p>
              </div>
              <div className={styles.groupBadge}>
                <span>{group.topologies.length} TOPOLOGIES</span>
              </div>
            </div>

            <div className={styles.cardsGrid}>
              {group.topologies.map((t) => {
                const deviceCount = t.deviceCount ?? t.contract.devices.length;
                const isVerified = t.generator.status === 'verified';
                return (
                  <div key={t.id} className={styles.topologyCard}>
                    {/* Diagram Preview */}
                    <div className={styles.diagramContainer}>
                      <TopologyDiagram diagram={t.diagram} className={styles.cardDiagram} />
                      <div className={styles.diagramOverlay}>
                        <Link
                          href={`/topologies/${t.id}`}
                          className={styles.inspectBtn}
                          aria-label={`Inspect ${t.name} schematic`}
                        >
                          <span>Inspect Schematic</span>
                        </Link>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className={styles.cardContent}>
                      <div className={styles.cardTopRow}>
                        <Link href={`/topologies/${t.id}`} className={styles.cardTitleLink}>
                          <h3 className={styles.cardTitle}>{t.name}</h3>
                        </Link>
                        <StatusPill variant={isVerified ? 'verified' : 'candidate'}>
                          {t.generator.status}
                        </StatusPill>
                      </div>

                      <p className={styles.cardDesc}>{t.description}</p>

                      {/* Technical Meta Chips */}
                      <div className={styles.cardChips}>
                        <span className={styles.techChip}>
                          <Cpu size={11} />
                          {deviceCount} Devices
                        </span>
                        <span className={styles.techChip}>
                          {t.inputType}
                        </span>
                        <span className={styles.techChipMuted}>
                          {activeTech}
                        </span>
                      </div>

                      {/* Footer Actions */}
                      <div className={styles.cardFooter}>
                        <Link href={`/topologies/${t.id}`} className={styles.viewDetailLink}>
                          <span>Details</span>
                          <ArrowRight size={12} />
                        </Link>

                        <Link
                          href={`/new?circuit=${group.id}&topology=${t.id}`}
                          className={styles.designActionBtn}
                        >
                          <Sparkles size={13} />
                          <span>Configure</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function pairId(id: string) {
  return id;
}
