---
name: cadence-analog-design-agent
version: 3.1.0
description: Spec-first Cadence Virtuoso IC6.1.7 analog schematic-generation skill for the verified tsmcN65 environment, with tested source-top PMOS orientation, opposite G/B directions, isolated named stubs, and VDC-driven net pin policy.
---

# Cadence Analog Design Agent — Master Skill v3.1

## 0. Mission

Use this skill for every analog CMOS schematic-generation request in the user's verified Cadence Virtuoso environment.

### Golden rule

> ASK FOR ALL DESIGN SPECS FIRST. CONFIRM THE DESIGN CONTRACT. ONLY THEN GENERATE THE `.il` FILE.

Preserve the verified low-level infrastructure. Change only topology-specific design data.

## 1. Mandatory specification interview

Before generating code, ask for:
- circuit type and topology
- NMOS/PMOS input pair
- single-ended/differential output
- PDK/node/library and device masters
- VDD/VSS and body-bias convention
- DC gain, GBW, CL, power, slew rate, ICMR, output swing, phase margin, noise/offset as relevant
- temperature and process corner
- input common-mode and bias current/voltage if specified
- gm/ID method/target, L-selection strategy, layout-oriented sizing, matching, NF/M constraints
- bias strategy: external pins, generated VDC sources, or mixed
- exact user-facing external pins

If the user says Auto, choose an engineering starting value and explicitly call it an INITIAL STARTING VALUE. Never call it verified.

## 2. Design Contract

Summarize the complete contract and get confirmation before writing the generator.

## 3. Verified platform

```text
Virtuoso = IC6.1.7
PDK      = tsmcN65
NMOS     = tsmcN65/nch/symbol
PMOS     = tsmcN65/pch/symbol
Terminals= S G B D
CDF      = w l nf m
```

## 4. Trusted SKILL APIs

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

Never use C-style comparison expressions such as `(pinName == "G")`. Use valid SKILL constructs such as `equal`, `case`, `if`, and `cond`.

Never use vector point addition such as `p + list(dx dy)`; use scalar `car/cadr` arithmetic.

If a genuinely new Cadence API is required, test it in an isolated schematic first and only integrate it after it works.

## 5. MOS creation and CDF sizing

Use the verified instance-CDF pattern:

```skill
procedure(SetMOS(inst W L NF M)
    let((cdf)
        cdf = cdfGetInstCDF(inst)
        unless(cdf error("Cannot access instance CDF.\n"))
        cdf->w->value  = W
        cdf->l->value  = L
        cdf->nf->value = NF
        cdf->m->value  = M
    )
)
```

Do not guess CDF field names in the verified platform.

## 6. VERIFIED MOS terminal-direction model

This rule is based on a working Cadence test using the actual transformed terminal coordinates.

The desired visual symbol convention is:

```text
        S
        |
B ----- MOS ----- G
        |
        D
```

Therefore, the required reference convention is:
- G and B are opposite horizontal directions. If G is RIGHT, B is LEFT.
- S and D are opposite vertical directions. For a source-top PMOS, S is UP and D is DOWN.

### Mandatory implementation rule

Do NOT infer terminal direction from left/right placement or from `inst~>bBox` center.

Instead:
1. obtain the actual transformed coordinates of G, B, S, and D with `dbFindTermByName` + `centerBox` + `dbTransformPoint`;
2. derive G direction from `(G - B)`;
3. derive B direction from `(B - G)`;
4. derive S direction from `(S - D)`;
5. derive D direction from `(D - S)`;
6. create exactly one straight stub along that direction.

This is the required acceptance rule and must be asserted after transformation. The recorded 2026-08-12 CIW evidence printed `B -> UP`, so do not call the G/B horizontal rule verified until that diagnostic is rerun successfully.

## 7. PMOS source-top rule

Do not blindly assume `MX` is the correct PMOS orientation.

For every design in which PMOS must be source-top/drain-bottom:
1. place a PMOS candidate orientation;
2. read actual transformed S and D coordinates;
3. require `S.Y > D.Y`;
4. if the condition fails, delete the candidate and test the verified alternate orientation;
5. use only the orientation that passes the actual geometry check.

In the user's verified tsmcN65 test, `MX` failed and `MY` passed:
```text
MX: S below D  -> FAIL
MY: S above D  -> PASS
```

Do not treat the string `MY` as universally correct for another PDK; verify actual geometry again when the PDK/device changes.

## 8. Actual terminal geometry

Never hard-code transistor pin coordinates.

Use:
```skill
term = dbFindTermByName(inst~>master pinName)
pin  = car(term~>pins)
fig  = pin~>fig
p    = dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
```

## 9. Critical named-net / isolated-stub architecture

Every MOS S/G/D/B terminal is independent.

For a shared logical net:
```text
terminal 1 -> short straight stub -> NET
terminal 2 -> short straight stub -> NET
```

Never physically connect two MOS terminals just because they share a net. This includes G-D, G-B, D-B, D-S, and S-B unless the user explicitly requests a physical wire.

