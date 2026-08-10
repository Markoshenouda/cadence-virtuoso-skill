# Cadence Virtuoso SKILL Design Agent Skill

Reusable skill for generating Cadence Virtuoso IC6.1.7 schematics in the verified `tsmcN65` environment.

## What is included

- `SKILL.md` — complete operating instructions for the AI agent.
- `references/Cadence_SKILL_Design_Agent_Knowledge_Base.md` — detailed verified environment knowledge base.
- `assets/generators/telescopic_ota_v4_pmos_pins.il` — final reference Telescopic OTA generator with PMOS `MX` orientation and real schematic pins.
- `assets/runbooks/RUN_telescopic_ota_v4_pmos_pins.md` — exact run procedure.
- Older V1/V2/V3 generator and runbook revisions for debugging/history.

## Verified environment

- Cadence Virtuoso IC6.1.7
- TSMC65 library `tsmcN65`
- NMOS `nch`
- PMOS `pch`
- terminals `S/G/B/D`
- CDF fields `w/l/nf/m`

## Core rule

**Preserve the verified infrastructure. Change only topology-specific design data.**

## Status

The package preserves the verified Cadence environment knowledge and the generator revisions developed during the project. It distinguishes verified runtime behavior from static/source knowledge and does not claim arbitrary future circuits have been tested.
