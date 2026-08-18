'use client';

import React from 'react';
import { Sliders, Thermometer, Zap, Activity } from 'lucide-react';
import { SimulationConfigForm } from '@/lib/simulation/sim-validation';
import styles from './simulation.module.css';

export type Step2ConfigureProps = {
  config: SimulationConfigForm;
  onChange: (updated: Partial<SimulationConfigForm>) => void;
};

export function Step2Configure({ config, onChange }: Step2ConfigureProps) {
  const isAc = ['AC', 'NOISE', 'PSRR', 'CMRR', 'STABILITY'].includes(config.simulationType);
  const isTran = config.simulationType === 'TRAN';
  const isDcSweep = config.simulationType === 'DC_SWEEP';

  return (
    <div>
      <div className={styles.stepTitleGroup}>
        <h3 className={styles.stepTitle}>Configure Simulation Parameters</h3>
        <p className={styles.stepSub}>
          Set analysis frequency sweep bounds, transient step limits, environmental conditions, and bias stimuli.
        </p>
      </div>

      <div className={styles.configSections}>
        {/* Analysis Parameters Card */}
        <div className={styles.configCard}>
          <div className={styles.configCardTitle}>
            <Sliders size={14} />
            <span>ANALYSIS SWEEP PARAMETERS ({config.simulationType})</span>
          </div>

          {isAc && (
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Start Frequency</span>
                  <span className={styles.formUnit}>Hz</span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={config.fStart}
                  onChange={(e) => onChange({ fStart: parseFloat(e.target.value) || 1 })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Stop Frequency</span>
                  <span className={styles.formUnit}>Hz</span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={config.fStop}
                  onChange={(e) => onChange({ fStop: parseFloat(e.target.value) || 1e9 })}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label className={styles.formLabel}>
                  <span>Points Per Decade</span>
                  <span className={styles.formUnit}>pts/dec</span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={config.pointsPerDecade}
                  onChange={(e) => onChange({ pointsPerDecade: parseInt(e.target.value, 10) || 50 })}
                />
              </div>
            </div>
          )}

          {isTran && (
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Stop Time</span>
                  <span className={styles.formUnit}>ns</span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={config.tStop}
                  onChange={(e) => onChange({ tStop: parseFloat(e.target.value) || 100 })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Max Step Time</span>
                  <span className={styles.formUnit}>ns</span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={config.tStep}
                  onChange={(e) => onChange({ tStep: parseFloat(e.target.value) || 0.1 })}
                />
              </div>
            </div>
          )}

          {isDcSweep && (
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Sweep Start</span>
                  <span className={styles.formUnit}>V</span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={config.dcSweepStart}
                  onChange={(e) => onChange({ dcSweepStart: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <span>Sweep Stop</span>
                  <span className={styles.formUnit}>V</span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={config.dcSweepStop}
                  onChange={(e) => onChange({ dcSweepStop: parseFloat(e.target.value) || 1.2 })}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                <label className={styles.formLabel}>
                  <span>Sweep Step Size</span>
                  <span className={styles.formUnit}>V</span>
                </label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={config.dcSweepStep}
                  onChange={(e) => onChange({ dcSweepStep: parseFloat(e.target.value) || 0.01 })}
                />
              </div>
            </div>
          )}

          {!isAc && !isTran && !isDcSweep && (
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              DC Operating Point calculates static bias conditions without sweeping.
            </div>
          )}
        </div>

        {/* Environmental Conditions Card */}
        <div className={styles.configCard}>
          <div className={styles.configCardTitle}>
            <Thermometer size={14} />
            <span>PVT / OPERATING ENVIRONMENT</span>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>Supply Voltage (VDD)</span>
                <span className={styles.formUnit}>V</span>
              </label>
              <input
                type="number"
                step="0.05"
                className={styles.formInput}
                value={config.vdd}
                onChange={(e) => onChange({ vdd: parseFloat(e.target.value) || 1.2 })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>Temperature</span>
                <span className={styles.formUnit}>°C</span>
              </label>
              <input
                type="number"
                className={styles.formInput}
                value={config.temperature}
                onChange={(e) => onChange({ temperature: parseFloat(e.target.value) || 27 })}
              />
            </div>

            <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
              <label className={styles.formLabel}>
                <span>Process Corner</span>
                <span className={styles.formUnit}>Model</span>
              </label>
              <select
                className={styles.formSelect}
                value={config.corner}
                onChange={(e) => onChange({ corner: e.target.value })}
              >
                <option value="TT">TT (Typical-Typical)</option>
                <option value="SS">SS (Slow-Slow)</option>
                <option value="FF">FF (Fast-Fast)</option>
                <option value="SF">SF (Slow-NMOS / Fast-PMOS)</option>
                <option value="FS">FS (Fast-NMOS / Slow-PMOS)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Input Stimulus Card */}
        <div className={styles.configCard}>
          <div className={styles.configCardTitle}>
            <Zap size={14} />
            <span>INPUT STIMULUS & BIAS</span>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>Common-Mode Bias</span>
                <span className={styles.formUnit}>V</span>
              </label>
              <input
                type="number"
                step="0.05"
                className={styles.formInput}
                value={config.commonModeV}
                onChange={(e) => onChange({ commonModeV: parseFloat(e.target.value) || 0.6 })}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <span>AC Magnitude</span>
                <span className={styles.formUnit}>V</span>
              </label>
              <input
                type="number"
                step="0.1"
                className={styles.formInput}
                value={config.acMag}
                onChange={(e) => onChange({ acMag: parseFloat(e.target.value) || 1.0 })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
