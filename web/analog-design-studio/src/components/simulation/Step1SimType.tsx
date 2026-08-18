'use client';

import React from 'react';
import {
  Activity,
  TrendingUp,
  Zap,
  Clock,
  Radio,
  ShieldCheck,
  Shield,
  GitCommit,
  BarChart2,
  Layers,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { SIMULATION_TYPE_CATALOG, SimulationTypeId } from '@/lib/simulation/sim-types';
import styles from './simulation.module.css';

const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  TrendingUp,
  Zap,
  Clock,
  Radio,
  ShieldCheck,
  Shield,
  GitCommit,
  BarChart2,
  Layers,
};

export type Step1SimTypeProps = {
  selectedType: SimulationTypeId;
  recommendedTypes: SimulationTypeId[];
  onSelectType: (typeId: SimulationTypeId) => void;
};

export function Step1SimType({ selectedType, recommendedTypes, onSelectType }: Step1SimTypeProps) {
  const catalogList = Object.values(SIMULATION_TYPE_CATALOG);

  return (
    <div>
      <div className={styles.stepTitleGroup}>
        <h3 className={styles.stepTitle}>Select Simulation Analysis</h3>
        <p className={styles.stepSub}>
          Choose the electrical verification analysis type for your design topology. Recommended types for this circuit are highlighted.
        </p>
      </div>

      <div className={styles.typeCardGrid}>
        {catalogList.map((simMeta) => {
          const isSelected = simMeta.id === selectedType;
          const isRecommended = recommendedTypes.includes(simMeta.id);
          const IconComp = ICON_MAP[simMeta.iconName] || Activity;

          return (
            <div
              key={simMeta.id}
              className={`${styles.typeCard} ${isSelected ? styles.typeCardSelected : ''}`}
              onClick={() => onSelectType(simMeta.id)}
            >
              <div>
                <div className={styles.typeCardHeader}>
                  <div className={styles.typeCardTitleGroup}>
                    <div className={styles.typeCardIcon}>
                      <IconComp size={18} />
                    </div>
                    <div>
                      <h4 className={styles.typeCardTitle}>{simMeta.title}</h4>
                      <span className={styles.typeCardCategory}>{simMeta.category}</span>
                    </div>
                  </div>
                  {isRecommended && (
                    <span
                      style={{
                        fontSize: '9.5px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        backgroundColor: 'var(--accent-bg)',
                        color: 'var(--accent-bright)',
                        border: '1px solid var(--accent-border)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-xs)',
                      }}
                    >
                      RECOMMENDED
                    </span>
                  )}
                </div>

                <p className={styles.typeCardDesc} style={{ marginTop: '10px' }}>
                  {simMeta.description}
                </p>
              </div>

              <div className={styles.typeCardList}>
                <div style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', fontWeight: 700, marginBottom: '2px' }}>
                  MEASURES:
                </div>
                {simMeta.whatItMeasures.slice(0, 3).map((item, idx) => (
                  <div key={idx} className={styles.typeCardListItem}>
                    <span className={styles.typeCardListItemDot} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
