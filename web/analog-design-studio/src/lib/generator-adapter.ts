import fs from 'node:fs/promises';
import path from 'node:path';
import type { DesignConfig } from './validation';
import { getGeneratorContract, validateContractConfig, deriveMosState, type GeneratorContract } from './generator-contract';
import type { GeneratorEntry } from './repository-registry';

export type GenerationMode = 'repository-source-export';

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

/**
 * Normalize known legacy-SKILL constructs that are accepted by newer Cadence
 * environments but are parsed unreliably by the IC6.1.7 reader used by the
 * local bridge. This transformation is deliberately narrow and does not alter
 * topology, placement, routing, or bias values.
 */
function normalizeCadenceCompatibility(source: string) {
  const brokenStubEnd = `procedure(TOTA8_StubEnd(inst pinName)
    let((g b s d p dx dy)
        g=TOTA8_PinCenter(inst "G")
        b=TOTA8_PinCenter(inst "B")
        s=TOTA8_PinCenter(inst "S")
        d=TOTA8_PinCenter(inst "D")
        p=TOTA8_PinCenter(inst pinName)
        if(equal(pinName "G") then dx=car(g)-car(b) dy=cadr(g)-cadr(b)
        else if(equal(pinName "B") then dx=car(b)-car(g) dy=cadr(b)-cadr(g)
        else if(equal(pinName "S") then dx=car(s)-car(d) dy=cadr(s)-cadr(d)
        else if(equal(pinName "D") then dx=car(d)-car(s) dy=cadr(d)-cadr(s)
        else error("TOTA8: unsupported terminal %s.\\n" pinName))))
        if(abs(dx)>=abs(dy) then
            if(dx<0.0 then list(car(p)-TOTA8_STUB cadr(p)) else list(car(p)+TOTA8_STUB cadr(p)))
        else
            if(dy<0.0 then list(car(p) cadr(p)-TOTA8_STUB) else list(car(p) cadr(p)+TOTA8_STUB))
        )
)`;

  const fixedStubEnd = `procedure(TOTA8_StubEnd(inst pinName)
    let((g b s d p dx dy)
        g=TOTA8_PinCenter(inst "G")
        b=TOTA8_PinCenter(inst "B")
        s=TOTA8_PinCenter(inst "S")
        d=TOTA8_PinCenter(inst "D")
        p=TOTA8_PinCenter(inst pinName)
        cond(
            (equal(pinName "G")
                dx=car(g)-car(b)
                dy=cadr(g)-cadr(b))
            (equal(pinName "B")
                dx=car(b)-car(g)
                dy=cadr(b)-cadr(g))
            (equal(pinName "S")
                dx=car(s)-car(d)
                dy=cadr(s)-cadr(d))
            (equal(pinName "D")
                dx=car(d)-car(s)
                dy=cadr(d)-cadr(s))
            (t
                error("TOTA8: unsupported terminal %s.\\n" pinName)))
        if(abs(dx)>=abs(dy) then
            if(dx<0.0 then list(car(p)-TOTA8_STUB cadr(p)) else list(car(p)+TOTA8_STUB cadr(p)))
        else
            if(dy<0.0 then list(car(p) cadr(p)-TOTA8_STUB) else list(car(p) cadr(p)+TOTA8_STUB))
        )
    )
)`;

  if (source.includes(brokenStubEnd)) return source.replace(brokenStubEnd, fixedStubEnd);
  return source;
}

/**
 * Cadence IC6.1.7's legacy reader is not UTF-8 safe for arbitrary Unicode
 * source text. Keep the canonical generator readable, but emit an ASCII-only
 * execution artifact to the bridge.
 *
 * Exported for direct unit testing and for any caller that needs to sanitize
 * an execution-bound SKILL fragment without running the full generator flow.
 */
export function sanitizeCadenceIL(source: string) {
  const replacements: Record<string, string> = {
    'µ': 'u',
    'μ': 'u',
    '°': 'deg',
    '—': '-',
    '–': '-',
    '→': '->',
    '←': '<-',
    '≤': '<=',
    '≥': '>=',
    '×': 'x',
    '√': 'sqrt',
    '²': '2',
    '³': '3',
    '…': '...',
  };

  let output = source;
  for (const [from, to] of Object.entries(replacements)) output = output.split(from).join(to);
  return output.replace(/[^\x00-\x7F]/g, '');
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
  const parameterized = parameterizeCanonicalGenerator(canonical, config, contract);
  const generated = sanitizeCadenceIL(normalizeCadenceCompatibility(parameterized));
  const provenance = sanitizeCadenceIL([
    '; ============================================================',
    '; Analog Design Studio - Parameterized Generator Artifact',
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
  ].join('\n'));
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
