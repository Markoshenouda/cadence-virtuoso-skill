# Run — Telescopic OTA V8

Artifact: `canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il`.

Status: candidate generator. V8 extends the Cadence-verified V7 protocol with `nch_mac`/`pch_mac` (tsmcN65 2.5V I/O family), gm/ID-optimized NF/L values, and numeric-tolerant CDF read-back on all eight sizing fields. A live Check & Save run of V8 has not yet been recorded; the V7 evidence (`SCH-1426`, `SCH-1181`, 2026-08-12) applies to V7 only. Do not call V8 Cadence-verified until its own run is recorded, and do not claim DC operating point or analog performance without simulation evidence.

Prerequisite: the target PDK must provide the `nch_mac` and `pch_mac` masters with the standard CDF fields (`w`, `l`, `wf`, `fingers`, `simM`, `totalM`, `nf`, `m`). The generator rejects a non-empty target schematic.

From Windows PowerShell, copy the repository artifact to the Desktop and transfer it:

```powershell
Copy-Item .\canonical\telescopic-ota\Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il $env:USERPROFILE\Desktop\
scp "$env:USERPROFILE\Desktop\Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il" cadence@192.168.75.217:/home/cadence/
```

Open a new, empty editable schematic. In the Cadence CIW run:

```skill
load("/home/cadence/Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il")
CreateTelescopicOTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813()
```

Then use **Check and Save**. Expected CIW markers include the opening banner `TELESCOPIC OTA V8 - NMOS INPUT / DIFFERENTIAL / VDC BIAS`, per-device sizing read-back lines `TOTA8: M1..M9 TotalW=... W/finger=... NF=... M=... WF=... totalM=...` (the generator stops on any mismatch), `TOTA8: VDC ...` for VDD/VSS/VBN_TAIL/VBN_CAS/VBP_CAS/VBP_LOAD/VINP/VINN, `TOTA8: PIN VOUTP` and `TOTA8: PIN VOUTN`, the closing marker `TOTA8 GENERATOR COMPLETED`, and `STATUS : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED`. After Check and Save, record `SCH-1426` (no schematic-check errors) and `SCH-1181` (saved) plus the full CIW output and schematic screenshot before making any verification claim.
