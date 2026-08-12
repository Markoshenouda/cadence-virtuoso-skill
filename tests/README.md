# Tests and verification evidence

## Golden MOS sizing regression

`mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il` is the current golden sizing regression.

```skill
TW_Complete_TotalW_Regression_Test_V5()
```

It verifies in the live tsmcN65 environment:

- TotalW/L/NF/M as the design-level inputs
- explicit `w/l/wf/fingers/simM/totalM/nf/m` assignment
- `wf == TotalW`
- `W/finger = TotalW/NF`
- `totalM = fingers * simM`
- persistence after `dbSave()`
- NF/M combinations including `(3,2)` and `(5,3)`

The user executed V5 successfully on 2026-08-12 and obtained `COMPLETE TOTALW REGRESSION TEST V5: PASS`.

## Existing circuit tests

`test_telescopic_ota_v7_contract.py` protects the canonical V7 repository contract. `telescopic-ota-v7-regression.md` records the live Cadence checks still required for a fresh run.

The existing 5T PMOS/VDC regression remains preserved as circuit-level evidence. Its documented PMOS geometry and VDC/pin checks are separate from the MOS sizing contract.

## Evidence policy

A file is “Cadence-verified” only when the repository contains the exact live-run evidence or a dated test note. A successful `load()` alone does not prove schematic correctness or analog performance.
