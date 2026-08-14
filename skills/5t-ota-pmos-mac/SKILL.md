---
name: 5t-ota-pmos-mac
version: 1.0.0
description: Reusable methodology and generator architecture for a PMOS-input 5T CMOS OTA in Cadence Virtuoso using pch_mac/nch_mac devices, with TotalW-first CDF assignment, numeric-tolerant read-back validation, and PMOS source-top orientation search. Sizing is placeholder/starting-value only — this skill does NOT perform gm/ID, bias-current, or performance-target sizing. Read section 3 before claiming any performance result.
status: partially verified — see section headers below for exactly what is and is not proven
provenance: derived from a single conversation (2026-08-14) generating /mnt/user-data/outputs/5T_OTA_PMOS_INPUT_MAC_V1_20260814.il; not yet run end-to-end in a live Cadence session by the assistant — see section 3.3
---

# PMOS-Input 5T OTA — pch_mac/nch_mac — Reusable Skill v1.0

## 0. How to use this skill

This document is a starting methodology for future 5T OTA generation requests, not a finished, spec-verified design procedure. Read section 3 (sizing) before doing anything else — it is the most important section, because it defines the boundary between what this skill can do reliably (topology, connectivity, CDF mechanics) and what it explicitly cannot do yet (translate a gain/GBW/PM/power spec into real transistor sizes for `pch_mac`/`nch_mac`).

When a future request comes in as "design a 5T OTA with spec X", this skill should be used to:
1. Immediately confirm topology and input-pair choice (section 1) — fast, no new info needed.
2. Reuse the CDF-assignment, validation, orientation-search, and stub/label/pin/VDC generation code patterns (sections 4–9) as-is — these are implemented and were exercised in a live Cadence session.
3. Stop and tell the user explicitly that sizing will be placeholder-only (section 3) unless real device data (section 3.4) has been supplied since this skill was written.

Do not silently upgrade placeholder sizing to "calculated" sizing in a future run without new device data. If this happens, it is a violation of this skill's intent.

---

## 1. Topology selection logic

### 1.1 Why 5T (not folded-cascode or telescopic)

The user asked for "a standard 5T CMOS OTA." No selection logic was applied beyond taking the user's explicit topology name at face value. This skill does not contain a rule for choosing 5T vs. folded-cascode vs. telescopic from a performance spec — the user must name the topology, or a future version of this skill must add that decision logic (not present today).

### 1.2 Canonical 5T device roles (from the repository's `skills/5t-ota/SKILL.md` and `skills/analog-design-agent/SKILL.md`)

```text
M1/M2 = differential input pair
M3/M4 = mirror / active load
M5    = tail current source
VOUT  = single-ended, at the input-pair's non-mirrored drain
```

### 1.3 How input-pair type (NMOS vs. PMOS) was decided

Not derived from the spec. The user was asked directly ("NMOS input pair" vs. "PMOS input pair") via a clarifying question, and chose PMOS. This skill does not contain logic for inferring input-pair type from ICMR, supply headroom, or noise requirements — that decision was, and should continue to be, made explicitly by the user or asked for explicitly if not given.

### 1.4 Net map used (PMOS-input variant, as generated)

This is the repository's canonical NMOS-input net map with polarity mirrored (mirror moved from PMOS to NMOS, tail moved from NMOS to PMOS, supply references swapped):

```text
M1.G -> VINP        M2.G -> VINN
M1.D -> MIRROR      M3.D -> MIRROR   M3.G -> MIRROR   M4.G -> MIRROR
M2.D -> VOUT        M4.D -> VOUT
M1.S -> TAIL        M2.S -> TAIL     M5.D -> TAIL
M5.G -> VBP_TAIL    M5.S -> VDD      M5.B -> VDD
M1.B -> VDD         M2.B -> VDD
M3.S -> VSS         M4.S -> VSS      M3.B -> VSS      M4.B -> VSS
```

Device roles: M1/M2 = PMOS input pair (`pch_mac`), M3/M4 = NMOS mirror load (`nch_mac`), M5 = PMOS tail source (`pch_mac`).

