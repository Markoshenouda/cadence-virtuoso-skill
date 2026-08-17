import { NextResponse } from 'next/server';
import { runSimulation } from '@/lib/simulation/sim-runner';
import { getCadenceBridgeConfig } from '@/lib/cadence-bridge';
import { getTopology } from '@/lib/repository-registry';
import { validateDesign } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || !body.config) {
      return NextResponse.json({ ok: false, status: 'failed', message: 'Request body must be a JSON object with a config field.' }, { status: 400 });
    }
    const config = body.config;
    const dryRun = body.dryRun === true;
    const topology = getTopology(config.circuitId, config.topologyId);
    if (!topology) {
      return NextResponse.json({ ok: false, status: 'failed', message: 'Topology is not registered in the repository registry.' }, { status: 400 });
    }
    const issues = validateDesign(config, topology.generator);
    if (issues.some(issue => issue.level === 'error')) {
      return NextResponse.json({ ok: false, status: 'failed', message: issues.map(i => i.message).join(' ') }, { status: 400 });
    }
    const bridge = getCadenceBridgeConfig();
    if (!bridge.enabled && !dryRun) {
      return NextResponse.json({ ok: false, status: 'disabled', message: 'Simulation bridge is disabled. Set CADENCE_BRIDGE_ENABLED=true, or use dryRun=true.' }, { status: 409 });
    }
    const result = await runSimulation(config, { dryRun, bridge });
    const ok = result.status === 'electrically-verified' || result.status === 'dry-run';
    return NextResponse.json({ ok, ...result }, { status: ok || result.status === 'specs-failed' ? 200 : 502 });
  } catch (error) {
    const message = error instanceof SyntaxError ? 'Request body must be valid JSON.' : error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, status: 'failed', message }, { status: 400 });
  }
}

export async function GET() {
  try {
    const bridge = getCadenceBridgeConfig();
    return NextResponse.json({
      enabled: bridge.enabled,
      host: bridge.host,
      spectreBin: bridge.spectreBin,
      spectreModel: bridge.spectreModel,
      remoteWorkdir: bridge.remoteWorkdir,
      timeoutMs: bridge.timeoutMs,
      spectreExecution: false,
      note: 'Spectre execution is controlled by CADENCE_BRIDGE_ENABLED.',
    });
  } catch (error) {
    return NextResponse.json({ enabled: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
