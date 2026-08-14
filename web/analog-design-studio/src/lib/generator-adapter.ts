import fs from 'node:fs/promises';
import path from 'node:path';
import type { DesignConfig } from './validation';
import type { GeneratorEntry } from './repository-registry';

export type GenerationMode = 'repository-source-export';

export type GeneratedArtifact = {
  filename: string;
  content: string;
  generator: GeneratorEntry;
  mode: GenerationMode;
  status: 'generated';
  cadencesExecuted: false;
};

function repositoryRoot() {
  return path.resolve(process.cwd(), '..', '..');
}

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function readRepositoryGenerator(generator: GeneratorEntry) {
  const absolutePath = path.join(repositoryRoot(), generator.path);
  const root = repositoryRoot();
  const relative = path.relative(root, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Generator path escapes repository root.');
  }
  return fs.readFile(absolutePath, 'utf8');
}

export async function generateRepositoryArtifact(config: DesignConfig, generator: GeneratorEntry): Promise<GeneratedArtifact> {
  const source = await readRepositoryGenerator(generator);
  const metadata = [
    '; ============================================================',
    '; Analog Design Studio — Repository Generator Export',
    `; Circuit       : ${config.circuitId}`,
    `; Topology      : ${config.topologyId}`,
    `; Technology    : ${config.technologyId}`,
    `; VDD           : ${config.vdd ?? 'unspecified'} V`,
    `; Temperature   : ${config.temperature ?? 'unspecified'} C`,
    `; Corner        : ${config.corner || 'unspecified'}`,
    `; Sizing method : ${config.sizingMethod}`,
    `; Source        : ${generator.path}`,
    `; Invocation    : ${generator.invocation ?? 'not specified'}`,
    ';',
    '; IMPORTANT: This MVP exports the repository generator verbatim with',
    '; configuration provenance metadata. It does not rewrite hard-coded',
    '; generator sizing values or execute Cadence Virtuoso.',
    '; ============================================================',
    '',
  ].join('\n');

  const filename = `${safeName(config.topologyId)}_${safeName(config.technologyId)}_repository_generator.il`;
  return { filename, content: metadata + source, generator, mode: 'repository-source-export', status: 'generated', cadencesExecuted: false };
}
