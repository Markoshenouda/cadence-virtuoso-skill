# Run - Wilson Current Mirror TotalW V1

## Generator

```text
canonical/current-mirror/Current_Mirror_Wilson_NMOS_TotalW_V1_20260817.il
```

## Status

Candidate generator. It is **not Cadence-verified** and its analog performance is **not verified** until a live IC6.1.7 / tsmcN65 run is recorded.

## Copy from Windows

```cmd
scp "C:\Users\<user>\Desktop\Current_Mirror_Wilson_NMOS_TotalW_V1_20260817.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/Current_Mirror_Wilson_NMOS_TotalW_V1_20260817.il")
```

## Run

```skill
CreateCurrentMirror_Wilson_NMOS_TotalW_V1_20260817()
```

## Required starting schematic

Open a **new empty editable schematic** before running. The generator rejects a non-empty target.

## Topology ID

```text
wilson-current-mirror  (circuit: current-mirror)
```

## Device masters

NMOS = tsmcN65/nch.

## Expected devices

```text
M1  NMOS diode reference (G=A D=A S=VSS B=VSS)
M2  NMOS degeneration device (G=A D=B S=VSS B=VSS)
M3  NMOS output device (G=A D=IOUT S=B B=VSS)
```

## Sizing contract

The generator explicitly assigns and reads back `w, l, wf, fingers, simM, totalM, nf, m` with `W/finger = TotalW/NF` and `totalM = NF*M`.

## Initial VDC values

```textV_IREF = 0.75 V (drive on node A)   V_VSS = 0.00 V (explicit source)
```

Starting bias values only; nothing has been simulated.

## Expected ADS_BRIDGE markers

```text
ADS_BRIDGE_START
CWM: <device> TotalW=... W/finger=... L=... NF=... M=... totalM=...
CWM: STUB <device>.<terminal> -> <net>
CWM GENERATOR COMPLETED
ADS_BRIDGE_GENERATOR_DONE
ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED
STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED
```

## Evidence location

Live-run evidence is recorded in the bridge run directory
`/home/cadence/Desktop/analog-design-studio-runs/<topology>_<timestamp>/` on the
Cadence VM (`virtuoso.log`, `evidence.txt`) and in the repository verification ledger.

## Simulation status

Simulation-ready via the dc-mirror profile (device roles: ref=M1, out=M3; note M3 mirrors with Wilson feedback).

## Verification status

Schematic candidate only; no electrical verification claim.

## Known limitations

- Sizing values are engineering starting values, not performance-derived.
- Electrical performance has not been simulated unless stated above.
- Do not call the generator Cadence-verified from `load()` success alone.
