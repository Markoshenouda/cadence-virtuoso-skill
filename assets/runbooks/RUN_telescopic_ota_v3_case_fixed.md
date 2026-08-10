# Telescopic OTA V3.2 — case-based fix

The V3.1 test still produced:

```text
*Error* eval: not a function - (pinName == "G")
```

The new file removes `equal()` comparisons from the helper and the M1-M9 existence check. It uses SKILL `case()` with literal string comparators instead. This avoids the failing comparison expression entirely.

## 1. Copy from Windows

```cmd
scp "C:\Users\marko\Desktop\telescopic_ota_v3_case_fixed.il" cadence@192.168.75.216:/home/cadence/
```

## 2. Open a NEW empty editable schematic

Do not use the schematic containing the previous test OTA.

## 3. Load the NEW filename in CIW

```skill
load("/home/cadence/telescopic_ota_v3_case_fixed.il")
```

Do not load the older `telescopic_ota_v3.il` or `telescopic_ota_v3_fixed.il` in this session after loading this file.

## 4. Run ONLY the new helper test

```skill
TOTA_V3_StaleSafeTest_V32()
```

Expected:

```text
TOTA_V3.2: helper test G -> ...
TOTA_V3.2: helper test D -> ...
```

There must be no `pinName == "G"` error.

## 5. Only after the helper test succeeds

Run:

```skill
CreateTelescopicOTA_V3()
```

The generator uses the verified TSMC65 setup:

- Library: `tsmcN65`
- NMOS: `nch`
- PMOS: `pch`
- Pins: `S G B D`
- CDF parameters: `w l nf m`

Sizing:

- M1/M2: 2u / 240n
- M3/M4: 4u / 480n
- M5/M6: 4u / 480n
- M7/M8: 6u / 480n
- M9: 6u / 480n
- nf=1, m=1

## 6. Verified construction APIs retained

- `dbOpenCellViewByType`
- `dbCreateInst`
- `cdfGetInstCDF`
- `dbFindTermByName`
- `term~>pins`
- `pin~>fig`
- `centerBox`
- `dbTransformPoint`
- `schCreateWire`
- `schCreateWireLabel`

The file does not use `schCreateLabel`, vector point addition, or `equal()` for its selection logic.

## 7. Validation

The source has been statically checked for balanced parentheses and for the absence of executable `equal()` / `==` comparison logic. It has not been executed inside the user's Cadence session.
