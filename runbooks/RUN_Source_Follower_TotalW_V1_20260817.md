# Run - Source Follower TotalW V1

## Generator

```text
canonical/amplifier/SourceFollower_NMOS_TotalW_V1_20260817.il
```

## Status

Candidate generator. It is **not Cadence-verified** and its analog performance is **not verified** until a live IC6.1.7 / tsmcN65 run is recorded.

## Copy from Windows

```cmd
scp "C:\Users\<user>\Desktop\SourceFollower_NMOS_TotalW_V1_20260817.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/SourceFollower_NMOS_TotalW_V1_20260817.il")
```

## Run

```skill
CreateSourceFollower_NMOS_TotalW_V1_20260817()
```

## Required starting schematic

Open a **new empty editable schematic** before running. The generator rejects a non-empty target.

## Device masters

NMOS = tsmcN65/nch (repository-verified core master).

## Topology

```text
M1  NMOS follower (G=VIN D=VDD S=VOUT B=VSS)
M2  NMOS sink     (G=VBN D=VOUT S=VSS B=VSS)
```

## Initial sizing

```text
M1  TotalW=4u  L=240n NF=1 M=1
M2  TotalW=6u  L=480n NF=1 M=1
```

The generator explicitly assigns and reads back `w, l, wf, fingers, simM, totalM, nf, m` with `W/finger = TotalW/NF` and `totalM = NF*M`.

## Initial VDC values

```text
V_VIN  = 1.00 V   V_VBN = 0.60 V
V_VDD  = 1.50 V   V_VSS = 0.00 V (explicit source)
```

Starting bias values only; nothing has been simulated.

## Verification sequence

1. Capture the complete CIW output.
2. Confirm every MOS CDF value (`wf == TotalW`, `fingers == NF`, `simM == M`, `nf == NF`, `m == M`, `totalM == NF*M`).
3. Confirm every S/G/D/B terminal has exactly one isolated labeled stub.
4. Check and Save with no schematic errors.
5. Only then run DC/AC/transient evaluation and record evidence before making any performance claim.
