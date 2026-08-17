# Run - PMOS-Input Folded Cascode Amplifier TotalW V1

## Generator

```text
canonical/amplifier/FoldedCascodeAmp_PMOS_TotalW_V1_20260817.il
```

## Status

Candidate generator. It is **not Cadence-verified** and its analog performance is **not verified** until a live IC6.1.7 / tsmcN65 run is recorded.

## Copy from Windows

```cmd
scp "C:\Users\<user>\Desktop\FoldedCascodeAmp_PMOS_TotalW_V1_20260817.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/FoldedCascodeAmp_PMOS_TotalW_V1_20260817.il")
```

## Run

```skill
CreateFoldedCascodeAmp_PMOS_TotalW_V1_20260817()
```

## Required starting schematic

Open a **new empty editable schematic** before running. The generator rejects a non-empty target.

## Topology ID

```text
folded-cascode-amplifier-pmos  (circuit: amplifier)
```

## Device masters

NMOS = tsmcN65/nch;
PMOS = tsmcN65/pch (orientation selected from actual S/D geometry).

## Expected devices

```text
M1 PMOS input (G=VIN D=PFOLD S=VDD B=VDD)
M2 NMOS folded cascode (G=VBN S=PFOLD D=VOUT B=VSS)
M3 NMOS fold source (G=VBN2 S=VSS D=PFOLD B=VSS)
M4 PMOS load (G=VBP D=VOUT S=VDD B=VDD)
```

## Sizing contract

The generator explicitly assigns and reads back `w, l, wf, fingers, simM, totalM, nf, m` with `W/finger = TotalW/NF` and `totalM = NF*M`.

## Initial VDC values

```textV_VIN = 1.25 V   V_VBN2 = 0.60 V   V_VBN = 0.95 V   V_VBP = 1.55 V   V_VDD = 2.00 V   V_VSS = 0.00 V
```

Starting bias values only; nothing has been simulated.

## Expected ADS_BRIDGE markers

```text
ADS_BRIDGE_START
PFA: <device> TotalW=... W/finger=... L=... NF=... M=... totalM=...
PFA: STUB <device>.<terminal> -> <net>
PFA GENERATOR COMPLETED
ADS_BRIDGE_GENERATOR_DONE
ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED
STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED
```

## Evidence location

Live-run evidence is recorded in the bridge run directory
`/home/cadence/Desktop/analog-design-studio-runs/<topology>_<timestamp>/` on the
Cadence VM (`virtuoso.log`, `evidence.txt`) and in the repository verification ledger.

## Simulation status

SIMULATION_READY via the ac-amplifier profile.

## Verification status

Schematic candidate only; no electrical verification claim.

## Known limitations

- Sizing values are engineering starting values, not performance-derived.
- Electrical performance has not been simulated unless stated above.
- Do not call the generator Cadence-verified from `load()` success alone.
