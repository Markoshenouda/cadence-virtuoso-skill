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
- A local-only Cadence execution bridge with SSH staging, fixed Virtuoso invocation, timeout handling, dry-run mode, log capture, and structured evidence.
- `POST /api/cadence/execute` and `GET /api/cadence/execute` for local bridge execution/health.
- Vitest coverage for circuit selection, generator resolution, validation, contract mapping, derivation rules, all three topology parameterizations, canonical-source immutability, and Cadence bridge safety/evidence behavior.

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

The generated artifact contains provenance pointing back to the exact canonical source path. `Cadence execution = false` remains explicit until Phase 4 is actually enabled and verified.

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

## Phase 4 — Cadence Execution Bridge

Phase 4 adds `src/lib/cadence-bridge.ts` and a local API at `/api/cadence/execute`.

The bridge follows the repository's existing 5T runbook workflow: stage the generated `.il`, load it in Virtuoso, call the repository generator procedure, and require Check & Save verification before simulation. The 5T runbook explicitly uses the `cadence` Linux account and the IC617 environment, and identifies the generator as a candidate until the user actually runs it in Cadence.

The local execution flow is:

```text
Validated DesignConfig
       ↓
Parameterized .il
       ↓
Local bridge
       ↓
SSH / SCP
       ↓
Configured Linux Cadence workspace
       ↓
run.restore.il
       ↓
virtuoso -nograph -restore run.restore.il -log virtuoso.log
       ↓
Generator execution
       ↓
Structured evidence
```

The bridge uses the repository procedure name from the generator contract. It does not accept an arbitrary shell command from the browser.

### Environment configuration

The bridge is disabled by default. For the local machine that can reach the user's Linux VM, configure:

```text
CADENCE_BRIDGE_ENABLED=true
CADENCE_SSH_HOST=<VM reachable IP or hostname>
CADENCE_SSH_USER=cadence
CADENCE_REMOTE_WORKDIR=/home/cadence/Desktop/analog-design-studio-runs
CADENCE_VIRTUOSO_PATH=/usr/local/cadence/IC617/tools/dfII/bin/virtuoso
CADENCE_TIMEOUT_MS=180000
# Optional:
CADENCE_SSH_KEY=<local SSH private-key path>
```

The defaults for `CADENCE_SSH_USER`, `CADENCE_REMOTE_WORKDIR`, and `CADENCE_VIRTUOSO_PATH` match the verified Linux environment supplied for this project. The SSH host is configurable rather than hard-coded into the deployment contract.

The supplied Cadence environment reports:

```text
Virtuoso: IC6.1.7-64b.78
CDS_ROOT: /usr/local/cadence/IC617
Virtuoso: /usr/local/cadence/IC617/tools/dfII/bin/virtuoso
```

### Dry run

Use:

```http
POST /api/cadence/execute
Content-Type: application/json

{
  "config": <DesignConfig>,
  "dryRun": true
}
```

A dry run resolves the real generator and displays the exact intended Virtuoso command and remote paths without invoking SSH, SCP, or Cadence.

### Real execution

After setting `CADENCE_BRIDGE_ENABLED=true` and configuring SSH access:

```http
POST /api/cadence/execute
Content-Type: application/json

{
  "config": <DesignConfig>,
  "dryRun": false
}
```

The bridge stages two files:

```text
<generated>.il
run.restore.il
```

and asks Virtuoso to execute the wrapper. The wrapper loads the generated artifact, invokes the repository generator procedure, emits explicit bridge markers, and exits.

### Execution status semantics

```text
succeeded
  = process exit 0
  + bridge start marker
  + generator completion marker
  + no detected Cadence error

failed
  = staging/process/evidence failure

timeout
  = configured execution timeout reached

dry-run
  = no Cadence process was started

disabled
  = bridge is not enabled
```

A zero process exit code alone is **not** sufficient to claim a successful design generation.

### Check & Save boundary

The bridge emits a `CHECK_AND_SAVE_REQUIRED` marker and parses logs for Check & Save evidence, but it does not falsely claim that a GUI Check & Save was performed when no such evidence exists. This distinction is intentional because the 5T runbook requires Check and Save before simulation.

### Security / execution boundary

- The bridge is local-only by design.
- The browser cannot provide arbitrary shell commands.
- Host, user, executable, and remote paths are validated.
- The remote command is assembled from fixed adapter arguments.
- Canonical `.il` files remain read-only.
- Generated artifacts are staged separately.
- SSH/SCP failures are returned as failed execution, not success.
- Timeouts are explicit.
- CI never invokes Cadence.
- Spectre execution remains disabled in Phase 4.

### Current Phase 4 limitation

The repository and web bridge now contain the execution adapter, but Cadence execution is not marked verified until the configured bridge is actually run against the user's Linux VM and the resulting Virtuoso evidence is inspected. The provided Linux shell confirms the Virtuoso executable and version, but this development environment cannot itself certify the VM-side run.

## Local setup

```bash
cd web/analog-design-studio
npm install
npm run dev
```

Then open `http://localhost:3000`.

For a server that should only be reachable locally while the Cadence bridge is enabled, bind Next.js to localhost when starting it.

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
7. Add bridge coverage in `src/lib/cadence-bridge.test.ts`.
8. Do not modify canonical `.il` files just to support the web UI.

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
Local Cadence Execution Bridge
   ↓
SSH/SCP → Linux VM
   ↓
Virtuoso IC6.1.7
   ↓
CIW / log evidence
   ↓
Future Spectre integration
```

## Deliberate boundaries

Not implemented yet:

- Spectre simulation
- simulation-result parsing
- AI sizing agent
- optimization loops
- persistent database
- authentication/cloud deployment
- real-time VM desktop control
- automatic topology restructuring
- automatic GUI Check & Save confirmation when the run is headless
- parameterization of VDC/bias values from performance specifications

Phase 4 does implement the controlled local Cadence process bridge, but actual execution remains an environment-level verification step.

## Roadmap

### Phase 1 — configuration-first UI — completed
Wizard, repository metadata, validation, topology previews and sizing contract.

### Phase 2 — generator adapter — completed
Read the exact canonical repository generator and export it without modifying the source.

### Phase 3 — parameterized generator contracts — completed
Validated `TotalW/L/NF/M` values now flow into exact canonical MOS placement anchors for all three current OTA generators while preserving the canonical files unchanged.

### Phase 4 — Cadence execution — implemented, environment verification pending
Controlled local SSH/SCP staging, fixed Virtuoso invocation, timeout/error handling, dry-run support, and structured evidence capture.

### Phase 5 — Simulation
Add Spectre job submission, result parsing and performance dashboards for gain, GBW, phase margin, slew rate, power, noise, PSRR and CMRR.

### Phase 6 — AI-assisted design
Connect specification analysis, topology selection and transistor sizing skills behind explicit validation/evidence gates.
