# Folded-Cascode OTA Skill

Canonical available artifact: [`../../canonical/folded-cascode-ota/Folded_Cascode_OTA_V8_REFERENCE.md`](../../canonical/folded-cascode-ota/Folded_Cascode_OTA_V8_REFERENCE.md). No executable V8/V9 `.il` was available in the repository or workspace; the historical gap is intentional and documented rather than filled with invented code.

This directory records the verified folded-cascode OTA workflow developed in the user's Cadence Virtuoso IC6.1.7 / TSMC65 environment.

## Current reference

The latest verified visual-routing revision in the conversation is **V8 — STRAIGHT**.

Its defining rule is:

> Every MOS terminal gets its own short straight isolated stub. Same-net connectivity is created by repeated net labels only. No two MOS terminals are physically connected by generated wires.

## V8 routing rules

```text
NMOS: D up, S down, G left, B right
PMOS MX: S up, D down, G left, B right
```

The left/right placement of a MOS does not change these directions.

## VDC rules

The verified `analogLib/vdc` symbol has:

- `PLUS`
- `MINUS`
- CDF parameter `vdc`

The VDD source is:

```text
VDD -> PLUS -> VDC(1.5 V) -> MINUS -> VSS
```

Bias sources use the same pattern and return to VSS.

## Current initial bias values

```text
VDD       1.50 V
VINP      0.75 V
VINN      0.75 V
VBP_FOLD  0.90 V
VBN_CAS   0.75 V
VBN_SINK  0.60 V
VBN_TAIL  0.60 V
VSS       0 V
```

These are starting values for DC testing, not proof of the performance targets.

## Required workflow for future designs

1. Ask for complete design specifications.
2. Confirm the design contract.
3. Build a complete device/net table.
4. Reuse the verified Cadence infrastructure.
5. Use actual transformed pin coordinates.
6. Generate only short isolated straight terminal stubs.
7. Use repeated net labels instead of physical same-net connections.
8. Create real external pins with `schCreatePin`.
9. Add VDC sources only using the verified `analogLib/vdc` behavior.
10. Validate syntax, topology, pins, orientation, and visual routing before delivery.

See `skills/folded-cascode-ota/SKILL.md` for the complete operating rules.
