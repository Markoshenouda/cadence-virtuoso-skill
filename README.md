# Cadence Virtuoso SKILL Design Agent Skill

Reusable SKILL knowledge and reference generators for Cadence Virtuoso IC6.1.7 analog CMOS schematic automation in the verified `tsmcN65` environment.

## Start here — Master Skill

- `skills/analog-design-agent/SKILL.md` — **spec-first master skill**. An AI using this file must ask for the circuit/design specifications first, confirm a design contract, then generate the `.il` file while preserving the verified Cadence infrastructure.
- `SKILL.md` — original core Cadence SKILL operating instructions.
- `references/Cadence_SKILL_Design_Agent_Knowledge_Base.md` — verified environment/API knowledge.

### Required AI workflow

```text
User asks for a new circuit
        ↓
Ask for complete specifications
        ↓
Confirm design contract
        ↓
Choose topology + sizing strategy
        ↓
Reuse verified SKILL infrastructure
        ↓
Generate .il
        ↓
Load/run in Cadence
        ↓
Validate schematic
```

## Verified construction rules

- Cadence Virtuoso IC6.1.7
- TSMC65 library `tsmcN65`
- NMOS `nch`
- PMOS `pch`
- terminals `S/G/B/D`
- CDF fields `w/l/nf/m`
- NMOS orientation `R0`
- PMOS orientation `MX` when source-top/drain-bottom is required
- real pin geometry through `dbFindTermByName` + `centerBox` + `dbTransformPoint`
- wires through `schCreateWire`
- net labels through `schCreateWireLabel`
- real external pins through `basic/iopin` + `schCreatePin`

### Named-net rule

The tested 5T generators use **short local wire stubs + identical net labels**. They do not physically wire same-net transistor terminals together unless explicitly requested.

For a mirror/diode-connected node:

```text
M3.G → short stub → MIRROR
M3.D → short stub → MIRROR
M1.D → short stub → MIRROR
M4.G → short stub → MIRROR
```

This avoids accidental physical G-D/G-B/D-B connections and keeps the schematic clean.

## Reference designs

### Telescopic OTA

- `assets/generators/telescopic_ota_v4_pmos_pins.il` — final tested reference generator.
- `assets/runbooks/` — execution/debugging runbooks and historical revisions.

### 5T OTA

- `skills/5t-ota/SKILL.md` — dedicated 5T OTA generation skill.
- `skills/5t-ota/README.md` — topology and verified primitives.
- `skills/5t-ota/runbooks/RUN_5T_OTA.md` — Windows → SSH → CIW workflow.
- `skills/analog-design-agent/SKILL.md` — use this one for **new designs**, because it forces the specification interview first and contains both NMOS-input and PMOS-input 5T references.

## 5T OTA reference topologies

### NMOS input

```text
M1/M2 = NMOS differential input pair
M3/M4 = PMOS current-mirror active load
M5    = NMOS tail
```

### PMOS input

```text
M1/M2 = PMOS differential input pair
M3/M4 = NMOS current-mirror active load
M5    = PMOS tail
```

## How to use the skill with another AI

Tell the AI:

> Use the `skills/analog-design-agent/SKILL.md` skill. Before generating any Cadence SKILL file, ask me for all required design specifications and confirm the design contract. Then generate the schematic using the verified `tsmcN65` IC6.1.7 infrastructure and the named-net/short-stub architecture.

## Runtime

From Windows CMD:

```cmd
scp "C:\Users\marko\Desktop\your_file.il" cadence@192.168.75.216:/home/cadence/
```

In Cadence CIW:

```skill
load("/home/cadence/your_file.il")
```

Then run the generator's documented main procedure.

## Quality rule

Do not claim that a design meets Gain, GBW, Slew Rate, DRC, LVS, or simulation targets merely because the SKILL generator ran. Those claims require actual verification in the user's Cadence flow.
