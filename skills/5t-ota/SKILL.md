---
name: cadence-5t-ota
version: 1.2.0
description: Generate 5T CMOS OTA schematics using the verified Cadence IC6.1.7/tsmcN65 infrastructure, with TotalW-first MOS sizing, tested PMOS source-top verification, opposite G/B routing, isolated named stubs, and VDC-driven net pin policy.
---

# 5T OTA Design Skill v1.2

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

## 3. TotalW-first sizing — mandatory

The designer/AI specifies each MOS with:

```text
TotalW
L
NF
M
```

For verified `tsmcN65`:

```text
TotalW -> wf
L      -> l
NF     -> fingers and nf
M      -> simM and m
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

The generator must print and validate all seven fields. `wf` is the authoritative TotalW field.

For the current canonical 5T reference, NF=1 and M=1, so:

```text
TotalW = W_PER_FINGER
```

Do not expose the old W-first interface in new 5T generators.

## 4. Canonical net map

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

M3 diode connection uses two independent stubs labeled `MIRROR`; never draw a physical G-D wire merely to make the net common.

## 5. Verified platform

```text
Virtuoso = IC6.1.7
tsmcN65
nch / pch
S G B D
```

## 6. Required low-level infrastructure

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

## 7. MOS orientation and terminal direction

### NMOS
Use `R0` only after verifying actual transformed terminal geometry.

### PMOS
Do NOT blindly assume `MX` is source-top. For every generated PMOS that must have source above drain:
1. place a candidate orientation;
2. read transformed S/D coordinates;
3. require `S.Y > D.Y`;
4. delete failing candidates and try alternatives;
5. keep only the passing orientation.

### G/B and S/D direction rule

Derive stub directions from actual transformed terminal pairs:

```text
G direction = G - B
B direction = B - G
S direction = S - D
D direction = D - S
```

Do not infer direction from placement or bounding boxes.

## 8. Mandatory isolated-stub routing

Every S/G/D/B terminal gets exactly one short straight stub and a net label. Same logical net means repeated labels, never a physical terminal-to-terminal wire.

## 9. Real external pins vs VDC-driven nets

Use `basic/iopin/symbol` + `schCreatePin` for true user-facing ports. A net driven by a generated `analogLib/vdc` source MUST NOT also receive a redundant external pin by default.

## 10. Verified analogLib/vdc

```text
Library = analogLib
Cell    = vdc
PLUS    = (0.0, 0.0)
MINUS   = (0.0, -0.375)
```

Set voltage through instance CDF `vdc`, use isolated stubs, and label both ends of an explicit VSS reference as `VSS` when requested.

## 11. Starting reference dimensions

```text
M1/M2 = TotalW 2u / L 240n / NF 1 / M 1
M3/M4 = TotalW 4u / L 480n / NF 1 / M 1
M5    = TotalW 6u / L 480n / NF 1 / M 1
```

These are starting values, not verified performance results.

## 12. Validation gate

Before delivery verify:
- five devices, correct masters and names
- TotalW/L/NF/M specified
- explicit W/L/WF/fingers/simM/nf/m assignment
- `wf` equals requested TotalW
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
