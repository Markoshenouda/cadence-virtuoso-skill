---
name: cadence-virtuoso-skill
version: 2.0.0
description: Verified Cadence Virtuoso IC6.1.7 / tsmcN65 SKILL knowledge base for analog schematic generation. Use the master spec-first skill for new designs.
---

# Cadence Virtuoso IC6.1.7 — Verified SKILL Knowledge Base

## Source of truth

For new analog designs, use:

```text
skills/analog-design-agent/SKILL.md
```

It contains the current **specification-first workflow**, verified construction APIs, named-net routing rules, real external pins, voltage-source generation, bias-source CDF handling, reference 5T/Telescopic/Folded-Cascode designs, and debugging lessons.

For folded-cascode work also use:

```text
skills/folded-cascode-ota/SKILL.md
```

## Verified platform

```text
Cadence Virtuoso IC6.1.7
PDK library = tsmcN65
NMOS = tsmcN65/nch/symbol
PMOS = tsmcN65/pch/symbol
MOS terminals = S G B D
MOS CDF = w l nf m
NMOS orientation = R0
PMOS orientation = MX when source-top/drain-bottom is required
```

## Verified APIs

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

Known failures:

```skill
schCreateLabel
hiGetString
gets
```

Do not use C-style `(pinName == "G")` syntax.

## Verified MOS CDF pattern

```skill
cdf = cdfGetInstCDF(inst)
cdf->w->value  = W
cdf->l->value  = L
cdf->nf->value = NF
cdf->m->value  = M
```

## Verified terminal geometry

```skill
term = dbFindTermByName(inst~>master pinName)
pin  = car(term~>pins)
fig  = pin~>fig
p    = dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
```

Never use vector addition such as:

```skill
p + list(dx dy)
```

Use scalar `car/cadr` arithmetic.

## Mandatory schematic routing rule

Every MOS S/G/D/B terminal is independent.

```text
terminal -> short straight stub -> net label
```

Same logical net = same label. Do not physically connect two MOS terminals merely because they share a net.

Forbidden unless explicitly requested:

```text
G-D
G-B
D-B
D-S
S-B
```

No diagonal wires, no loops around devices, no wires through MOS bodies, no overlapping terminal stubs, and no standalone internal wires used only to display a net name.

Terminal direction must come from actual symbol geometry/orientation, never from whether the instance is placed left or right.

## Real external pins

Use:

```skill
dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
schCreatePin(cv pinMaster netName direction nil point "R0")
```

Pins must be real schematic pins.

## Verified voltage-source system

The verified source is:

```text
Library = analogLib
Cell    = vdc
View    = symbol
Terminals = PLUS / MINUS
```

Verified pin centers:

```text
PLUS  = (0.0, 0.0)
MINUS = (0.0, -0.375)
```

After placing a VDC instance, obtain its **instance CDF**:

```skill
cdf = cdfGetInstCDF(inst)
```

Set the DC value with:

```skill
cdf->vdc->value = "1.5"
```

Standard structure:

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

For VDD:

```text
PLUS  -> VDD
MINUS -> VSS
VDC   -> 1.5 V
```

For bias sources, PLUS receives the bias net name and MINUS receives VSS. Do not physically connect VDC pins to MOS terminals; use clean net labels/stubs.

## Mandatory new-design workflow

```text
1. Ask for all design specs.
2. Ask for bias strategy and whether VDC sources are wanted.
3. Confirm the design contract.
4. Decide/confirm topology.
5. Build device/net table.
6. Choose W/L/NF/M and identify their source.
7. Choose starting bias values and identify their source.
8. Place MOS devices.
9. Get actual transformed pin coordinates.
10. Create one short straight stub per terminal.
11. Label every terminal net.
12. Create real external pins.
13. Create analogLib/vdc sources when requested.
14. Set VDC values through instance CDF `vdc`.
15. Save.
16. Check and Save in Cadence.
17. Verify DC operating point.
18. Only then run AC/transient performance analysis.
```

## Reference dimensions

### 5T NMOS input

```text
M1/M2 = 2u / 240n
M3/M4 = 4u / 480n
M5    = 6u / 480n
NF=1 M=1
```

### 5T PMOS input

```text
M1/M2 = 2u / 240n PMOS
M3/M4 = 4u / 480n NMOS
M5    = 6u / 480n PMOS
NF=1 M=1
```

### Telescopic reference

```text
M1/M2 = 2u / 240n
M3/M4 = 4u / 480n
M5/M6 = 4u / 480n
M7/M8 = 6u / 480n
M9    = 6u / 480n
NF=1 M=1
```

These are starting/reference dimensions, not guaranteed performance results.

## Current folded-cascode reference

Use the dedicated skill for the full topology and bias details:

```text
skills/folded-cascode-ota/SKILL.md
```

Current reference arrangement:

```text
M3/M4   PMOS top pair
M5/M6   PMOS folded pair
M7/M8   NMOS folded pair
M9/M10  NMOS lower sinks
M1/M2   NMOS input pair
M11     NMOS tail
```

Current starting bias values:

```text
VDD      = 1.50 V
VSS      = 0 V
VINP     = 0.75 V
VINN     = 0.75 V
VBP_FOLD = 0.90 V
VBN_CAS  = 0.75 V
VBN_SINK = 0.60 V
VBN_TAIL = 0.60 V
```

## Debugging lessons preserved

- `schCreateLabel` failed → use `schCreateWireLabel`.
- `hiGetString` and `gets` failed → collect specifications in chat, not with those SKILL functions.
- `(pinName == "G")` failed → use valid SKILL constructs.
- vector addition failed → use `car/cadr` arithmetic.
- standalone internal wires caused floating-net warnings → remove them.
- physical terminal-to-terminal connections caused illegal bus/net errors → isolate every terminal and use same net labels.
- side-dependent G/B routing caused wires to cross MOS symbols → derive direction from actual symbol geometry.
- stale CIW definitions caused old functions to run → use unique revision names and reload the newest file.
- test new APIs independently before integrating them.

## Final principle

```text
ASK FOR SPECS FIRST.
PRESERVE VERIFIED INFRASTRUCTURE.
USE ACTUAL PIN GEOMETRY.
USE ISOLATED STRAIGHT STUBS.
USE SAME NET LABELS FOR LOGICAL CONNECTIVITY.
USE REAL EXTERNAL PINS.
USE analogLib/vdc + PLUS/MINUS + instance-CDF vdc FOR BIAS SOURCES.
DO NOT GUESS PDK DETAILS.
CHANGE ONLY DESIGN-SPECIFIC DATA.
VALIDATE BEFORE CLAIMING SUCCESS.
```
