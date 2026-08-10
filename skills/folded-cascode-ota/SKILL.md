---
name: folded-cascode-ota
version: 2.0.0
description: Complete spec-first folded-cascode OTA generation skill for the verified Cadence Virtuoso IC6.1.7 / TSMC65 environment, including isolated terminal routing and analogLib/vdc bias-source generation.
---

# Folded-Cascode OTA Skill v2

Use this skill together with `skills/analog-design-agent/SKILL.md`.

## 1. Mandatory first step — specification interview

Before generating any `.il`, ask the user for:

### Circuit
- Input pair: NMOS / PMOS
- Output: single-ended / differential
- Preferred folded-cascode topology, if any
- Bias strategy: external bias pins / generated VDC sources
- Exact external pin names

### Technology
- PDK / library
- VDD
- VSS
- NMOS/PMOS master names if different

### Performance
- DC gain
- GBW
- CL
- Power limit or Auto
- Slew rate or Auto
- ICMR or Auto
- Output swing or Auto
- Phase margin/noise/offset if relevant

### Operating point
- Temperature
- Process corner
- Input common-mode voltage if specified
- Bias currents/voltages if specified

### Sizing
- gm/ID methodology or another method
- gm/ID target or Auto
- L selection strategy
- Layout-oriented sizing
- Matching/finger/multiplier constraints

Do not code until the specification contract is confirmed.

---

## 2. Current reference contract

The latest folded-cascode work used:

```text
Input pair       = NMOS
PDK              = TSMC65 / tsmcN65
VDD              = 1.5 V
VSS              = 0 V
DC Gain          > 60 dB
GBW              >= 100 MHz
CL               = 5 pF
Temperature      = 27 C
Process corner   = TT
Output           = Single-ended
gm/ID            = Auto
L selection      = gm/ID optimized
Layout-oriented  = YES
Power            = Auto
Slew Rate        = Auto
ICMR             = Auto
Output Swing     = Auto
Bias             = External/generated bias sources as requested
```

Starting DC values used for initial testing:

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

These are starting values only.

---

## 3. Verified platform

```text
Cadence Virtuoso = IC6.1.7
PDK              = tsmcN65
NMOS             = tsmcN65/nch/symbol
PMOS             = tsmcN65/pch/symbol
MOS terminals    = S G B D
CDF              = w l nf m
NMOS orientation = R0
PMOS orientation = MX
```

---

## 4. Trusted APIs

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

Never use C-style `(pinName == "G")` syntax.

New APIs must be tested separately first.

---

## 5. MOS sizing and placement

Use instance CDF:

```skill
cdf = cdfGetInstCDF(inst)
cdf->w->value  = W
cdf->l->value  = L
cdf->nf->value = NF
cdf->m->value  = M
```

Use `dbCreateInst` and the verified masters.

Use actual transformed pin coordinates. Never hard-code pin positions.

---

## 6. Exact reference transistor distribution

The current visual reference is:

```text
                         VDD
                    ┌────┴────┐
                   M3        M4
                   │          │
                   M5        M6
                   │          │
                   M7        M8
                   │          │
                   M9        M10
                   │          │
                  VSS        VSS

          M1                 M2
          │                   │
          └──────── TAIL ─────┘
                       │
                      M11
                       │
                      VSS
```

Roles:

```text
M1/M2   = NMOS differential input pair
M3/M4   = PMOS top pair
M5/M6   = PMOS folded pair
M7/M8   = NMOS folded pair
M9/M10  = NMOS lower current sinks
M11     = NMOS tail current source
```

Single-ended output:

```text
VOUT = right branch between M6 and M8
```

---

## 7. Reference bias nets

```text
M3/M4       G -> VBP2
M5/M6       G -> VBP1
M7/M8       G -> VBN1
M9/M10/M11  G -> VBN2
```

Reference internal nets:

```text
NLEFT
NRIGHT
FOLD_L
VOUT
LEFT_SINK
RIGHT_SINK
TAIL
```

Reference logical relationships:

```text
M1.D -> NLEFT
M3.D -> NLEFT
M5.S -> NLEFT

M2.D -> NRIGHT
M4.D -> NRIGHT
M6.S -> NRIGHT

M5.D -> FOLD_L
M7.D -> FOLD_L

M6.D -> VOUT
M8.D -> VOUT

M7.S -> LEFT_SINK
M9.D -> LEFT_SINK

M8.S -> RIGHT_SINK
M10.D -> RIGHT_SINK

M1.S -> TAIL
M2.S -> TAIL
M11.D -> TAIL
```

Body connections are logical net labels, not physical terminal-to-terminal wires:

```text
PMOS bodies -> VDD
NMOS bodies -> VSS
```

---

## 8. Critical routing rule

Every S/G/D/B is an independent terminal.

For a common logical net:

```text
terminal 1 -> short isolated stub -> NET
terminal 2 -> short isolated stub -> NET
```

Do not draw a physical wire between the two terminals.

Never physically connect:

```text
G-D
G-B
D-B
D-S
S-B
```

unless the user explicitly asks for a physical connection.

This rule is mandatory even for diode-connected or mirror devices.

---

## 9. Straight-stub routing

Every terminal gets one short straight stub.

Forbidden:

- diagonal wires
- loops around MOS
- wires through MOS bodies
- overlapping stubs
- a stub crossing another terminal
- a stub touching another terminal
- long internal wires used only to carry labels

For the verified symbol geometry:

