# Run — Simple Current Mirror TotalW V1

## Generator

```text
canonical/current-mirror/Current_Mirror_NMOS_TotalW_V1_20260817.il
```

## Status

Candidate generator. Bridge-run evidence recorded on 2026-08-17: the artifact was executed in the live IC6.1.7 / tsmcN65 environment through the Analog Design Studio bridge (cell `simple-current-mirror_ADS_1786919831087`, library `BGR_ADI`). The CIW log contains the complete `CMW:` marker chain (M1/M2 8-field CDF read-back, diode-connection labels, both VDC sources, all three pins), `ADS_BRIDGE_GENERATOR_DONE`, and `CHECK_AND_SAVE=dbSave_completed`. This verifies schematic generation mechanics only: no GUI Check & Save dialog was confirmed, no DC operating point was simulated, and analog performance is **not verified**. Do not claim electrical performance until Spectre evidence is recorded.

Note: the first bridge run (`simple-current-mirror_ADS_1786919831087`) was misclassified by the API as `failed` because the VM's site `.cdsinit` prints `*Error*` lines for optional ASSURA/HSPICE integrations at every Virtuoso startup and the original classifier treated any `*Error*` as fatal. The classifier was fixed the same day: only `ADS_BRIDGE:` markers or fatal text between `ADS_BRIDGE_START` and `ADS_BRIDGE_GENERATOR_DONE` count as execution failures. Verification run `simple-current-mirror_ADS_1786920876760` then completed with API status `succeeded` and the full marker chain above.

## Copy from Windows

```cmd
scp "C:\Users\marko\Desktop\Current_Mirror_NMOS_TotalW_V1_20260817.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/Current_Mirror_NMOS_TotalW_V1_20260817.il")
```

## Run

```skill
CreateCurrentMirror_NMOS_TotalW_V1_20260817()
```

## Required starting schematic

Open a **new empty editable schematic** before running the generator. The generator intentionally rejects a non-empty target.

## Device

```text
NMOS = tsmcN65/nch
```

`nch` is the repository-verified core NMOS master. The TotalW CDF contract (`w, l, wf, fingers, simM, totalM, nf, m`) is Cadence-verified for tsmcN65 by `tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il`. The generator fails explicitly if the master or any required CDF field is unavailable.

## Topology

```text
M1  diode-connected NMOS reference (gate and drain on IREF)
M2  NMOS output device (gate on IREF, drain on IOUT)
```

The 1:1 ratio is the default; the ratio is set by the M1/M2 TotalW/NF/M values.

## Initial sizing

```text
M1  TotalW=4u  L=480n NF=1 M=1
M2  TotalW=4u  L=480n NF=1 M=1
```

The generator explicitly assigns and reads back:

```text
w, l, wf, fingers, simM, totalM, nf, m
```

with:

```text
W/finger = TotalW/NF
totalM = NF*M
```

## Initial VDC values

```text
V_IREF_SRC = 0.75 V  (PLUS=IREF MINUS=VSS)
V_VSS_SRC  = 0.00 V  (explicit source; PLUS=VSS MINUS=VSS)
```

These are starting drive values only; the reference current they produce has not been simulated.

## External pins

```text
IREF (input)  IOUT (output)  VSS (input)
```

## Expected CIW markers

```text
CMW: M1 TotalW=... W/finger=... L=... NF=... M=... totalM=...
CMW: M2 TotalW=... W/finger=... L=... NF=... M=... totalM=...
CMW: STUB M1.G -> IREF   /   CMW: STUB M1.D -> IREF
CMW: STUB M2.G -> IREF   /   CMW: STUB M2.D -> IOUT
CMW: VDC V_IREF_SRC = 0.75V PLUS=IREF MINUS=VSS
CMW: VDC V_VSS_SRC = 0.0V PLUS=VSS MINUS=VSS
CMW: PIN IREF direction=input ...
CMW: PIN IOUT direction=output ...
CMW TOTALW V1 GENERATOR COMPLETED
STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED
```

## Verification sequence

1. Capture the complete CIW output.
2. Confirm all M1/M2 CDF values.
3. Confirm `wf == TotalW`, `fingers == NF`, `simM == M`, `nf == NF`, `m == M`, and `totalM == NF*M`.
4. Confirm the M1 diode connection: both `M1.G` and `M1.D` stubs are labeled `IREF`.
5. Confirm every S/G/D/B terminal has exactly one isolated labeled stub.
6. Check and Save with no schematic errors.
7. Run a DC operating point and record the reference current and the mirrored output current.
8. Only then evaluate mirror accuracy, output resistance, and compliance range against targets.

Do not call the generator Cadence-verified from `load()` success alone, and do not claim any current-accuracy or output-resistance target until Spectre evidence is recorded.
