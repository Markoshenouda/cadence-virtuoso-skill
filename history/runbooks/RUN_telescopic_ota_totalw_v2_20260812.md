# Run — Telescopic OTA TotalW V2

## Generator

```text
canonical/telescopic-ota/telescopic_ota_totalw_v2_20260812.il
```

## Copy from Windows

```cmd
scp "C:\Users\marko\Desktop\telescopic_ota_totalw_v2_20260812.il" cadence@192.168.75.217:/home/cadence/
```

## Load in CIW

```skill
load("/home/cadence/telescopic_ota_totalw_v2_20260812.il")
```

## Run

```skill
CreateTelescopicOTA_TotalW_V2_20260812()
```

## Expected sizing contract

Every MOS is generated from `TotalW`, `L`, `NF`, `M`. The generator derives `W/finger = TotalW/NF` and explicitly assigns `w`, `l`, `wf`, `fingers`, `simM`, `totalM`, `nf`, and `m`.

## Verification

Before any simulation:
1. Open each MOS properties.
2. Confirm `wf == TotalW`.
3. Confirm `fingers == NF` and `simM == M`.
4. Confirm `totalM == NF*M`.
5. Confirm VOUT is on the actual M4.D stub endpoint.
6. Check and Save.

This V2 generator is a new post-migration candidate and is not called Cadence-verified until the user runs it.
