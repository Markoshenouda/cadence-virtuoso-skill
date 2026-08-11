---
name: cadence-5t-ota
version: 1.1.0
description: Generate 5T CMOS OTA schematics using the verified Cadence IC6.1.7/tsmcN65 infrastructure, including tested PMOS source-top verification, opposite G/B routing, isolated named stubs, and VDC-driven net pin policy.
---

# 5T OTA Design Skill v1.1

Use this skill together with `skills/analog-design-agent/SKILL.md`.

## 1. Mandatory specification interview

Before generating `.il`, ask for the full circuit, technology, performance, operating-condition, sizing, bias, and interface specifications. Confirm the Design Contract first.

## 2. Canonical 5T topology

```text
M1/M2 = NMOS differential input pair
M3/M4 = PMOS current-mirror active load
M5    = NMOS tail-current source
VOUT  = single-ended output at M2.D / M4.D
```

Canonical net map:
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

M3 diode connection uses two independent stubs labeled `MIRROR`; never draw a physical G-D wire just to make the net common.

## 3. Verified platform

```text
Virtuoso = IC6.1.7
tsmcN65
nch / pch
S G B D
w l nf m
```

## 4. Required low-level infrastructure

Reuse:
- `geGetEditCellView`
- `dbOpenCellViewByType`
- `dbCreateInst`
- `cdfGetInstCDF`
- `dbFindTermByName`
- `centerBox`
- `dbTransformPoint`
- `schCreateWire`
- `schCreateWireLabel`
- `schCreatePin`

Do not use `schCreateLabel`, `hiGetString`, `gets`, C-style `(pinName == "G")`, or vector addition such as `p + list(dx dy)`.

## 5. MOS orientation and terminal direction

### NMOS
Use `R0` only after verifying the actual transformed terminal geometry.

### PMOS
Do NOT blindly assume `MX` is source-top. For every generated PMOS that must have source above drain:
1. place a candidate orientation;
2. read transformed S/D coordinates;
3. require `S.Y > D.Y`;
4. delete failing candidates and try the supported alternative;
5. keep only the passing orientation.

In the user's recorded tsmcN65 test:
```text
MX -> FAIL (S below D)
MY -> PASS (S above D)
```

### G/B and S/D direction rule
The terminal stub direction is derived from actual transformed terminal pairs, not from instance placement or `inst~>bBox` center:
```text
G direction = G - B
B direction = B - G
S direction = S - D
D direction = D - S
```

The required symbol convention is:
```text
G -> RIGHT  => B -> LEFT
S -> UP     => D -> DOWN
```

The implementation must assert this relationship from coordinates. Note: the recorded 2026-08-12 CIW diagnostic printed `B -> UP`, so the G/B horizontal relationship is an acceptance criterion awaiting a clean rerun, not a verified result of that log.

## 6. Mandatory isolated-stub routing

Every S/G/D/B terminal gets exactly one short straight stub and a net label.

```text
terminal -> short straight stub -> NET
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

Also forbidden: loops, diagonal wires, through-body wires, overlapping stubs, touching stubs, and standalone internal wires used only to show a net name.

## 7. Real external pins vs VDC-driven nets

Use `basic/iopin/symbol` + `schCreatePin` for true user-facing ports.

A net driven by a generated `analogLib/vdc` source MUST NOT also receive a redundant external pin by default.

Typical self-contained 5T testbench:
```text
VDD      -> VDC + VDD label       -> NO PIN
VBN_TAIL -> VDC + VBN_TAIL label  -> NO PIN
VINP     -> VDC + VINP label      -> NO PIN
VINN     -> VDC + VINN label      -> NO PIN
VOUT     -> real external output pin
```

If the user explicitly asks for both a VDC source and an external pin on the same net, confirm before generating.

## 8. Verified analogLib/vdc

```text
Library = analogLib
Cell    = vdc
PLUS    = (0.0, 0.0)
MINUS   = (0.0, -0.375)
```

After placing the instance:
```skill
cdf = cdfGetInstCDF(inst)
cdf->vdc->value = "1.5"
```

Use isolated VDC stubs and labels. Do not physically wire VDC terminals to MOS terminals.

For self-contained tests, an explicit VSS reference source may be generated:
```text
PLUS  -> VSS
MINUS -> VSS
VDC   = 0 V
```
Both terminals must be labeled `VSS`.

## 9. Starting reference dimensions

```text
M1/M2 = 2u / 240n
M3/M4 = 4u / 480n
M5    = 6u / 480n
NF=1 M=1
```

These are starting values, not verified performance results.

## 10. Validation gate

Before delivery verify:
- five devices, correct masters and names
- W/L/NF/M
- actual PMOS source-top geometry
- G/B opposite and S/D opposite directions
- every terminal labeled
- no unintended physical terminal short
- no loops/diagonals/floating internal wires
- only intentional external pins
- VDC parameters set through instance CDF
- VDC-driven nets have no redundant pins
- VSS reference source, if requested, is 0 V with both ends labeled VSS
- schematic saved and Check-and-Save has no errors

Do not claim gain/GBW until actual Cadence simulation verifies them.
