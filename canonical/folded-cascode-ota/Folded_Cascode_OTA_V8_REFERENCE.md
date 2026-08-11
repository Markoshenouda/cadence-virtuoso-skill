# Folded-Cascode OTA — Current Reference and Lessons

## Status

This document is now the persistent reference for the latest folded-cascode work. The repository skill was upgraded to include the complete specification-first workflow, clean routing rules, and verified `analogLib/vdc` bias-source workflow.

The latest local generator revision produced in the conversation is:

```text
Folded_Cascode_OTA_NMOS_FINAL_V9_REFERENCE_TOPOLOGY.il
```

The previously verified clean routing reference is:

```text
Folded_Cascode_OTA_NMOS_FINAL_V8_STRAIGHT.il
```

V8 is the routing reference; V9 is the latest topology-arrangement reference.

---

## Verified environment

```text
Virtuoso IC6.1.7
PDK: tsmcN65
NMOS: nch/symbol
PMOS: pch/symbol
Terminals: S G B D
CDF: w l nf m
NMOS orientation: R0
PMOS source-top orientation: MX
```

---

## Mandatory specification-first workflow

Before generating a new folded-cascode `.il` file, ask for:

```text
Input pair
PDK / technology
VDD / VSS
DC gain
GBW
CL
Temperature
Process corner
Output type
Bias strategy
Power
Slew rate
ICMR
Output swing
gm/ID strategy
L-selection strategy
Layout-oriented sizing
External pin names
```

Then confirm the design contract before writing SKILL.

---

## Current reference topology

The desired visual distribution is:

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

## Reference logical net map

```text
M1.G -> VINP
M1.D -> NLEFT
M1.S -> TAIL
M1.B -> VSS

M2.G -> VINN
M2.D -> NRIGHT
M2.S -> TAIL
M2.B -> VSS

M3.G -> VBP2
M3.D -> NLEFT
M3.S -> VDD
M3.B -> VDD

M4.G -> VBP2
M4.D -> NRIGHT
M4.S -> VDD
M4.B -> VDD

M5.G -> VBP1
M5.D -> FOLD_L
M5.S -> NLEFT
M5.B -> VDD

M6.G -> VBP1
M6.D -> VOUT
M6.S -> NRIGHT
M6.B -> VDD

M7.G -> VBN1
M7.D -> FOLD_L
M7.S -> LEFT_SINK
M7.B -> VSS

M8.G -> VBN1
M8.D -> VOUT
M8.S -> RIGHT_SINK
M8.B -> VSS

M9.G -> VBN2
M9.D -> LEFT_SINK
M9.S -> VSS
M9.B -> VSS

M10.G -> VBN2
M10.D -> RIGHT_SINK
M10.S -> VSS
M10.B -> VSS

M11.G -> VBN2
M11.D -> TAIL
M11.S -> VSS
M11.B -> VSS
```

Connectivity is logical by repeated labels. Terminal stubs remain physically isolated.

---

## Critical routing rule learned from V5–V8

Every MOS terminal gets exactly one short straight stub:

```text
G -> stub -> NET
B -> stub -> NET
D -> stub -> NET
S -> stub -> NET
```

Never physically connect two MOS terminals merely because they share a logical net.

Forbidden unless the user explicitly requests a physical connection:

```text
G-D
G-B
D-B
D-S
S-B
```

No diagonal wires, loops around devices, wires through MOS bodies, overlapping stubs, or standalone internal wires.

The terminal direction is determined from actual symbol geometry and orientation, never from whether the MOS is placed on the left or right side.

---

## Verified external pins

Use:

```skill
dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
schCreatePin(cv pinMaster netName direction nil point "R0")
```

When requested, place the external pins in one clean vertical column in the exact user-specified order.

---

## Verified VDC / bias-source workflow

Source:

```text
analogLib / vdc / symbol
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

The verified workflow is to place the source instance and then use its **instance CDF**:

```skill
cdf = cdfGetInstCDF(inst)
cdf->vdc->value = "1.5"
```

Standard source arrangement:

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

For bias sources:

```text
PLUS  -> bias net
MINUS -> VSS
VDC   -> starting bias value
```

Do not physically connect a VDC pin to a MOS terminal. Use the same named-net architecture.

---

## Current design contract

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
Bias strategy    = External/generated bias sources as requested
```

Initial DC values used for testing:

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

## Sizing reference

Latest V9 starting dimensions:

```text
M1/M2   NMOS  4u / 240n
M3/M4   PMOS  6u / 480n
M5/M6   PMOS  6u / 480n
M7/M8   NMOS  6u / 480n
M9/M10  NMOS  6u / 480n
M11     NMOS  6u / 480n
NF=1
M=1
```

These are engineering starting values, not proven gm/ID-optimal or performance-verified values.

---

## Revision history

### V5
VDC/internal-label experiments produced standalone internal wires and poor routing.

### V6
Standalone internal wires were removed, but terminal routing still produced unwanted geometry/connectivity.

### V7
Isolated terminal-stub architecture was introduced, but argument-count and side-dependent routing bugs remained.

### V8
Terminal direction was made independent of left/right placement. Every terminal became an independent straight stub; same-net connectivity became label-only.

### V9
The transistor distribution was reorganized to match the user's reference folded-cascode drawing: M3/M4 top, M5/M6 below, M7/M8 below, M9/M10 lower, M1/M2 input pair, M11 tail.

---

## Final future-agent rule

For every new folded-cascode request:

```text
ASK SPECS
  ↓
CONFIRM DESIGN CONTRACT
  ↓
BUILD DEVICE/NET TABLE
  ↓
CHOOSE W/L/NF/M
  ↓
CHOOSE STARTING BIAS VALUES
  ↓
PLACE USING REFERENCE GEOMETRY
  ↓
ACTUAL PIN GEOMETRY
  ↓
ONE STRAIGHT ISOLATED STUB PER TERMINAL
  ↓
SAME NET LABELS FOR LOGICAL CONNECTIONS
  ↓
REAL EXTERNAL PINS
  ↓
analogLib/vdc SOURCES IF REQUESTED
  ↓
INSTANCE CDF vdc VALUES
  ↓
SAVE + CHECK
  ↓
DC OPERATING POINT
  ↓
ONLY THEN AC/TRANSIENT VERIFICATION
```
