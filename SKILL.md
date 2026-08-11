---
name: cadence-virtuoso-skill
version: 2.1.0
description: Verified Cadence Virtuoso IC6.1.7 / tsmcN65 SKILL knowledge base for analog schematic generation.
---

# Cadence Virtuoso IC6.1.7 — Verified SKILL Knowledge Base

## Source of truth

For new analog designs use (and consult the verification ledger before claiming a rule is verified):
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
CDF: w l nf m
```

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

The user's tested tsmcN65 symbol convention is:
```text
        S
        |
B ----- MOS ----- G
        |
        D
```

Therefore:
```text
G and B are opposite horizontal directions.
G RIGHT => B LEFT.
S and D are opposite vertical directions.
S UP    => D DOWN.
```

Implementation must derive this from actual transformed pin coordinates:
```text
G = G - B
B = B - G
S = S - D
D = D - S
```
Never infer terminal direction from left/right instance placement or `inst~>bBox` center.

## PMOS source-top rule

For any PMOS that must visually have source above drain:
1. place a candidate orientation;
2. read actual transformed S and D coordinates;
3. require `S.Y > D.Y`;
4. reject failing orientations and test the verified alternative.

In the tested tsmcN65 environment:
```text
MX -> FAIL
MY -> PASS
```
Do not assume `MY` for another PDK; verify actual geometry again.

## Mandatory named-net / isolated-stub routing

Every MOS terminal is independent:
```text
terminal -> short straight stub -> net label
```

Same logical net means the same label, not a physical terminal-to-terminal wire.
Forbidden unless explicitly requested:
```text
G-D
G-B
D-B
D-S
S-B
```
Also forbidden: loops, diagonals, through-body wires, touching/overlapping stubs, and standalone wires used only to display a net name.

## Real external pins

Use:
```skill
dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
schCreatePin(cv pinMaster netName direction nil point "R0")
```

Only create pins for intentional user-facing external ports.

### VDC-driven net rule

If a net is driven by generated `analogLib/vdc`, do not also create a redundant external pin by default.
```text
VDD      -> VDC + label      -> no pin
VBN_TAIL -> VDC + label      -> no pin
VINP     -> VDC + label      -> no pin
VINN     -> VDC + label      -> no pin
VOUT     -> external pin
```
An explicit user request for both VDC and pin is an exception and should be confirmed.

## Verified analogLib/vdc

```text
Library = analogLib
Cell = vdc
Terminals = PLUS / MINUS
PLUS  = (0.0, 0.0)
MINUS = (0.0, -0.375)
```

After placing an instance:
```skill
cdf = cdfGetInstCDF(inst)
cdf->vdc->value = "1.5"
```

Standard source:
```text
BIAS_NET
   |
 PLUS
   |
 VDC
   |
 MINUS
   |
 VSS
```
Use independent VDC and MOS stubs with repeated net labels. Do not physically wire them together.

### Explicit VSS reference source

When a self-contained testbench needs an explicit VSS source, create:
```text
PLUS  -> VSS
VDC   = 0 V
MINUS -> VSS
```
Both source terminals carry the `VSS` net label.

## Mandatory new-design workflow

```text
1. Ask for all design specs.
2. Ask for bias strategy and VDC-vs-pin choice.
3. Confirm the Design Contract.
4. Decide/confirm topology.
5. Build device/net table.
6. Choose W/L/NF/M and identify their source.
7. Choose initial bias values and identify their source.
8. Place devices.
9. Read actual transformed terminal coordinates.
10. Verify PMOS S/D orientation if required.
11. Derive G/B and S/D directions from actual terminal pairs.
12. Create one straight isolated stub per terminal.
13. Apply net labels.
14. Classify nets and create only intentional real external pins.
15. Create analogLib/vdc sources when requested.
16. Set VDC values through instance CDF.
17. Save.
18. Check and Save in Cadence.
19. Verify DC operating point.
20. Only then run AC/transient performance tests.
```

## Reference dimensions

5T NMOS input:
```text
M1/M2 = 2u/240n
M3/M4 = 4u/480n
M5    = 6u/480n
NF=1 M=1
```

5T PMOS input:
```text
M1/M2 = 2u/240n PMOS
M3/M4 = 4u/480n NMOS
M5    = 6u/480n PMOS
NF=1 M=1
```

These are starting/reference values only.

## Debugging lessons

- `schCreateLabel` failed -> use `schCreateWireLabel`.
- `hiGetString` / `gets` failed -> collect specifications in chat.
- C-style equality failed -> use valid SKILL constructs.
- vector addition failed -> use `car/cadr` arithmetic.
- standalone internal wires caused floating warnings -> remove them.
- physical terminal-to-terminal connections caused illegal net/bus errors -> isolate each terminal and use repeated labels.
- side-dependent G/B routing caused crossing wires -> derive direction from actual transformed terminal pairs.
- stale CIW definitions caused old functions -> use unique revision names and reload newest file.
- new APIs must be tested in isolation before integration.

## Final principle

```text
ASK FOR SPECS FIRST.
PRESERVE VERIFIED INFRASTRUCTURE.
USE ACTUAL TERMINAL GEOMETRY.
MAKE G/B OPPOSITE AND S/D OPPOSITE FROM ACTUAL COORDINATES.
VERIFY PMOS SOURCE-TOP / DRAIN-BOTTOM.
USE ONE STRAIGHT ISOLATED STUB PER TERMINAL.
USE NET LABELS FOR LOGICAL CONNECTIVITY.
NO REDUNDANT PINS ON VDC-DRIVEN NETS.
USE analogLib/vdc + PLUS/MINUS + instance-CDF vdc.
USE EXPLICIT 0-V VSS SOURCE WHEN REQUESTED.
VALIDATE BEFORE CLAIMING SUCCESS.
```
