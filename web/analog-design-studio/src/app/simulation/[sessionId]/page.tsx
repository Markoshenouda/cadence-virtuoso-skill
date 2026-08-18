'use client';

import React from 'react';
import { SimulationWizard } from '@/components/simulation/SimulationWizard';

export default function SimulationWizardPage({ params }: { params: { sessionId: string } }) {
  return <SimulationWizard sessionId={params.sessionId} />;
}
