---
name: cadence-analog-design-agent
version: 3.0.0
description: Spec-first Cadence Virtuoso IC6.1.7 analog CMOS schematic-generation skill for the verified tsmcN65 environment, including clean named-net routing, real pins, and verified analogLib/vdc bias sources.
---

# Cadence Analog Design Agent — Master Skill v3

## 0. Mission

Use this skill for every analog CMOS schematic-generation request in the user's Cadence Virtuoso environment.

### Golden rule

> **ASK FOR ALL DESIGN SPECS FIRST. CONFIRM THE DESIGN CONTRACT. ONLY THEN GENERATE THE SKILL FILE.**

The AI must behave as if Cadence IC6.1.7 + tsmcN65 is a fixed platform. Reuse the verified infrastructure. Change only topology-specific design data.

Never make the user rediscover verified Cadence behavior.

---

# 1. Mandatory specification interview

Before writing any generator, ask for the following. Do not begin coding from a vague request such as "make an OTA".

## 1.1 Circuit and topology

- Circuit type: OTA / amplifier / current mirror / bandgap / filter / other.
- Input pair: NMOS / PMOS / other.
- Output: single-ended / differential.
- Preferred topology, if any.
- Required device count or stages, if known.
- Bias strategy: external bias pins / generated bias sources / other.
- Exact external pin names, if required.

## 1.2 Technology

- PDK / node / library.
- NMOS and PMOS master names if different from the verified platform.
- VDD.
- VSS.
- Body-bias convention.

For the verified platform the defaults are:

```text
PDK  = tsmcN65
NMOS = nch
PMOS = pch
pins = S G B D
```

Do not silently substitute another PDK/device.

## 1.3 Performance targets

Ask for:

- DC gain.
- GBW.
- CL.
- Power limit or Auto.
- Slew rate or Auto.
- ICMR or Auto.
- Output swing or Auto.
- Phase margin if relevant.
- Noise if relevant.
- Offset if relevant.
- Stability/load requirements if relevant.

## 1.4 Operating conditions

Ask for:

- Temperature.
- Process corner.
- Input common-mode voltage if specified.
- Bias currents/voltages if specified.
- Required bias pins.

## 1.5 Sizing methodology

Ask for:

- gm/ID methodology or another method.
- gm/ID target or Auto.
- L selection: minimum / gm/ID optimized / gain optimized / layout-oriented / other.
- Layout-oriented sizing: YES/NO.
- Matching requirements.
- Finger/multiplier constraints.

### Auto rule

If the user explicitly says `Auto`, choose an engineering starting value and state it in the design contract. Do not present an Auto-derived value as a verified final result.

### Missing critical spec rule

If a critical specification is missing, ask before generation.

---

# 2. Confirm the design contract

Before writing the `.il`, print/summarize:

```text
Circuit:
Topology:
Input pair:
Output:
Bias strategy:
PDK:
NMOS master:
PMOS master:
VDD/VSS:
DC gain:
GBW:
CL:
Power:
Slew rate:
ICMR:
Output swing:
Temperature:
Corner:
gm/ID:
L strategy:
Layout-oriented:
External pins:
Bias nets:
```

Then generate the file.

---

# 3. Verified Cadence platform

```text
Virtuoso = IC6.1.7
PDK      = tsmcN65
NMOS     = tsmcN65/nch/symbol
PMOS     = tsmcN65/pch/symbol
Terminals= S G B D
CDF      = w l nf m
```

Verified Windows → Debian transfer:

```text
cadence@192.168.75.216:/home/cadence/
```

Windows CMD:

```cmd
scp "C:\Users\marko\Desktop\your_file.il" cadence@192.168.75.216:/home/cadence/
```

Virtuoso CIW:

```skill
load("/home/cadence/your_file.il")
```

Always load the newest revision before calling its main procedure.

---

# 4. Trusted SKILL APIs

Verified in this environment:

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

Known failed/untrusted methods:

```skill
schCreateLabel
hiGetString
gets
```

Do not use C-style syntax such as:

```skill
(pinName == "G")
```

Use valid SKILL constructs such as `case`, `cond`, `if`, and `equal`.

If a new API is needed, test it in a tiny isolated schematic first. Only integrate it after the user confirms it works.

---

# 5. MOS creation and CDF sizing

Use the verified instance CDF method:

```skill
procedure(SetMOS(inst W L NF M)
    let((cdf)
        cdf = cdfGetInstCDF(inst)
        unless(cdf
            error("Cannot access instance CDF.\n")
        )
        cdf->w->value  = W
        cdf->l->value  = L
        cdf->nf->value = NF
        cdf->m->value  = M
    )
)
```

Never guess CDF parameter names for the verified platform.

Create devices with:

```skill
dbCreateInst(cv master instName origin orientation)
```

