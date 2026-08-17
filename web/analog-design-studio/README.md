# Analog Design Studio MVP

A local web-based engineering interface around the existing `cadence-virtuoso-skill` repository. The web layer is configuration-first: repository skills, canonical generators, runbooks and sizing conventions remain the source of truth.

## Implemented

- Dark engineering-oriented dashboard.
- New Design wizard: Circuit → Topology → Technology → Specifications → Sizing → Review.
- Repository-backed 5T OTA, Telescopic OTA V7 and Folded Cascode OTA metadata.
- Explicit generator contracts using `TotalW`, `L`, `NF`, `M`.
- Safe parameterization of exact canonical MOS placement anchors.
- Canonical generator preservation.
- `POST /api/design/resolve` and `POST /api/design/generate`.
- Local Cadence bridge at `POST/GET /api/cadence/execute`.
- Dry-run, SSH/SCP staging, fixed Virtuoso invocation, timeout handling and structured evidence.
- Vitest coverage for registry, validation, contracts, parameterization and bridge safety.

## Repository integration

The registry points to existing repository artifacts instead of copying SKILL knowledge into the frontend:

```text
5T OTA
  canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il
  invocation: Create5TOTA_PMOS_TOTALW_V2_20260812()

Telescopic OTA V7
  canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il
  invocation: CreateTelescopicOTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812()

Folded Cascode OTA V1
  canonical/folded-cascode-ota/Folded_Cascode_OTA_NMOS_TotalW_V1_20260814.il
  invocation: CreateFoldedCascodeOTA_NMOS_TotalW_V1_20260814()
```

Candidate/verified status remains the repository's status. Web execution does not silently upgrade candidate generators to verified.

## Phase 3 — parameterized generator contracts

Each topology has an explicit contract containing:

```text
Topology
Technology
Canonical source path
Canonical placement procedure
Exact device list + polarity
TotalW / L / NF / M
W/finger = TotalW / NF
TotalM = NF × M
```

The adapter only changes the four quoted sizing arguments on exact known placement anchors. Topology, routing, VDC, pins, instance names, coordinates, orientation and repository CDF logic remain sourced from the canonical generator.

Canonical files are never written by the web generator.

## Phase 4 — Cadence Execution Bridge

Phase 4 connects a validated generated `.il` artifact to the user's **local Linux Cadence VM** through SSH/SCP.

The verified environment supplied for this project is:

```text
SSH host:       192.168.75.219
SSH user:       cadence
HOME:           /home/cadence
DISPLAY:        :0
Virtuoso:       /usr/local/cadence/IC617/tools/dfII/bin/virtuoso
Virtuoso -W:    IC6.1.7-64b.78
CDS_ROOT:       /usr/local/cadence/IC617
Library:        BGR_ADI
```

The current runbook used as the reference for the 5T generator loads the `.il` in CIW and calls the repository procedure. The generator itself uses `geGetEditCellView()`, so Phase 4 deliberately uses a **graphical Virtuoso session** with `DISPLAY=:0`; it does not use `-nograph` for the actual generator run.

The execution flow is:

```text
Web DesignConfig
      ↓
Validation
      ↓
Parameterized .il
      ↓
Local Cadence Bridge
      ↓
SSH / SCP
      ↓
/home/cadence/Desktop/analog-design-studio-runs/<run>
      ↓
run.restore.il
      ↓
Virtuoso IC6.1.7 with DISPLAY=:0
      ↓
Create target schematic cell
      ↓
Open editable schematic window
      ↓
load(parameterized .il)
      ↓
repository generator invocation
      ↓
dbSave
      ↓
evidence.txt + Virtuoso log
```

The bridge uses the invocation from the generator contract. The browser cannot supply an arbitrary shell command.

### Why the bridge opens a fresh target cell

The current canonical generators expect an empty editable schematic context through `geGetEditCellView()`. Phase 4 therefore creates a unique target cell under the configured library and opens it graphically before invoking the generator. This avoids overwriting an existing design and avoids relying on whatever cell happens to be open in a user's desktop session.

### Environment

Copy `.env.example` to `.env.local` for local use. The supplied environment is represented as:

```text
ADS_REPO_ROOT=<optional absolute path to the cadence-virtuoso-skill repository root>
CADENCE_BRIDGE_ENABLED=false
CADENCE_SSH_HOST=192.168.75.219
CADENCE_SSH_USER=cadence
CADENCE_REMOTE_WORKDIR=/home/cadence/Desktop/analog-design-studio-runs
CADENCE_ROOT=/usr/local/cadence/IC617
CADENCE_VIRTUOSO_PATH=/usr/local/cadence/IC617/tools/dfII/bin/virtuoso
CADENCE_DISPLAY=:0
CADENCE_LIBRARY=BGR_ADI
CADENCE_TIMEOUT_MS=180000
```

`ADS_REPO_ROOT` overrides where the app resolves canonical generators and runbooks. When unset, the app falls back to two directories above its working directory (the standard `web/analog-design-studio` checkout layout), so normal local development needs no configuration.

Set `CADENCE_BRIDGE_ENABLED=true` only when the Next.js server is running on the trusted local machine that can SSH to the VM. `BatchMode=yes` is used, so password prompts are not accepted; use an SSH key/agent when required.

### Health check

```http
GET /api/cadence/execute
```

The endpoint checks whether the configured bridge is enabled and whether the remote Virtuoso executable is reachable/executable.

### Dry run

```http
POST /api/cadence/execute
Content-Type: application/json

{
  "config": <DesignConfig>,
  "dryRun": true
}
```

