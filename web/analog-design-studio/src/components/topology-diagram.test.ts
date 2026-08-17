import { describe, expect, it } from 'vitest';
import { circuits } from '@/lib/repository-registry';
import { diagramKeys, hasDiagram } from '@/components/topology-diagram';

describe('topology diagram registry integrity', () => {
  it('provides a diagram for every registered topology', () => {
    for (const circuit of circuits) {
      for (const topology of circuit.topologies) {
        expect(hasDiagram(topology.diagram), `${circuit.id}/${topology.id}: diagram key '${topology.diagram}' has no SVG`).toBe(true);
      }
    }
  });

  it('keeps diagram keys unique', () => {
    expect(new Set(diagramKeys).size).toBe(diagramKeys.length);
  });

  it('registers exactly the registered topology diagram keys', () => {
    const registryKeys = circuits.flatMap(c => c.topologies.map(t => t.diagram)).sort();
    expect([...diagramKeys].sort()).toEqual(registryKeys);
  });

  it('does not silently fall back to another topology for unknown keys', () => {
    expect(hasDiagram('not-a-topology')).toBe(false);
    expect(hasDiagram('')).toBe(false);
  });
});
