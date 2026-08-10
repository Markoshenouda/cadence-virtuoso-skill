---
name: folded-cascode-ota
version: 1.0.0
description: Spec-first folded-cascode OTA generation rules for the verified Cadence Virtuoso IC6.1.7 / TSMC65 environment.
---

# Folded-Cascode OTA Skill

Use this skill together with the repository master Cadence Analog Design Agent skill.

## 1. Mandatory first step: specification interview

Before writing any SKILL generator, ask for and confirm:

- Input pair: NMOS or PMOS
- PDK / technology / library
- VDD and VSS
- DC gain target
- GBW target
- CL
- Temperature
- Process corner
- Single-ended or differential output
- gm/ID method or target
- L-selection strategy
- Layout-oriented sizing: yes/no
- Power limit or Auto
- Slew-rate target or Auto
- ICMR target or Auto
- Output swing target or Auto
- External bias pins or another bias strategy
- Exact external pin names if the user has requirements

Do not silently invent a missing critical specification. If the user says Auto, select an engineering starting value and state it in the design contract.

## 2. Verified platform

- Cadence Virtuoso IC6.1.7
- PDK library: `tsmcN65`
- NMOS: `tsmcN65/nch/symbol`
- PMOS: `tsmcN65/pch/symbol`
- MOS terminals: `S`, `G`, `B`, `D`
- MOS CDF fields: `w`, `l`, `nf`, `m`
- NMOS orientation: `R0`
- PMOS orientation when source must be visually on top: `MX`

## 3. Trusted APIs only

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

Known failures that must not be reintroduced:

```skill
schCreateLabel
hiGetString
gets
```

Do not use C-style comparison syntax such as `(pinName == "G")`.

If a new API is needed, test it independently before integrating it into the complete generator.

## 4. MOS sizing

Use the verified instance-CDF method:

```skill
cdf = cdfGetInstCDF(inst)
cdf->w->value  = W
cdf->l->value  = L
cdf->nf->value = NF
cdf->m->value  = M
```

Never guess PDK parameter names.

## 5. Actual terminal geometry

Never hard-code MOS terminal coordinates. For every terminal:

```skill
term = dbFindTermByName(inst~>master pinName)
pin  = car(term~>pins)
fig  = pin~>fig
p    = dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
```

For point arithmetic use scalar `car/cadr` arithmetic. Never use vector addition such as:

```skill
p + list(dx dy)
```

## 6. Critical routing rule learned from V5-V8

Every MOS terminal is treated as an independent connection point.

**Never physically connect two MOS terminals merely because they belong to the same logical net.**

This includes:

- G to D
- G to B
- D to B
- D to S
- any other terminal-to-terminal connection

Instead, every terminal gets its own short straight wire stub and the same net name is placed at the stub end.

Example for a diode-connected device:

```text
G terminal  -> short isolated stub -> MIRROR
D terminal  -> short isolated stub -> MIRROR
```

The two stubs must not touch.

## 7. Straight-stub rule

The V8 layout rule is stricter than earlier revisions:

- No diagonal wires.
- No wires that wrap around the MOS symbol.
- No long wires through the MOS body.
- No overlapping terminal stubs.
- No stub may pass through another terminal.
- No stub may touch another terminal's stub.
- Net connectivity comes from identical labels, not physical crossing.

The terminal direction must be derived from the actual symbol geometry/orientation, not from whether the instance is placed on the left or right side of the schematic.

For the verified TSMC65 symbols used in this project, the desired visual convention is:

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

The instance's left/right placement must never reverse the G/B direction.

## 8. Net-label architecture

Internal nets such as:

```text
NLEFT
NRIGHT
FOLD_L
FOLD_R
TAIL
LEFT_SINK
RIGHT_SINK
```

must only appear on real terminal stubs where those nets are used.

Do NOT create decorative/standalone wires in empty schematic space whose only purpose is to display a net name. Those wires create floating-net warnings.

## 9. External pins

Use:

```skill
dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
```

and:

```skill
schCreatePin(cv pinMaster netName direction nil point "R0")
```

Keep external pins visually organized, preferably in one vertical column when requested.

## 10. VDC bias sources

The verified `analogLib/vdc` instance is:

```text
Library = analogLib
Cell    = vdc
Terminals = PLUS / MINUS
PLUS center  = (0.0 0.0)
MINUS center = (0.0 -0.375)
CDF parameter = vdc
```

Set the value through the instance CDF:

```skill
cdf = cdfGetInstCDF(inst)
cdf->vdc->value = "1.5"
```

For a bias source, the intended structure is:

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

Do not physically connect the VDC to a MOS terminal. Use the bias net name.

## 11. Current verified folded-cascode reference

The user's current reference is the NMOS-input folded-cascode OTA V8 straight-stub implementation.

Target contract used for this reference:

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
Bias             = External bias pins
```

Starting DC bias values used for initial testing:

```text
VDD       = 1.50 V
VSS       = 0 V
VINP      = 0.75 V
VINN      = 0.75 V
VBP_FOLD  = 0.90 V
VBN_CAS   = 0.75 V
VBN_SINK  = 0.60 V
VBN_TAIL  = 0.60 V
```

These are starting values only. They do not prove the performance targets.

## 12. Reference device/net organization

The folded-cascode generator is topology-specific. Before coding, make a complete table containing for every MOS:

```text
instance
master
origin
orientation
W
L
NF
M
G net
D net
S net
B net
```

Then generate each terminal independently with a short straight stub and label.

## 13. Validation gate

Before delivering a generator:

- [ ] specification contract is complete
- [ ] topology is explicit
- [ ] device count is correct
- [ ] masters are correct
- [ ] W/L/NF/M are intentional
- [ ] NMOS/PMOS orientation is correct
- [ ] every S/G/D/B has a net
- [ ] no two terminal wires physically touch
- [ ] no G-B/G-D/D-B accidental connection
- [ ] no diagonal/wrapping wires
- [ ] no standalone internal-net wires
- [ ] external pins are real pins
- [ ] VDC uses PLUS/MINUS and `cdf->vdc->value`
- [ ] VDD/VSS are correct
- [ ] schematic is visually readable
- [ ] file syntax is checked
- [ ] stale function-name collisions are avoided

Do not claim simulation, gain, GBW, DRC, or LVS success unless actually verified in Cadence.

## 14. Revision history / lessons

### V5
Introduced VDC sources and internal labels, but created standalone internal wires and poor routing.

### V6
Removed standalone internal-label wires, but terminal direction logic still allowed bad routing and accidental connectivity.

### V7
Attempted isolated terminal stubs, but an argument-count mismatch and incorrect side-dependent routing remained.

### V8
Current reference. Terminal routing is independent of left/right placement. Every MOS terminal gets its own straight isolated stub. Same-net connectivity is label-only. No terminal-to-terminal physical wiring and no standalone internal wires.

## 15. Future-design rule

When the user requests another OTA or analog block:

1. Ask for all specs first.
2. Confirm the design contract.
3. Reuse the verified Cadence infrastructure.
4. Build a device/net table.
5. Change only topology-specific data.
6. Generate isolated straight terminal stubs.
7. Use repeated net labels for logical connectivity.
8. Add real external pins.
9. Add bias sources only after their symbol/CDF behavior is verified.
10. Validate before delivery.

The user should not need to repeat this history in future requests.
