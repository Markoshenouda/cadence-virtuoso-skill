# PMOS-Input 5T OTA (pch_mac/nch_mac) Skill

Reusable methodology for generating a PMOS-input 5T CMOS OTA schematic in Cadence Virtuoso using `pch_mac`/`nch_mac` devices.

See `SKILL.md` for the complete, section-by-section breakdown of what is implemented/verified vs. placeholder/unverified.

**Read this first:** sizing in this skill is placeholder/starting-value only. It is not derived from and does not meet any gain/GBW/phase-margin/power specification. See `SKILL.md` section 3 before quoting any number from this skill as a performance result.

## Generated artifact this skill documents

```text
5T_OTA_PMOS_INPUT_MAC_V1_20260814.il
```

Generated in a single conversation on 2026-08-14, run successfully by the user in a live Cadence IC6.1.7 session after two rounds of bug fixes (SKILL-syntax parsing errors, then a CDF read-back validation false-failure). Both fixes are documented in `SKILL.md` sections 5.2–5.4.

## What this skill package contains

- `SKILL.md` — the full methodology document, organized to mirror the topics in the repository's other skills (topology, CDF mapping, validation, orientation search, connectivity, pins, VDC, generator structure), with an explicit implemented/assumed/not-verified/needs-more-data breakdown for every section.

## What this skill package does NOT contain

- Any gm/ID, bias-current, gain, GBW, phase-margin, or power calculation.
- Any confirmation that the generated design meets a performance spec.
- Any `pch_mac`/`nch_mac` SPICE model data — this skill documents that such data is required before real sizing is possible (see `SKILL.md` section 3.4) but does not supply it.

## Relationship to the source repository

This skill was built using the source repository's conventions (`skills/analog-design-agent/SKILL.md`, `skills/5t-ota/SKILL.md`, `references/TotalW_MOS_Sizing_Convention_20260812.md`) as the mechanical baseline — CDF field mapping, stub/label architecture, PMOS orientation-search logic all trace back to those documents. It extends them to `pch_mac`/`nch_mac` devices and a PMOS-input variant, and fixes two bugs found in that baseline pattern (SKILL-syntax parsing, CDF read-back comparison) that should be carried back into future use of the repository's own `nch`/`pch` generators as well.