**Status: implemented and generated successfully in Cadence** (device placement, CDF assignment, and orientation checks all completed without error on the user's live run). Electrical correctness of the topology (that it actually functions as a valid 5T OTA) was not independently simulated or verified in this conversation — only schematic-generation mechanics were confirmed to execute.

---

## 2. Device mapping: `pch_mac` / `nch_mac`

### 2.1 What was actually done

The repository's verified generators use `tsmcN65/nch/symbol` and `tsmcN65/pch/symbol`. Neither `pch_mac` nor `nch_mac` appears anywhere in the source repository — no SKILL.md, reference doc, generator, or test mentions these cellnames.

The generator was written to open these masters directly by literal cellname:

```skill
setq(T5TW_NCH "nch_mac")
setq(T5TW_PCH "pch_mac")
...
nmos = dbOpenCellViewByType(T5TW_LIB T5TW_NCH "symbol" "" "r")
pmos = dbOpenCellViewByType(T5TW_LIB T5TW_PCH "symbol" "" "r")
```

with an explicit `unless(nmos error(...))` / `unless(pmos error(...))` guard so the script fails loudly if the library/cellname/view combination does not resolve, rather than silently proceeding with a null master.

### 2.2 Assumption made, and what confirmed it

**Assumption:** `pch_mac`/`nch_mac` expose the same CDF parameter names as `pch`/`nch` — specifically `w`, `l`, `wf`, `fingers`, `simM`, `totalM`, `nf`, `m`.

This assumption was **not verified by inspection** before code was written (no live CDF browse of `pch_mac`/`nch_mac` was performed). It was verified indirectly, after the fact, by the generator's own mandatory field-existence guards (section 4.2) executing without error and the read-back validation (section 5) ultimately succeeding on the user's real Cadence run, for the fields exercised by this specific 5T topology (`w`, `l`, `wf`, `fingers`, `simM`, `totalM`, `nf`, `m`).

**Status: confirmed true for this specific field set, on the user's live Cadence environment, for this one generation run.** Not confirmed for any CDF field this generator doesn't touch (e.g. any `_mac`-specific parameters, corner/model-selection fields, or layout-specific CDF fields).

---

## 3. Sizing — READ THIS SECTION FIRST

### 3.1 What the user asked for

```text
VDD              = 1.2 V
DC Gain          >= 60 dB
GBW              >= 100 MHz
Load Capacitance = 1 pF
Phase Margin     >= 60°
Power            <= 1 mW
```

### 3.2 What was actually delivered

Placeholder starting-value sizing, explicitly acknowledged as such in-conversation and confirmed by the user as the accepted path forward:

```text
M1/M2  (pch_mac, PMOS input pair)  TotalW=4u  L=240n  NF=1  M=1
M3/M4  (nch_mac, NMOS mirror load) TotalW=2u  L=480n  NF=1  M=1
M5     (pch_mac, PMOS tail source) TotalW=6u  L=480n  NF=1  M=1
```

### 3.3 How these specific numbers were chosen (full honesty)

These values were **scaled by analogy** from the repository's existing NMOS-input 5T canonical generator (`canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il`), which itself documents its own starting dimensions as "starting values, not verified performance results." No calculation connects these numbers to the user's gain/GBW/PM/power targets. Specifically, none of the following were computed, at any point, for `pch_mac` or `nch_mac`:

- gm/ID ratio or gm/ID-vs-VOV/L sweep
- Bias current (tail current, per-branch current)
- Transconductance gm for any device
- Output resistance / intrinsic gain (gm·ro)
- Any GBW calculation (gm/CL or gm/(2π·CL))
- Any phase-margin or non-dominant-pole estimate
- Any power calculation (I·VDD)
- Any noise, offset, ICMR, or slew-rate calculation

**Nothing in this repository or this conversation supports any performance claim for this design.** Do not describe this design as "meeting spec," "60 dB gain," "100 MHz GBW," or similar in any downstream document, even informally.

### 3.4 What is required before real, performance-based sizing is possible

For a future request to be honestly sizeable against a gain/GBW/PM/power spec, the following `pch_mac`/`nch_mac`-specific data must be available (from a PDK model file, a Cadence ADE gm/ID sweep, foundry documentation, or the user directly):

- SPICE/BSIM model parameters for `pch_mac` and `nch_mac` (at minimum: VTH, Cox, μ, λ or equivalent output-conductance data) at the process corner and temperature of interest
- gm/ID vs. VOV (or gm/ID vs. L) characterization data, ideally from an ADE gm/ID sweep in the user's actual Cadence environment, since this is technology- and possibly `_mac`-variant-specific
- Cgg/Cgs/Cgd (or at least total gate capacitance vs. W/L) for the dominant-pole / GBW calculation
- Confirmation of whether `_mac` denotes a distinct device (e.g. matched/multiplier-array variant) with different characteristics from plain `nch`/`pch`, since the name suggests something non-default

Once that data exists, a real sizing procedure would be: pick a tail current from the power budget (`I_tail <= P_max/VDD`), split it across the input pair, choose VOV from the gm/ID sweep to hit the GBW target (`gm1 = 2π·GBW·CL`), derive `(W/L)` from `gm/ID` and the sweep data, check `gm·ro` (from the same sweep) against the gain target, and verify PM via a non-dominant-pole estimate. **This procedure is described here for future reference only — it was not performed, and no part of the delivered `.il` file reflects it.**

---

## 4. TotalW-first design interface and CDF mapping

### 4.1 Design-level interface (repository convention, reused as-is)

```text
TotalW, L, NF, M
```

`W` (per-finger width) is never a user-facing or caller-facing input; it is derived internally.

### 4.2 CDF field mapping (repository convention, reused as-is; confirmed to hold for `pch_mac`/`nch_mac` — see 2.2)

```text
TotalW -> wf
L      -> l
NF     -> fingers, nf
M      -> simM, m
W      -> w   (derived: TotalW / NF)
totalM -> NF * M
```

Every MOS instance gets all eight fields explicitly assigned — no field is left to a PDK default or stale instance state:

```skill
cdf->w->value       = W_PER_FINGER
cdf->l->value       = L
cdf->wf->value      = TotalW
cdf->fingers->value = NF
cdf->simM->value    = M
cdf->totalM->value  = NF * M
cdf->nf->value      = NF
cdf->m->value       = M
```

Before any assignment, the generator checks that every one of these eight CDF fields actually exists on the instance (`unless(cdf->w error(...))`, etc.) and errors out by name if any field is missing — this is what would catch a genuine `pch_mac`/`nch_mac` CDF-schema difference from `pch`/`nch`.

### 4.3 NF and M handling

`NF` and `M` are passed through as opaque strings from the design-level interface straight to `cdf->fingers->value` / `cdf->nf->value` and `cdf->simM->value` / `cdf->m->value` respectively. They are only converted to integers (`atoi`) internally, for two purposes:
1. Deriving `W_PER_FINGER = TotalW / NF` (needs `NF` as a number)
2. Computing `totalM = NF * M` (needs both as numbers, then reformatted back to a string for the CDF write)

All four devices in this design used `NF=1, M=1` (so `totalM=1`) — no multi-fingering or multi-multiplier configuration was exercised. The NF/M plumbing is generic and should work for other values, but only `NF=1/M=1` has actually been run in Cadence.

---

## 5. CDF read-back validation, including numeric-tolerance handling

### 5.1 Why a validation gate exists

The skill mandates reading back every assigned CDF field after the write and stopping generation on any mismatch, rather than trusting the write succeeded silently.

### 5.2 The bug that was found and fixed (important for reuse)

The first version of the validation gate used strict `equal(cdf->field->value written_string)`. This **false-failed** on `pch_mac`'s `w` field: the write succeeded (confirmed by the generator's own `printf` log line showing the correct value), but Cadence's CDF layer returned the read-back as a normalized numeric type rather than the exact string that was written (`4e-06` vs. the written `"4e-06"` string, or a differently-formatted numeric representation) — so `equal()` failed on a value that was actually correct.

