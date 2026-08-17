/**
 * Spectre deck generation from a simulation contract. Produces a standalone
 * netlist-mode deck using the repository-verified conventions:
 *   - include <PDK toplevel.scs> section=<corner>_lib
 *   - instance lines `M1 (d g s b) nch w=.. l=.. nf=.. m=..`
 *   - vsource with dc / mag / type=pulse
 *   - analyses `dcop dc`, `ac1 ac start=.. stop=.. dec=..`, `tran1 tran stop=..`
 *   - save of nodes, terminal currents (`M1:d`), and supply sources
 * All paths come from configuration; nothing machine-specific is hardcoded.
 */

import type { DesignConfig } from '../validation';
import type { SimulationContract, SimSource } from './simulation-contract';

export type SpectreEnvironment = {
  spectreModel: string;
  corner: string;
};

const CORNER_SECTIONS: Record<string, string> = { TT: 'tt_lib', SS: 'ss_lib', FF: 'ff_lib' };

export function modelSectionFor(corner: string): string {
  const section = CORNER_SECTIONS[corner];
  if (!section) throw new Error(`Unsupported process corner for simulation: ${corner}`);
  return section;
}

function deviceMaster(config: DesignConfig, device: string): 'nch' | 'pch' {
  const entry = config.devices.find(d => d.device === device);
  if (!entry) throw new Error(`Device ${device} is missing from the design configuration.`);
  return entry.type === 'PMOS' ? 'pch' : 'nch';
}

function sourceLine(source: SimSource, ground: string): string {
  const plus = source.plus;
  const minus = source.minus === ground ? '0' : source.minus;
  const input = source.role === 'input' ? source.input : undefined;
  const params: string[] = [`dc=${source.dc}`];
  if (input?.acMag !== undefined && input.acMag !== 0) params.push(`mag=${input.acMag}`);
  if (input?.pulse) {
    const p = input.pulse;
    params.push(`type=pulse val0=${p.v0} val1=${p.v1} rise=${p.rise} fall=${p.rise} width=${p.width} period=${p.period}`);
  }
  return `${source.name} (${plus} ${minus}) vsource ${params.join(' ')}`;
}

export function buildSpectreDeck(config: DesignConfig, contract: SimulationContract, env: SpectreEnvironment): string {
  const { simulation, profile } = contract;
  const ground = simulation.nodes.ground;
  const section = modelSectionFor(env.corner);
  const lines: string[] = [];

  lines.push(`// Analog Design Studio simulation deck`);
  lines.push(`// Topology      : ${config.topologyId}`);
  lines.push(`// Technology    : ${config.technologyId}`);
  lines.push(`// Corner/T      : ${config.corner} / ${config.temperature} C`);
  lines.push(`// STATUS        : SIMULATION DECK (no result claim embedded)`);
  lines.push(`simulator lang=spectre`);
  lines.push(`include "${env.spectreModel}" section=${section}`);

  lines.push('');
  lines.push('// Devices (netlist mirrors the canonical generator label table).');
  for (const device of simulation.devices) {
    const sizing = config.devices.find(d => d.device === device.device);
    if (!sizing) throw new Error(`Device ${device.device} is missing from the design configuration.`);
    const master = deviceMaster(config, device.device);
    lines.push(`${device.device} (${device.d} ${device.g} ${device.s} ${device.b}) ${master} w=${sizing.totalW} l=${sizing.L} nf=${sizing.NF} m=${sizing.M}`);
  }

  lines.push('');
  lines.push('// Supplies, biases, and stimulus.');
  for (const source of simulation.sources) lines.push(sourceLine(source, ground));

  if (simulation.load) {
    lines.push('');
    lines.push('// Load.');
    const loadMinus = ground;
    lines.push(`CL (${simulation.load.node} ${loadMinus === ground ? '0' : loadMinus}) capacitor c=${simulation.load.c}`);
  }

  lines.push('');
  lines.push('// Analyses (from the simulation profile).');
  for (const analysis of profile.analyses) {
    if (analysis.kind === 'dc') lines.push(`${analysis.name} dc`);
    if (analysis.kind === 'ac') lines.push(`${analysis.name} ac start=1 stop=1e12 dec=20`);
    if (analysis.kind === 'tran') lines.push(`${analysis.name} tran stop=${simulation.tranStop ?? '4u'} errpreset=moderate`);
  }

  lines.push('');
  lines.push('// Saved signals.');
  const saved = new Set<string>();
  for (const device of simulation.devices) {
    saved.add(device.d);
    saved.add(`${device.device}:d`);
  }
  for (const source of simulation.sources) saved.add(source.name);
  for (const role of [simulation.nodes.out, simulation.nodes.outP, simulation.nodes.outN, simulation.nodes.ref, simulation.nodes.tail]) {
    if (role) saved.add(role);
  }
  lines.push(`save ${Array.from(saved).join(' ')}`);

  return lines.join('\n') + '\n';
}