```text
NMOS:       D
            |
        G --MOS-- B
            |
            S

PMOS MX:    S
            |
        G --MOS-- B
            |
            D
```

The G/B direction is determined by actual symbol geometry, not whether the instance is on the left or right.

---

## 10. Real external pins

Use:

```skill
dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
```

Then:

```skill
schCreatePin(cv pinMaster netName direction nil point "R0")
```

When requested, put all pins in one exact vertical column in the user's requested order.

---

## 11. Voltage-source / bias-source generation

Voltage sources are part of the folded-cascode skill.

### Verified source

```text
Library = analogLib
Cell    = vdc
View    = symbol
```

Terminals:

```text
PLUS
MINUS
```

Verified pin centers:

```text
PLUS  = (0.0, 0.0)
MINUS = (0.0, -0.375)
```

### Verified CDF workflow

Place the VDC instance first, then obtain its **instance** CDF:

```skill
cdf = cdfGetInstCDF(inst)
```

Verified parameter:

```text
vdc
```

Set:

```skill
cdf->vdc->value = "1.5"
```

Do not use `cdfGetCellCDF()` as a substitute for the verified instance workflow.

### Standard bias-source shape

```text
        BIAS_NET
           |
         PLUS
           |
        +------+
        | VDC  |
        |1.50V |
        +------+
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

For a bias net:

```text
PLUS  -> bias net
MINUS -> VSS
VDC   -> chosen starting bias
```

Do not physically wire the VDC PLUS pin directly to a MOS terminal. Use net labels and clean local stubs.

### Source placement

Place VDCs in a dedicated clean bias area. Avoid long looping wires. The user specifically wants the source readable as a vertical supply/bias structure when requested.

### Value policy

Clearly distinguish:

```text
user-specified
reference-derived
engineering-starting-value
```

Never claim a bias value is final until DC operating-point verification supports it.

---

## 12. Starting bias values

For the current NMOS-input reference:

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

These are initial test values only. If the DC operating point fails, diagnose device regions and bias headroom before blindly changing all W/L values.

---

## 13. Sizing policy

For every MOS create a complete design table:

```text
M#
master
origin
orientation
W
L
NF
M
G
D
S
B
value source
```

When gm/ID is requested:

1. derive required gm/current from the performance target
2. choose L using gm/ID/gain/layout intent
3. determine W from current density/inversion level
4. check headroom
5. run DC operating point
6. iterate

Do not call the dimensions gm/ID-optimized without actual device characterization/LUT support.

---

## 14. Validation gate

Before delivery:

- [ ] specification contract complete
- [ ] topology matches reference arrangement
- [ ] device count correct
- [ ] masters correct
- [ ] W/L/NF/M intentional
- [ ] NMOS R0 / PMOS MX correct
- [ ] every S/G/D/B has a net
- [ ] same-net terminals have same labels
- [ ] no physical G-D/G-B/D-B/D-S/S-B connection
- [ ] no diagonal/looping wires
- [ ] no overlapping terminal stubs
- [ ] no standalone internal wires
- [ ] external pins are real pins
- [ ] VDC uses analogLib/vdc
- [ ] VDC terminals are PLUS/MINUS
- [ ] VDC uses instance CDF `vdc`
- [ ] VDD/VSS correct
- [ ] bias values identified as starting values
- [ ] syntax checked
- [ ] stale function collisions avoided

---

## 15. Revision lessons

### V5
VDC/internal-label experiments produced standalone internal wires and poor routing.

### V6
Standalone internal wires were removed, but terminal routing and accidental connectivity remained problematic.

### V7
Isolated terminal-stub architecture was introduced, but argument-count and side-dependent routing bugs remained.

### V8
The terminal-routing rule was corrected: G/B direction is independent of left/right placement. Each terminal gets its own straight isolated stub and repeated net labels create logical connectivity.

### V9 reference topology
The transistor placement was reorganized to match the user's reference folded-cascode drawing: M3/M4 top, M5/M6 below, M7/M8 below, M9/M10 lower, M1/M2 input pair, M11 tail.

---

## 16. Future folded-cascode request workflow

```text
1. Ask all specifications.
2. Ask bias strategy.
3. Confirm design contract.
4. Select/confirm folded-cascode topology.
5. Build device/net table.
6. Choose starting W/L/NF/M.
7. Choose starting bias values.
8. Place devices in the reference arrangement.
9. Generate actual terminal coordinates.
10. Create one straight isolated stub per terminal.
11. Apply net labels.
12. Create external pins in a clean column.
13. Create analogLib/vdc sources if requested.
14. Set each VDC through instance CDF.
15. Save.
16. Check and Save in Cadence.
17. Run DC operating point.
18. Only after DC is sane, run AC/transient performance tests.
```

---

## 17. Final rule

```text
ASK FOR SPECS FIRST.
USE THE REFERENCE TOPOLOGY.
REUSE VERIFIED INFRASTRUCTURE.
USE ACTUAL PIN GEOMETRY.
USE ONE STRAIGHT ISOLATED STUB PER TERMINAL.
USE NET LABELS FOR LOGICAL CONNECTIVITY.
NEVER PHYSICALLY CONNECT MOS TERMINALS JUST TO SHARE A NET.
USE REAL EXTERNAL PINS.
USE analogLib/vdc + PLUS/MINUS + instance CDF vdc FOR BIAS SOURCES.
KEEP BIAS SOURCES CLEAN AND READABLE.
VALIDATE BEFORE CLAIMING SUCCESS.
```
