# Analog Design Studio MVP

A local web-based engineering interface around the existing `cadence-virtuoso-skill` repository. The web layer is intentionally configuration-first: repository skills, canonical generators, runbooks and sizing conventions remain the source of truth.

## What is implemented

- Dark, engineering-oriented dashboard.
- New Design wizard: Circuit → Topology → Technology → Specifications → Sizing → Review.
- Repository-backed OTA metadata for 5T OTA, Telescopic OTA V7, and Folded Cascode TotalW V1.
- Generator registry/resolver with explicit artifact status (`verified`, `candidate`, `unverified`).
- Technology metadata for the repository's TSMC N65 platform.
- Specification validation and explicit target/operator/unit fields.
- Repository-compatible sizing model: `TotalW`, `L`, `NF`, `M` for every registered MOS entry.
- SVG topology previews derived from the registered topology model.
- Result screen that distinguishes configuration/generator resolution from actual Cadence execution.
- `POST /api/design/resolve` for metadata-only resolution.
- `POST /api/design/generate` for real repository-source `.il` export.
- Generator adapter that reads the actual repository `.il` source at runtime, adds configuration provenance comments, and returns a downloadable artifact.
- Vitest coverage for circuit selection, generator resolution, validation, status boundaries, and generator-source export.

## Phase 1 completion pass

The Phase 1 audit identified a few gaps and they are now addressed:

- The New Design page no longer presents the repository branch as `main` while working on the MVP branch.
- The sizing screen now exposes a structured MOS list for the selected topology using `TotalW`, `L`, `NF`, and `M`.
- Validation now checks technology, corner, specification operators, device presence, MOS polarity, and all sizing fields.
- The result screen now has a real Generate & Download SKILL action instead of a placeholder button.
- Generator/runbook links point to the actual repository artifacts on the current MVP branch.

## Repository integration

The registry is deliberately thin. It points to existing repository artifacts rather than copying their SKILL code into the web application.

Examples:

```text
5T OTA
  -> canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il

Telescopic OTA
  -> canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il

Folded Cascode OTA
  -> canonical/folded-cascode-ota/Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il
```

The UI never treats a `load()` success or a candidate artifact as performance verification. The repository's own authority map, design contract and runbooks define the actual engineering status.

## Phase 2 generator adapter

The adapter is in `src/lib/generator-adapter.ts`.

```text
Validated DesignConfig
       ↓
Topology / Generator Registry
       ↓
Repository generator path
       ↓
Read actual .il source
       ↓
Prepend configuration provenance comments
       ↓
Download concrete .il artifact
```

The adapter is intentionally conservative. It does **not** rewrite hard-coded device sizing inside the existing generators, because doing so would silently turn the web UI into a second generator implementation and could violate the repository's canonical contracts.

The generated artifact is therefore:

```text
status            = generated
Cadence executed  = false
Spectre executed  = false
```

The configuration is carried as provenance metadata. Parameterized generator synthesis is a later phase after the repository generator contracts are explicitly refactored for parameter injection.

## Sizing contract

The UI exposes the repository design-level interface:

```text
TotalW
L
NF
M
```

It does not ask the user for per-finger `W`. The repository derives `W/finger = TotalW/NF` and requires the complete CDF state including `w`, `l`, `wf`, `fingers`, `simM`, `totalM`, `nf`, and `m`, with `totalM = NF * M`.

## Local setup

```bash
cd web/analog-design-studio
npm install
npm run dev
```

Then open `http://localhost:3000`.

Production build:

```bash
npm run build
npm run start
```

Tests:

```bash
npm test
```

## Adding a new circuit/topology

1. Add a metadata entry to `src/lib/repository-registry.ts`.
2. Point its generator entry to an existing repository path.
3. Add the real runbook path and exact invocation when available.
4. Set the artifact status conservatively.
5. Add or extend validation tests in `src/lib/registry.test.ts`.
6. Add adapter coverage when the new generator path is introduced.
7. Do not copy `.il` generator source into the frontend.

## Architecture

```text
Next.js UI
   ↓
DesignConfig
   ↓
Validation
   ↓
Topology / Generator Registry
   ↓
Repository Generator Adapter
   ↓
Concrete .il export
   ↓
Future Cadence Execution Adapter
   ↓
Future Cadence / Spectre integration
```

## Deliberate boundaries

Not implemented yet:

- real Cadence Virtuoso execution
- parameter injection into the existing canonical `.il` generators
- Spectre simulation
- simulation-result parsing
- AI sizing agent
- optimization loops
- persistent database
- authentication/cloud deployment
- real-time VM control

The generation-result screen therefore reports **generated/resolved**, not **executed in Cadence**.

## Roadmap

### Phase 2 — Generator adapter — implemented
Resolve the exact repository generator and export its real `.il` source with configuration provenance while preserving the canonical source file unchanged.

### Phase 3 — Parameterized generator contracts + Cadence execution
Refactor only where justified so canonical generators can consume an explicit validated design configuration, then add a controlled local execution bridge for the user's Virtuoso environment and surface CIW/Check & Save evidence.

### Phase 4 — Simulation
Add Spectre job submission, result parsing and performance dashboards for gain, GBW, phase margin, slew rate, power, noise, PSRR and CMRR.

### Phase 5 — AI-assisted design
Connect specification analysis, topology selection and transistor sizing skills behind explicit validation/evidence gates.
