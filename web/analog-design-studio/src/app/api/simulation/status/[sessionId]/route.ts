import { NextResponse } from 'next/server';
import { SimulationSessionStore } from '@/lib/simulation/simulation-session';

export async function GET(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  const session = SimulationSessionStore.loadSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Simulation session not found' }, { status: 404 });
  }

  return NextResponse.json({
    sessionId: session.id,
    status: session.execution.status,
    elapsedMs: session.execution.elapsedMs,
    startedAt: session.execution.startedAt,
    completedAt: session.execution.completedAt,
    error: session.execution.error,
    results: session.results,
  });
}
