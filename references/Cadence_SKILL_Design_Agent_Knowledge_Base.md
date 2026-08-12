# Cadence Virtuoso IC6.1.7 — SKILL Design-Agent Knowledge Base v2

This document is the reusable operating manual for the current repository architecture. The repository-wide MOS sizing source of truth is `references/TotalW_MOS_Sizing_Convention_20260812.md`.

## 1. Verified environment

```text
Cadence Virtuoso IC6.1.7
tsmcN65
NMOS = tsmcN65/nch/symbol
PMOS = tsmcN65/pch/symbol
MOS terminals = S G B D
```

Current schematic:

```skill
cv = geGetEditCellView()
```

## 2. Verified tsmcN65 CDF contract

Live CDF inspection established:

```text
w        -> w (M)
l        -> l (M)
wf       -> total_width(M)
fingers  -> Number of Fingers
simM     -> Multiplier
totalM   -> total_m
nf       -> Nf
m        -> m / iPar("simM")
```

### Design-level inputs

```text
TotalW
L
NF
M
```

### Derived/implementation state

```text
W/finger = TotalW / NF
wf       = TotalW
fingers  = NF
simM     = M
totalM   = NF * M
nf       = NF
m        = M
```

Every current generator must explicitly assign all eight CDF fields:

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

After assignment, read back and validate every field. Never rely on a PDK default, stale instance state, or implicit callback.

For suffix-aware numeric parsing use:

```skill
cdfParseFloatString("1.0u")
```

Do not use `evalstring()` for sizing strings.

## 3. Verified low-level APIs

Use:

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
dbSave()
```

Do not use the failed `schCreateLabel`, `hiGetString`, or `gets` approaches.

Do not use C-style comparison expressions or point-list addition. Use `equal`, `if`, `cond`, `car`, `cadr`, and scalar arithmetic.

## 4. Actual terminal geometry

Never guess MOS pin coordinates from the instance bounding box.

```skill
term = dbFindTermByName(inst~>master pinName)
pin  = car(term~>pins)
fig  = pin~>fig
p    = dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
```

Derive terminal directions from actual transformed coordinates:

```text
G = G - B
B = B - G
S = S - D
D = D - S
```

Create exactly one short straight isolated stub per terminal and use repeated net labels for logical same-net connectivity.

## 5. PMOS orientation

When source-top/drain-bottom is required:

1. place a candidate orientation;
2. read actual transformed S/D coordinates;
3. require `S.Y > D.Y`;
4. delete failing candidates;
5. retain only the passing orientation.

Never assume `MX` or `MY` is universal across PDKs.

## 6. Real schematic pins

Use:

```skill
pinMaster = dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
schCreatePin(cv pinMaster netName direction nil point "R0")
```

Create only intentional user-facing external pins. A net driven by `analogLib/vdc` must not also receive a redundant external pin by default.

## 7. analogLib/vdc

Verified source:

```text
Library = analogLib
Cell    = vdc
Terminals = PLUS / MINUS
```

Set voltage through its CDF:

```skill
cdf->vdc->value = value
```

Use isolated source stubs and labels. An explicit VSS reference source uses 0 V with both ends labeled VSS when requested.

## 8. Generator architecture

All new generators should expose:

```skill
procedure(PlaceMOS(cv master name xy TotalW L NF M orient)
```

The helper must internally derive W/finger and explicitly assign all eight CDF fields. A generator must log something equivalent to:

```text
M1 TotalW=... W/finger=... L=... NF=... M=... wf=... fingers=... simM=... totalM=... nf=... m=...
```

## 9. Current 5T topology

```text
M1/M2 = differential input pair
M3/M4 = PMOS current-mirror active load
M5    = NMOS tail source
VOUT  = M2.D / M4.D
```

## 10. Current Telescopic topology

Use the current canonical Telescopic artifact as the source of topology/net structure. The verified correction is that `VOUT` is on `M2.D`/`M4.D`, with the external VOUT pin placed at the actual M4.D stub endpoint.

## 11. Validation workflow

```text
1. Ask all specs.
2. Confirm Design Contract.
3. Choose topology.
4. Build device/net table.
5. Choose TotalW/L/NF/M.
6. Derive W/finger internally.
7. Place devices.
8. Assign w/l/wf/fingers/simM/totalM/nf/m explicitly.
9. Validate all eight fields.
10. Validate actual terminal geometry.
11. Validate PMOS orientation where required.
12. Create isolated stubs/labels.
13. Create intentional external pins only.
14. Add VDC sources if requested.
15. Save and Check-and-Save.
16. Verify DC operating point.
17. Only then run AC/transient performance simulations.
```

## 12. Golden sizing evidence

The current golden regression is:

```text
tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il
```

It verifies multiple NF/M combinations and explicitly checks:

```text
totalM = fingers * simM
```

The user executed V5 successfully in the live IC6.1.7 / tsmcN65 environment on 2026-08-12.

## 13. Legacy policy

Historical W-first generators remain unchanged as historical evidence. They must not be treated as current canonical implementations. Compatibility copies under `assets/` remain non-canonical unless explicitly marked current.
