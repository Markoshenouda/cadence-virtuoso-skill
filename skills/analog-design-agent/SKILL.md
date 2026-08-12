---
name: cadence-analog-design-agent
version: 4.0.0
description: Master operating protocol for specification-first Cadence Virtuoso generation, TotalW-first sizing, local-stub routing, VDC bias, and evidence-based promotion.
---

# Cadence Analog Design Agent — Master Skill v3.3

## 0. Mission

Use this skill for every analog CMOS schematic-generation request in the user's verified Cadence environment.

Golden rule: ask for all design specifications, confirm the Design Contract, then generate the `.il` file.

The required operating sequence is: specification extraction -> missing-spec questions -> confirmed design summary -> confirmed TotalW/L/NF/M sizing -> one complete generator -> Cadence execution -> verification -> canonical promotion. Follow `../../references/design-contract.md` and resolve conflicts with `../../references/repository-authority-map.md`.

## 1. Mandatory specification interview

Ask for:
- circuit/topology
- NMOS/PMOS input pair
- output type
- PDK/node/library/device masters
- VDD/VSS/body-bias convention
- DC gain, GBW, CL, power, slew rate, ICMR, swing, phase margin, noise/offset as relevant
- temperature/corner
- input common-mode and bias information if specified
- gm/ID target/method and L strategy
- layout-oriented sizing and NF/M constraints
- bias strategy and external interface

If the user says Auto, choose an engineering **initial starting value** and never call it verified.

## 2. Verified platform

```text
Virtuoso IC6.1.7
tsmcN65
NMOS = tsmcN65/nch/symbol
PMOS = tsmcN65/pch/symbol
Terminals = S G B D
```

## 3. TotalW-first MOS sizing — MANDATORY

Every new MOS is specified at design level by:

```text
TotalW
L
NF
M
```

Never expose per-finger `W` as the user-facing sizing input.

Verified tsmcN65 mapping:

```text
TotalW -> wf
L      -> l
NF     -> fingers + nf
M      -> simM + m
W      -> derived per-finger implementation width
```

The generator must explicitly assign all eight fields for **every MOS instance**:

```skill
cdf->w->value       = W_PER_FINGER
cdf->l->value       = L
cdf->wf->value      = TOTAL_W
cdf->fingers->value = NF
cdf->simM->value    = M
cdf->totalM->value  = NF * M
cdf->nf->value      = NF
cdf->m->value       = M
```

### Required relations

```text
W_PER_FINGER = TotalW / NF
WF           = TotalW
totalM       = NF * M
```

`totalM` is never equal to `M` unless `NF=1`.

### Required validation

After assignment, read back and verify:

```text
w == W_PER_FINGER
l == L
wf == TotalW
fingers == NF
simM == M
totalM == NF*M
nf == NF
m == M
```

Stop generation on any mismatch. Do not rely on stale/default PCell state or callbacks.

For suffix-aware numeric strings, use `cdfParseFloatString()`; do not use unsafe `evalstring()` for sizing input parsing.

## 4. MOS creation API

All new generators must expose a TotalW-first API:

```skill
procedure(PlaceMOS(cv master name xy TotalW L NF M orient)
```

`W` is derived internally and is not a caller argument.

## 5. Required logging

Every MOS should produce a compact record such as:

```text
M1 TotalW=... W/finger=... L=... NF=... M=... wf=... fingers=... simM=... totalM=... nf=... m=...
```

## 6. Terminal geometry

Use actual transformed pin coordinates:

```skill
term = dbFindTermByName(inst~>master pinName)
pin  = car(term~>pins)
fig  = pin~>fig
p    = dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
```

Derive directions from terminal pairs:

```text
G = G - B
B = B - G
S = S - D
D = D - S
```

Never infer direction from the instance bounding box.

## 7. PMOS source-top rule

For a PMOS that must be source-top/drain-bottom:
1. place a candidate orientation;
2. read actual transformed S/D coordinates;
3. require `S.Y > D.Y`;
4. delete failing candidates;
5. keep only a passing orientation.

## 8. Isolated-stub architecture

Every S/G/D/B terminal gets one short straight stub and a net label. Same logical net uses repeated labels, not physical terminal-to-terminal wires.

## 9. External pins and VDC

Use `basic/iopin` for intentional user-facing ports. VDC-driven nets do not receive redundant external pins. Use `analogLib/vdc` and its CDF `vdc` parameter when a generated bias source is requested.

## 10. Mandatory workflow

```text
1. Ask specs.
2. Confirm Design Contract.
3. Confirm topology.
4. Build device/net table.
5. Choose TotalW/L/NF/M.
6. Derive W/finger internally.
7. Place devices.
8. Explicitly assign w/l/wf/fingers/simM/totalM/nf/m.
9. Validate every field.
10. Validate actual terminal geometry.
11. Validate PMOS orientation where required.
12. Create isolated stubs/labels.
13. Create intentional external pins only.
14. Create VDC sources if requested.
15. Save and Check-and-Save.
16. Verify DC operating point.
17. Only then run AC/transient performance tests.
```

## 11. Validation gate

Before delivery verify device count/masters, TotalW/L/NF/M, all eight CDF fields, `wf==TotalW`, `totalM==NF*M`, actual terminal geometry, no unintended shorts, no malformed stubs, intentional pins only, VDC settings, and Cadence Check-and-Save status.

## 12. Legacy policy

Historical W-first artifacts remain unchanged as historical evidence. Current canonical generators must use TotalW-first sizing. Compatibility copies under `assets/` are not canonical unless explicitly marked current.

## Mandatory artifact handoff

Every generated artifact response includes the local filename, Windows SCP command, Cadence `load()` command, exact generator invocation, empty-schematic prerequisite, expected CIW markers, Check and Save instruction, and request for CIW output plus screenshot. Use only terminal -> local stub -> net label routing; never create device-to-device wires. Use `analogLib/vdc` for internally generated supply, bias, and DC input sources. Place real output pins at their actual drain-stub endpoints. The canonical Telescopic reference is V7; do not present V1/V2 or compatibility V1–V4 as current.