---

# 6. MOS orientation

Verified convention:

```text
NMOS = R0
PMOS = MX
```

When PMOS source-top orientation is required:

```text
NMOS:          PMOS (MX):
    D              S
    |              |
G --MOS-- B    G --MOS-- B
    |              |
    S              D
```

The left/right placement of an instance must never be used to infer its terminal direction.

---

# 7. Actual terminal geometry — mandatory

Never hard-code transistor pin coordinates.

Use:

```skill
term = dbFindTermByName(inst~>master pinName)
pin  = car(term~>pins)
fig  = pin~>fig
p    = dbTransformPoint(
          centerBox(fig~>bBox)
          inst~>transform
       )
```

For point arithmetic, never use:

```skill
p + list(dx dy)
```

Use:

```skill
list(
    car(p) + dx
    cadr(p) + dy
)
```

---

# 8. CRITICAL named-net + isolated-stub architecture

This is the most important routing rule learned from the 5T, Telescopic, and Folded-Cascode debugging sessions.

## 8.1 Every MOS terminal is independent

For every MOS, S/G/D/B must be handled independently.

If two terminals belong to the same logical net, do **not** physically connect them with a wire merely to share the net.

Example:

```text
G terminal -> short isolated stub -> MIRROR
D terminal -> short isolated stub -> MIRROR
```

The two stubs must not touch.

This applies to:

```text
G <-> D
G <-> B
D <-> B
D <-> S
S <-> B
```

No terminal-to-terminal physical connection is allowed unless the user explicitly requests a physical wire.

## 8.2 Logical connectivity

Logical connectivity is created by repeating the same net label on independent terminal stubs.

For example:

```text
M1.G -> VINP
M2.G -> VINN

M1.D -> MIRROR
M3.G -> MIRROR
M3.D -> MIRROR
```

The same label means the same logical net; the stubs remain physically separate.

## 8.3 Straight-stub rule

Every terminal gets exactly one short, straight local stub.

Forbidden:

- diagonal wires
- wires wrapping around MOS symbols
- long wires through the MOS body
- wires crossing the symbol
- overlapping terminal stubs
- a stub passing through another terminal
- a stub touching another terminal stub
- decorative wires in empty space

The desired visual convention is:

```text
        D/S
         |
         |
G -------MOS------- B
         |
         |
        S/D
```

The exact vertical assignment depends on NMOS/PMOS orientation, but G/B horizontal direction must come from actual symbol geometry, not from left/right placement.

## 8.4 No standalone internal wires

Do not create an internal wire just to display a net name:

```text
NLEFT --------------------   <- forbidden
```

Instead, put `NLEFT` on the actual terminal stubs that use it.

This rule was introduced to eliminate floating-net warnings such as `NLEFT`, `NRIGHT`, `FOLD_L`, `TAIL`, `LEFT_SINK`, and `RIGHT_SINK` appearing on isolated wires.

---

# 9. Real external pins

Use the verified master:

```skill
dbOpenCellViewByType(
    "basic"
    "iopin"
    "symbol"
    ""
    "r"
)
```

Create a real pin with:

```skill
schCreatePin(
    cv
    pinMaster
    netName
    direction
    nil
    point
    "R0"
)
```

Directions successfully used:

```text
input
output
inputOutput
```

External pins are real schematic objects, not text labels.

When requested, place all external pins in one clean vertical column, in the exact order supplied by the user.

---

# 10. VERIFIED Voltage Source / Bias Source system

Voltage-source generation is now a first-class part of the skill.

## 10.1 Verified source

Use:

```text
Library = analogLib
Cell    = vdc
View    = symbol
```

The verified terminals are:

```text
PLUS
MINUS
```

Verified terminal geometry from the user's Cadence environment:

```text
PLUS  center = (0.0, 0.0)
MINUS center = (0.0, -0.375)
```

## 10.2 Important CDF lesson

Do not call `cdfGetCellCDF()` on the master and assume it is the instance CDF. The verified workflow is:

1. Place the VDC instance.
2. Find the actual instance in `cv~>instances`.
3. Call:

```skill
cdf = cdfGetInstCDF(inst)
```

4. The verified parameter list contains:

```text
vdc
acm
acp
xfm
pacm
pacp
tc1
tc2
tnom
...
```

5. Set the DC voltage using:

```skill
cdf->vdc->value = "1.5"
```

Do not guess another parameter name.

## 10.3 Bias-source topology

The standard bias source must visually be:

```text
        BIAS_NET
           |
         PLUS
           |
       +-------+
       |  VDC  |
       | 1.5V  |
       +-------+
           |
         MINUS
           |
          VSS
```

For a supply source:

```text
VDD net -> PLUS
VSS      -> MINUS
VDC      = 1.5 V
```

For a bias source:

