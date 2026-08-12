---
name: cadence-virtuoso-skill
version: 2.3.0
description: Verified Cadence Virtuoso IC6.1.7 / tsmcN65 SKILL knowledge base with a mandatory TotalW-first MOS sizing contract.
---

# Cadence Virtuoso IC6.1.7 — Verified SKILL Knowledge Base

## Source of truth

For new analog designs use:
- `skills/analog-design-agent/SKILL.md`
- `skills/5t-ota/SKILL.md`
- `skills/folded-cascode-ota/SKILL.md`
- `references/TotalW_MOS_Sizing_Convention_20260812.md`

## Verified platform

```text
Cadence Virtuoso IC6.1.7
tsmcN65
nch / pch
S G B D
```

## Mandatory TotalW-first MOS contract

The user/AI specifies:

```text
TotalW
L
NF
M
```

The user must never be asked for per-finger `W` as the design-level width.

Verified tsmcN65 mapping:

```text
TotalW -> wf
L      -> l
NF     -> fingers + nf
M      -> simM + m
W      -> derived per-finger implementation width
```

The complete CDF state must always be assigned explicitly:

```skill
cdf->w->value       = W_PER_FINGER
cdf->l->value       = L
cdf->wf->value      = TOTAL_W
cdf->fingers->value = NF
cdf->simM->value    = M
cdf->totalM->value  = NF * M
cdf->nf->value      = NF
cdf->m->value       = M
```

`totalM` is **not** `M`; it is `NF * M`.

No sizing field may rely on a default, stale instance value, or implicit callback.

## Width derivation

```text
W_PER_FINGER = TotalW / NF
WF           = TotalW
```

For SKILL generators, suffix-aware parsing may use the verified `cdfParseFloatString()` function. Never use unsafe `evalstring()` to parse user sizing strings.

## Required sizing validation

After every assignment, read back and validate:

```text
w, l, wf, fingers, simM, totalM, nf, m
```

Also validate:

```text
wf == TotalW
totalM == fingers * simM
fingers == NF
nf == NF
simM == M
m == M
```

Generation must stop on mismatch.

## Mandatory new-design workflow

```text
1. Ask all specs.
2. Confirm Design Contract.
3. Decide/confirm topology.
4. Build device/net table.
5. Choose TotalW/L/NF/M and identify their source.
6. Derive W/finger internally.
7. Place devices.
8. Explicitly assign all eight CDF sizing fields.
9. Validate the complete CDF sizing state.
10. Read actual transformed terminal coordinates.
11. Verify PMOS S/D orientation if required.
12. Derive G/B and S/D directions.
13. Create isolated stubs and labels.
14. Create only intentional external pins.
15. Create VDC sources when requested.
16. Save.
17. Check and Save in Cadence.
18. Verify DC operating point.
19. Only then run AC/transient performance tests.
```

## Geometry and routing rules

- Derive terminal direction from actual transformed G/B/S/D coordinates.
- For source-top PMOS require `S.Y > D.Y`; do not assume an orientation universally.
- Use one short straight isolated stub per terminal.
- Use repeated labels for logical connectivity instead of physical terminal-to-terminal wires.
- Do not create redundant external pins on VDC-driven nets.

## Trusted APIs

```skill
geGetEditCellView()
dbOpenCellViewByType()
dbCreateInst()
cdfGetInstCDF()
dbFindTermByName()
centerBox()
dbTransformPoint()
schCreateWire()
schCreateWireLabel()
schCreatePin()
cdfParseFloatString()
```

Avoid `schCreateLabel`, `hiGetString`, `gets`, C-style comparisons, vector point addition, and unsafe `evalstring()` for sizing parsing.

## Legacy policy

Historical W-first artifacts remain unchanged and are evidence only. Current canonical generators and skills must use TotalW-first sizing. Compatibility copies under `assets/` are not canonical unless explicitly marked current.

## Final principle

```text
ASK FOR SPECS FIRST.
USE TOTALW AS THE DESIGN-LEVEL WIDTH.
DERIVE W/FINGER INTERNALLY.
EXPLICITLY ASSIGN W, L, WF, FINGERS, SIMM, TOTALM, NF, M.
ENFORCE totalM = NF * M.
VALIDATE BEFORE CLAIMING SUCCESS.
```
