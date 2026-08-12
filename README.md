# Cadence Virtuoso SKILL Design Agent

Repository for Cadence Virtuoso IC6.1.7 / `tsmcN65` schematic-generation skills, SKILL generators, references, tests, and runbooks.

## Start here

| Purpose | Entry point | Status |
|---|---|---|
| Master rules | `skills/analog-design-agent/SKILL.md` | Current TotalW-first skill v3.3 |
| MOS sizing contract | `references/TotalW_MOS_Sizing_Convention_20260812.md` | Current verified convention |
| Golden sizing regression | `tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il` | Cadence-verified on 2026-08-12 |
| Latest 5T artifact | `canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il` | Current TotalW-first generator; re-run required after migration |
| Latest Telescopic artifact | `canonical/telescopic-ota/telescopic_ota_totalw_v2_20260812.il` | Current TotalW-first generator; preserves actual M4.D VOUT endpoint |
| Folded Cascode skill | `skills/folded-cascode-ota/SKILL.md` | Current TotalW-first skill |
| Folded Cascode executable | `canonical/folded-cascode-ota/Folded_Cascode_OTA_NMOS_FINAL_V9_REFERENCE_TOPOLOGY.il` | Legacy/reference until TotalW migration is Cadence-verified |

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
- **Telescopic VOUT:** current generator keeps `M2.D`/`M4.D` on `VOUT` and creates the external VOUT pin at the actual M4.D stub endpoint.
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
