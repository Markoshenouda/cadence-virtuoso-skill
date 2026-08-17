# Run - Fully Differential Folded-Cascode OTA TotalW V1

## Generator

```text
canonical/ota/FoldedCascode_OTA_FullyDiff_TotalW_V1_20260817.il
```

## Status

Candidate generator. It is **not Cadence-verified** and its analog performance is **not verified** until a live IC6.1.7 / tsmcN65 run is recorded.

## Copy from Windows

```cmd
scp "C:\Users\<user>\Desktop\FoldedCascode_OTA_FullyDiff_TotalW_V1_20260817.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/FoldedCascode_OTA_FullyDiff_TotalW_V1_20260817.il")
```

## Run

```skill
CreateFoldedCascode_OTA_FullyDiff_TotalW_V1_20260817()
```

## Required starting schematic

Open a **new empty editable schematic** before running. The generator rejects a non-empty target.

## Topology ID

```text
fully-differential-folded-ota  (circuit: ota)
```

## Device masters

NMOS = tsmcN65/nch;
PMOS = tsmcN65/pch (orientation selected from actual S/D geometry).

## Expected devices

```text
M1/M2 pair; M3/M4 PMOS top; M5/M6 folded cascodes (VOUTP/VOUTN); M7/M8 NMOS cascodes; M9/M10 sinks; M11 tail
```

## Sizing contract

The generator explicitly assigns and reads back `w, l, wf, fingers, simM, totalM, nf, m` with `W/finger = TotalW/NF` and `totalM = NF*M`.

## Initial VDC values

```textV_VDD = 2.00 V   VBP2=1.55 VBP1=1.30 VBN1=0.65 VBN2=0.45 VBN_TAIL=0.65   V_VINP/V_VINN = 1.00 V
```

Starting bias values only; nothing has been simulated.

## Expected ADS_BRIDGE markers

```text
ADS_BRIDGE_START
FDF: <device> TotalW=... W/finger=... L=... NF=... M=... totalM=...
FDF: STUB <device>.<terminal> -> <net>
FDF GENERATOR COMPLETED
ADS_BRIDGE_GENERATOR_DONE
ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED
STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED
```

## Evidence location

Live-run evidence is recorded in the bridge run directory
`/home/cadence/Desktop/analog-design-studio-runs/<topology>_<timestamp>/` on the
Cadence VM (`virtuoso.log`, `evidence.txt`) and in the repository verification ledger.

## Simulation status

SCHEMATIC_ONLY: CMFB is required but not implemented; differential DC operating point needs external common-mode control before AC simulation is meaningful.

## Verification status

Schematic candidate only; no electrical verification claim.

## Known limitations

- Sizing values are engineering starting values, not performance-derived.
- Electrical performance has not been simulated unless stated above.
- Do not call the generator Cadence-verified from `load()` success alone.
