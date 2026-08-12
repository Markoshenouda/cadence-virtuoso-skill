# Telescopic OTA V3.1 — stale-function-safe

This revision fixes the exact failure where Virtuoso reported:

```text
*Error* eval: not a function - (pinName == "G")
```

The uploaded V3 source itself does **not** contain `pinName == "G"`; it uses `equal(pinName "G")`. That means the error is coming from an older helper definition still present in the current CIW session. V3.1 therefore gives the two helper functions unique names with a date suffix so the old implementation cannot be called.

## 1. Copy the fixed file from Windows

```cmd
scp "C:\Users\marko\Desktop\telescopic_ota_v3_fixed.il" cadence@192.168.75.216:/home/cadence/
```

## 2. Use a NEW empty editable schematic

Do not run the generator on the previous broken schematic.

## 3. Load the fixed file

In Virtuoso CIW:

```skill
load("/home/cadence/telescopic_ota_v3_fixed.il")
```

## 4. Run the helper sanity test FIRST

```skill
TOTA_V3_StaleSafeTest()
```

Expected result:

```text
TOTA_V3.1: helper test G -> (0.25 2.0)
TOTA_V3.1: helper test D -> (1.0 2.75)
```

The exact numbers above assume a point of `(1.0 2.0)` and the configured 0.75 stub length.

Most importantly, there must be **no** message containing:

```text
(pinName == "G")
```

## 5. Generate the OTA

Only after the helper test succeeds:

```skill
CreateTelescopicOTA_V3()
```

## 6. Expected devices

- M1/M2: NMOS differential input pair, 2u/240n
- M3/M4: NMOS cascodes, 4u/480n
- M5/M6: PMOS cascodes, 4u/480n
- M7/M8: PMOS loads, 6u/480n
- M9: NMOS tail, 6u/480n

`nf=1`, `m=1`.

## 7. Expected net labels

External:

```text
VINP VINN VOUT VDD VSS
VBN_CAS VBP_CAS VBP VBN_TAIL
```

Internal:

```text
NLEFT NRIGHT NLEFT_CAS
NLEFT_LOAD NRIGHT_LOAD TAIL
```

Every MOS terminal gets a short local wire and a label. Equal label names are used to establish the intended electrical nets.

## 8. If the helper test fails

Do not run the OTA generator.

Send the complete CIW output from:

```skill
load("/home/cadence/telescopic_ota_v3_fixed.il")
TOTA_V3_StaleSafeTest()
```

The fixed file uses the same verified APIs from the successful single-wire test:

- `dbFindTermByName`
- `term~>pins`
- `pin~>fig`
- `centerBox`
- `dbTransformPoint`
- `schCreateWire`
- `schCreateWireLabel`

No `schCreateLabel` is used, and no vector `point + list(dx dy)` arithmetic is used.

The file is statically checked for balanced parentheses. It has not been executed inside the user's Cadence session.
