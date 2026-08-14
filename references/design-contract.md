# Analog Schematic Design Contract

This contract applies to every newly generated Cadence SKILL artifact.

1. Extract the specification, list known/unknown/assumed/derived values, and ask only blocking missing-spec questions.
2. Present the topology, device/net table, external interface, and bias plan; obtain user confirmation.
3. Produce a TotalW-first sizing summary and obtain a second confirmation before generation.
4. Generate one complete `.il` file, never a partial patch sequence.
5. Every MOS uses `TotalW`, `L`, `NF`, and `M`; derive `W/finger = TotalW/NF`.
6. Explicitly assign and read back `w`, `l`, `wf`, `fingers`, `simM`, `totalM`, `nf`, `m`, with `totalM = NF*M`.
7. Every terminal is connected only by `terminal -> local stub -> net label`. Never create a device-to-device wire.
8. Generate internal bias, supply, and DC input sources with `analogLib/vdc`; do not add redundant bias pins.
9. Place each output `basic/iopin` at the actual corresponding drain-stub endpoint.
10. Deliver the file location plus complete Windows SCP, Cadence `load()`, exact generator invocation, expected CIW markers, and Check & Save instruction.
11. Do not call an artifact verified until the user supplies Cadence evidence. Do not call performance verified without simulation evidence.
