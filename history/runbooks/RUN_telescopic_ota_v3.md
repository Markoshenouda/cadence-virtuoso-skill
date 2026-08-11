# Run Telescopic OTA V3

## What this file creates

`telescopic_ota_v3.il` builds a nine-transistor, single-ended telescopic OTA in the currently open Virtuoso schematic.

- PDK masters: `tsmcN65/nch` and `tsmcN65/pch`
- Sizes: `M1/M2 = 2u/240n`; `M3/M4 = 4u/480n`; `M5/M6 = 4u/480n`; `M7/M8 = 6u/480n`; `M9 = 6u/480n`
- CDF values: `nf = 1`, `m = 1`
- External labeled nets: `VINP`, `VINN`, `VOUT`, `VDD`, `VSS`, `VBN_CAS`, `VBP_CAS`, `VBP`, `VBN_TAIL`
- Internal labeled nets: `NLEFT`, `NRIGHT`, `NLEFT_CAS`, `NLEFT_LOAD`, `NRIGHT_LOAD`, `TAIL`

The generator uses short wire stubs drawn from actual transformed terminal locations. Equal wire-label names create the intended electrical nets; it does not draw long guessed-coordinate wires.

## Before running

1. Create and open a **new, empty schematic** in your writable design library. Do not create the target schematic inside `tsmcN65`; that library supplies the transistor symbols.
2. Confirm the schematic is editable and does not already contain instances named `M1` through `M9`.
3. Copy `telescopic_ota_v3.il` to the Cadence machine, for example to `/home/cadence/telescopic_ota_v3.il`.

The included `TOTA_V3_CleanupM1toM9(cv)` procedure intentionally does not delete anything. No object-deletion API was verified, so it safely reports existing `M1`–`M9` instances instead of risking deletion of unrelated schematic content.

## Run in the CIW

```skill
load("/home/cadence/telescopic_ota_v3.il")
CreateTelescopicOTA_V3()
```

The procedure returns a list of the nine created transistor instances. Save the open schematic using the normal Virtuoso Save command after you inspect it.

## Expected connectivity

| Net | Connected terminals |
|---|---|
| `VINP` | `M1.G` |
| `VINN` | `M2.G` |
| `TAIL` | `M1.S`, `M2.S`, `M9.D` |
| `NLEFT` | `M1.D`, `M3.S` |
| `NRIGHT` | `M2.D`, `M4.S` |
| `NLEFT_CAS` | `M3.D`, `M5.D` |
| `VOUT` | `M4.D`, `M6.D` |
| `NLEFT_LOAD` | `M5.S`, `M7.D` |
| `NRIGHT_LOAD` | `M6.S`, `M8.D` |
| `VBN_CAS` | `M3.G`, `M4.G` |
| `VBP_CAS` | `M5.G`, `M6.G` |
| `VBP` | `M7.G`, `M8.G` |
| `VBN_TAIL` | `M9.G` |
| `VDD` | `M5.B`, `M6.B`, `M7.S`, `M7.B`, `M8.S`, `M8.B` |
| `VSS` | `M1.B`, `M2.B`, `M3.B`, `M4.B`, `M9.S`, `M9.B` |

## Visual review checklist

1. Verify that `M1`–`M4` are `nch` and `M5`–`M8` are `pch`.
2. Verify the size shown on each MOS instance matches the table above.
3. Verify every `S`, `G`, `B`, and `D` terminal has a short local wire and a label.
4. Verify labels with the same net name appear on every terminal listed in the connectivity table.
5. Run your normal schematic check after saving. This generator does not call unverified check or save APIs.

## Scope and validation

The sizes are a high-DC-gain-oriented starting point, not a guaranteed gain specification. Add the bias generators, supplies, input sources, load, and simulator setup separately, then tune from DC operating points and AC simulation.

The SKILL file has been statically inspected for balanced parentheses, conservative IC6.1.7 syntax, and use of the user-verified pin/wire/label call pattern. It has not been executed in your Cadence session.
