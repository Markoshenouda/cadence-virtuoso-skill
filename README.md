# Cadence Virtuoso SKILL Design Agent

Repository for Cadence Virtuoso IC6.1.7 / `tsmcN65` schematic-generation skills, SKILL generators, references, tests, and runbooks.

## Start here

| Purpose | Entry point | Status |
|---|---|---|
| Master rules | `skills/analog-design-agent/SKILL.md` | Current specification-first operating protocol |
| Authority map | `references/repository-authority-map.md` | Definitive conflict and artifact-status ledger |
| MOS sizing contract | `references/TotalW_MOS_Sizing_Convention_20260812.md` | Current verified convention |
| Golden sizing regression | `tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il` | Cadence-verified on 2026-08-12 |
| Latest 5T artifact | `canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il` | Current TotalW-first generator; re-run required after migration |
| PMOS-input `pch_mac/nch_mac` 5T skill | `skills/5t-ota-pmos-mac/SKILL.md` | Reusable PMOS-input methodology; sizing placeholder-only |
| PMOS-input `pch_mac/nch_mac` generator | `canonical/5t-ota/5T_OTA_PMOS_INPUT_MAC_V1_20260814.il` | User-run in live Cadence; electrical performance unverified |
| Canonical Telescopic artifact | `canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il` | Registry-current generator: `nch_mac`/`pch_mac`, gm/ID-optimized sizing, numeric-tolerant CDF read-back; live Check & Save run of V8 not yet recorded |
| Telescopic V7 (recorded evidence) | `canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il` | Cadence schematic-generation verified 2026-08-12; superseded by V8 in the registry; retained as the evidence reference |
| Folded Cascode skill | `skills/folded-cascode-ota/SKILL.md` | Current TotalW-first skill |
| Folded Cascode executable | `canonical/folded-cascode-ota/Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il` | Current TotalW-first generator; schematic generation user-confirmed in live Cadence 2026-08-14; electrical performance unverified |
| Folded Cascode legacy reference | `canonical/folded-cascode-ota/Folded_Cascode_OTA_NMOS_FINAL_V9_REFERENCE_TOPOLOGY.il` | Legacy W-first reference only; not TotalW-conformant |

## Repository map

```text
canonical/       Current executable entry points
history/         Preserved historical generators/tests/runbooks
skills/          Reusable AI/Cadence rules
assets/          Compatibility copies; not canonical unless marked current
references/      Knowledge base and sizing conventions
tests/           Cadence regression tests and verification evidence
runbooks/        Stable execution guidance
output/examples/ Screenshots/examples; not executable generators
```

## Repository-wide MOS sizing contract

The AI/design level uses only:

```text
TotalW
L
NF
M
```

The verified tsmcN65 implementation is:

```text
W/finger = TotalW / NF
wf        = TotalW
fingers   = NF
simM      = M
totalM    = NF * M
nf        = NF
m         = M
```

Every MOS must explicitly assign `w`, `l`, `wf`, `fingers`, `simM`, `totalM`, `nf`, and `m`. No sizing field may depend on a default or stale instance state.

## Verification ledger

- **TotalW CDF regression V5, 2026-08-12:** successfully executed in the user's live Cadence IC6.1.7 / tsmcN65 environment. The test verified multiple NF/M combinations and `totalM = fingers * simM` after save.
- **5T PMOS/VDC test, 2026-08-12:** previous successful Cadence run remains recorded in the historical verification material.
- **PMOS-input `pch_mac/nch_mac` 5T, 2026-08-14:** the user ran the generated schematic in live Cadence after SKILL-syntax and CDF read-back fixes. Topology generation, CDF assignment, PMOS orientation checks, stub/label connectivity, VOUT pin, and VDC generation were confirmed in that run. No electrical simulation or performance verification was performed.
- **Telescopic V7, 2026-08-12:** CIW evidence records `SCH-1426` with no schematic-check errors and `SCH-1181` save. That evidence applies to V7 only; operating point and performance remain unverified. V7 is superseded by V8 in the registry but retained as the recorded-evidence reference.
- **Telescopic V8, 2026-08-14:** promoted to the registry-current telescopic generator (`nch_mac`/`pch_mac`, gm/ID-optimized sizing, numeric-tolerant 8-field CDF read-back, ASCII-safe). No live Cadence run of V8 has been recorded yet; do not call it Cadence-verified until one is.
- **Folded Cascode TotalW V1, 2026-08-14:** schematic generation user-confirmed in the live IC6.1.7 / tsmcN65 environment (PDK-aware PMOS auto-placement; the only canonical generator calling `schCheck`). Electrical performance remains unverified.
- **Historical artifacts:** old W-first generators remain preserved and are not presented as current TotalW generators.

## Run a generator

From Windows CMD:

```cmd
scp "C:\Users\marko\Desktop\your_file.il" cadence@192.168.75.217:/home/cadence/
```

In a new empty Cadence schematic:

```skill
load("/home/cadence/your_file.il")
```

Then run the exact procedure documented by the corresponding runbook. Do not call a generator Cadence-verified until the live run is recorded.

For the PMOS-input `pch_mac/nch_mac` 5T generator, load and run:

```skill
load("/home/cadence/5T_OTA_PMOS_INPUT_MAC_V1_20260814.il")
Create5TOTA_PMOSIN_MAC_V1_20260814()
```

For Telescopic V8 use [the V8 runbook](runbooks/RUN_telescopic_ota_v8_20260813.md); the [V7 runbook](runbooks/RUN_telescopic_ota_v7_20260812.md) documents the 2026-08-12 verified run. New designs follow: specification extraction → missing-spec questions → design confirmation → sizing → sizing confirmation → one-shot generator → Cadence execution → verification → canonical promotion.
