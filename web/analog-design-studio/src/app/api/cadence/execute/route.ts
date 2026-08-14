import { NextResponse } from 'next/server';
import { executeCadence, getCadenceBridgeConfig, verifyCadenceBinary } from '@/lib/cadence-bridge';
import { getTopology } from '@/lib/repository-registry';
import { validateDesign } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = body?.config;
    const dryRun = body?.dryRun === true;
    const topology = getTopology(config?.circuitId, config?.topologyId);
    if (!topology) {
      return NextResponse.json({ ok: false, issues: [{ level: 'error', field: 'topology', message: 'Topology is not registered in the repository registry.' }] }, { status: 400 });
    }
    const issues = validateDesign(config, topology.generator);
    if (issues.some((issue) => issue.level === 'error')) {
      return NextResponse.json({ ok: false, issues }, { status: 400 });
    }
    const bridge = getCadenceBridgeConfig();
    if (!bridge.enabled && !dryRun) {
      return NextResponse.json({ ok: false, status: 'disabled', cadenceExecuted: false, message: 'Cadence bridge is disabled. Set CADENCE_BRIDGE_ENABLED=true on the local server to enable execution, or use dryRun=true.' }, { status: 409 });
    }
    const result = await executeCadence(config, { dryRun, bridge });
    return NextResponse.json({ ok: result.status === 'succeeded' || result.status === 'dry-run' || result.status === 'disabled', ...result }, { status: result.status === 'succeeded' || result.status === 'dry-run' || result.status === 'disabled' ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({ ok: false, status: 'failed', cadenceExecuted: false, message: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}

export async function GET() {
  try {
    const bridge = getCadenceBridgeConfig();
    const probe = bridge.enabled ? await verifyCadenceBinary(bridge) : { ok: false, message: 'Cadence bridge is disabled.' };
    return NextResponse.json({
      enabled: bridge.enabled,
      host: bridge.host,
      user: bridge.user,
      remoteWorkdir: bridge.remoteWorkdir,
      virtuosoPath: bridge.virtuosoPath,
      cadenceRoot: bridge.cadenceRoot,
      pdkRoot: bridge.pdkRoot,
      display: bridge.display,
      library: bridge.library,
      timeoutMs: bridge.timeoutMs,
      reachable: probe.ok,
      message: probe.message,
      cadenceExecution: false,
      spectreExecution: false,
    });
  } catch (error) {
    return NextResponse.json({ enabled: false, reachable: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