### 5.3 The fix: `T5TW_ValueMatches` / `T5TW_ToFloat`

Replace strict `equal()` with a numeric-tolerant comparison that only falls back to `equal()` for genuinely non-numeric fields:

```skill
procedure(T5TW_ValueMatches(gotVal expectVal)
    let((gotNum expectNum)
        gotNum    = T5TW_ToFloat(gotVal)
        expectNum = T5TW_ToFloat(expectVal)
        if(gotNum && expectNum
            then abs(gotNum - expectNum) < 1e-12 * max(1.0 abs(expectNum))
            else equal(gotVal expectVal)
        )
    )
)

procedure(T5TW_ToFloat(val)
    cond(
        (numberp(val) float(val))
        (stringp(val)
            let((parsed)
                parsed = nil
                errset(parsed = cdfParseFloatString(val) t)
                parsed
            )
        )
        (t nil)
    )
)
```

On failure, the error message reports both the actual and expected value (`"got %L expected %L"`) rather than only naming the field, specifically so a genuine future mismatch is diagnosable instead of just "something didn't match."

**Status: implemented and confirmed to resolve the false failure on the user's live Cadence run.** This is a generically useful fix that should be carried into any future TotalW-first generator, including ones that continue to use `nch`/`pch` rather than `_mac` variants, since the same string/numeric CDF round-trip behavior could in principle affect them too (it simply wasn't triggered in the repository's original regression run).

