# Canonical artifacts

This folder contains the current executable entry point for each circuit family. Historical/compatibility artifacts remain preserved separately and are not silently rewritten.

## Current MOS sizing contract

Every current canonical generator uses:

```text
Design input: TotalW, L, NF, M

Derived implementation:
W/finger = TotalW / NF

Explicit tsmcN65 CDF:
w, l, wf, fingers, simM, totalM, nf, m

totalM = NF * M
```

`wf` is the verified `tsmcN65 total_width(M)` field and is the authoritative TotalW field.

| Family | Canonical artifact | Status |
|---|---|---|
| 5T OTA | `5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il` | Current TotalW-first generator; requires Cadence re-run after migration |
| Telescopic OTA | `telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il` | Canonical; schematic generation and Check & Save verified on 2026-08-12; performance not verified |
| Folded Cascode OTA | `folded-cascode-ota/Folded_Cascode_OTA_V8_REFERENCE.md` | Reference only; executable remains legacy until a TotalW version is Cadence-verified |

## Verification policy

A generator is called **Cadence-verified** only after the user runs it in the live IC6.1.7 / tsmcN65 environment and the result is recorded in `tests/` or its associated README.

The TotalW sizing foundation itself is verified by:

```text
tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il
```

which verifies explicit W/L/WF/NF/M assignment and `totalM = fingers * simM`.

Superseded Telescopic TotalW V1/V2 artifacts are retained under `history/generators/`; they are not canonical entry points.
