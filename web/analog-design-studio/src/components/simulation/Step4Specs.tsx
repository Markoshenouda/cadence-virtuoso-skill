'use client';

import React from 'react';
import { Plus, Trash2, Sparkles, Target } from 'lucide-react';
import { SpecDefinition, SpecOperator, SpecPriority } from '@/lib/simulation/sim-types';
import { SimulationConfigForm } from '@/lib/simulation/sim-validation';
import styles from './simulation.module.css';

export type Step4SpecsProps = {
  config: SimulationConfigForm;
  recommendedSpecs: SpecDefinition[];
  onChange: (specs: SpecDefinition[]) => void;
};

export function Step4Specs({ config, recommendedSpecs, onChange }: Step4SpecsProps) {
  const specs = config.specs;

  const addSpecRow = () => {
    const newSpec: SpecDefinition = {
      id: `spec_${Date.now()}`,
      name: 'Custom Spec',
      metric: 'gain',
      target: 60,
      operator: '>=',
      unit: 'dB',
      priority: 'Important',
      enabled: true,
    };
    onChange([...specs, newSpec]);
  };

  const removeSpecRow = (id: string) => {
    onChange(specs.filter((s) => s.id !== id));
  };

  const updateSpecRow = (id: string, updated: Partial<SpecDefinition>) => {
    onChange(specs.map((s) => (s.id === id ? { ...s, ...updated } : s)));
  };

  const loadRecommendedSpecs = () => {
    onChange(recommendedSpecs);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div className={styles.stepTitleGroup} style={{ marginBottom: 0 }}>
          <h3 className={styles.stepTitle}>Define Target Specifications</h3>
          <p className={styles.stepSub}>
            Set target values, operators, and priorities to automatically evaluate PASS/FAIL metrics after simulation.
          </p>
        </div>

        <button type="button" className={styles.addSpecBtn} onClick={loadRecommendedSpecs}>
          <Sparkles size={13} />
          <span>Load Recommended Specs</span>
        </button>
      </div>

      {specs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', backgroundColor: 'var(--bg-sunken)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-default)' }}>
          <Target size={24} style={{ color: 'var(--text-tertiary)', marginBottom: '8px' }} />
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No specifications defined yet.</p>
          <button type="button" className={styles.addSpecBtn} onClick={loadRecommendedSpecs} style={{ marginTop: '12px' }}>
            Load Recommended Specs for Topology
          </button>
        </div>
      ) : (
        <div className={styles.specList}>
          <div className={styles.specHeaderRow}>
            <span>SPECIFICATION NAME</span>
            <span>METRIC</span>
            <span>OPERATOR</span>
            <span>TARGET VALUE</span>
            <span>PRIORITY</span>
            <span></span>
          </div>

          {specs.map((spec) => (
            <div key={spec.id} className={styles.specRow}>
              <input
                type="text"
                className={styles.formInput}
                value={spec.name}
                onChange={(e) => updateSpecRow(spec.id, { name: e.target.value })}
                placeholder="Spec Name"
              />

              <select
                className={styles.formSelect}
                value={spec.metric}
                onChange={(e) => updateSpecRow(spec.id, { metric: e.target.value })}
              >
                <option value="gain">gain (dB)</option>
                <option value="gbw">gbw (MHz)</option>
                <option value="phaseMargin">phaseMargin (deg)</option>
                <option value="slewRate">slewRate (V/us)</option>
                <option value="power">power (mW)</option>
                <option value="iref">iref (uA)</option>
                <option value="iout">iout (uA)</option>
                <option value="ratio">ratio (unitless)</option>
                <option value="tailCurrent">tailCurrent (uA)</option>
                <option value="vn_in">vn_in (nV/sqrt(Hz))</option>
              </select>

              <select
                className={styles.formSelect}
                value={spec.operator}
                onChange={(e) => updateSpecRow(spec.id, { operator: e.target.value as SpecOperator })}
              >
                <option value=">=">&gt;= (Greater or Equal)</option>
                <option value="<=">&lt;= (Less or Equal)</option>
                <option value="=">= (Equals)</option>
                <option value=">">&gt; (Strictly Greater)</option>
                <option value="<">&lt; (Strictly Less)</option>
              </select>

              <input
                type="number"
                step="any"
                className={styles.formInput}
                value={spec.target ?? ''}
                onChange={(e) => updateSpecRow(spec.id, { target: parseFloat(e.target.value) || 0 })}
                placeholder="Target"
              />

              <select
                className={styles.formSelect}
                value={spec.priority}
                onChange={(e) => updateSpecRow(spec.id, { priority: e.target.value as SpecPriority })}
              >
                <option value="Must Have">Must Have</option>
                <option value="Important">Important</option>
                <option value="Optional">Optional</option>
              </select>

              <button
                type="button"
                onClick={() => removeSpecRow(spec.id)}
                style={{ color: 'var(--fail)', opacity: 0.8, cursor: 'pointer' }}
                title="Remove Specification"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button type="button" className={styles.addSpecBtn} onClick={addSpecRow} style={{ marginTop: '16px' }}>
        <Plus size={14} />
        <span>Add Specification Row</span>
      </button>
    </div>
  );
}