### 5.4 Other SKILL-syntax fixes made in the same pass (mechanical, not sizing-related)

These were parser-level bugs in the repository's original canonical generator pattern, carried over into the first draft of this generator, and fixed here:

- `sprintf(nil "%d" (* (atoi(NF)) (atoi(M))))` — nested prefix calls inside `sprintf` fail to parse. Fixed by binding `nfInt = atoi(NF)`, `mInt = atoi(M)`, `totalMInt = nfInt * mInt` as separate `let` statements before formatting.
- `tw / nf` (float divided by integer inside `T5TW_DeriveW`) — fixed by explicit `float(nfInt)` cast before division, to avoid any integer-division truncation risk.
- `if(abs(dx) >= abs(dy) then ...)` — fixed by binding `absDx = abs(dx)`, `absDy = abs(dy)` before the comparison, rather than calling `abs()` inline inside the conditional.

These fixes should be treated as the corrected baseline for any TotalW-first generator going forward, not just this PMOS-input `_mac` variant.

---

## 6. PMOS source-top orientation search

Reused from the repository's verified pattern, unchanged in logic:

```skill
procedure(T5TW_PlaceVerifiedPMOS(cv master name xy TotalW L NF M)
    let((orientList inst pass)
        orientList = list("MX" "MY" "R0" "R180")
        pass       = nil
        foreach(o orientList
            unless(pass
                inst = dbCreateInst(cv master name xy o)
                T5TW_SetMOS(inst TotalW L NF M)
                if(T5TW_PMOSPass(inst)
                    then pass = t
                    else dbDeleteObject(inst) inst = nil
                )
            )
        )
        unless(pass error("T5TW: no source-top orientation for %s.\n" name))
        inst
    )
)
```

The pass/fail check reads **actual transformed terminal coordinates** (never the instance bounding box) and requires `S.Y > D.Y`:

```skill
procedure(T5TW_PMOSPass(inst)
    let((s d sy dy)
        s = T5TW_PinCenter(inst "S")
        d = T5TW_PinCenter(inst "D")
        sy = cadr(s)
        dy = cadr(d)
        if(sy > dy then t else nil)
    )
)
```

All three PMOS devices in this design (M1, M2, M5) go through this search-and-verify procedure, both at placement time and again in a final post-placement re-check before `dbSave`.

**Status: implemented and confirmed working on the user's live Cadence run** (M1, M2, M5 all passed). No hard-coded orientation (`MX`, etc.) is assumed for `pch_mac`, consistent with the skill's rule to never assume a universal orientation across PDKs/devices.

---

## 7. Stub/label connectivity architecture

Every terminal (S/G/D/B on every device, PLUS/MINUS on every VDC source) gets exactly one short straight stub, computed from actual transformed pin geometry, followed by a net label at the stub's outer end. Same logical net = repeated label text, never a direct terminal-to-terminal wire.

