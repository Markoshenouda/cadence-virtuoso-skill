import fs from 'node:fs/promises';
import path from 'node:path';
import type { DesignConfig } from './validation';
import { getGeneratorContract, validateContractConfig, deriveMosState, type GeneratorContract } from './generator-contract';

export type GeneratedArtifact = {
  filename: string;
  content: string;
  sourcePath: string;
  topologyId: string;
  technologyId: string;
  status: 'generated';
  cadencesExecuted: false;
  parameterized: true;
  contract: GeneratorContract;
};

function repositoryRoot() {
  return path.resolve(process.cwd(), '..', '..');
}

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parameterizePlacementLine(
  line: string,
  procedureName: string,
  device: string,
  totalW: string,
  L: string,
  NF: number,
  M: number,
) {
  const prefix = new RegExp(
    `^(\\s*.*?${escapeRegExp(procedureName)}\\(cv\\s+\\w+\\s+"${escapeRegExp(device)}"\\s+[^\\s]+\\s+)`,
  );
  const match = line.match(prefix);
  if (!match) return null;

  const remainder = line.slice(match[0].length);
  const fields = remainder.match(/^"[^"]+"\s+"[^"]+"\s+"[^"]+"\s+"[^"]+"(\s+(?:"[^"]+")\s*)?\)\s*$/);
  if (!fields) return null;

  const orientationSuffix = fields[1] ?? '';
  const state = deriveMosState(totalW, NF, M);
  return `${match[0]}"${state.totalW}" "${L}" "${NF}" "${M}"${orientationSuffix})`;
}

export async function readCanonicalGenerator(contract: GeneratorContract) {
  const root = repositoryRoot();
  const absolutePath = path.resolve(root, contract.source.path);
  const relative = path.relative(root, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Generator path escapes repository root.');
  const content = await fs.readFile(absolutePath, 'utf8');
  return { content, absolutePath };
}

export function parameterizeCanonicalGenerator(source: string, config: DesignConfig, contract: GeneratorContract) {
  validateContractConfig(config, contract);
  const byDevice = new Map(config.devices.map((d) => [d.device, d]));
  const lines = source.split(/\r?\n/);
  const changed = new Set<string>();
  const output = lines.map((line) => {
    for (const spec of contract.devices) {
      const device = byDevice.get(spec.device);
      if (!device) continue;
      const procedureName = spec.placementProcedure ?? contract.placementProcedure;
      if (!line.includes(`${procedureName}(cv`) || !line.includes(`"${spec.device}"`)) continue;
      const updated = parameterizePlacementLine(line, procedureName, spec.device, device.totalW, device.L, device.NF, device.M);
      if (updated) {
        changed.add(spec.device);
        return updated;
      }
    }
    return line;
  });
  const missing = contract.devices.map((d) => d.device).filter((d) => !changed.has(d));
  if (missing.length) {
    const details = missing.map((device) => {
      const spec = contract.devices.find((entry) => entry.device === device);
      return `${device} (${spec?.placementProcedure ?? contract.placementProcedure})`;
    });
    throw new Error(`Canonical generator contract anchors not found for: ${details.join(', ')}.`);
  }
  return output.join('\n');
}

export async function generateParameterizedArtifact(config: DesignConfig): Promise<GeneratedArtifact> {
  const contract = getGeneratorContract(config.topologyId, config.technologyId);
  const { content: canonical } = await readCanonicalGenerator(contract);
  const generated = parameterizeCanonicalGenerator(canonical, config, contract);
  const provenance = [
    '; ============================================================',
    '; Analog Design Studio — Parameterized Generator Artifact',
    `; Topology      : ${config.topologyId}`,
    `; Technology    : ${config.technologyId}`,
    `; Source        : ${contract.source.path}`,
    `; Contract      : ${contract.topologyId}`,
    `; Sizing method : ${config.sizingMethod}`,
    `; VDD           : ${config.vdd ?? 'unspecified'} V`,
    `; Temperature   : ${config.temperature ?? 'unspecified'} C`,
    `; Corner        : ${config.corner || 'unspecified'}`,
    '; Parameterization: exact MOS placement anchors only; topology/routing/VDC code is preserved.',
    '; Cadence execution: false',
    '; ============================================================',
    '',
  ].join('\n');
  return {
    filename: `${safeName(config.topologyId)}_${safeName(config.technologyId)}_parameterized.il`,
    content: provenance + generated,
    sourcePath: contract.source.path,
    topologyId: config.topologyId,
    technologyId: config.technologyId,
    status: 'generated',
    cadencesExecuted: false,
    parameterized: true,
    contract,
  };
}
