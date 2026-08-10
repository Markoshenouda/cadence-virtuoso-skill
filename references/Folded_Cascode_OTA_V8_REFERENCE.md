# Folded-Cascode OTA V8 Reference

## Status

The user's Cadence test reached the visually correct V8 routing behavior in the conversation on 2026-08-10. The exact downloadable source delivered in the conversation is:

```text
Folded_Cascode_OTA_NMOS_FINAL_V8_STRAIGHT.il
```

The repository stores the complete V8 operating rules in `skills/folded-cascode-ota/SKILL.md` so future agents can reproduce the same architecture without rediscovering the debugging history.

## Verified environment

```text
Virtuoso IC6.1.7
PDK: tsmcN65
NMOS: nch/symbol
PMOS: pch/symbol
Terminals: S G B D
CDF: w l nf m
NMOS orientation: R0
PMOS source-top orientation: MX
```

## Verified schematic APIs

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

## Routing rule that fixed V8

Every MOS terminal is isolated:

```text
G -> one short straight stub -> NET
B -> one short straight stub -> NET
D -> one short straight stub -> NET
S -> one short straight stub -> NET
```

No terminal-to-terminal wires are generated. No wire is allowed to wrap around a MOS. No diagonal wire is allowed. No standalone internal-net wire is generated.

For the verified symbol geometry:

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

The transistor's left/right placement never changes the terminal directions.

## Connectivity rule

If multiple terminals share a net, repeat the same net label on their separate stubs. Do not physically join the stubs.

This rule prevents the previously observed:

```text
DB-270004: Illegal bus reference
```

errors and prevents accidental G-B, G-D, D-B, or other terminal shorts.

## Internal-net rule

Do not create decorative wires such as:

```text
NLEFT --------
NRIGHT -------
TAIL ---------
```

in empty schematic space. They produce floating-net warnings. Internal labels must exist only on actual terminal stubs.

## VDC rule

The verified `analogLib/vdc` instance has:

```text
PLUS
MINUS
```

with:

```text
PLUS  center  = (0.0, 0.0)
MINUS center  = (0.0, -0.375)
CDF parameter = vdc
```

Set the source value through:

```skill
cdf = cdfGetInstCDF(inst)
cdf->vdc->value = "1.5"
```

Bias-source topology:

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

## Current folded-cascode design contract

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

Initial DC values:

```text
VINP      = 0.75 V
VINN      = 0.75 V
VBP_FOLD  = 0.90 V
VBN_CAS   = 0.75 V
VBN_SINK  = 0.60 V
VBN_TAIL  = 0.60 V
VDD       = 1.50 V
VSS       = 0 V
```

These are starting values and must be verified by operating-point simulation.

## Revision lessons

- V5: standalone internal label wires and poor routing.
- V6: removed floating internal wires but still had terminal-routing problems.
- V7: isolated-stub architecture introduced, but an argument-count bug and side-dependent routing remained.
- V8: terminal direction is determined by the actual MOS symbol convention, not by the instance's left/right branch. All four terminals are independent straight stubs.

## Future-agent rule

When a new analog circuit is requested, first ask for the complete specification, confirm the design contract, then reuse the verified infrastructure and only change topology-specific device/net data.
