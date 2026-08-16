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
| 5T OTA — PMOS input / `pch_mac` + `nch_mac` | `5t-ota/5T_OTA_PMOS_INPUT_MAC_V1_20260814.il` | User-run successfully in live Cadence; sizing placeholder-only; electrical performance unverified |
| Telescopic OTA | `telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il` | Registry-current generator (`nch_mac`/`pch_mac`, gm/ID-optimized sizing, numeric-tolerant 8-field CDF read-back); a live Check & Save run of V8 has not yet been recorded |
| Telescopic OTA (superseded) | `telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il` | Cadence-verified 2026-08-12 (`SCH-1426` no check errors, `SCH-1181` saved); schematic generation only; retained as the recorded-evidence reference |
| Folded Cascode OTA | `folded-cascode-ota/Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il` | Current TotalW-first generator; schematic generation user-confirmed in the live IC6.1.7 / tsmcN65 environment on 2026-08-14; electrical performance unverified |
| Folded Cascode OTA (legacy) | `folded-cascode-ota/Folded_Cascode_OTA_NMOS_FINAL_V9_REFERENCE_TOPOLOGY.il`, `folded-cascode-ota/Folded_Cascode_OTA_V8_REFERENCE.md` | Legacy W-first executable and routing/topology reference documentation; not TotalW-conformant; do not use for new designs |

## Verification policy

A generator is called **Cadence-verified** only after the user runs it in the live IC6.1.7 / tsmcN65 environment and the result is recorded in `tests/` or its associated README.

The TotalW sizing foundation itself is verified by:

```text
tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il
```

which verifies explicit W/L/WF/NF/M assignment and `totalM = fingers * simM`.

The PMOS-input `pch_mac/nch_mac` skill records the user's live generation result and its verified mechanics in `skills/5t-ota-pmos-mac/SKILL.md`; it does not claim electrical performance verification.
Superseded Telescopic TotalW V1/V2 artifacts are retained under `history/generators/`; they are not canonical entry points.
