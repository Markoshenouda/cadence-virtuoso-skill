# Runbooks

Runbooks contain exact copy, load, and run commands. Versioned historical originals remain under `assets/runbooks/` and `history/runbooks/`.

## Current post-migration entry points

- `RUN_5T_OTA_TOTALW_V2_20260812.md`
- `RUN_telescopic_ota_v8_20260813.md` — registry-current Telescopic V8 flow (`nch_mac`/`pch_mac`).
- `RUN_telescopic_ota_v7_20260812.md` — Cadence-verified 2026-08-12 Telescopic V7 flow; retained as the recorded-evidence runbook.
- `RUN_Folded_Cascode_OTA_TotalW_V1_20260814.md` — current Folded Cascode TotalW flow.
- `RUN_Current_Mirror_TotalW_V1_20260817.md` — simple NMOS current mirror flow (schematic candidate).
- `RUN_Current_Mirror_Cascode_TotalW_V1_20260817.md` — cascode NMOS current mirror.
- `RUN_Current_Mirror_PMOS_TotalW_V1_20260817.md` — PMOS current mirror.
- `RUN_Differential_Pair_TotalW_V1_20260817.md` — NMOS differential pair stage.
- `RUN_CommonSource_Amp_TotalW_V1_20260817.md` — common-source amplifier.
- `RUN_Source_Follower_TotalW_V1_20260817.md` — source follower.
- `RUN_Cascode_Amp_TotalW_V1_20260817.md` — cascode amplifier.

All use the repository-wide design-level interface:

```text
TotalW, L, NF, M
```

and require explicit verification of:

```text
w, l, wf, fingers, simM, totalM, nf, m
```

with `totalM = NF*M`.

Use a new empty schematic for first execution. Read the runbook associated with the exact generator filename. Do not infer a procedure name from a filename.

## Execution environments

Manual runbooks transfer artifacts with `scp` to `cadence@192.168.75.217:/home/cadence/`. Historical runbooks reference `192.168.75.216` (retired host, evidence only). The Analog Design Studio web bridge (`web/analog-design-studio`) targets its own environment (`192.168.75.219` by default) and is configured through `CADENCE_*` environment variables, not through these runbooks.
