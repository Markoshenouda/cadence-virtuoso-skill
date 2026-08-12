# Run — 5T OTA TotalW V2

## Generator

```text
canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il
```

## Copy from Windows

```cmd
scp "C:\Users\marko\Desktop\5T_OTA_PMOS_TOTALW_V2_20260812.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/5T_OTA_PMOS_TOTALW_V2_20260812.il")
```

## Run

```skill
Create5TOTA_PMOS_TOTALW_V2_20260812()
```

## Verification

For every MOS verify `wf == TotalW`, `fingers == NF`, `simM == M`, `nf == NF`, `m == M`, and `totalM == NF*M`. Then Check and Save before simulation.

This V2 generator is a post-migration candidate and is not called Cadence-verified until the user runs it.
