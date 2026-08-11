# Tests and verification evidence

## Latest recorded test

[`5T_OTA_PMOS_VDC_RULE_TEST_20260812_FINAL_V2_WITH_VSS.il`](5T_OTA_PMOS_VDC_RULE_TEST_20260812_FINAL_V2_WITH_VSS.il) is the latest 5T regression artifact. Main procedure:

```skill
Create5TOTA_PMOS_VDC_RULE_TEST_20260812()
```

The conversation records successful Cadence schematic checks, PMOS S/D coordinate validation, VDC values/pin policy, isolated stubs, and explicit 0-V VSS. The recorded terminal diagnostic also contains `B -> UP`, so the required `G -> RIGHT / B -> LEFT` rule remains an acceptance check for the next rerun, not a proven result of this exact log.

## Evidence policy

A file is “Cadence-verified” only when the repository includes the exact run output or a dated test note that establishes what passed. Static parenthesis checks, a successful `load()`, or a generated schematic alone do not prove analog performance or terminal-direction correctness.
