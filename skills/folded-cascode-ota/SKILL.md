---
name: folded-cascode-ota
version: 2.3.0
description: Spec-first folded-cascode OTA generation for Cadence IC6.1.7/tsmcN65 using the repository-wide TotalW-first MOS contract, explicit complete CDF assignment, verified terminal geometry, PMOS source-top validation, VDC policy, and no redundant pins.
---

# Folded-Cascode OTA Skill v2.3

Use with `skills/analog-design-agent/SKILL.md`.

## 1. Specification interview

Before any `.il`, confirm input-pair type, output type, PDK, supplies, targets, temperature/corner, gm/ID method, L strategy, layout-oriented requirements, bias strategy, and external interface.

## 2. TotalW-first device sizing — mandatory

Every MOS is specified at design level with:

```text
TotalW
L
NF
M
```

Verified tsmcN65 mapping:

```text
TotalW -> wf
L      -> l
NF     -> fingers + nf
M      -> simM + m
W      -> internally derived W/finger
```

Every generator must explicitly assign:

```skill
cdf->w->value       = W_PER_FINGER
cdf->l->value       = L
cdf->wf->value      = TotalW
cdf->fingers->value = NF
cdf->simM->value    = M
cdf->totalM->value  = NF * M
cdf->nf->value      = NF
cdf->m->value       = M
```

Relations:

```text
W_PER_FINGER = TotalW / NF
WF = TotalW
totalM = NF * M
```

Validate all eight values after assignment. `totalM` is not `M` except when `NF=1`.

## 3. Current topology reference

```text
M1/M2   = input differential pair
M3/M4   = PMOS top pair
M5/M6   = PMOS folded pair
M7/M8   = NMOS folded pair
M9/M10  = NMOS lower sinks
M11     = NMOS tail
```

Single-ended output is on the right branch.

## 4. Terminal routing

Every S/G/D/B is independent:

```text
terminal -> short straight stub -> net label
```

Never physically connect terminals solely because they share a logical net. No loops, diagonals, through-body wires, overlapping stubs, or decorative floating wires.

Derive G/B and S/D directions from transformed pin coordinates.

## 5. PMOS source-top

For every PMOS requiring source-top/drain-bottom, test actual transformed S/D coordinates and require `S.Y > D.Y`. Do not hard-code `MY` or any other orientation across PDKs.

## 6. External pins and VDC

Use `basic/iopin/symbol` + `schCreatePin` only for intentional user-facing ports. VDC-driven nets receive no redundant external pin by default. Use `analogLib/vdc` and its `vdc` CDF value for generated bias sources.

## 7. Validation gate

Before delivery confirm:
- topology/device count
- TotalW/L/NF/M for every MOS
- explicit w/l/wf/fingers/simM/totalM/nf/m assignment
- `wf == TotalW`
- `totalM == NF*M`
- actual PMOS source-top geometry
- opposite G/B and S/D directions
- every terminal has a labeled net
- no unintended terminal-to-terminal physical connections
- no malformed stubs
- only intentional external pins
- VDC CDF values are explicit
- Check-and-Save has no errors

Do not claim gain/GBW until actual Cadence simulation verifies them.

## 8. Canonicalization rule

The old V9 executable is retained as a legacy/reference artifact until a TotalW-migrated Folded Cascode executable is executed and verified in the user's Cadence environment. Do not silently relabel the legacy W-first executable as TotalW.
