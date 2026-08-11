# Telescopic OTA V4 — PMOS orientation + real schematic pins

This version addresses the two requested changes:

1. **PMOS orientation:** PMOS instances are created with `MX`, which mirrors top/bottom while keeping the gate on the same left/right side. The intended visual result is **PMOS Source on top, Drain on bottom**, opposite to the NMOS orientation.
2. **Real pins:** external terminals are created with the documented `schCreatePin()` interface using the standard `basic/iopin/symbol` pin master.

The `schCreatePin()` signature for Virtuoso 6.1.x is:
`schCreatePin(cv master termName direction offSheet origin orientation)`. 

## Step 1 — Copy to Debian

From Windows CMD:

```cmd
scp "C:\Users\marko\Desktop\telescopic_ota_v4_pmos_pins.il" cadence@192.168.75.216:/home/cadence/
```

## Step 2 — New empty schematic

Open a NEW empty schematic in Virtuoso.

Do not use the previous generated schematic for the first test.

## Step 3 — Load

In CIW:

```skill
load("/home/cadence/telescopic_ota_v4_pmos_pins.il")
```

## Step 4 — Test real pin creation FIRST

Run:

```skill
TOTA_V3_PinTest_20260810()
```

Expected:

```text
TOTA_V3: PIN TEST PASSED -> db:...
```

You should see a real `PIN_TEST` schematic pin.

If this test fails, STOP there and send the complete CIW error. Do not run the OTA generator yet.

## Step 5 — Generate

After the pin test succeeds:

```skill
CreateTelescopicOTA_V3()
```

The generator saves the schematic after creation.

## External pins generated

- `VINP` — input
- `VINN` — input
- `VOUT` — output
- `VDD` — inputOutput
- `VSS` — inputOutput
- `VBN_CAS` — input
- `VBP_CAS` — input
- `VBP` — input
- `VBN_TAIL` — input

Internal nets remain labels only.

## PMOS orientation

M5/M6/M7/M8 use:

```skill
"MX"
```

NMOS M1/M2/M3/M4/M9 use:

```skill
"R0"
```

So the PMOS top/bottom orientation is flipped relative to the NMOS.

## Important

The existing verified wire construction is preserved:

- transformed real pin coordinates
- `schCreateWire`
- `schCreateWireLabel`

The new part is only `schCreatePin` plus the standard `basic/iopin` pin master.

The file was statically checked for balanced parentheses and generated from the previously working V3.1 source. It has not been executed inside your actual Cadence session.
