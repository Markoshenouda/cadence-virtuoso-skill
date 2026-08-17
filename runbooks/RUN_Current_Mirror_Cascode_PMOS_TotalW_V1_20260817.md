# Run - Cascode PMOS Current Mirror TotalW V1

## Generator

```text
canonical/current-mirror/Current_Mirror_Cascode_PMOS_TotalW_V1_20260817.il
```

## Status

Candidate generator. It is **not Cadence-verified** and its analog performance is **not verified** until a live IC6.1.7 / tsmcN65 run is recorded.

## Copy from Windows

```cmd
scp "C:\Users\<user>\Desktop\Current_Mirror_Cascode_PMOS_TotalW_V1_20260817.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/Current_Mirror_Cascode_PMOS_TotalW_V1_20260817.il")
```

## Run

```skill
CreateCurrentMirror_Cascode_PMOS_TotalW_V1_20260817()
```

## Required starting schematic

Open a **new empty editable schematic** before running. The generator rejects a non-empty target.

## Topology ID

```text
cascode-pmos-current-mirror  (circuit: current-mirror)
```

## Device masters

NMOS = tsmcN65/nch;
PMOS = tsmcN65/pch (orientation selected from actual S/D geometry).

## Expected devices

```text
M1  PMOS diode reference (G=NB D=NB S=VDD B=VDD)
M2  PMOS output device (G=NB D=NB2 S=VDD B=VDD)
M3  PMOS reference cascode (G=VBC S=NB D=IREF B=VDD)
M4  PMOS output cascode (G=VBC S=NB2 D=IOUT B=VDD)
```

## Sizing contract

The generator explicitly assigns and reads back `w, l, wf, fingers, simM, totalM, nf, m` with `W/finger = TotalW/NF` and `totalM = NF*M`.

## Initial VDC values

```textV_VDD = 1.50 V   V_VBC = 0.60 V   V_IREF = 0.80 V   V_VSS = 0.00 V
```

Starting bias values only; nothing has been simulated.

## Expected ADS_BRIDGE markers

```text
ADS_BRIDGE_START
CPM2: <device> TotalW=... W/finger=... L=... NF=... M=... totalM=...
CPM2: STUB <device>.<terminal> -> <net>
CPM2 GENERATOR COMPLETED
ADS_BRIDGE_GENERATOR_DONE
ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED
STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED
```

## Evidence location

Live-run evidence is recorded in the bridge run directory
`/home/cadence/Desktop/analog-design-studio-runs/<topology>_<timestamp>/` on the
Cadence VM (`virtuoso.log`, `evidence.txt`) and in the repository verification ledger.

## Simulation status

Simulation-ready via the dc-mirror profile (ref=M3, out=M4).

## Verification status

Schematic candidate only; no electrical verification claim.

## Known limitations

- Sizing values are engineering starting values, not performance-derived.
- Electrical performance has not been simulated unless stated above.
- Do not call the generator Cadence-verified from `load()` success alone.
