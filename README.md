# Cadence Virtuoso SKILL Design Agent Skill

Reusable SKILL knowledge and reference generators for Cadence Virtuoso IC6.1.7 analog CMOS schematic automation in the verified `tsmcN65` environment.

## Included

### Core Skill

- `SKILL.md` — complete operating instructions for the Cadence SKILL design agent.
- `references/Cadence_SKILL_Design_Agent_Knowledge_Base.md` — verified environment/API knowledge.

### Telescopic OTA

- `assets/generators/telescopic_ota_v4_pmos_pins.il` — final reference generator.
- `assets/runbooks/` — execution/debugging runbooks and historical revisions.

### 5T OTA

- `skills/5t-ota/SKILL.md` — dedicated 5T OTA generation skill.
- `skills/5t-ota/README.md` — scope, topology, and verified primitives.
- `skills/5t-ota/runbooks/RUN_5T_OTA.md` — exact Windows → SSH → CIW workflow and troubleshooting.

## 5T OTA topology

- M1/M2: NMOS differential input pair
- M3/M4: PMOS current-mirror active load
- M5: NMOS tail-current source

## Verified environment

- Cadence Virtuoso IC6.1.7
- TSMC65 library `tsmcN65`
- NMOS `nch`
- PMOS `pch`
- terminals `S/G/B/D`
- CDF fields `w/l/nf/m`

## Core rule

**Preserve the verified infrastructure. Change only topology-specific design data.**

The package distinguishes verified runtime behavior from assumptions. New SKILL APIs should be tested in isolation before being integrated into a full generator.
