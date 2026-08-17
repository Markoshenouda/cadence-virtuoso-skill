# Run - Differential Pair with PMOS Current Load TotalW V1

## Generator

```text
canonical/differential-pair/Diff_Pair_PMOSLoad_TotalW_V1_20260817.il
```

## Status

Candidate generator. It is **not Cadence-verified** and its analog performance is **not verified** until a live IC6.1.7 / tsmcN65 run is recorded.

## Copy from Windows

```cmd
scp "C:\Users\<user>\Desktop\Diff_Pair_PMOSLoad_TotalW_V1_20260817.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/Diff_Pair_PMOSLoad_TotalW_V1_20260817.il")
```

## Run

```skill
CreateDiffPair_PMOSLoad_TotalW_V1_20260817()
```

## Required starting schematic

Open a **new empty editable schematic** before running. The generator rejects a non-empty target.

## Topology ID

```text
diff-pair-pmos-load  (circuit: differential-pair)
```

## Device masters

NMOS = tsmcN65/nch;
PMOS = tsmcN65/pch (orientation selected from actual S/D geometry).

## Expected devices

```text
M1 pair (G=VIP D=VOUTP S=TAIL B=VSS)
M2 pair (G=VIN D=VOUTN S=TAIL B=VSS)
M3 tail (G=VBN_TAIL D=TAIL S=VSS B=VSS)
M4 PMOS load (G=VBP D=VOUTP S=VDD B=VDD)
M5 PMOS load (G=VBP D=VOUTN S=VDD B=VDD)
```

## Sizing contract

The generator explicitly assigns and reads back `w, l, wf, fingers, simM, totalM, nf, m` with `W/finger = TotalW/NF` and `totalM = NF*M`.

## Initial VDC values

```textV_VDD = 1.50 V   V_VBN_TAIL = 0.60 V   V_VBP = 0.90 V   V_VIP = V_VIN = 0.75 V   V_VSS = 0.00 V
```

Starting bias values only; nothing has been simulated.

## Expected ADS_BRIDGE markers

```text
ADS_BRIDGE_START
DPL: <device> TotalW=... W/finger=... L=... NF=... M=... totalM=...
DPL: STUB <device>.<terminal> -> <net>
DPL GENERATOR COMPLETED
ADS_BRIDGE_GENERATOR_DONE
ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED
STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED
```

## Evidence location

Live-run evidence is recorded in the bridge run directory
`/home/cadence/Desktop/analog-design-studio-runs/<topology>_<timestamp>/` on the
Cadence VM (`virtuoso.log`, `evidence.txt`) and in the repository verification ledger.

## Simulation status

SIMULATION_READY via the dc-diffpair profile (tail=M3, inP=M1, inN=M2; loads included in the netlist).

## Verification status

Schematic candidate only; no electrical verification claim.

## Known limitations

- Sizing values are engineering starting values, not performance-derived.
- Electrical performance has not been simulated unless stated above.
- Do not call the generator Cadence-verified from `load()` success alone.
