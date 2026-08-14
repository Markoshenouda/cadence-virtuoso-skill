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
- `POST /api/design/generate` for parameterized repository-generator export.
- Explicit generator contracts for 5T OTA, Telescopic OTA V7, and Folded Cascode OTA.
- A safe parameterization adapter that changes only exact MOS placement anchors for `TotalW`, `L`, `NF`, and `M` while preserving topology, routing, VDC, pin, and verification code from the canonical source.
- Vitest coverage for circuit selection, generator resolution, validation, contract mapping, derivation rules, all three topology parameterizations, and canonical-source immutability.

## Phase 1 completion pass

The Phase 1 audit identified and addressed several gaps:

- The New Design page reports the active MVP branch instead of `main`.
- The sizing screen exposes a structured MOS list for the selected topology using `TotalW`, `L`, `NF`, and `M`.
- Validation checks technology, corner, specification operators, device presence, MOS polarity, and sizing fields.
- The result screen has a real generator action rather than a placeholder.
- Generator/runbook links point to the repository artifacts on the MVP branch.

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

The UI never treats a candidate artifact as performance verification. The repository's authority map, design contract and runbooks define the actual engineering status.

## Phase 2 — repository generator adapter

Phase 2 established the runtime bridge from a validated `DesignConfig` to the actual repository `.il` source. The canonical file is read at runtime and remains untouched.

```text
Validated DesignConfig
       ↓
Topology / Generator Registry
       ↓
Repository generator path
       ↓
Read canonical .il
       ↓
Configuration provenance
       ↓
Concrete .il artifact
```

## Phase 3 — parameterized generator contracts

Phase 3 adds `src/lib/generator-contract.ts` and upgrades `src/lib/generator-adapter.ts` from source export to controlled parameterization.

Each supported topology now has an explicit contract containing:

```text
Topology
Technology
Canonical source path
Canonical placement procedure
Exact device list + polarity
TotalW / L / NF / M parameter interface
W/finger = TotalW / NF
TotalM = NF × M
```

Current contracts:

```text
5T OTA
  procedure: T5TW_Place
  devices: M1..M5

Telescopic OTA V7
  procedure: TOTA7_PlaceMOS
  devices: M1..M9

Folded Cascode OTA V1
  procedure: FCW_PlaceMOS
  devices: M1..M11
```

### Safe parameterization boundary

The adapter does **not** regenerate the topology and does **not** perform arbitrary numeric substitutions. It only replaces the four quoted sizing arguments on exact, known canonical placement anchors:

```text
<PlacementProcedure>(cv <master> "Mx" <xy> "TotalW" "L" "NF" "M" <orient>)
```

Everything else is preserved from the canonical generator:

- device master selection
- instance names
- placement coordinates
- orientation
- routing helpers
- net labels
- VDC sources
- external pins
- topology logic
- CDF assignment/readback logic
- repository verification logic

The generated artifact contains provenance pointing back to the exact canonical source path. `Cadence execution = false` remains explicit.

### Canonical artifact protection

Phase 3 never writes to `canonical/**`. Tests read the canonical source, generate a parameterized copy in memory, then verify that the source on disk is unchanged and that the generated artifact contains the requested values.

This gives us:

```text
Canonical generator
       │
       │ read-only
       ▼
Parameterized adapter
       │
       ▼
Generated .il
```

rather than maintaining a second handwritten generator in the web application.

## Sizing contract

The UI exposes the repository design-level interface:

```text
TotalW
L
NF
M
```

The adapter derives:

```text
W/finger = TotalW / NF
totalM   = NF × M
```

The canonical generators then assign the complete CDF state:

```text
w
l
wf
fingers
simM
totalM
nf
m
```

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

1. Add the topology metadata to `src/lib/repository-registry.ts`.
2. Point the generator entry to an existing canonical repository path.
3. Add the exact canonical placement procedure and device/polarity contract in `src/lib/generator-contract.ts`.
4. Set the artifact status conservatively.
5. Add validation coverage in `src/lib/registry.test.ts`.
6. Add parameterization coverage in `src/lib/generator-contract.test.ts`.
7. Do not modify canonical `.il` files just to support the web UI.

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
Generator Contract
   ↓
Read-only Canonical .il
   ↓
Exact Placement-Anchor Parameterization
   ↓
Generated .il
   ↓
Future Cadence Execution Adapter
   ↓
Future Spectre integration
```

## Deliberate boundaries

Not implemented yet:

- real Cadence Virtuoso execution
- Spectre simulation
- simulation-result parsing
- AI sizing agent
- optimization loops
- persistent database
- authentication/cloud deployment
- real-time VM control
- parameterization of VDC/bias values from performance specifications
- automatic topology restructuring

The generation-result screen therefore reports **generated/resolved**, not **executed in Cadence**.

## Roadmap

### Phase 1 — configuration-first UI — completed
Wizard, repository metadata, validation, topology previews and sizing contract.

### Phase 2 — generator adapter — completed
Read the exact canonical repository generator and export it without modifying the source.

### Phase 3 — parameterized generator contracts — implemented
Validated `TotalW/L/NF/M` values now flow into exact canonical MOS placement anchors for all three current OTA generators while preserving the canonical files unchanged.

### Phase 4 — Cadence execution
Add a controlled local execution bridge for the user's Virtuoso environment and surface CIW/Check & Save evidence.

### Phase 5 — Simulation
Add Spectre job submission, result parsing and performance dashboards for gain, GBW, phase margin, slew rate, power, noise, PSRR and CMRR.

### Phase 6 — AI-assisted design
Connect specification analysis, topology selection and transistor sizing skills behind explicit validation/evidence gates.
