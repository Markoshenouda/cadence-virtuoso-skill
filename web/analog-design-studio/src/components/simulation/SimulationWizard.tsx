'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Play, Sparkles } from 'lucide-react';
import { SimulationSession, SimulationSessionStore } from '@/lib/simulation/simulation-session';
import { getTopologySimRecommendations } from '@/lib/simulation/sim-recommendations';

import { WizardStepIndicator } from './WizardStepIndicator';
import { Step1SimType } from './Step1SimType';
import { Step2Configure } from './Step2Configure';
import { Step3Outputs } from './Step3Outputs';
import { Step4Specs } from './Step4Specs';
import { Step5Review } from './Step5Review';
import { Step6Run } from './Step6Run';
import styles from './simulation.module.css';

export type SimulationWizardProps = {
  sessionId: string;
};

export function SimulationWizard({ sessionId }: SimulationWizardProps) {
  const router = useRouter();
  const [session, setSession] = useState<SimulationSession | null>(null);

  useEffect(() => {
    const loaded = SimulationSessionStore.loadSession(sessionId);
    if (loaded) {
      // Initialize default specs if empty
      if (!loaded.simulation.specs || loaded.simulation.specs.length === 0) {
        const rec = getTopologySimRecommendations(loaded.design.topologyId, loaded.design.circuitId);
        loaded.simulation.specs = rec.recommendedSpecs;
        loaded.simulation.selectedOutputs = rec.recommendedOutputs;
        SimulationSessionStore.saveSession(loaded);
      }
      setSession(loaded);
    }
  }, [sessionId]);

  if (!session) {
    return (
      <div className={styles.wizardContainer} style={{ padding: '60px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Simulation Session Not Found</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '8px' }}>
          Session ID <code>{sessionId}</code> does not exist or has expired.
        </p>
        <button
          type="button"
          className={styles.nextBtn}
          onClick={() => router.push('/new')}
          style={{ marginTop: '16px', display: 'inline-flex' }}
        >
          <span>Configure New Design →</span>
        </button>
      </div>
    );
  }

  const rec = getTopologySimRecommendations(session.design.topologyId, session.design.circuitId);
  const currentStep = session.wizard.currentStep;

  const updateSession = (updated: Partial<SimulationSession>) => {
    const newSess = { ...session, ...updated };
    setSession(newSess);
    SimulationSessionStore.saveSession(newSess);
  };

  const updateSimConfig = (updated: Partial<typeof session.simulation>) => {
    const newConfig = { ...session.simulation, ...updated };
    updateSession({ simulation: newConfig });
  };

  const goToStep = (stepId: number) => {
    if (stepId === 7) {
      router.push(`/simulation/${sessionId}/results`);
      return;
    }
    const completed = Array.from(new Set([...session.wizard.completedSteps, currentStep]));
    updateSession({
      wizard: {
        currentStep: stepId,
        completedSteps: completed,
      },
    });
  };

  const handleNext = () => {
    if (currentStep < 6) {
      goToStep(currentStep + 1);
    } else if (currentStep === 6) {
      router.push(`/simulation/${sessionId}/results`);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const handleRunSimulation = async () => {
    try {
      const res = await fetch('/api/simulation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: session.design.designConfig, dryRun: false }),
      });
      const resultData = await res.json();
      session.execution.status = resultData.ok ? 'COMPLETED' : 'FAILED';
      session.results = resultData;
      SimulationSessionStore.saveSession(session);
      setSession({ ...session });
    } catch (e) {
      session.execution.status = 'FAILED';
      session.execution.error = e instanceof Error ? e.message : String(e);
      SimulationSessionStore.saveSession(session);
      setSession({ ...session });
    }
  };

  const handleCancelSimulation = async () => {
    try {
      await fetch('/api/simulation/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      session.execution.status = 'CANCELLED';
      SimulationSessionStore.saveSession(session);
      setSession({ ...session });
    } catch {
      // Ignore
    }
  };

  return (
    <div className={styles.wizardContainer}>
      {/* Wizard Header */}
      <div className={styles.wizardHeader}>
        <div className={styles.wizardMetaTop}>
          <div className={styles.designInfo}>
            <span className={styles.topologyBadge}>{session.design.topologyName}</span>
            <span className={styles.techTag}>TSMC 65nm ({session.design.technologyId})</span>
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
            Session ID: {session.id}
          </span>
        </div>

        <WizardStepIndicator
          currentStep={currentStep}
          completedSteps={session.wizard.completedSteps}
          onStepClick={goToStep}
        />
      </div>

      {/* Step Body Content */}
      <div className={styles.wizardBody}>
        {currentStep === 1 && (
          <Step1SimType
            selectedType={session.simulation.simulationType}
            recommendedTypes={rec.recommendedSimTypes}
            onSelectType={(typeId) => updateSimConfig({ simulationType: typeId })}
          />
        )}

        {currentStep === 2 && (
          <Step2Configure config={session.simulation} onChange={updateSimConfig} />
        )}

        {currentStep === 3 && (
          <Step3Outputs
            config={session.simulation}
            recommendedOutputs={rec.recommendedOutputs}
            onChange={(selectedOutputs) => updateSimConfig({ selectedOutputs })}
          />
        )}

        {currentStep === 4 && (
          <Step4Specs
            config={session.simulation}
            recommendedSpecs={rec.recommendedSpecs}
            onChange={(specs) => updateSimConfig({ specs })}
          />
        )}

        {currentStep === 5 && <Step5Review session={session} />}

        {currentStep === 6 && (
          <Step6Run
            session={session}
            onRunSimulation={handleRunSimulation}
            onCancelSimulation={handleCancelSimulation}
            onViewResults={() => router.push(`/simulation/${sessionId}/results`)}
            onBackToConfigure={() => goToStep(2)}
          />
        )}

        {/* Navigation Footer */}
        {currentStep < 6 && (
          <div className={styles.wizardFooter}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <button type="button" className={styles.nextBtn} onClick={handleNext}>
              <span>{currentStep === 5 ? 'Continue to Run →' : 'Next Step →'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
