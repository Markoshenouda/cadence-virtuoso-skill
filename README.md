# Cadence Virtuoso SKILL Design Agent

Repository for Cadence Virtuoso IC6.1.7 / `tsmcN65` schematic-generation skills, SKILL generators, references, tests, and runbooks.

## Start here

| Purpose | Entry point | Status |
|---|---|---|
| Master rules | [`skills/analog-design-agent/SKILL.md`](skills/analog-design-agent/SKILL.md) | Current skill entry point |
| Latest 5T artifact | [`canonical/5t-ota/5T_OTA_PMOS_VDC_RULE_TEST_20260812_FINAL_V2_WITH_VSS.il`](canonical/5t-ota/5T_OTA_PMOS_VDC_RULE_TEST_20260812_FINAL_V2_WITH_VSS.il) | Cadence-run test; see verification note below |
| Latest Telescopic generator | [`canonical/telescopic-ota/telescopic_ota_v4_pmos_pins.il`](canonical/telescopic-ota/telescopic_ota_v4_pmos_pins.il) | Latest working version reported in the conversation; runbook says not executed in the actual session |
| Folded Cascode skill | [`skills/folded-cascode-ota/SKILL.md`](skills/folded-cascode-ota/SKILL.md) | Skill/reference only |
| Folded Cascode latest reference | [`canonical/folded-cascode-ota/Folded_Cascode_OTA_V8_REFERENCE.md`](canonical/folded-cascode-ota/Folded_Cascode_OTA_V8_REFERENCE.md) | V8 reference; no V9 `.il` was available |

## Repository map

```text
canonical/       Clearly named latest/candidate entry points
history/         Copies of every preserved generator, test, and runbook
skills/          Reusable AI/Cadence rules
assets/          Original generator and runbook paths kept for compatibility
references/      Topology and knowledge-base documents
tests/           Cadence regression tests and validation evidence
runbooks/        Stable execution guidance and commands
output/examples/ Screenshots/examples; not executable generators
```

Each area has an index README. The original paths remain intact so existing links and workflows keep working.

## Verification ledger

- **5T PMOS/VDC test, 2026-08-12:** the conversation records a successful Cadence load/run, `SCH-1426` schematic check with no errors, PMOS source-above-drain using actual transformed coordinates (`MY` passed, `MX` failed), VDC-driven nets without redundant external pins, isolated stubs, and explicit 0-V VSS source labels on both terminals.
- **G/B direction:** the same recorded CIW output says `G -> RIGHT` and `B -> UP`. That conflicts with the intended rule that G/B are opposite horizontal directions. This repository records the rule as a required acceptance criterion, not as verified evidence from that run.
- **Telescopic V4:** retained as the latest working generator reported in the conversation. Its runbook explicitly says the pin test/generator had not been executed in the actual Cadence session.
- **Folded Cascode V8:** retained as a reference topology/skill. No executable V8/V9 `.il` was present in the repository or workspace, so none is invented here.

## Latest rules carried forward

- Derive terminal direction from actual transformed pin geometry; do not use the instance bounding box as a direction proxy.
- PMOS orientation is selected by checking actual transformed coordinates so `S.Y > D.Y`; do not assume `MX` universally.
- G and B must be opposite horizontal directions; S and D must be opposite vertical directions. A generator must assert this, and the 2026-08-12 evidence still needs the B-direction rerun.
- Use one short straight isolated stub per MOS terminal. Use repeated net labels for same-net connectivity instead of physical terminal-to-terminal wires.
- VDC-driven nets do not receive redundant external pins. `VOUT` is the user-facing external-pin example.
- A self-contained testbench may use an explicit `analogLib/vdc` at `0 V` with `VSS` labels on both `PLUS` and `MINUS`.

## Run a generator

From Windows CMD, copy the selected `.il` file to Debian:

```cmd
scp "C:\Users\marko\Desktop\your_file.il" cadence@192.168.75.217:/home/cadence/
```

In a new empty Cadence schematic, load it in CIW:

```skill
load("/home/cadence/your_file.il")
```

Then use the exact procedure documented by its runbook. Never call an artifact “Cadence-verified” unless the verification evidence is recorded in `tests/` or its associated README.

## Missing local uploads

The referenced workspace contained no additional `.il` uploads. In particular, the conversation named `Folded_Cascode_OTA_NMOS_FINAL_V9_REFERENCE_TOPOLOGY.il`, `5T_OTA_NMOS_V2_STRAIGHT_FIXED_20260812.il`, `5T_OTA_Generator_FINAL_V3.il`, and `5T_OTA_Generator_PMOS_INPUT_FINAL.il`; their exact contents were unavailable, so they are documented as gaps rather than recreated.
