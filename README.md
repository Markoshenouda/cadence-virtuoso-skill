# Cadence Virtuoso SKILL Design Agent

Repository for Cadence Virtuoso IC6.1.7 / `tsmcN65` schematic-generation skills, SKILL generators, references, tests, and runbooks.

## Start here

| Purpose | Entry point | Status |
|---|---|---|
| Master rules | `skills/analog-design-agent/SKILL.md` | Current specification-first operating protocol |
| Authority map | `references/repository-authority-map.md` | Definitive conflict and artifact-status ledger |
| MOS sizing contract | `references/TotalW_MOS_Sizing_Convention_20260812.md` | Current verified convention |
| Golden sizing regression | `tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il` | Cadence-verified on 2026-08-12 |
| Latest 5T artifact | `canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il` | Current TotalW-first generator; re-run required after migration |
| PMOS-input `pch_mac/nch_mac` 5T skill | `skills/5t-ota-pmos-mac/SKILL.md` | Reusable PMOS-input methodology; sizing placeholder-only |
| PMOS-input `pch_mac/nch_mac` generator | `canonical/5t-ota/5T_OTA_PMOS_INPUT_MAC_V1_20260814.il` | User-run in live Cadence; electrical performance unverified |
| Canonical Telescopic artifact | `canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813.il` | Registry-current generator: `nch_mac`/`pch_mac`, gm/ID-optimized sizing, numeric-tolerant CDF read-back; live Check & Save run of V8 not yet recorded |
| Telescopic V7 (recorded evidence) | `canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il` | Cadence schematic-generation verified 2026-08-12; superseded by V8 in the registry; retained as the evidence reference |
| Folded Cascode skill | `skills/folded-cascode-ota/SKILL.md` | Current TotalW-first skill |
| Folded Cascode executable | `canonical/folded-cascode-ota/Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il` | Current TotalW-first generator; schematic generation user-confirmed in live Cadence 2026-08-14; electrical performance unverified |
| Folded Cascode legacy reference | `canonical/folded-cascode-ota/Folded_Cascode_OTA_NMOS_FINAL_V9_REFERENCE_TOPOLOGY.il` | Legacy W-first reference only; not TotalW-conformant |
| Current Mirror executable | `canonical/current-mirror/Current_Mirror_NMOS_TotalW_V1_20260817.il` | Simple NMOS mirror (diode-connected M1 + output M2, `tsmcN65/nch`); schematic candidate; not Cadence-verified |

## Repository map

```text
canonical/       Current executable entry points
history/         Preserved historical generators/tests/runbooks
skills/          Reusable AI/Cadence rules
assets/          Compatibility copies; not canonical unless marked current
references/      Knowledge base and sizing conventions
tests/           Cadence regression tests and verification evidence
runbooks/        Stable execution guidance
output/examples/ Screenshots/examples; not executable generators
```

## Repository-wide MOS sizing contract

The AI/design level uses only:

```text
TotalW
L
NF
M
```

The verified tsmcN65 implementation is:

```text
W/finger = TotalW / NF
wf        = TotalW
fingers   = NF
simM      = M
totalM    = NF * M
nf        = NF
m         = M
```

Every MOS must explicitly assign `w`, `l`, `wf`, `fingers`, `simM`, `totalM`, `nf`, and `m`. No sizing field may depend on a default or stale instance state.

## Verification ledger

- **TotalW CDF regression V5, 2026-08-12:** successfully executed in the user's live Cadence IC6.1.7 / tsmcN65 environment. The test verified multiple NF/M combinations and `totalM = fingers * simM` after save.
- **5T PMOS/VDC test, 2026-08-12:** previous successful Cadence run remains recorded in the historical verification material.
- **PMOS-input `pch_mac/nch_mac` 5T, 2026-08-14:** the user ran the generated schematic in live Cadence after SKILL-syntax and CDF read-back fixes. Topology generation, CDF assignment, PMOS orientation checks, stub/label connectivity, VOUT pin, and VDC generation were confirmed in that run. No electrical simulation or performance verification was performed.
- **Telescopic V7, 2026-08-12:** CIW evidence records `SCH-1426` with no schematic-check errors and `SCH-1181` save. That evidence applies to V7 only; operating point and performance remain unverified. V7 is superseded by V8 in the registry but retained as the recorded-evidence reference.
- **Telescopic V8, 2026-08-14:** promoted to the registry-current telescopic generator (`nch_mac`/`pch_mac`, gm/ID-optimized sizing, numeric-tolerant 8-field CDF read-back, ASCII-safe). No live Cadence run of V8 has been recorded yet; do not call it Cadence-verified until one is.
- **Folded Cascode TotalW V1, 2026-08-14:** schematic generation user-confirmed in the live IC6.1.7 / tsmcN65 environment (PDK-aware PMOS auto-placement; the only canonical generator calling `schCheck`). Electrical performance remains unverified.
- **Current Mirror TotalW V1, 2026-08-17:** first non-OTA topology, built through the registry-driven web architecture on the Folded V1 generator pattern (`tsmcN65/nch`). Bridge-run in the live IC6.1.7 / tsmcN65 environment the same day: full `CMW:` marker chain, `ADS_BRIDGE_GENERATOR_DONE`, `CHECK_AND_SAVE=dbSave_completed` (cell `simple-current-mirror_ADS_1786919831087`, library `BGR_ADI`). Schematic-generation mechanics verified; electrical performance unverified.
- **Topology batch, 2026-08-17:** six further TotalW-first generators (Differential Pair; Common-Source, Source Follower, and Cascode amplifiers; Cascode and PMOS current mirrors) integrated through the registry-driven architecture and each bridge-run in the live environment the same day with API status `succeeded`, generator completion, and `CHECK_AND_SAVE=dbSave_completed` evidence. All are schematic candidates; none is electrically verified, and no performance claim is made.
- **Topology expansion batch, 2026-08-17:** 35 new TotalW-first topologies (34 new canonical generators + the PMOS-input `pch_mac/nch_mac` 5T registered as its own topology) across current mirrors/sources, differential stages, common-source/common-gate/cascode amplifiers, followers, OTAs (incl. two-stage Miller, symmetrical, three-stage, fully-differential folded), comparators (incl. StrongARM), and a gm-C integrator. All are schematic candidates with honest per-runbook SIMULATION_READY / SCHEMATIC_ONLY status; none is electrically verified. Resistor-dependent references (Widlar, beta-multiplier, bandgap, PTAT) were deliberately excluded because the repository sizing contract is MOS-only.
- **Spectre simulation infrastructure, 2026-08-17:** netlist-mode Spectre execution added on top of the bridge (registry-driven simulation contracts, deck generation against the PDK `toplevel.scs` corner sections, psfascii measurement extraction, specification evaluation, structured simulation evidence). Pilot results with real simulations: Source Follower **electrically verified** (gain -1.37 dB vs >= -3 dB target PASS, power PASS, slew 227 V/us measured); 5T OTA simulated with honest mixed results (gain 29.9 dB vs 60 dB target FAIL, phase margin 90.2 deg PASS, slew 116.6 V/us PASS); Simple Current Mirror simulated (ratio 1.016 measured); Differential Pair simulated (exact 50/50 tail split). Common-Source and Cascode amplifiers simulate but their default starting biases sit outside the high-gain region; their measured gains are reported honestly as specification failures. No result is ever called verified without simulation evidence.
- **Historical artifacts:** old W-first generators remain preserved and are not presented as current TotalW generators.

