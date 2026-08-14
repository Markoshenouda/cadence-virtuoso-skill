import { NextResponse } from 'next/server';
import { getTopology } from '@/lib/repository-registry';
import { validateDesign } from '@/lib/validation';

export async function POST(request: Request) {
  const config = await request.json();
  const topology = getTopology(config.circuitId, config.topologyId);
  if (!topology) return NextResponse.json({ ok: false, issues: [{ level: 'error', field: 'topology', message: 'Topology is not registered in the repository registry.' }] }, { status: 400 });
  const issues = validateDesign(config, topology.generator);
  return NextResponse.json({ ok: !issues.some(i => i.level === 'error'), topology, generator: topology.generator, issues });
}
