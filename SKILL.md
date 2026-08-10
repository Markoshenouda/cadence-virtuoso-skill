---
name: cadence-virtuoso-skill
version: 1.0.0
description: Generate and modify Cadence Virtuoso IC6.1.7 schematics with SKILL using a verified TSMC65/tmsN65 workflow. Preserve the proven device-placement, CDF-sizing, transformed-pin, wire, net-label, and real-schematic-pin infrastructure; change only topology-specific design data. Use this skill whenever the user asks to create, modify, debug, or automate an analog CMOS schematic in the verified environment.
---

# Cadence Virtuoso SKILL Design Agent

## Mission

Act as a Cadence Virtuoso SKILL schematic-generation engineer working inside the user's **verified** environment. The primary objective is to produce reliable, repeatable schematic generators without repeatedly rediscovering or replacing working infrastructure.

The core rule is:

> **Preserve the proven infrastructure. Change only the design-specific data.**

When the user requests a new circuit, keep the verified PDK handling, MOS CDF sizing, instance creation, real pin-coordinate extraction, wire creation, wire-label creation, and external-pin creation. Modify only device count, topology, placement, orientation, W/L/NF/M, net mapping, and external pins.

## Verified Environment

- Cadence Virtuoso IC6.1.7
- SKILL
- PDK library: `tsmcN65`
- NMOS master: `tsmcN65/nch/symbol`
- PMOS master: `tsmcN65/pch/symbol`
- MOS terminals: `S`, `G`, `B`, `D`
- CDF sizing fields: `w`, `l`, `nf`, `m`

The user has a working passwordless SSH/SCP path between Windows and Debian:

```text
Windows -> cadence@192.168.75.216:/home/cadence/
```

Do not invent another IP or path when this environment is the target.

## Verified SKILL APIs

These were tested in the user's Cadence environment and should be treated as the trusted API set:

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

Do not casually replace these with generic APIs.

## Proven Construction Patterns

### 1. Get the active schematic

```skill
cv = geGetEditCellView()
unless(cv
    error("Please open a schematic first.\n")
)
```

### 2. Open MOS masters

```skill
nmosMaster = dbOpenCellViewByType(
    "tsmcN65"
    "nch"
    "symbol"
    ""
    "r"
)

pmosMaster = dbOpenCellViewByType(
    "tsmcN65"
    "pch"
    "symbol"
    ""
    "r"
)
```

### 3. Create an instance

```skill
inst = dbCreateInst(
    cv
    master
    instName
    origin
    orientation
)
```

### 4. Size a MOS through CDF

Use this pattern unchanged:

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

### 5. Find a real pin coordinate

```skill
term = dbFindTermByName(inst~>master "G")
pin  = car(term~>pins)
fig  = pin~>fig
p    = dbTransformPoint(
          centerBox(fig~>bBox)
          inst~>transform
       )
```

This was directly verified in the user's environment.

### 6. Point arithmetic

**Never** do:

```skill
p + list(dx dy)
```

It failed in the user's SKILL session.

Use:

```skill
list(
    car(p) + dx
    cadr(p) + dy
)
```

### 7. Create a wire

Verified pattern:

```skill
wire = schCreateWire(
    cv
    "route"
    "full"
    list(p1 p2)
    0.0625
    0.0625
    0
)
```

### 8. Create a net label

Verified pattern:

```skill
label = schCreateWireLabel(
    cv
    car(wire)
    p2
    netName
    "lowerLeft"
    "R0"
    "stick"
    0.0625
    nil
)
```

### 9. Create a real schematic pin

The successful final generator used `basic/iopin/symbol`:

```skill
pinMaster = dbOpenCellViewByType(
    "basic"
    "iopin"
    "symbol"
    ""
    "r"
)
```

Then:

```skill
pin = schCreatePin(
    cv
    pinMaster
    netName
    direction
    nil
    point
    "R0"
)
```

Directions used successfully include:

```text
input
output
inputOutput
```

## Orientation Rules

For the successful Telescopic OTA convention:

- NMOS: `R0`
- PMOS: `MX`

`MX` is used so the PMOS visual orientation has **Source at the top and Drain at the bottom**, opposite to the NMOS orientation.

Target visual convention:

```text
NMOS             PMOS
 D                S
 |                |
MOS              MOS
 |                |
 S                D
```

Do not change this convention unless the user explicitly asks for a different orientation.

## Helper Architecture

Future generators should use these conceptual helpers:

- `SetMOS` — CDF sizing only.
- `PlaceMOS` — master + instance creation + orientation + sizing.
- `PinCenter` — actual terminal geometry -> transformed schematic coordinate.
- `StubEnd` — short wire endpoint from a real pin coordinate.
- `LabelPinNet` — short wire + net label.
- `CreateExternalPin` — real `schCreatePin` on an external net.
- `PinFromTerminal` — real terminal -> short wire -> label -> optional external pin.
- `Create<Design>()` — topology-specific main generator.

Do not make topology logic responsible for low-level pin geometry if a helper can isolate it.

## Error History — Do Not Repeat

### `schCreateLabel`

Failed with:

```text
*Error* eval: undefined function - schCreateLabel
```

Use `schCreateWireLabel` instead.

### Vector addition

Failed:

```skill
p + list(1.0 0.0)
```

Use scalar `car/cadr` arithmetic.

### Equality syntax / stale helper problem

Older versions produced:

```text
*Error* eval: not a function - (pinName == "G")
```

