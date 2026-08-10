---
name: cadence-analog-design-agent
version: 2.0.0
description: Spec-first Cadence Virtuoso IC6.1.7 analog CMOS schematic design skill for the verified tsmcN65 environment.
---

# Cadence Analog Design Agent — Master Skill

## Mission

Use this skill for every analog CMOS schematic-generation request in the user's Cadence environment.

**Golden rule: ASK FOR THE DESIGN SPECIFICATIONS FIRST. THEN GENERATE THE SKILL FILE.**

Do not start coding from a vague request such as "make an OTA". First collect the missing specifications, confirm the design contract, then generate the `.il` file.

## 1. Mandatory specification interview

Before generation, ask for:

### Circuit/topology
- Circuit type: OTA, amplifier, mirror, bandgap, filter, etc.
- Input pair: NMOS / PMOS / other.
- Output: single-ended / differential.
- Preferred topology or topology constraints.
- Required number of stages/devices if known.

### Technology
- PDK / node / library.
- MOS master names if different from the verified environment.
- VDD and VSS.
- Body-bias convention.

### Performance
- DC gain target.
- GBW target.
- CL.
- Power limit or Auto.
- Slew rate or Auto.
- Input common-mode range or Auto.
- Output swing.
- Noise, offset, phase margin, or stability requirements if relevant.

### Operating point
- Temperature.
- Process corner.
- Bias currents/voltages if specified.
- Common-mode voltage if specified.
- Required bias pins.

### Sizing methodology
- gm/ID methodology or another method.
- Target gm/ID or Auto.
- L selection: minimum / gm/ID optimized / gain optimized / layout-oriented.
- Layout-oriented sizing: yes/no.
- Matching requirements.
- Finger and multiplier constraints.

### Interface
Ask for exact external net/pin names. Typical names are:
`VINP`, `VINN`, `VOUT`, `VDD`, `VSS`, and bias pins.

If a critical specification is missing, ask before generating. If the user explicitly says Auto, choose an engineering starting value and state it in the design contract.

## 2. Confirm the design contract

Before writing the generator, summarize:

```text
Topology:
Input pair:
Output:
PDK:
VDD/VSS:
Gain:
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
Layout-oriented sizing:
External pins:
```

Then generate the `.il` file.

## 3. Verified Cadence platform

```text
Virtuoso = IC6.1.7
PDK      = tsmcN65
NMOS     = tsmcN65/nch/symbol
PMOS     = tsmcN65/pch/symbol
Terminals= S G B D
CDF      = w l nf m
```

Verified Windows → Debian destination:

```text
cadence@192.168.75.216:/home/cadence/
```

Windows:

```cmd
scp "C:\Users\marko\Desktop\your_file.il" cadence@192.168.75.216:/home/cadence/
```

Cadence CIW:

```skill
load("/home/cadence/your_file.il")
```

## 4. Trusted SKILL APIs

Only the following APIs are already verified in this environment:

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

### Do not use known-failed methods

```skill
schCreateLabel
hiGetString
gets
```

Also do not use C-style function syntax such as:

```skill
(pinName == "G")
```

Use valid SKILL constructs such as `case`, `cond`, `if`, and `equal`.

Do not introduce a new Cadence API into a complete generator before testing it in isolation.

## 5. Verified MOS construction

Use CDF sizing:

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

Create instances with `dbCreateInst` using the real symbol master.

## 6. Real pin geometry

Never hard-code transistor pin coordinates. Use:

```skill
term = dbFindTermByName(inst~>master pinName)
pin  = car(term~>pins)
fig  = pin~>fig
p    = dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
```

For point arithmetic, never do:

```skill
p + list(dx dy)
```

Use:

```skill
list(car(p) + dx cadr(p) + dy)
```

## 7. CRITICAL: named-net architecture

The verified 5T generators use **short local stubs + net labels**, not long physical wires between distant terminals.

If multiple terminals belong to the same net, give each terminal its own short stub and the **same net name**.

Example:

```text
M3.G -> short stub -> MIRROR
M3.D -> short stub -> MIRROR
M1.D -> short stub -> MIRROR
M4.G -> short stub -> MIRROR
```

This means the terminals are electrically connected by the common net name without drawing a physical G-D wire.

### Do not physically wire these unless the user explicitly asks

```text
G <-> D
G <-> B
D <-> B
```

This rule is especially important for diode-connected mirror devices.

Use:

```skill
schCreateWire()
schCreateWireLabel()
```

for the short local stub and label.

## 8. Real external pins

Use the verified master:

```skill
dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
```

Then:

