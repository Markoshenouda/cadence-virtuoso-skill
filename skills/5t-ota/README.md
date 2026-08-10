# 5T OTA Skill

Dedicated skill for the classic five-transistor CMOS OTA in Cadence Virtuoso IC6.1.7 / TSMC65.

## Topology

- M1/M2: NMOS differential pair
- M3/M4: PMOS current-mirror active load
- M5: NMOS tail current source

## Verified Cadence primitives

The skill preserves the project-tested mechanisms for:

- `geGetEditCellView`
- `dbOpenCellViewByType`
- `dbCreateInst`
- CDF `w/l/nf/m` updates
- `dbFindTermByName`
- `term~>pins` / `pin~>fig`
- `centerBox`
- `dbTransformPoint`
- `schCreateWire`
- real schematic pin creation
- `dbSave`

The skill explicitly guards against the two major SKILL mistakes encountered during development: treating `(pinName == "G")` as a function and trying to add point lists with `+`.

## Scope

This is a reusable generation skill, not a claim that every future 5T sizing or simulation target is already optimized. Device dimensions and floorplan are design parameters and must be changed according to the user's requested target.
