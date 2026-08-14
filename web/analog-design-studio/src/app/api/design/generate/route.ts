import { NextResponse } from 'next/server';
import { getTopology } from '@/lib/repository-registry';
import { validateDesign } from '@/lib/validation';
import { generateParameterizedArtifact } from '@/lib/generator-adapter';

export async function POST(request: Request) {
  try {
    const config = await request.json();
import { validateDesign, type DesignConfig } from '@/lib/validation';
import { generateRepositoryArtifact } from '@/lib/generator-adapter';

export async function POST(request: Request) {
  try {
    const config = (await request.json()) as DesignConfig;
    const topology = getTopology(config.circuitId, config.topologyId);
    if (!topology) {
      return NextResponse.json({ ok: false, issues: [{ level: 'error', field: 'topology', message: 'Topology is not registered in the repository registry.' }] }, { status: 400 });
    }

    const issues = validateDesign(config, topology.generator);
    if (issues.some((issue) => issue.level === 'error')) {
      return NextResponse.json({ ok: false, issues }, { status: 400 });
    }
    const artifact = await generateParameterizedArtifact(config);

    const artifact = await generateRepositoryArtifact(config, topology.generator);
    return new NextResponse(artifact.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${artifact.filename}"`,
        'X-Analog-Design-Status': artifact.status,
        'X-Analog-Parameterized': 'true',
        'X-Analog-Cadence-Executed': 'false',
        'X-Analog-Canonical-Source': artifact.sourcePath,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Parameterized generator failed.';
    return NextResponse.json({ ok: false, issues: [{ level: 'error', field: 'generator', message }] }, { status: 400 });
        'X-Analog-Generator': topology.generator.path,
        'X-Analog-Cadence-Executed': 'false',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generator export failed.';
    return NextResponse.json({ ok: false, issues: [{ level: 'error', field: 'generation', message }] }, { status: 500 });
  }
}