Dry-run performs no SSH, SCP or Virtuoso execution. It resolves the real generator and returns the intended remote artifact/wrapper paths and command.

### Real execution

```http
POST /api/cadence/execute
Content-Type: application/json

{
  "config": <DesignConfig>,
  "dryRun": false
}
```

The bridge stages:

```text
<generated>.il
run.restore.il
```

The restore script creates/opens a unique schematic cell, makes it the current editable window, loads the generated artifact, calls the exact repository generator procedure, saves the cellview, writes explicit evidence markers, and exits Virtuoso.

### Evidence semantics

The bridge reports `succeeded` only when all of these are true:

```text
Virtuoso process exited with code 0
ADS_BRIDGE_START marker present
ADS_BRIDGE_GENERATOR_DONE marker present
ADS_BRIDGE_CHECK_AND_SAVE_CONFIRMED marker present
no detected fatal/error marker
```

A zero exit code by itself is not enough.

The evidence explicitly records `dbSave_completed`. It is **not** presented as a full GUI Check & Save dialog result. If the repository generator performs its own `dbSave`, that is the evidence captured by this bridge. Full schematic Check & Save automation remains a later refinement if required.

### Security boundary

- Local bridge only.
- No arbitrary shell command from browser input.
- Host, user, executable, library and remote paths are validated.
- Canonical `.il` files remain read-only.
- Generated artifacts are staged separately.
- SSH/SCP failures are failures, never success.
- Execution timeout is explicit.
- CI never invokes Cadence.
- Spectre remains disabled.

## API status

```text
disabled
  bridge not enabled

dry-run
  no remote process started

succeeded
  Virtuoso exited + generator/evidence markers confirmed

failed
  staging, process, Cadence, or evidence failure

timeout
  execution exceeded configured timeout
```

## Local setup

```bash
cd web/analog-design-studio
npm install
npm run dev
```

Then open `http://localhost:3000`.

For production:

```bash
npm run build
npm run start
```

For tests:

```bash
npm test
```

CI tests the bridge logic only; it never starts Cadence.

## Spectre simulation (netlist mode)

`POST /api/simulation/run` generates a standalone Spectre deck from registry simulation metadata (netlists mirror the canonical generator label tables), stages it on the VM, runs netlist-mode Spectre (`dcop`/`ac`/`tran` per profile), parses psfascii results, extracts measurements, and evaluates the enabled specifications. Every stage is reported separately (`deckGenerated`, `staged`, `launched`, `analysesCompleted`, `measurementsExtracted`, `specEvaluationCompleted`, `specsPassed`); `electrically-verified` requires simulation completion plus passing measured specs. Schematic generation alone is never electrical verification, and a `specs-failed` result stays distinct from `sim-failed`.

Environment additions: `CADENCE_SPECTRE_BIN`, `CADENCE_SPECTRE_LD_LIBRARY_PATH`, `CADENCE_SPECTRE_MODEL` (defaults target the verified VM: MMSIM 14.10 64-bit and the TSMC CRN65LP `models/spectre/toplevel.scs` with `tt_lib`/`ss_lib`/`ff_lib` corner sections). Simulation profiles live in `src/lib/simulation/simulation-contract.ts`; topology netlists/bias sets live in the registry `simulation` metadata.

## Adding a new topology

The repository registry (`src/lib/repository-registry.ts`) is the single source of truth; contracts, the wizard, diagrams, and spec forms all derive from it.

1. Add the topology to `src/lib/repository-registry.ts`: metadata, `generator` entry (path/runbook/invocation/status), `contract` (placement procedure, per-device list with polarity and `defaultSizing`), and a `diagram` key.
2. Point the generator entry at an existing canonical generator; add its runbook. The registry/contract integrity tests fail if the files do not exist on disk.
3. Generator contracts in `src/lib/generator-contract.ts` are derived automatically — no per-topology edits there.
4. Keep artifact status conservative; never mark `verified` without recorded repository evidence.
5. Add the diagram under the registered key in `src/components/topology-diagram.tsx` (unknown keys render an explicit placeholder).
6. Add contract/parameterization tests; the registry consistency tests enforce device counts, sizing defaults, and contract/registry agreement.
7. Do not modify canonical `.il` files merely to support the web application.

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
SSH/SCP → Linux VM 192.168.75.219
   ↓
Virtuoso IC6.1.7 GUI DISPLAY=:0
   ↓
Editable schematic
   ↓
Generator + dbSave
   ↓
Evidence
   ↓
Future Spectre integration
```

## Current limitations

- Actual Cadence execution is implemented but still requires a real run on the supplied VM before this project can call it Cadence-verified.
- Full GUI Check & Save result parsing is not yet implemented; the bridge captures generator completion and `dbSave` evidence.
- Spectre simulation is not implemented.
- Simulation-result parsing is not implemented.
- AI sizing and optimization are not implemented.
- No persistent database/authentication/cloud deployment.
- No automatic VM desktop-control protocol.
- VDC/bias targets are not yet parameterized from performance specifications.

## Roadmap

### Phase 1 — configuration-first UI
Completed.

### Phase 2 — generator adapter
Completed.

### Phase 3 — parameterized generator contracts
Completed for the three current OTA generators.

### Phase 4 — Cadence execution
Implemented; VM-side execution/evidence verification pending.

### Phase 5 — Spectre simulation
Submit simulations, parse gain/GBW/phase margin/slew/power/noise/PSRR/CMRR and display results.

### Phase 6 — AI-assisted design
Use the repository's design skills and contracts for topology selection, sizing and optimization behind explicit validation/evidence gates.