Stub direction is derived from the *difference between paired terminal coordinates* (G vs. B, S vs. D), not from left/right placement or the instance bounding box:

```skill
; e.g. for pin "G": direction = G_position - B_position
dx = car(g) - car(b)
dy = cadr(g) - cadr(b)
```

then the longer axis (compared via `absDx`/`absDy`, see 5.4) determines whether the stub runs horizontally or vertically, and its sign determines which way it points outward.

**Status: implemented and confirmed working.** All 20 terminal labels (5 devices × 4 terminals) plus 10 VDC-source stub/label pairs (5 sources × PLUS/MINUS) were generated without routing errors on the user's live run.

---

## 8. Pin generation

External schematic pins use `basic/iopin/symbol` via `schCreatePin`, created only for intentional user-facing ports:

```skill
procedure(T5TW_Pin(cv pinMaster netName direction xy)
    schCreatePin(cv pinMaster netName direction nil xy "R0")
)
```

Only one external pin was created in this design: `VOUT` (output). No external pin was created for VDD, VSS, or any bias net, because each of those is driven by a VDC source instead (see section 9) — consistent with the repository rule that a VDC-driven net does not also receive a redundant external pin by default.

---

## 9. VDC source generation

Reused from the repository's verified pattern. Each `analogLib/vdc` instance is placed, its `vdc` CDF parameter is set, and its PLUS/MINUS terminals get isolated stubs + labels (PLUS → the target net, MINUS → VSS):

```skill
procedure(T5TW_VDC(cv master name xy netName value)
    let((inst plus minus ep em wp wm)
        inst  = dbCreateInst(cv master name xy "R0")
        T5TW_SetVDC(inst value)
        plus  = T5TW_VPin(inst "PLUS")
        minus = T5TW_VPin(inst "MINUS")
        ep    = list(car(plus)  cadr(plus)  + T5TW_STUB)
        em    = list(car(minus) cadr(minus) - T5TW_STUB)
        wp    = schCreateWire(cv "route" "full" list(plus  ep) T5TW_WW T5TW_WW 0)
        wm    = schCreateWire(cv "route" "full" list(minus em) T5TW_WW T5TW_WW 0)
        schCreateWireLabel(cv car(wp) ep netName "lowerLeft" "R0" "stick" T5TW_WW nil)
        schCreateWireLabel(cv car(wm) em "VSS"   "lowerLeft" "R0" "stick" T5TW_WW nil)
        inst
    )
)
```

