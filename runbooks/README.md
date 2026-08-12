# Runbooks

Runbooks contain exact copy, load, and run commands. Versioned historical originals remain under `assets/runbooks/` and `history/runbooks/`.

## Current post-migration entry points

- `RUN_5T_OTA_TOTALW_V2_20260812.md`
- `RUN_telescopic_ota_totalw_v2_20260812.md`

Both use the repository-wide design-level interface:

```text
TotalW, L, NF, M
```

and require explicit verification of:

```text
w, l, wf, fingers, simM, totalM, nf, m
```

with `totalM = NF*M`.

Use a new empty schematic for first execution. Read the runbook associated with the exact generator filename. Do not infer a procedure name from a filename.
