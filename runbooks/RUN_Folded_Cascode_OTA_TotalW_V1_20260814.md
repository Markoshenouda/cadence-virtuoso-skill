# Run — Folded-Cascode OTA TotalW V1

## Generator

```text
canonical/folded-cascode-ota/Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il
```

## Status

Candidate generator. It is **not Cadence-verified** and its analog performance is **not verified** until a live IC6.1.7 / tsmcN65 run is recorded.

## Copy from Windows

```cmd
scp "C:\Users\marko\Desktop\Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il")
```

## Run

```skill
CreateFoldedCascodeOTA_NMOS_TotalW_V1_20260814()
```

## Required starting schematic

Open a **new empty editable schematic** before running the generator. The generator intentionally rejects a non-empty target.

## Initial device candidates

```text
NMOS = tsmcN65/nch_25
PMOS = tsmcN65/pch_25
```

The repository device catalog requires live PDK/CDF/model confirmation of special-voltage device behavior. The generator therefore fails explicitly if a selected master or required TotalW CDF field is unavailable.

## Initial sizing

```text
M1/M2   TotalW=8u  L=480n NF=2 M=1
M3/M4   TotalW=8u  L=1u   NF=2 M=1
M5/M6   TotalW=8u  L=1u   NF=2 M=1
M7/M8   TotalW=8u  L=1u   NF=2 M=1
M9/M10  TotalW=6u  L=1u   NF=2 M=1
M11     TotalW=8u  L=1u   NF=2 M=1
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
VDD      = 2.00 V
VBP2     = 1.55 V
VBP1     = 1.30 V
VBN1     = 0.65 V
VBN2     = 0.45 V
VBN_TAIL = 0.65 V
VINP     = 1.00 V
VINN     = 1.00 V
```

These are starting bias values only.

## Verification sequence

1. Capture the complete CIW output.
2. Confirm all M1–M11 CDF values.
3. Confirm `wf == TotalW`, `fingers == NF`, `simM == M`, `nf == NF`, `m == M`, and `totalM == NF*M`.
4. Confirm PMOS source-top checks pass.
5. Confirm every S/G/D/B terminal has exactly one isolated labeled stub.
6. Check and Save with no schematic errors.
7. Run DC operating point and verify all MOS devices are in the intended operating region.
8. Run AC and verify gain, GBW, and phase margin.
9. Run transient and verify slew rate.
10. Check supply power and output swing.

Do not call the generator Cadence-verified from `load()` success alone, and do not claim the 60-dB/100-MHz/50-V/us/1-mW targets until Spectre evidence is recorded.
