# Run - Three-Stage OTA TotalW V1

## Generator

```text
canonical/ota/ThreeStage_OTA_TotalW_V1_20260817.il
```

## Status

Candidate generator. It is **not Cadence-verified** and its analog performance is **not verified** until a live IC6.1.7 / tsmcN65 run is recorded.

## Copy from Windows

```cmd
scp "C:\Users\<user>\Desktop\ThreeStage_OTA_TotalW_V1_20260817.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/ThreeStage_OTA_TotalW_V1_20260817.il")
```

## Run

```skill
CreateThreeStage_OTA_TotalW_V1_20260817()
```

## Required starting schematic

Open a **new empty editable schematic** before running. The generator rejects a non-empty target.

## Topology ID

```text
three-stage-ota  (circuit: ota)
```

## Device masters

NMOS = tsmcN65/nch;
PMOS = tsmcN65/pch (orientation selected from actual S/D geometry).

## Expected devices

```text
Stage 1: M1/M2 pair, M3/M4 PMOS mirror, M5 tail (out VOUT1)
Stage 2: M6 NMOS + M7 PMOS (out VOUT2)
Stage 3: M8 NMOS + M9 PMOS (out VOUT)
```

## Sizing contract

The generator explicitly assigns and reads back `w, l, wf, fingers, simM, totalM, nf, m` with `W/finger = TotalW/NF` and `totalM = NF*M`.

## Initial VDC values

```textV_VDD = 1.50 V   V_VBN_TAIL = 0.60 V   V_VINP = V_VINN = 0.75 V   V_VSS = 0.00 V
```

Starting bias values only; nothing has been simulated.

## Expected ADS_BRIDGE markers

```text
ADS_BRIDGE_START
THS: <device> TotalW=... W/finger=... L=... NF=... M=... totalM=...
THS: STUB <device>.<terminal> -> <net>
THS GENERATOR COMPLETED
ADS_BRIDGE_GENERATOR_DONE
ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED
STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED
```

## Evidence location

Live-run evidence is recorded in the bridge run directory
`/home/cadence/Desktop/analog-design-studio-runs/<topology>_<timestamp>/` on the
Cadence VM (`virtuoso.log`, `evidence.txt`) and in the repository verification ledger.

## Simulation status

SCHEMATIC_ONLY: uncompensated three-stage network; AC results without compensation capacitors are not meaningful.

## Verification status

Schematic candidate only; no electrical verification claim.

## Known limitations

- Sizing values are engineering starting values, not performance-derived.
- Electrical performance has not been simulated unless stated above.
- Do not call the generator Cadence-verified from `load()` success alone.
