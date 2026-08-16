# Run - Cascode Current Mirror TotalW V1

## Generator

```text
canonical/current-mirror/Current_Mirror_Cascode_NMOS_TotalW_V1_20260817.il
```

## Status

Candidate generator. It is **not Cadence-verified** and its analog performance is **not verified** until a live IC6.1.7 / tsmcN65 run is recorded.

## Copy from Windows

```cmd
scp "C:\Users\<user>\Desktop\Current_Mirror_Cascode_NMOS_TotalW_V1_20260817.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/Current_Mirror_Cascode_NMOS_TotalW_V1_20260817.il")
```

## Run

```skill
CreateCurrentMirror_Cascode_NMOS_TotalW_V1_20260817()
```

## Required starting schematic

Open a **new empty editable schematic** before running. The generator rejects a non-empty target.

## Device masters

NMOS = tsmcN65/nch (repository-verified core master).

## Topology

```text
M1  NMOS diode reference (G=NB  D=NB  S=VSS B=VSS)
M2  NMOS output          (G=NB  D=NB2 S=VSS B=VSS)
M3  NMOS ref cascode     (G=VBC S=NB  D=IREF B=VSS)
M4  NMOS out cascode     (G=VBC S=NB2 D=IOUT B=VSS)
```

## Initial sizing

```text
M1..M4  TotalW=4u  L=480n NF=1 M=1 (1:1 default)
```

The generator explicitly assigns and reads back `w, l, wf, fingers, simM, totalM, nf, m` with `W/finger = TotalW/NF` and `totalM = NF*M`.

## Initial VDC values

```text
V_VBC  = 0.90 V (cascode gates)
V_IREF = 1.20 V (reference drive, PLUS=IREF MINUS=VSS)
V_VSS  = 0.00 V (explicit source)
```

Starting bias values only; nothing has been simulated.

## Verification sequence

1. Capture the complete CIW output.
2. Confirm every MOS CDF value (`wf == TotalW`, `fingers == NF`, `simM == M`, `nf == NF`, `m == M`, `totalM == NF*M`).
3. Confirm every S/G/D/B terminal has exactly one isolated labeled stub.
4. Check and Save with no schematic errors.
5. Only then run DC/AC/transient evaluation and record evidence before making any performance claim.
