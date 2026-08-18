'use client';

import React from 'react';
import { ChevronRight, Check } from 'lucide-react';
import styles from './simulation.module.css';

export const WIZARD_STEPS = [
  { id: 1, label: 'Simulation' },
  { id: 2, label: 'Configure' },
  { id: 3, label: 'Outputs' },
  { id: 4, label: 'Specs' },
  { id: 5, label: 'Review' },
  { id: 6, label: 'Run' },
  { id: 7, label: 'Results' },
];

export type WizardStepIndicatorProps = {
  currentStep: number;
  completedSteps: number[];
  onStepClick: (stepId: number) => void;
};

export function WizardStepIndicator({ currentStep, completedSteps, onStepClick }: WizardStepIndicatorProps) {
  return (
    <div className={styles.stepper}>
      {WIZARD_STEPS.map((step, idx) => {
        const isCurrent = step.id === currentStep;
        const isDone = completedSteps.includes(step.id);

        return (
          <React.Fragment key={step.id}>
            <div
              className={`${styles.stepItem} ${isCurrent ? styles.stepActive : ''} ${isDone ? styles.stepCompleted : ''}`}
              onClick={() => onStepClick(step.id)}
            >
              <div className={styles.stepNum}>{isDone ? <Check size={11} /> : step.id}</div>
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
            {idx < WIZARD_STEPS.length - 1 && <ChevronRight size={14} className={styles.stepArrow} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