Five VDC sources were generated for this design: `V_VDD` (1.2 V, per the user's spec), `V_VBP_TAIL`, `V_VINP`, `V_VINN` (0.6 V each — placeholder common-mode/bias starting points, not calculated from any bias procedure), and `V_VSS` (0.0 V reference).

**Status: implemented and confirmed working.**

---

## 10. Generator structure, workflow, and the empty-schematic requirement

### 10.1 Required precondition

The generator calls `geGetEditCellView()` first and errors immediately (`"open an EMPTY editable schematic first"`) if no editable cellview is open. **The target schematic must be a new, empty, editable cellview before running the generator** — the generator does not create or open a cellview itself, and it does not check that the cellview is empty (only that one is open and editable). Running it into a non-empty schematic will add devices on top of whatever is already there.

### 10.2 Full generation workflow, as implemented

```text
1.  geGetEditCellView() — confirm an editable schematic is open.
2.  Open device masters: nch_mac, pch_mac, basic/iopin, analogLib/vdc.
3.  Place M1, M2 (PMOS input pair) via orientation-search placement.
4.  Place M5 (PMOS tail) via orientation-search placement.
5.  Place M3, M4 (NMOS mirror load) at fixed R0 orientation.
    [Each placement in steps 3-5 internally calls T5TW_SetMOS, which
     assigns all 8 CDF fields and validates them via T5TW_ValueMatches
     before returning.]
6.  Generate isolated stub + label for every terminal on M1-M5 (20 total).
7.  Create the VOUT external pin.
8.  Place 5 VDC sources (VDD, VBP_TAIL, VINP, VINN, VSS) with stubs/labels.
9.  Re-verify PMOS source-top orientation on M1, M2, M5 (final check).
10. dbSave(cv).
11. printf() a summary, explicitly including a reminder that sizing
    is placeholder and carries no performance claim.
```

### 10.3 What "generated programmatically" means here, precisely

Every device, wire, label, and pin in the final schematic was created via direct SKILL API calls (`dbCreateInst`, `schCreateWire`, `schCreateWireLabel`, `schCreatePin`) driven by the fixed topology/net-map table in sections 1.4/7/9 — nothing was placed manually, and nothing was copied from an existing schematic. The `.il` file is self-contained and reproducible: running it again on a fresh empty schematic should produce the same layout, subject to Cadence's own placement/geometry behavior being deterministic.

---

## 11. Assumptions and engineering rules used (consolidated)

- 5T topology and PMOS input pair: **user-specified, not derived.**
- Net map: mirrored from the repository's NMOS-input canonical net map by swapping mirror/tail polarity and supply references — a topology-translation rule, not a performance-driven choice.
- `pch_mac`/`nch_mac` CDF field-name compatibility with `pch`/`nch`: **assumed, then confirmed indirectly** by successful field-existence checks and read-back validation on the fields this generator touches (section 2.2).
- Sizing: **scaled by analogy from the repository's own placeholder starting values**, explicitly not performance-derived (section 3).
- Bias voltages (`VBP_TAIL`, `VINP`, `VINN` = 0.6 V): placeholder starting points chosen to sit at a plausible mid-rail fraction of the 1.2 V supply, not derived from any ICMR/headroom calculation.
- `NF=1, M=1` for every device: simplest-case default, not derived from a layout matching/fingering strategy.
- Numeric-tolerance validation (section 5.3): an engineering judgment that CDF read-back formatting differences are not sizing failures, applied after observing the actual failure mode on a live run — not a pre-existing repository rule.

---

## 12. Summary table — status of every claim in this skill

| Area | Status |
|---|---|
| 5T topology, PMOS-input net map | Implemented; generated successfully in live Cadence |
| `pch_mac`/`nch_mac` device open + placement | Implemented; confirmed working in live Cadence |
| CDF field-name compatibility (w/l/wf/fingers/simM/totalM/nf/m) | Confirmed for these 8 fields only, on this run |
| TotalW-first assignment (all 8 fields) | Implemented; confirmed working |
| Numeric-tolerant read-back validation | Implemented; confirmed fixes a real observed failure |
| PMOS source-top orientation search | Implemented; confirmed working (M1, M2, M5 all passed) |
| Stub/label connectivity | Implemented; confirmed working (20 terminal + 10 VDC labels) |
| VOUT external pin | Implemented; confirmed working |
| 5 VDC sources incl. VDD=1.2V | Implemented; confirmed working |
| Transistor sizing (TotalW/L/NF/M) | **Placeholder only — not performance-derived, not verified against spec** |
| Bias current / gm / gain / GBW / PM / power | **Not calculated at any point — no data exists in the repo to calculate them for `_mac` devices** |
| Electrical simulation of the design | **Not performed** |
| DC operating point check | **Not performed** in this conversation (repository workflow calls for this as the next step) |

---

## 13. Next steps for a future request

If a future "design a 5T OTA to spec X" request arrives and this skill is loaded:

1. Confirm topology/input-pair the same way (ask, don't infer) unless the user has already stated a durable preference.
2. Reuse sections 4–10 verbatim as the generator architecture (CDF assignment, validation, orientation search, stub/label/pin/VDC code) — these are proven.
3. Check whether `pch_mac`/`nch_mac` device data (section 3.4) has been supplied since this skill was written. If not, tell the user directly that sizing will again be placeholder-only, exactly as this run was, and ask whether they want to proceed on that basis or supply device data first.
4. Do not reuse the specific placeholder numbers in section 3.2 as if they were appropriate for a different spec — they were an analogy-based starting point for this one request, not a general-purpose value.
