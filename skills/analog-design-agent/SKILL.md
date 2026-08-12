---
name: cadence-analog-design-agent
version: 3.2.0
description: Spec-first Cadence Virtuoso IC6.1.7 analog schematic-generation skill for verified tsmcN65, with geometry-verified terminals, isolated named stubs, VDC-driven net policy, and TotalW-first MOS sizing.
---

# Cadence Analog Design Agent — Master Skill v3.2

## 0. Mission

Use this skill for every analog CMOS schematic-generation request in the user's verified Cadence Virtuoso environment.

### Golden rule
> ASK FOR ALL DESIGN SPECS FIRST. CONFIRM THE DESIGN CONTRACT. ONLY THEN GENERATE THE `.il` FILE.

Preserve verified low-level infrastructure. Change only topology-specific design data.

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
```

### Verified tsmcN65 MOS CDF naming

Live CIW inspection on 2026-08-12 established:

```text
w        -> w (M)
wf       -> total_width(M)       <-- TotalW design parameter
after live CDF inspection:
l        -> l (M)
fingers  -> Number of Fingers
simM     -> Multiplier
nf       -> Nf
m        -> m / iPar("simM")
```

The design-level interface is **TotalW**, not per-finger W.

## 4. TotalW-first MOS sizing — MANDATORY

Every new generator must specify each MOS at design level with:

```text
TotalW
L
NF
M
```

Never ask the user for per-finger W when TotalW is the intended design quantity.

### Verified PDK mapping

```text
TotalW -> wf
L      -> l
NF     -> fingers / nf
M      -> simM / m
```

`w` is the per-finger physical width and is an implementation parameter.

### Explicit assignment policy

For every MOS, do not rely on stale/default PCell state. Explicitly assign the complete sizing state:

```skill
cdf->w->value       = W_PER_FINGER
cdf->l->value       = L
cdf->wf->value      = TOTAL_W
cdf->fingers->value = NF
cdf->simM->value    = M
cdf->nf->value      = NF
cdf->m->value       = M
```

`W_PER_FINGER` is produced by the sizing layer from the TotalW design value and the selected NF. The PDK's `wf` field is the authoritative total-width field. Never silently substitute a different width convention.

### Required logging

Every generator should print:

```text
M1 TotalW=... L=... NF=... M=... W/finger=... wf=... fingers=... simM=...
```

### Required validation

After assignment, verify that `wf`, `l`, `fingers`, `simM`, `nf`, `m`, and `w` match the intended state. If any field does not match, stop generation and report the mismatch.

### Critical distinction

```text
TotalW = wf = design-level total width
W      = w  = per-finger physical width
NF     = fingers
M      = simM
```

The AI reasons in TotalW. Cadence receives the complete explicit CDF state.

## 5. Trusted SKILL APIs

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

Never use C-style comparison expressions such as `(pinName == "G")`. Use `equal`, `case`, `if`, or `cond`.
Never use vector point addition such as `p + list(dx dy)`; use scalar `car/cadr` arithmetic.
If a genuinely new Cadence API is required, test it in an isolated schematic first and only integrate it after it works.

## 6. MOS creation API

Use a TotalW-first interface for all new generators:

```skill
procedure(PlaceMOS(cv master name xy TotalW L NF M orient)
```

New generators must not expose the old `PlaceMOS(... W L NF M ...)` interface.

## 7. VERIFIED MOS terminal-direction model

Use actual transformed terminal coordinates.

```text
        S
        |
B ----- MOS ----- G
        |
        D
```

G/B must be opposite directions; S/D must be opposite directions. For source-top PMOS, require `S.Y > D.Y`.

Mandatory implementation:
1. get actual transformed G/B/S/D with `dbFindTermByName` + `centerBox` + `dbTransformPoint`;
2. derive each direction from the corresponding terminal pair;
3. create exactly one straight stub along that direction;
4. assert the geometry after transformation.

Do not infer terminal direction from placement or bounding-box center.

## 8. PMOS source-top rule

For every design requiring source-top/drain-bottom PMOS:
1. place a candidate orientation;
2. read actual transformed S/D coordinates;
3. require `S.Y > D.Y`;
4. delete failed candidates;
5. use only the orientation that passes actual geometry verification.

Do not treat `MX` or `MY` as universally correct across PDKs.

## 9. Actual terminal geometry

Never hard-code transistor pin coordinates.

```skill
term = dbFindTermByName(inst~>master pinName)
pin  = car(term~>pins)
fig  = pin~>fig
p    = dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
```

## 10. Isolated-stub architecture

Every MOS S/G/D/B terminal is independent. Shared logical nets use separate stubs with repeated labels. Never physically connect MOS terminals merely because they share a logical net.

Forbidden: looping wires, diagonal wires, wires through MOS bodies, wires crossing symbols, touching/overlapping stubs, and standalone floating internal wires.

## 11. Real external pins

Use `basic/iopin` with `schCreatePin`. VDC-driven nets do not receive redundant external pins by default.

## 12. analogLib/vdc bias-source system

Use `analogLib/vdc`, PLUS/MINUS, isolated stubs, labels, and instance CDF `vdc`. Do not physically wire a VDC terminal directly into a MOS terminal.

For explicit VSS reference sources, use 0 V and VSS labels on both terminals.

## 13. Specification-first generation workflow

```text
1. Ask all specs.
2. Confirm Design Contract.
3. Decide/confirm topology.
4. Build device/net table.
5. Choose TotalW/L/NF/M and identify source of values.
6. Derive W/finger in the sizing layer.
7. Place devices.
8. Explicitly assign w/l/wf/fingers/simM/nf/m.
9. Validate complete CDF sizing state.
10. Read actual transformed terminal coordinates.
11. Verify PMOS S/D orientation where required.
12. Derive G/B and S/D directions.
13. Create isolated stubs and labels.
14. Create only intentional external pins.
15. Create VDC sources when requested.
16. Save.
17. Check and Save in Cadence.
18. Verify DC operating point.
19. Only then run AC/transient performance tests.
```

## 14. Validation gate

Before delivery:
- correct device count and masters
- intentional TotalW/L/NF/M
- explicit w/l/wf/fingers/simM/nf/m assignment
- CDF sizing state matches the requested design state
- PMOS actual S/D geometry passes source-top requirement where applicable
- every S/G/D/B has a net
- G/B and S/D direction rules pass
- no unintended physical shorts
- no malformed stubs
- external pins are intentional
- VDC-driven nets have no redundant pins
- VDC uses analogLib/vdc instance CDF `vdc`
- explicit VSS reference source uses VSS/VSS and 0 V
- syntax checked
- stale helper collisions avoided

## 15. Legacy sizing rule

Existing historical/reference artifacts whose W values predate the TotalW migration are legacy per-finger-W artifacts unless explicitly marked TotalW. Do not rewrite historical evidence. Current canonical generators must be migrated to TotalW-first.

For a migrated legacy generator with `NF=1` and `M=1`:

```text
TotalW = legacy W
W/finger = legacy W
```

For NF>1 or M>1, explicitly document TotalW and the derived implementation W/finger.

## 16. Final operating principle

```text
ASK FOR SPECS FIRST.
CONFIRM THE CONTRACT.
USE TOTALW AS THE DESIGN-LEVEL WIDTH.
EXPLICITLY ASSIGN W, L, WF, M, NF AND THE VERIFIED tsmcN65 MIRROR FIELDS.
KEEP WF AS THE AUTHORITATIVE TOTAL-WIDTH FIELD.
USE ACTUAL TERMINAL GEOMETRY.
VERIFY PMOS SOURCE-TOP / DRAIN-BOTTOM FROM ACTUAL S/D COORDINATES.
USE ONE STRAIGHT ISOLATED STUB PER TERMINAL.
USE NET LABELS FOR LOGICAL CONNECTIVITY.
DO NOT CREATE REDUNDANT PINS ON VDC-DRIVEN NETS.
VALIDATE BEFORE CLAIMING SUCCESS.
```