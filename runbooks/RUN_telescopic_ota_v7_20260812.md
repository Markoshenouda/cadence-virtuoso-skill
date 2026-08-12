# Run — Telescopic OTA V7

Artifact: `canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il`.

Status: the recorded 2026-08-12 run completed `SCH-1426` with no schematic-check errors and `SCH-1181` save. This does not verify DC operating point or analog performance.

From Windows PowerShell, copy the repository artifact to the Desktop and transfer it:

```powershell
Copy-Item .\canonical\telescopic-ota\Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il $env:USERPROFILE\Desktop\
scp "$env:USERPROFILE\Desktop\Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il" cadence@192.168.75.217:/home/cadence/
```

Open a new, empty editable schematic. In the Cadence CIW run:

```skill
load("/home/cadence/Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il")
CreateTelescopicOTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812()
```

Then use **Check and Save**. Expected CIW markers include `TOTA7: PIN VOUTP`, `TOTA7: PIN VOUTN`, `TOTA7 GENERATOR COMPLETED`, and no `SCH-` errors. Return the full CIW output and schematic screenshot for any new verification claim.