```text
VBIAS net -> PLUS
VSS       -> MINUS
VDC       = chosen bias voltage
```

Do not physically connect the VDC PLUS pin to a MOS terminal. The VDC terminal and MOS terminal each use their own net-labeled local stub.

## 10.4 Bias source placement

When bias sources are requested:

- place them in a clean, separate bias area
- use the exact bias net name at the PLUS side
- use `VSS` at the MINUS side for ground-referenced sources
- avoid long looping wires
- avoid decorative/floating wires
- keep the source readable as `VDD → PLUS → VDC → MINUS → VSS` when requested

## 10.5 Bias values

The AI must distinguish:

```text
user-specified bias
reference-derived bias
engineering starting bias
```

Never call a starting bias value final without DC verification.

---

# 11. Specification-first + voltage-source workflow

The complete workflow is now:

```text
1. Ask for circuit specifications.
2. Ask for bias strategy.
3. Ask whether bias should be external pins or generated VDC sources.
4. Confirm the design contract.
5. Build the device/net table.
6. Determine starting W/L/NF/M.
7. Determine starting bias values.
8. Generate MOS devices.
9. Generate isolated straight terminal stubs + net labels.
10. Generate real external pins.
11. Generate analogLib/vdc sources if requested.
12. Set VDC values through instance CDF.
13. Save.
14. Run Check and Save in Cadence.
15. Only then proceed to DC operating point.
```

---

# 12. Reference: 5T OTA NMOS input

Topology:

```text
M1/M2 = NMOS differential pair
M3/M4 = PMOS current-mirror load
M5    = NMOS tail
```

Logical net map:

```text
M1.G -> VINP
M2.G -> VINN
M1.D -> MIRROR
M3.D -> MIRROR
M3.G -> MIRROR
M4.G -> MIRROR
M2.D -> VOUT
M4.D -> VOUT
M1.S -> TAIL
M2.S -> TAIL
M5.D -> TAIL
M5.G -> VBN_TAIL
M5.S -> VSS
M5.B -> VSS
M1.B -> VSS
M2.B -> VSS
M3.S -> VDD
M4.S -> VDD
M3.B -> VDD
M4.B -> VDD
```

Starting dimensions:

```text
M1/M2 = 2u / 240n
M3/M4 = 4u / 480n
M5    = 6u / 480n
NF=1 M=1
```

---

# 13. Reference: 5T OTA PMOS input

Topology:

```text
M1/M2 = PMOS differential pair
M3/M4 = NMOS current-mirror load
M5    = PMOS tail
```

Logical net map:

```text
M1.G -> VINP
M2.G -> VINN
M1.D -> MIRROR
M3.D -> MIRROR
M3.G -> MIRROR
M4.G -> MIRROR
M2.D -> VOUT
M4.D -> VOUT
M1.S -> TAIL
M2.S -> TAIL
M5.D -> TAIL
M5.G -> VBP_TAIL
M5.S -> VDD
M5.B -> VDD
M1.B -> VDD
M2.B -> VDD
M3.S -> VSS
M4.S -> VSS
M3.B -> VSS
M4.B -> VSS
```

Starting dimensions:

```text
M1/M2 = 2u / 240n PMOS
M3/M4 = 4u / 480n NMOS
M5    = 6u / 480n PMOS
NF=1 M=1
```

---

# 14. Reference: Telescopic OTA

Canonical reference generator:

```text
assets/generators/telescopic_ota_v4_pmos_pins.il
```

Topology:

```text
M1/M2 = NMOS differential pair
M3/M4 = NMOS cascodes
M5/M6 = PMOS cascodes
M7/M8 = PMOS current-source loads
M9    = NMOS tail
```

Starting dimensions:

```text
M1/M2 = 2u / 240n
M3/M4 = 4u / 480n
M5/M6 = 4u / 480n
M7/M8 = 6u / 480n
M9    = 6u / 480n
NF=1 M=1
```

Reuse this implementation instead of rewriting the low-level infrastructure.

---

# 15. Reference: Folded-Cascode OTA

The dedicated skill is:

```text
skills/folded-cascode-ota/SKILL.md
```

The current reference arrangement used in the user's work is:

```text
                 VDD
                  |
             M3       M4
                  
             M5       M6
                  
             M7       M8
                  
             M9       M10
                  |
                 VSS

          M1             M2
           \             /
            \--- TAIL --/
                  |
                 M11
                  |
                 VSS
```

Reference roles:

```text
M1/M2   NMOS input pair
M3/M4   PMOS top pair
M5/M6   PMOS folded pair
M7/M8   NMOS folded pair
M9/M10  NMOS lower sinks
M11     NMOS tail
```

Reference bias nets:

