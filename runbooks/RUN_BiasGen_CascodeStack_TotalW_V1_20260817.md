# Run - Cascode Bias Generator TotalW V1

## Generator

```text
canonical/current-mirror/BiasGen_CascodeStack_TotalW_V1_20260817.il
```

## Status

Candidate generator. It is **not Cadence-verified** and its analog performance is **not verified** until a live IC6.1.7 / tsmcN65 run is recorded.

## Copy from Windows

```cmd
scp "C:\Users\<user>\Desktop\BiasGen_CascodeStack_TotalW_V1_20260817.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/BiasGen_CascodeStack_TotalW_V1_20260817.il")
```

## Run

```skill
CreateBiasGen_CascodeStack_TotalW_V1_20260817()
```

## Required starting schematic

Open a **new empty editable schematic** before running. The generator rejects a non-empty target.

## Topology ID

```text
cascode-bias-generator  (circuit: current-mirror)
```

## Device masters

NMOS = tsmcN65/nch.

## Expected devices

```text
M1 bottom diode (G=D=NB1 S=VSS B=VSS)
M2 middle diode (G=D=NB2 S=NB1 B=VSS)
M3 top diode (G=D=NB3 S=NB2 D=IREF B=VSS)
```

## Sizing contract

The generator explicitly assigns and reads back `w, l, wf, fingers, simM, totalM, nf, m` with `W/finger = TotalW/NF` and `totalM = NF*M`.

## Initial VDC values

```textV_IREF = 1.80 V   V_VSS = 0.00 V
```

Starting bias values only; nothing has been simulated.

## Expected ADS_BRIDGE markers

```text
ADS_BRIDGE_START
CBG: <device> TotalW=... W/finger=... L=... NF=... M=... totalM=...
CBG: STUB <device>.<terminal> -> <net>
CBG GENERATOR COMPLETED
ADS_BRIDGE_GENERATOR_DONE
ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED
STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED
```

## Evidence location

Live-run evidence is recorded in the bridge run directory
`/home/cadence/Desktop/analog-design-studio-runs/<topology>_<timestamp>/` on the
Cadence VM (`virtuoso.log`, `evidence.txt`) and in the repository verification ledger.

## Simulation status

SIMULATION_READY via the dc-mirror profile (indicative branch-current measurement).

## Verification status

Schematic candidate only; no electrical verification claim.

## Known limitations

- Sizing values are engineering starting values, not performance-derived.
- Electrical performance has not been simulated unless stated above.
- Do not call the generator Cadence-verified from `load()` success alone.
