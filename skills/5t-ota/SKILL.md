---
name: cadence-5t-ota
version: 1.3.0
description: Generate verified 5T CMOS OTA schematics in Cadence IC6.1.7/tsmcN65 using the repository TotalW-first MOS contract, explicit complete CDF assignment, geometry-verified PMOS orientation, isolated stubs, and VDC policy.
---

# 5T OTA Design Skill v1.3

Use together with `skills/analog-design-agent/SKILL.md`.

## 1. Mandatory design inputs

Before generation confirm the Design Contract and obtain the required circuit/performance/interface specifications.

## 2. Canonical topology

```text
M1/M2 = differential input pair
M3/M4 = PMOS current-mirror active load
M5    = NMOS tail current source
VOUT  = single-ended at M2.D / M4.D
```

## 3. TotalW-first sizing — mandatory

Every MOS is specified as:

```text
TotalW
L
NF
M
```

Verified tsmcN65 mapping:

```text
TotalW -> wf
L      -> l
NF     -> fingers + nf
M      -> simM + m
W      -> internally derived W/finger
```

Explicit assignment is mandatory:

```skill
cdf->w->value       = W_PER_FINGER
cdf->l->value       = L
cdf->wf->value      = TotalW
cdf->fingers->value = NF
cdf->simM->value    = M
cdf->totalM->value  = NF * M
cdf->nf->value      = NF
cdf->m->value       = M
```

Relations:

```text
W_PER_FINGER = TotalW / NF
WF = TotalW
totalM = NF * M
```

Read back and validate all eight fields. No defaults or stale values are allowed.

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

Use repeated labels and isolated stubs; do not physically short terminals merely to implement a logical net.

## 5. PMOS orientation and terminal geometry

For PMOS source-top/drain-bottom, test actual transformed S/D coordinates and require `S.Y > D.Y`. Do not hard-code a universal orientation.

Derive G/B and S/D stub directions from actual transformed coordinates.

## 6. VDC and external pins

Use `basic/iopin` only for intentional user-facing pins. VDC-driven nets must not receive redundant external pins. Use `analogLib/vdc` and its `vdc` CDF parameter.

## 7. Starting reference dimensions

```text
M1/M2 = TotalW 2u / L 240n / NF 1 / M 1
M3/M4 = TotalW 4u / L 480n / NF 1 / M 1
M5    = TotalW 6u / L 480n / NF 1 / M 1
```

These are starting values, not verified performance results.

## 8. Validation gate

Before delivery verify:
- five correct devices/masters
- TotalW/L/NF/M for every MOS
- explicit w/l/wf/fingers/simM/totalM/nf/m assignment
- `wf == TotalW`
- `totalM == NF*M`
- actual PMOS source-top geometry
- opposite G/B and S/D directions
- every terminal has a logical net
- no unintended physical terminal shorts
- only intentional external pins
- VDC parameters are explicit
- Check-and-Save has no errors

Do not claim gain/GBW until actual Cadence simulation verifies them.