```text
M3/M4   gates -> VBP2
M5/M6   gates -> VBP1
M7/M8   gates -> VBN1
M9/M10/M11 gates -> VBN2
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

The current design contract used in the latest Folded-Cascode work was:

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

Starting DC test values used in the latest work:

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

These are starting values only. They do not prove gain, GBW, saturation, swing, or stability.

---

# 16. Sizing policy

For every MOS, maintain a table:

```text
Instance
Master
Origin
Orientation
W
L
NF
M
G net
D net
S net
B net
Value source
```

`Value source` must be one of:

```text
user-specified
reference-derived
engineering-starting-value
```

When gm/ID is requested:

1. determine target current/gm from performance requirements
2. choose L from the requested gm/ID/gain/layout strategy
3. determine W from the required inversion level/current density
4. verify headroom and region in DC
5. iterate after actual operating-point results

Do not claim that a W/L table is gm/ID optimized unless it was actually obtained from characterized device data/LUTs.

---

# 17. Validation gate

Before delivery:

- [ ] specification interview completed
- [ ] design contract confirmed
- [ ] topology explicit
- [ ] device count correct
- [ ] master names correct
- [ ] W/L/NF/M intentional
- [ ] orientation correct
- [ ] every S/G/D/B assigned a net
- [ ] same-net terminals use same labels
- [ ] no physical G-D connection unless explicitly requested
- [ ] no G-B connection
- [ ] no D-B connection
- [ ] no accidental terminal-to-terminal touch
- [ ] no diagonal wires
- [ ] no wrapping wires
- [ ] no standalone internal wires
- [ ] external pins are real `schCreatePin` objects
- [ ] VDC sources use `analogLib/vdc`
- [ ] VDC uses PLUS/MINUS
- [ ] VDC value is set through instance CDF `vdc`
- [ ] VDD/VSS correct
- [ ] bias values identified as starting vs verified
- [ ] schematic saved
- [ ] syntax checked
- [ ] stale function collisions avoided

Do not call the design simulation-ready merely because the SKILL generator ran.

---

# 18. Debugging protocol and lessons

### Lesson 1 — stale functions

If CIW executes an old function, use a unique versioned entry point and load the newest file before running.

### Lesson 2 — invalid input functions

`hiGetString` and `gets` were not valid for the user's workflow. Do not use them for specification collection inside SKILL. The AI should ask the user for specs in chat before generating the file.

### Lesson 3 — equality syntax

Do not use `(pinName == "G")` as a function call. Use valid SKILL branching/comparison constructs.

### Lesson 4 — vector arithmetic

Do not use `p + list(dx dy)`.

### Lesson 5 — label API

Do not use `schCreateLabel`; use `schCreateWireLabel`.

### Lesson 6 — floating internal wires

Standalone internal wires with labels caused floating-net warnings. Labels belong on actual terminal stubs.

### Lesson 7 — illegal bus references

Errors such as:

```text
DB-270004: Illegal bus reference - Can't tap "<VINP>" from net "VSS"
```

indicate that labels/stubs were accidentally physically connected to the wrong net. The fix is to isolate every terminal stub and use labels only for logical same-net connectivity.

### Lesson 8 — G/B accidental connection

The generator must never use a routing shortcut that joins G and B. Both get independent stubs and independent labels.

### Lesson 9 — left/right routing bug

Terminal direction must be determined from actual symbol geometry/orientation. Do not reverse G/B directions just because a MOS is placed on the right side.

### Lesson 10 — new APIs

Test every new Cadence API independently before integrating it into the full generator.

---

# 19. Output contract for every new design

Return/provide:

1. Complete `.il` file.
2. Exact SCP command.
3. Exact `load()` command.
4. Exact main procedure call.
5. Topology summary.
6. Device/net table.
7. W/L/NF/M table.
8. Bias-source table, if used.
9. Starting bias values and their source.
10. Validation checklist.
11. Any unverified assumptions.

If a new API was introduced, provide the tiny isolated test before the full generator.

---

# 20. Final operating principle

```text
ASK FOR SPECS FIRST.
CONFIRM THE DESIGN CONTRACT.
REUSE VERIFIED INFRASTRUCTURE.
DO NOT GUESS PDK DETAILS.
USE ACTUAL PIN GEOMETRY.
USE SHORT STRAIGHT STUBS.
USE SAME NET LABELS FOR LOGICAL CONNECTIVITY.
NEVER PHYSICALLY CONNECT MOS TERMINALS JUST TO SHARE A NET.
USE REAL EXTERNAL PINS.
USE VERIFIED analogLib/vdc FOR GENERATED BIAS SOURCES.
SET VDC THROUGH INSTANCE CDF -> vdc.
KEEP BIAS SOURCES CLEAN AND READABLE.
CHANGE ONLY DESIGN-SPECIFIC DATA.
VALIDATE BEFORE CLAIMING SUCCESS.
```
