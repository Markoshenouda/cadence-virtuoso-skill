---
name: cadence-virtuoso-skill
version: 2.2.0
description: Verified Cadence Virtuoso IC6.1.7 / tsmcN65 SKILL knowledge base for analog schematic generation with TotalW-first MOS sizing.
---

# Cadence Virtuoso IC6.1.7 — Verified SKILL Knowledge Base

## Source of truth

For new analog designs use:
```text
skills/analog-design-agent/SKILL.md
```
Circuit-specific skills:
```text
skills/5t-ota/SKILL.md
skills/folded-cascode-ota/SKILL.md
```

## Verified platform
```text
Cadence Virtuoso IC6.1.7
tsmcN65
nch / pch
S G B D
```

## TotalW-first MOS sizing — mandatory

The design-level width is always:

```text
TotalW
```

For the verified tsmcN65 CDF:

```text
TotalW -> wf       (total_width(M))
L      -> l
NF     -> fingers + nf
M      -> simM + m
W      -> explicit per-finger implementation width
```

Every generated MOS must explicitly assign the complete state:

```skill
cdf->w->value       = W_PER_FINGER
cdf->l->value       = L
cdf->wf->value      = TOTAL_W
cdf->fingers->value = NF
cdf->simM->value    = M
cdf->nf->value      = NF
cdf->m->value       = M
```

After assignment, print and validate all fields. `wf` is the authoritative TotalW field.

Do not use the old W-first interface in new generators. Historical artifacts keep their original convention and are not silently rewritten.

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
```

Do not use `schCreateLabel`, `hiGetString`, `gets`, C-style `(pinName == "G")`, or vector addition `p + list(dx dy)`.

## Verified terminal-direction rule

The tested tsmcN65 symbol convention is:
```text
        S
        |
B ----- MOS ----- G
        |
        D
```

Implementation must derive this from actual transformed pin coordinates:
```text
G = G - B
B = B - G
S = S - D
D = D - S
```

Never infer terminal direction from instance placement or `inst~>bBox` center.

## PMOS source-top rule

For any PMOS that must have source above drain:
1. place a candidate orientation;
2. read actual transformed S and D coordinates;
3. require `S.Y > D.Y`;
4. reject failing orientations and test alternatives.

The recorded tsmcN65 test found:
```text
MX -> FAIL
MY -> PASS
```
Do not assume `MY` for another PDK.

## Mandatory isolated-stub routing

Every MOS terminal is independent:
```text
terminal -> short straight stub -> net label
```

Same logical net means the same label, not a physical terminal-to-terminal wire. Forbidden unless explicitly requested: G-D, G-B, D-B, D-S, S-B physical connections; loops; diagonals; through-body wires; touching/overlapping stubs; standalone wires used only to display a net name.

## Real external pins

Use:
```skill
dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
schCreatePin(cv pinMaster netName direction nil point "R0")
```

Only create intentional user-facing external ports. VDC-driven nets do not get redundant pins by default.

## Verified analogLib/vdc

```text
Library = analogLib
Cell = vdc
Terminals = PLUS / MINUS
PLUS  = (0.0, 0.0)
MINUS = (0.0, -0.375)
```

Set source voltage through instance CDF `vdc`. Use independent VDC and MOS stubs with repeated labels. For an explicit VSS reference source, use 0 V with both terminals labeled VSS.

## Mandatory new-design workflow

```text
1. Ask for all specs.
2. Ask for bias strategy and VDC-vs-pin choice.
3. Confirm the Design Contract.
4. Decide/confirm topology.
5. Build device/net table.
6. Choose TotalW/L/NF/M and identify their source.
7. Derive W/finger in the sizing layer.
8. Place devices.
9. Explicitly assign W/L/WF/fingers/simM/nf/m.
10. Validate the complete CDF sizing state.
11. Read actual transformed terminal coordinates.
12. Verify PMOS S/D orientation if required.
13. Derive G/B and S/D directions.
14. Create isolated stubs and labels.
15. Create only intentional external pins.
16. Create VDC sources when requested.
17. Save.
18. Check and Save in Cadence.
19. Verify DC operating point.
20. Only then run AC/transient performance tests.
```

## Reference dimensions

5T NMOS input:
```text
M1/M2 = TotalW 2u / L 240n / NF 1 / M 1
M3/M4 = TotalW 4u / L 480n / NF 1 / M 1
M5    = TotalW 6u / L 480n / NF 1 / M 1
```

5T PMOS-input reference:
```text
M1/M2 = TotalW 2u / L 240n / NF 1 / M 1
M3/M4 = TotalW 4u / L 480n / NF 1 / M 1
M5    = TotalW 6u / L 480n / NF 1 / M 1
```

These are starting/reference values only.

## Final principle

```text
ASK FOR SPECS FIRST.
USE TOTALW AS THE DESIGN-LEVEL WIDTH.
EXPLICITLY ASSIGN W, L, WF, M, NF AND THE VERIFIED tsmcN65 MIRROR FIELDS.
KEEP WF AS THE AUTHORITATIVE TOTAL-WIDTH FIELD.
USE ACTUAL TERMINAL GEOMETRY.
VERIFY PMOS SOURCE-TOP / DRAIN-BOTTOM.
USE ONE STRAIGHT ISOLATED STUB PER TERMINAL.
USE NET LABELS FOR LOGICAL CONNECTIVITY.
NO REDUNDANT PINS ON VDC-DRIVEN NETS.
VALIDATE BEFORE CLAIMING SUCCESS.
```
