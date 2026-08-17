/**
 * Parser for Spectre psfascii result files (the format verified against the
 * live IC6.1.7/MMSIM 14.10 environment). Two shapes exist:
 *
 *  - DC (single point): VALUE section with `"name" "V"|"I" value [PROP(..)]`
 *  - Swept (ac/tran):   VALUE section with repeated blocks
 *        "freq"|"time" <sweep-value>
 *        "name" (real imag)      // ac
 *        "name" value            // tran
 *
 * PROP(..) blocks are skipped.
 */

export type Complex = { re: number; im: number };

export type DcResults = Record<string, number>;

export type SweepResults = {
  sweep: string; // 'freq' | 'time'
  points: Array<{ x: number; values: Record<string, Complex> }>;
};

function stripPropBlocks(lines: string[]): string[] {
  const out: string[] = [];
  let depth = 0;
  for (const line of lines) {
    if (depth > 0) {
      depth += (line.match(/\(/g) ?? []).length;
      depth -= (line.match(/\)/g) ?? []).length;
      continue;
    }
    const propIndex = line.indexOf('PROP(');
    if (propIndex >= 0) {
      // Keep any content on the same line before the PROP( block.
      const prefix = line.slice(0, propIndex).trim();
      if (prefix) out.push(prefix);
      depth += (line.match(/\(/g) ?? []).length;
      depth -= (line.match(/\)/g) ?? []).length;
      continue;
    }
    out.push(line);
  }
  return out;
}

/** Parse a single-point DC psfascii file. */
export function parsePsfDc(text: string): DcResults {
  const valueIndex = text.indexOf('\nVALUE\n');
  if (valueIndex < 0 && !text.startsWith('VALUE\n')) throw new Error('No VALUE section in psfascii DC result.');
  const body = text.slice(text.indexOf('VALUE\n') + 'VALUE\n'.length);
  const lines = stripPropBlocks(body.split(/\r?\n/));
  const results: DcResults = {};
  for (const line of lines) {
    // Type token is present for some signals ("M1:d" "I" ...) and absent for others ("V_S:i" ...).
    const match = line.match(/^"([^"]+)"\s+(?:"(?:V|I)"\s+)?(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/);
    if (match) results[match[1]] = Number(match[2]);
  }
  if (Object.keys(results).length === 0) throw new Error('psfascii DC result contained no values.');
  return results;
}

const COMPLEX_RE = /^"([^"]+)"\s+\((-?\d+\.?\d*(?:[eE][+-]?\d+)?)\s+(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\)/;
const SCALAR_RE = /^"([^"]+)"\s+(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/;
const SWEEP_RE = /^"(freq|time)"\s+(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/;

/** Parse a swept (ac/tran) psfascii file. */
export function parsePsfSweep(text: string): SweepResults {
  const body = text.slice(text.indexOf('VALUE\n') + 'VALUE\n'.length);
  const lines = stripPropBlocks(body.split(/\r?\n/));
  const sweepMatch = lines.map(l => l.match(SWEEP_RE)).find(Boolean);
  if (!sweepMatch) throw new Error('No sweep variable found in psfascii sweep result.');
  const sweep = sweepMatch[1];
  const points: SweepResults['points'] = [];
  let current: { x: number; values: Record<string, Complex> } | null = null;
  for (const line of lines) {
    const sweepLine = line.match(SWEEP_RE);
    if (sweepLine) {
      if (current) points.push(current);
      current = { x: Number(sweepLine[2]), values: {} };
      continue;
    }
    if (!current) continue;
    const complex = line.match(COMPLEX_RE);
    if (complex) {
      current.values[complex[1]] = { re: Number(complex[2]), im: Number(complex[3]) };
      continue;
    }
    const scalar = line.match(SCALAR_RE);
    if (scalar) current.values[scalar[1]] = { re: Number(scalar[2]), im: 0 };
  }
  if (current) points.push(current);
  if (points.length === 0) throw new Error('psfascii sweep result contained no points.');
  return { sweep, points };
}

export function magnitude(c: Complex): number {
  return Math.sqrt(c.re * c.re + c.im * c.im);
}

export function phaseDeg(c: Complex): number {
  return (Math.atan2(c.im, c.re) * 180) / Math.PI;
}