M3 diode connection example:
```text
M3.G -> MIRROR
M3.D -> MIRROR
```
with two separate, non-touching stubs.

Forbidden:
- looping wires
- diagonal wires
- wires through MOS bodies
- wires crossing symbols
- touching/overlapping stubs
- standalone internal wires whose only purpose is to show a net name

Logical connectivity is created by repeated net labels on the isolated stubs.

## 10. Real external pins

Use:
```skill
dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
schCreatePin(cv pinMaster netName direction nil point "R0")
```

Directions used successfully include `input`, `output`, and `inputOutput`.

### VDC-driven net rule

A net driven by a generated `analogLib/vdc` source must NOT receive a redundant external pin by default.

Classification:
1. VDC-driven net -> VDC + isolated stubs + net label, NO external pin.
2. User-facing signal/control not internally driven -> real external pin.
3. Internal-only net -> net labels only, NO external pin.
4. If the user explicitly requests both a VDC source and an external pin on the same net, confirm before generating it.

Typical self-contained OTA testbench:
```text
VDD      -> VDC + VDD label      -> NO PIN
VBN_TAIL -> VDC + VBN_TAIL label -> NO PIN
VINP     -> VDC + VINP label     -> NO PIN
VINN     -> VDC + VINN label     -> NO PIN
VOUT     -> real output pin
```

## 11. Verified analogLib/vdc bias-source system

Verified source:
```text
Library = analogLib
Cell    = vdc
View    = symbol
Terminals = PLUS / MINUS
PLUS center  = (0.0, 0.0)
MINUS center = (0.0, -0.375)
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

Do not physically wire a VDC terminal directly into a MOS terminal; use independent labeled stubs.

### VSS source rule

When a self-contained test schematic is requested, the generator may create an explicit `analogLib/vdc` reference source:
```text
PLUS  -> VSS
MINUS -> VSS
VDC   = 0 V
```

Both terminals must carry the `VSS` net label. The source is a reference/test source, not a second ground net.

## 12. Specification-first generation workflow

```text
1. Ask all specs.
2. Ask bias strategy and VDC-vs-pin choice.
3. Confirm Design Contract.
4. Decide/confirm topology.
5. Build device/net table.
6. Choose W/L/NF/M and identify source of values.
7. Choose initial bias values and identify source.
8. Place devices.
9. Read actual transformed terminal coordinates.
10. Verify PMOS S/D orientation where required.
11. Derive G/B and S/D directions from actual terminal pairs.
12. Create one straight isolated stub per terminal.
13. Apply net labels.
14. Classify external nets and create only intentional real pins.
15. Create analogLib/vdc sources when requested.
16. Set VDC values through instance CDF.
17. Save.
18. Check and Save in Cadence.
19. Verify DC operating point.
20. Only then run AC/transient performance tests.

## 13. Validation gate

Before delivery:
- correct device count and masters
- intentional W/L/NF/M
- PMOS actual S/D geometry passes source-top requirement where applicable
- every S/G/D/B has a net
- G/B are opposite directions and S/D are opposite directions
- no physical terminal-to-terminal short unless explicitly requested
- no looping/diagonal/overlapping stubs
- no standalone floating internal wires
- external pins are real and only on intentional user-facing nets
- VDC uses analogLib/vdc PLUS/MINUS and instance CDF `vdc`
- VDC-driven nets have no redundant pins
- explicit VSS reference source, when requested, uses VSS on both terminals and 0 V
- syntax checked
- stale helper collisions avoided

## 14. Reference 5T NMOS-input starting data

```text
M1/M2 = NMOS differential pair
M3/M4 = PMOS current-mirror load
M5    = NMOS tail
M1/M2 = 2u / 240n
M3/M4 = 4u / 480n
M5    = 6u / 480n
NF=1 M=1
```

These are starting values only.

## 15. Reference implementation

Use the verified Telescopic generator as the low-level implementation reference:
```text
assets/generators/telescopic_ota_v4_pmos_pins.il
```

Reuse the implementation method; do not copy its topology into unrelated circuits.

## 16. Final operating principle

```text
ASK FOR SPECS FIRST.
CONFIRM THE CONTRACT.
PRESERVE VERIFIED INFRASTRUCTURE.
USE ACTUAL TERMINAL GEOMETRY.
MAKE G/B OPPOSITE AND S/D OPPOSITE FROM ACTUAL COORDINATES.
VERIFY PMOS SOURCE-TOP / DRAIN-BOTTOM FROM ACTUAL S/D COORDINATES.
USE ONE STRAIGHT ISOLATED STUB PER TERMINAL.
USE NET LABELS FOR LOGICAL CONNECTIVITY.
DO NOT CREATE REDUNDANT PINS ON VDC-DRIVEN NETS.
USE analogLib/vdc + PLUS/MINUS + instance-CDF vdc FOR SOURCES.
VALIDATE BEFORE CLAIMING SUCCESS.
```
