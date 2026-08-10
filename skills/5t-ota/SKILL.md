---
name: cadence-5t-ota
version: 1.0.0
description: Generate and modify a 5-transistor CMOS OTA schematic in Cadence Virtuoso IC6.1.7 using the verified tsmcN65 SKILL infrastructure. Preserve the proven device creation, CDF sizing, transformed-pin, wiring, and real schematic pin/label mechanisms; change only topology-specific data.
---

# 5T OTA Design Skill

## Mission

When the user requests a 5T OTA, create or modify the schematic using the verified Cadence Virtuoso IC6.1.7 / TSMC65 workflow established in this project.

The canonical topology is the classic five-transistor OTA:

- M1/M2: NMOS differential input pair.
- M3/M4: PMOS current-mirror active load.
- M5: NMOS tail-current source.

Do not replace the verified schematic-generation infrastructure with guessed APIs.

## Verified environment

- Virtuoso IC6.1.7
- PDK library: `tsmcN65`
- NMOS master: `tsmcN65/nch/symbol`
- PMOS master: `tsmcN65/pch/symbol`
- Device terminals: `S`, `G`, `B`, `D`
- Device CDF parameters: `w`, `l`, `nf`, `m`

## Mandatory rules

1. Reuse the known-working helper pattern instead of inventing new APIs.
2. Always obtain the current schematic with `geGetEditCellView()`.
3. Create devices with `dbOpenCellViewByType(... "symbol" ... "r")` and `dbCreateInst`.
4. Set W/L/NF/M through the instance CDF.
5. Never use SKILL syntax such as `(pinName == "G")` as though it were a function. SKILL conditionals must use valid language constructs such as `if`/`cond` comparisons.
6. Never assume a pin is at a hard-coded coordinate. Read the master terminal, obtain its pin figure/bBox, compute the center, then transform the point with `dbTransformPoint(... inst~>transform)`.
7. For arithmetic on points, use `list(car(p)+dx cadr(p)+dy)` rather than `p + list(...)`.
8. Create wires with the verified `schCreateWire` calling convention used by the project.
9. Use real schematic pins for top-level ports. Do not fake ports by drawing arbitrary wire ends or text.
10. PMOS orientation matters: for the canonical 5T OTA, orient the PMOS so its source is at the upper supply side and drain is below toward the output/mirror node. Preserve the verified orientation string from the working generator/reference.
11. After generation, save with `dbSave(cv)`.
12. Do not claim simulation, connectivity, or LVS correctness unless it was actually verified in Cadence.

## Canonical topology connectivity

Use these logical connections unless the user explicitly requests a different 5T topology:

- M1 source -> tail node.
- M2 source -> tail node.
- M5 drain -> tail node.
- M5 source -> VSS.
- M1 gate -> VINP.
- M2 gate -> VINN.
- M1 drain -> left mirror node.
- M3 drain -> left mirror node.
- M3 gate -> left mirror node.
- M4 gate -> left mirror node.
- M2 drain -> OUT.
- M4 drain -> OUT.
- M3 source -> VDD.
- M4 source -> VDD.
- Body connections follow the PDK's intended biasing convention; do not invent a body connection if the user's device symbol/PDK setup has a different verified convention.

## Recommended naming

Use stable instance names `M1` ... `M5`. Avoid relying on automatically generated names such as `M0`, `M1`, etc. when the script can explicitly assign names.

Top-level net labels/pins should normally be:

- `VINP`
- `VINN`
- `OUT`
- `VDD`
- `VSS`

The exact pin placement can change with the topology/floorplan, but the electrical net names should remain explicit.

## Sizing

Sizing is design data, not infrastructure. If the user specifies W/L, use those values exactly. If no values are given, select reasonable starting values and clearly mark them as starting values rather than verified optimum sizing.

A useful parameter block is:

- `Wn_in`, `Ln_in` for M1/M2
- `Wp_load`, `Lp_load` for M3/M4
- `Wn_tail`, `Ln_tail` for M5
- `NF_*` and `M_*` when needed

