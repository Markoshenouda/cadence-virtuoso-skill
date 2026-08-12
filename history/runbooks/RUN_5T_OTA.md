# RUN — 5T OTA

## Environment

Cadence Virtuoso IC6.1.7 / TSMC65, with `tsmcN65/nch/symbol` and `tsmcN65/pch/symbol` available.

## 1. Copy the generator to the VM

From Windows, run `scp` from the Windows terminal, not from inside the Linux SSH session:

```bat
scp "C:\Users\marko\Desktop\5t_ota.il" cadence@192.168.75.216:/home/cadence/
```

If SSH keys are configured, no password prompt should appear.

## 2. SSH into Cadence VM

```bat
ssh cadence@192.168.75.216
```

## 3. Load the generator

Inside the Cadence CIW:

```skill
load("/home/cadence/5t_ota.il")
```

## 4. Run the generator

Use the exact top-level procedure name supplied by the generator, for example:

```skill
Create5TOTA()
```

or the uniquely versioned procedure name used by the current generator.

## 5. Verify visually

Confirm:

- M1/M2 are the differential pair.
- M3/M4 are PMOS active-load devices.
- PMOS source is on the VDD/top side.
- M5 is the centered tail device.
- wires connect the intended transistor terminals.
- VINP, VINN, OUT, VDD, and VSS are actual schematic pins.

## 6. Save

The generator should call `dbSave(cv)`. If necessary, save the schematic manually after inspection.

## Troubleshooting

### `eval: not a function - (pinName == "G")`

The script contains invalid SKILL conditional syntax. Replace the pattern with valid `if`/`cond` logic. Do not write a parenthesized equality as a callable function.

### `plus: can't handle ((x y) + (dx dy))`

Do not add coordinate lists directly. Use:

```skill
list(car(p1) + dx cadr(p1) + dy)
```

### Devices appear but no wires

Test one transformed pin coordinate first. Then test a single `schCreateWire` call. Only after it works should the full wiring routine be enabled.

### Labels appear but pins are missing

Text labels are not sufficient. Use the verified real schematic-pin creation path and ensure the pin is connected to the wire/net.
