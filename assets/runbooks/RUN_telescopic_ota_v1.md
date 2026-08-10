# Running telescopic_ota.il in Cadence Virtuoso

## 1. Put the file somewhere visible to the Cadence Linux VM

Copy `telescopic_ota.il` into a directory accessible from the Cadence environment, for example:

```text
/home/cadence/skill/telescopic_ota.il
```

## 2. Edit the PDK configuration

At the top of the file, change:

```skill
(setq TO_PDK_LIB       "YOUR_PDK_LIBRARY")
(setq TO_NMOS_CELL     "nmos")
(setq TO_PMOS_CELL     "pmos")
(setq TO_DES_LIB       "OTA_DESIGN")
(setq TO_DES_CELL      "telescopic_ota")
```

For your actual PDK, the NMOS/PMOS symbol master names must match the PDK exactly.

Also make sure `OTA_DESIGN` already exists as a Cadence library.

## 3. Start Virtuoso

Open the Cadence Virtuoso environment normally.

The easiest execution method is through the CIW.

In the Virtuoso CIW enter:

```skill
load("/home/cadence/skill/telescopic_ota.il")
```

Then execute:

```skill
TO_createTelescopicOTA()
```

## 4. What the script is intended to generate

The topology is a single-ended-output telescopic OTA with:

- M1/M2: NMOS differential input pair
- M3/M4: NMOS cascode devices
- M5/M6: PMOS cascode/load devices
- M7/M8: PMOS top load/current-source devices
- M9: NMOS tail current source
- BIASN: NMOS cascode bias
- BIASP: PMOS cascode bias
- VINP / VINN: differential inputs
- VOUT: single-ended output

The longer channel lengths are intentional because channel-length increase generally improves intrinsic gain `gm*r_o`, which is important for high DC gain.

## 5. Important PDK-specific point

The file is a generator/template rather than a guaranteed drop-in for every PDK.

Different Cadence PDKs expose transistor parameters differently. If your PDK does not accept:

```skill
dbReplaceProp(inst "w" "float" ...)
dbReplaceProp(inst "l" "float" ...)
```

use the exact CDF parameter names from the transistor symbol.

Also, symbol pin coordinates differ between PDKs. The topology and placement are therefore separated from the PDK-specific master names and pin geometry.

## 6. First debug step

If `load()` itself fails, the problem is SKILL syntax/environment.

If `load()` succeeds but `TO_createTelescopicOTA()` fails while opening a transistor master, the problem is the PDK library/cell/view names.

If instances appear but wires are misplaced, the problem is the PDK symbol pin geometry and the generic wire coordinates need to be adapted to that PDK.

## 7. Recommended high-gain design direction

For a real high-gain telescopic OTA, do not optimize only W/L.

A better sequence is:

1. Choose the required DC gain.
2. Choose current and overdrive `Vov`.
3. Use longer `L` for the cascode devices.
4. Size input devices for the required `gm`.
5. Set the tail current.
6. Generate proper `BIASN` and `BIASP`.
7. Run DC operating point.
8. Verify every transistor is in saturation.
9. Run AC analysis and extract DC gain, GBW and phase margin.
10. Iterate the W/L and bias currents.

A useful first target for a 65-nm-class OTA is to start with `L` several times the minimum length on the gain-critical devices, then sweep `L` and bias current rather than assuming one fixed W/L is optimal.