Never silently change the user's dimensions.

## Placement strategy

Use a clean, readable structure:

- M1/M2 side-by-side at the lower-middle level.
- M3/M4 directly above M1/M2.
- M5 centered below M1/M2.
- Keep the mirror node and output node visually distinct.
- Keep VDD above the PMOS pair and VSS below M5.
- Keep input pins on the left/right or another explicit location that makes differential polarity obvious.

The exact coordinates are topology-specific data and can be changed without changing the infrastructure.

## Safe pin-coordinate algorithm

For an instance `inst` and terminal name `pinName`:

1. `term = dbFindTermByName(inst~>master pinName)`.
2. `pin = car(term~>pins)`.
3. `fig = pin~>fig`.
4. `masterXY = centerBox(fig~>bBox)`.
5. `instXY = dbTransformPoint(masterXY inst~>transform)`.

If a terminal has multiple pin figures, inspect them and choose the figure appropriate to the symbol connection rather than blindly assuming the first entry.

## Wiring algorithm

For every required connection:

1. Obtain the transformed pin coordinates of the two endpoints.
2. Build a Manhattan path explicitly as a list of points.
3. Call the verified `schCreateWire` API.
4. Check the returned wire object.
5. Do not use arbitrary graphical lines as substitutes for schematic wires.

For example, point arithmetic must look like:

```skill
p2 = list(car(p1) + 1.0 cadr(p1))
```

not:

```skill
p2 = p1 + list(1.0 0.0)
```

## Pin creation

Create actual schematic pins/ports using the verified schematic API available in the reference generator. The pin must have:

- an explicit net/terminal name,
- a valid direction when supported,
- a pin figure attached to the terminal,
- connectivity to the corresponding schematic wire.

Do not use only `schCreateLabel` to represent a top-level port.

## Debugging protocol

When a script fails:

1. Stop changing multiple subsystems at once.
2. Identify whether the failure is device creation, CDF sizing, pin coordinate extraction, wire creation, or pin/label creation.
3. Test the smallest API call in isolation.
4. Record the exact returned object/error.
5. Only after the primitive works, integrate it into the generator.

Known project failures that must not be repeated:

- `eval: not a function - (pinName == "G")` — caused by invalid SKILL expression syntax.
- `plus: can't handle ((x y) + (dx dy))` — point lists are not directly added with `+` in the used environment.
- `schCreateLabel` is not a substitute for actual schematic pins.
- Hard-coded pin coordinates are unsafe because symbol geometry and instance transforms matter.

## Generation workflow

1. Open the target schematic cell.
2. Load the generator with `load("/path/to/generator.il")`.
3. Run the uniquely named top-level procedure.
4. Inspect device count and placement.
5. Inspect PMOS orientation and source/drain direction visually.
6. Inspect every electrical wire.
7. Inspect actual pins and their names.
8. Save.
9. Only then proceed to simulation or further automation.

## Modification workflow

When asked for another OTA design:

- Keep the helper functions and proven API calls.
- Keep terminal discovery and coordinate transformation logic.
- Keep the wire and real-pin creation mechanisms.
- Change only transistor count/topology, instance names, coordinates, dimensions, and requested labels.
- If the new topology needs an API not already verified, test that API separately before putting it into the full generator.

## Output quality bar

A successful 5T OTA generator is not merely five transistor symbols. It must produce a readable schematic with:

- five correctly oriented MOS devices,
- correct W/L/NF/M values,
- correct electrical connectivity,
- actual schematic pins for VINP, VINN, OUT, VDD, and VSS,
- meaningful net labels where appropriate,
- saved database state,
- no dependence on stale function definitions when possible.

## Reference files

Use the files under `references/`, `generators/`, and `runbooks/` in this directory as the canonical project examples. Prefer the latest verified generator over historical revisions, but keep older revisions for debugging provenance.
