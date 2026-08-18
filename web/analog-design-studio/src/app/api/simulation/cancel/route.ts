import { NextResponse } from 'next/server';
import { defaultSimulationService } from '@/lib/simulation/simulation-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    await defaultSimulationService.cancel(sessionId);
    return NextResponse.json({ success: true, message: `Simulation ${sessionId} cancelled` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
