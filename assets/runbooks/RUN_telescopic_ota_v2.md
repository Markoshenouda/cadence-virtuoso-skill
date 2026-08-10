# Telescopic OTA V2 — Run Instructions

## 1. Use a NEW empty schematic

Do not run V2 on the schematic that contains the previous broken OTA.
Create/open a new empty schematic in Virtuoso IC6.1.7.

The generator uses the verified PDK configuration:

- Library: `tsmcN65`
- NMOS: `nch`
- PMOS: `pch`

## 2. Copy the file to Debian

From Windows:

```cmd
scp "C:\Users\marko\Desktop\telescopic_ota_v2.il" cadence@192.168.75.216:/home/cadence/
```

Because passwordless SSH is already configured, it should not ask for a password.

## 3. Load it in Virtuoso CIW

With the NEW schematic open, run:

```skill
load("/home/cadence/telescopic_ota_v2.il")
```

You should see function definitions load without an error.

## 4. Generate the OTA

Run:

```skill
CreateTelescopicOTA_V2()
```

The script will:

1. Place M1-M9.
2. Apply W/L/NF/M through the same CDF method used by the user's working 5T generator.
3. Create short wire stubs at the real symbol pin locations.
4. Add identical net labels to pins that belong to the same electrical net.
5. Run `schCheck`.
6. Save the schematic.

## 5. Expected topology

M1/M2: NMOS differential pair

M3/M4: NMOS cascodes

M5/M6: PMOS cascodes

M7/M8: PMOS current-source loads

M9: NMOS tail current source

External nets:

- `VINP`
- `VINN`
- `VOUT`
- `VDD`
- `VSS`
- `VBN`
- `VBP_CAS`
- `VBP`
- `VBN_TAIL`

The output is the right branch: `VOUT`.

## 6. Why V2 uses labels

The previous version drew long wires using assumed geometry. That produced crossings and ratsnest/unconnected-looking connections.

V2 instead creates a short wire from each actual pin and places the same net label on all pins belonging to that net. Cadence's schematic flow uses wire labels to establish named nets; `schCreateWireLabel` attaches the label to a wire object.

This is intentionally much more robust for this PDK.

## 7. If you see an error

Do not modify the file immediately.

Copy the complete CIW error, including the line/function name, and send it back. The next revision should be based on the exact IC6.1.7 error.

## 8. After the schematic is correct

The next engineering step is not simulation yet.

First verify:

- Every MOS is in the intended topology.
- No unintended shorts.
- M1/M2 sources connect to `TAIL`.
- M3/M4 sources connect to M1/M2 drains.
- M3/M4 drains connect upward.
- M5/M6 drains connect to the NMOS cascode drains.
- M5/M6 sources connect to M7/M8 drains.
- M7/M8 sources connect to VDD.
- M9 source connects to VSS.
- NMOS bulks connect to VSS.
- PMOS bulks connect to VDD.
- VOUT is the right output branch.

Then we can add the bias generator and choose the operating current for the desired gain.

## Useful commands

Reload:

```skill
load("/home/cadence/telescopic_ota_v2.il")
```

Generate:

```skill
CreateTelescopicOTA_V2()
```

Remove only M1-M9 if needed:

```skill
RemoveTelescopicOTADevices()
```

For a completely clean retry, creating a NEW empty schematic is safer because the cleanup helper does not remove old wires and labels.
