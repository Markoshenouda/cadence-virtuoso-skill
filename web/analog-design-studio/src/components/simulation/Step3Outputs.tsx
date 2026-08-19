'use client';

import React from 'react';
import { CheckSquare, Square, Sparkles } from 'lucide-react';
import { SIMULATION_TYPE_CATALOG, SimulationOutputDef } from '@/lib/simulation/sim-types';
import { SimulationConfigForm } from '@/lib/simulation/sim-validation';
import styles from './simulation.module.css';

export type Step3OutputsProps = {
  config: SimulationConfigForm;
  recommendedOutputs: string[];
  onChange: (selectedOutputs: string[]) => void;
};

export function Step3Outputs({ config, recommendedOutputs, onChange }: Step3OutputsProps) {
  const currentSimMeta = SIMULATION_TYPE_CATALOG[config.simulationType] || SIMULATION_TYPE_CATALOG['AC'];
  const available: SimulationOutputDef[] = currentSimMeta.availableOutputs;

  const toggleOutput = (outputId: string) => {
    if (config.selectedOutputs.includes(outputId)) {
      onChange(config.selectedOutputs.filter((id: string) => id !== outputId));
    } else {
      onChange([...config.selectedOutputs, outputId]);
    }
  };

  const selectAllRecommended = () => {
    const recIds = available
      .filter((o: SimulationOutputDef) => o.category === 'recommended' || recommendedOutputs.includes(o.id))
      .map((o: SimulationOutputDef) => o.id);
    const merged = Array.from(new Set([...config.selectedOutputs, ...recIds]));
    onChange(merged);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div className={styles.stepTitleGroup} style={{ marginBottom: 0 }}>
          <h3 className={styles.stepTitle}>Select Output Measurements</h3>
          <p className={styles.stepSub}>
            Choose metrics to record during {currentSimMeta.title} simulation.
          </p>
        </div>

        <button type="button" className={styles.addSpecBtn} onClick={selectAllRecommended}>
          <Sparkles size={13} />
          <span>Select Recommended</span>
        </button>
      </div>

      <div className={styles.outputsGrid}>
        {available.map((outDef) => {
          const isChecked = config.selectedOutputs.includes(outDef.id);
          const isRec = recommendedOutputs.includes(outDef.id) || outDef.category === 'recommended';

          return (
            <div
              key={outDef.id}
              className={`${styles.outputCheckboxCard} ${isChecked ? styles.outputCheckboxCardActive : ''}`}
              onClick={() => toggleOutput(outDef.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: isChecked ? 'var(--accent)' : 'var(--text-disabled)' }}>
                  {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                </div>

                <div className={styles.outputInfo}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={styles.outputName}>{outDef.name}</span>
                    {isRec && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontFamily: 'var(--font-mono)',
                          backgroundColor: 'var(--accent-bg)',
                          color: 'var(--accent-bright)',
                          border: '1px solid var(--accent-border)',
                          padding: '1px 5px',
                          borderRadius: 'var(--radius-xs)',
                        }}
                      >
                        RECOMMENDED
                      </span>
                    )}
                  </div>
                  <span className={styles.outputDesc}>{outDef.description}</span>
                </div>
              </div>

              <span className={styles.outputUnit}>{outDef.unit || 'unitless'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