## Run a generator

From Windows CMD:

```cmd
scp "C:\Users\marko\Desktop\your_file.il" cadence@192.168.75.217:/home/cadence/
```

In a new empty Cadence schematic:

```skill
load("/home/cadence/your_file.il")
```

Then run the exact procedure documented by the corresponding runbook. Do not call a generator Cadence-verified until the live run is recorded.

For the PMOS-input `pch_mac/nch_mac` 5T generator, load and run:

```skill
load("/home/cadence/5T_OTA_PMOS_INPUT_MAC_V1_20260814.il")
Create5TOTA_PMOSIN_MAC_V1_20260814()
```

For Telescopic V8 use [the V8 runbook](runbooks/RUN_telescopic_ota_v8_20260813.md); the [V7 runbook](runbooks/RUN_telescopic_ota_v7_20260812.md) documents the 2026-08-12 verified run. New designs follow: specification extraction → missing-spec questions → design confirmation → sizing → sizing confirmation → one-shot generator → Cadence execution → verification → canonical promotion.

## Analog Design Studio (web)

`web/analog-design-studio/` is a Next.js application that exposes every registered topology through a browser-based design wizard. The registry (`src/lib/repository-registry.ts`) is the single source of truth — topology IDs, device metadata, generator paths, runbook links, verification status, specification groups, and simulation contracts all flow from there.

### Quick start

```bash
cd web/analog-design-studio
npm install
npm run dev        # http://localhost:3000
npm test           # vitest (71 tests)
npm run typecheck  # tsc --noEmit
npm run build      # next build
```

### Architecture

```text
repository-registry.ts   ← single source of truth (44 topologies, 6 families)
  ├─ topology explorer   (/topologies) — cards derived from circuits[]
  ├─ detail pages        (/topologies/[id]) — topology findTopology(id)
  ├─ design wizard       (/new) — spec-first flow, registry-driven defaults
  ├─ generator contracts  (generator-contract.ts) — auto-derived from registry
  ├─ simulation contracts (simulation-contract.ts) — netlists for 38 sim-ready topologies
  ├─ topology diagrams    (topology-diagram.tsx) — 44 engineering SVGs
  └─ tests               (registry.test.ts, simulation.test.ts, diagram.test.ts)
```

### Topology families (as of 2026-08-18)

| Family | Topologies | Simulation-ready |
|---|---|---|
| OTA | 8 (5T, telescopic, folded-cascode, two-stage Miller, symmetrical, three-stage, current-mirror OTA, fully-diff folded) | 5 of 8 |
| Current Mirror | 12 (simple, cascode NMOS/PMOS, PMOS, Wilson, regulated-cascode, wide-swing, dual-output, complementary, cascode NMOS/PMOS current sources, cascode bias stack) | 12 of 12 |
| Differential Pair | 5 (NMOS, PMOS, PMOS-load, folded, cascode-tail) | 5 of 5 |
| Amplifier | 15 (common-source, diode-load CS, source follower, PMOS follower, super follower, complementary follower, cascode NMOS/PMOS, folded-cascode NMOS/PMOS, common-gate NMOS/PMOS, inverter, TIA, class-AB) | 14 of 15 |
| Comparator | 3 (CMOS, two-stage, StrongARM) | 1 of 3 |
| gm-C | 1 (gm-C integrator) | 0 of 1 |

Six topologies are schematic-only (no simulation metadata): two-stage-miller-ota, three-stage-ota, fully-diff-folded-cascode-ota, class-ab-output-stage, strongarm-comparator, gmc-integrator. Calling `getSimulationContract()` on them throws a clear error.

### Electrical verification

Only topologies with actual Spectre simulation results in the verification ledger are called electrically verified. As of 2026-08-18: Source Follower (gain, power, slew PASS). Other topologies that simulate produce honest measurement reports — specification failures are reported as failures, not hidden.