Do not use unverified C-style comparison syntax. Use conservative SKILL constructs such as `case` for string dispatch when appropriate. More importantly, use unique helper names for major revisions if the CIW may contain stale definitions, and always `load()` the newest file before running it.

### Do not introduce many unknown APIs at once

When a new feature requires an API that is not already verified:

1. Write a tiny isolated test.
2. Run it in a new empty schematic.
3. Confirm the result.
4. Only then integrate it into the full generator.

This is especially important for new schematic APIs, pin APIs, deletion APIs, ADE automation, simulation setup, and netlist manipulation.

## Successful Telescopic OTA Reference

The final successful architecture used nine devices:

```text
M1/M2 = NMOS differential input pair
M3/M4 = NMOS cascodes
M5/M6 = PMOS cascodes
M7/M8 = PMOS current-source loads
M9    = NMOS tail current source
```

High-gain-oriented starting sizes:

```text
M1/M2  2u / 240n
M3/M4  4u / 480n
M5/M6  4u / 480n
M7/M8  6u / 480n
M9     6u / 480n
```

All used:

```text
NF = 1
M  = 1
```

Do not claim a final gain from these dimensions alone. They are starting values.

## Successful Telescopic OTA Net Map

```text
M1.G -> VINP
M1.D -> NLEFT
M1.S -> TAIL
M1.B -> VSS

M2.G -> VINN
M2.D -> NRIGHT
M2.S -> TAIL
M2.B -> VSS

M3.G -> VBN_CAS
M3.D -> NLEFT_CAS
M3.S -> NLEFT
M3.B -> VSS

M4.G -> VBN_CAS
M4.D -> VOUT
M4.S -> NRIGHT
M4.B -> VSS

M5.G -> VBP_CAS
M5.D -> NLEFT_CAS
M5.S -> NLEFT_LOAD
M5.B -> VDD

M6.G -> VBP_CAS
M6.D -> VOUT
M6.S -> NRIGHT_LOAD
M6.B -> VDD

M7.G -> VBP
M7.D -> NLEFT_LOAD
M7.S -> VDD
M7.B -> VDD

M8.G -> VBP
M8.D -> NRIGHT_LOAD
M8.S -> VDD
M8.B -> VDD

M9.G -> VBN_TAIL
M9.D -> TAIL
M9.S -> VSS
M9.B -> VSS
```

External pins:

```text
VINP       input
VINN       input
VOUT       output
VDD        inputOutput
VSS        inputOutput
VBN_CAS    input
VBP_CAS    input
VBP        input
VBN_TAIL   input
```

## How to Build a New Design

When the user requests another circuit, follow this exact sequence:

### Phase A — Understand the topology

Determine:

- device count
- device type for every instance
- transistor stacking
- differential/single-ended structure
- current mirrors
- cascodes
- bias nodes
- supplies
- external input/output nodes

Do not write code until the topology is explicit.

### Phase B — Reuse infrastructure

Reuse:

```text
SetMOS
PlaceMOS
PinCenter
StubEnd
LabelPinNet
CreateExternalPin
```

Reuse the verified APIs.

### Phase C — Define design data

Put topology-specific information in one clearly marked section:

```text
instance names
master type
origin
orientation
W
L
NF
M
net assignments
external pin list
```

This allows future circuits to change data without rewriting infrastructure.

### Phase D — Generate

1. Open current schematic.
2. Open required masters.
3. Place devices.
4. Size devices.
5. Find actual pin coordinates.
6. Create short wire stubs.
7. Create labels.
8. Create real external pins.
9. Save.
10. Print a concise generation report.

### Phase E — Validate

Check:

- correct number of devices
- correct master names
- correct orientation
- correct W/L/NF/M
- every S/G/B/D assigned
- every intended net assigned
- external pins are real pins
- VDD/VSS correct
- no unintended shorts
- no floating intended connections
- output node correct

Do not call a schematic simulation-ready merely because the generator completed.

## SSH/SCP Workflow

From Windows CMD:

```cmd
scp "C:\Users\marko\Desktop\your_file.il" cadence@192.168.75.216:/home/cadence/
```

Then in Virtuoso CIW:

```skill
load("/home/cadence/your_file.il")
```

Then call the main procedure, for example:

```skill
CreateTelescopicOTA_V3()
```

If a file was revised, load the new file again before executing it.

## File/Revision Policy

The `assets/generators/` directory contains historical generator revisions. The recommended reference is the final successful generator:

```text
assets/generators/telescopic_ota_v4_pmos_pins.il
```

The older V1/V2/V3 files are retained as debugging history and should not automatically be treated as the preferred implementation.

The detailed verified environment reference is:

```text
references/Cadence_SKILL_Design_Agent_Knowledge_Base.md
```

## Output Requirements for Future Generators

When producing a new generator, provide:

1. Complete `.il` source.
2. A runbook with exact copy/load/run commands.
3. A small test first if a new API is introduced.
4. A short explanation of what changed from the proven infrastructure.
5. Clear separation between verified behavior and untested assumptions.

Never silently replace a verified API with an untested alternative.

## Final Operating Principle

Treat the user's Cadence setup as a fixed platform profile:

```text
Virtuoso = IC6.1.7
tsmcN65
nch / pch
S G B D
w l nf m
NMOS = R0
PMOS = MX when source-top is required
```

The job of the AI is to extend this platform reliably. Do not make the user rediscover the same working Cadence behavior for every new circuit.
