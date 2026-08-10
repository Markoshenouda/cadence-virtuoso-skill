# Cadence Virtuoso SKILL Design Agent Skill

Reusable skill for generating Cadence Virtuoso IC6.1.7 schematics in the verified `tsmcN65` environment.

## Included

- `SKILL.md` — complete operating instructions for the AI agent.
- `references/Cadence_SKILL_Design_Agent_Knowledge_Base.md` — detailed verified environment knowledge base.
- `assets/generators/telescopic_ota_v4_pmos_pins.il` — final Telescopic OTA reference generator with PMOS `MX` orientation and real schematic pins.
- `assets/runbooks/` — V1/V2/V3/V3.1/V3.2/V4 execution and debugging runbooks.
- `.gitignore` — Cadence lock/temp/log exclusions.

The working package used during development also contains earlier generator source revisions; the repository keeps the final reference generator and the revision/runbook documentation as the canonical starting point.

## Verified environment

- Cadence Virtuoso IC6.1.7
- TSMC65 library `tsmcN65`
- NMOS `nch`
- PMOS `pch`
- terminals `S/G/B/D`
- CDF fields `w/l/nf/m`

## Core rule

**Preserve the verified infrastructure. Change only topology-specific design data.**

## Agent behavior

The skill enforces a test-first approach for new SKILL APIs, real transformed terminal coordinates, verified wire/label construction, real schematic pins through `basic/iopin/symbol`, and explicit separation of verified runtime behavior from untested assumptions.
