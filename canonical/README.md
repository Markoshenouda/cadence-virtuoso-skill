# Canonical artifacts

This folder is the short path to the latest or most relevant artifact for each circuit family. Historical/compatibility artifacts remain preserved; current canonical generators use the repository-wide **TotalW-first MOS sizing convention**.

## Current MOS sizing contract

For every current canonical generator:

```text
Design input: TotalW, L, NF, M
PDK mapping:  wf=TotalW, l=L, fingers=NF, simM=M
Explicit CDF state: w, l, wf, fingers, simM, nf, m
```

`wf` is the verified tsmcN65 `total_width(M)` field. `w` is the explicit per-finger implementation width.

| Family | Canonical file | Classification |
|---|---|---|
| 5T OTA | `5t-ota/5T_OTA_PMOS_TOTALW_V1_20260812.il` | TotalW-first executable generator; current migration artifact |
| Telescopic OTA | `telescopic-ota/telescopic_ota_totalw_v1_20260812.il` | TotalW-first executable generator; current migration artifact |
| Folded Cascode OTA | `folded-cascode-ota/Folded_Cascode_OTA_V8_REFERENCE.md` | Reference document; executable generator still requires TotalW migration before becoming canonical |

Historical W-first files are not rewritten as historical evidence. A current generator must not use the old W-first API.

Update this table and the relevant runbook after the TotalW generator has been executed successfully in Cadence.