```skill
schCreatePin(cv pinMaster netName direction nil point "R0")
```

External ports must be real schematic pins, not just text.

## 9. Orientation

Verified convention:

```text
NMOS = R0
PMOS = MX
```

When `MX` is used for PMOS, the desired visual convention is:

```text
NMOS: D / MOS / S
PMOS: S / MOS / D
```

Therefore PMOS source is visually on top and drain below.

## 10. Helper architecture

Every generator should preserve this separation:

```text
SetMOS
PlaceMOS
PinCenter
StubEnd
CreateWire
LabelTerminal
CreateExternalPin
Main topology generator
```

Only the topology-specific section should change between designs:

```text
instance count
master type
placement
orientation
W/L/NF/M
net map
external pins
```

Use unique helper prefixes/version suffixes to avoid stale CIW definitions.

## 11. Reference: 5T OTA — NMOS input pair

```text
M1/M2 = NMOS differential input pair
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

Tested starting sizes:

```text
M1/M2 = 2u / 240n
M3/M4 = 4u / 480n
M5    = 6u / 480n
NF=1 M=1
```

These are starting values, not guaranteed performance.

## 12. Reference: 5T OTA — PMOS input pair

```text
M1/M2 = PMOS differential input pair
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

Tested starting sizes:

```text
M1/M2 = 2u / 240n  PMOS
M3/M4 = 4u / 480n  NMOS
M5    = 6u / 480n  PMOS
NF=1 M=1
```

## 13. Reference: Telescopic OTA

The tested reference generator contains:

```text
M1/M2 = NMOS differential input pair
M3/M4 = NMOS cascodes
M5/M6 = PMOS cascodes
M7/M8 = PMOS current-source loads
M9    = NMOS tail
```

The canonical implementation is:

```text
assets/generators/telescopic_ota_v4_pmos_pins.il
```

Do not replace that implementation with a guessed rewrite. Reuse it as the baseline and modify only design-specific data.

Starting dimensions:

```text
M1/M2 = 2u / 240n
M3/M4 = 4u / 480n
M5/M6 = 4u / 480n
M7/M8 = 6u / 480n
M9    = 6u / 480n
NF=1 M=1
```

## 14. New-design procedure

After the specification contract is confirmed:

1. Decide/confirm topology.
2. Write the complete device/net table before coding.
3. Reuse the verified helper infrastructure.
4. Select W/L using the requested gm/ID, gain, GBW, headroom, load, and layout intent.
5. Mark every sizing value as user-specified, reference-derived, or engineering starting value.
6. Place devices symmetrically and readably.
7. Obtain actual transformed terminal coordinates.
8. Create only short local stubs.
9. Apply the same net label to every terminal on a common net.
10. Create real external pins.
11. Save with `dbSave(cv)`.
12. Print a concise generation report.

## 15. Validation gate

Before declaring success:

- [ ] specification contract complete
- [ ] correct number of devices
- [ ] correct masters
- [ ] correct W/L/NF/M
- [ ] correct PMOS/NMOS orientation
- [ ] every S/G/B/D has an intended net
- [ ] common nets use identical labels
- [ ] no unintended physical G-D/B/D-B/G-B shorts
- [ ] external ports are real pins
- [ ] output net is correct
- [ ] VDD/VSS are correct
- [ ] schematic is visually readable
- [ ] `dbSave(cv)` completed

Do not claim gain, GBW, slew rate, DRC, LVS, or simulation success unless it was actually measured/verified.

## 16. Debugging protocol

When an error occurs:

1. Stop changing multiple helpers.
2. Identify the failing subsystem: instance, CDF, pin geometry, wire, label, or pin.
3. Reproduce it with the smallest possible test.
4. Verify the API result.
5. Integrate only after the primitive works.
6. Use a unique function name if stale definitions are suspected.

## 17. Output contract

For every generated design, return:

1. Complete `.il` source/file.
2. SCP command.
3. `load()` command.
4. Main procedure call.
5. Topology/net summary.
6. W/L/NF/M table and source of values.
7. Unverified assumptions.
8. Validation checklist.

## 18. Final rule

```text
ASK FOR SPECS FIRST.
CONFIRM THE DESIGN CONTRACT.
PRESERVE VERIFIED CADENCE INFRASTRUCTURE.
USE ACTUAL PIN GEOMETRY.
USE SHORT STUBS + SAME NET LABELS.
DO NOT PHYSICALLY CONNECT SAME-NET TERMINALS UNLESS REQUESTED.
DO NOT GUESS PDK DETAILS.
CHANGE ONLY DESIGN-SPECIFIC DATA.
```
