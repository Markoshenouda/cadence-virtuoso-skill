# tsmcN65 MOS Device Catalog & Selection Guide

## Purpose

This reference records the MOS device master names that are clearly readable in the supplied PDK screenshots and turns the naming into a **device-selection aid** for future analog-design generation.

The catalog is intentionally conservative:

- Device names are transcribed from the supplied screenshots.
- A suffix is **not** treated as proof of an electrical property unless that property is established elsewhere in the repository or by the PDK documentation/CDF.
- `mac` / `macx` variants are especially important because the current PMOS-input 5T generator uses `pch_mac` and `nch_mac`.
- Where the exact meaning of a suffix cannot be established from the screenshots alone, the guide says **"verify in PDK"** rather than inventing a model/device definition.

## 1. Device families visible in the screenshots

### Standard/core names

```text
nch
nchx
pch
pchx
```

Use these as the baseline NMOS/PMOS choices when the design does not require a special voltage, threshold, isolation, or matching variant. `x` is a PDK-specific variant suffix and its exact meaning must be verified from the PDK CDF/model data.

### 2.5-V family

Clearly visible names include:

```text
nch_25
nch_25x
pch_25
pch_25x
```

These names indicate a 25-family device in the PDK naming scheme. The exact rated-voltage/model definition must be taken from the PDK documentation/CDF rather than inferred only from the name.

### 2.5-V / oxide-related variants visible

```text
nch_25od33
nch_25od33x
nch_25ud18
nch_25ud18x
pch_25od33
pch_25od33x
pch_25ud18
pch_25ud18x
```

The `od33` and `ud18` suffixes are PDK-specific nomenclature. Their exact oxide/voltage meaning should be verified from the PDK device definition before an AI uses them for electrical sizing.

### Deep-N-well variants visible

```text
nch_dnw
nch_dnwx
nch_25_dnw
```

Additional `dnw` combinations are visible in the device list. `dnw` should be treated as a **deep-N-well/isolation-related variant** for selection purposes, while the exact body/well connectivity and allowed voltage range must be read from the PDK CDF/model definition.

### Threshold-voltage families visible

NMOS examples:

```text
nch_lvt
nch_hvt
nch_hv25
nch_hv25x
```

PMOS examples:

```text
pch_lvt
pch_hv25
pch_hv25x
pch_hvt
```

The naming strongly indicates threshold/process variants (`lvt`, `hvt`, etc.), but the AI must use the actual PDK model/CDF data when deciding the electrical tradeoff. Do not assign a numerical VTH from the name alone.

### MLVT family visible

```text
nch_mlvt
nch_mlvt_mac
nch_mlvt_macx
nch_mlvt_dnw_mac
nch_mlvt_dnw_macx
pch_mlvt
pch_mlvt_mac
pch_mlvt_macx
```

`mlvt` is a distinct threshold/device family in the PDK list. Exact VTH/model behavior must be verified from the PDK.

### NA / NA25 family visible

```text
nch_na_mac
nch_na_macx
nch_na25_mac
nch_na25_macx
nch_na25x
nch_nax
```

These are PDK-specific `na` / `na25` families. Their intended application and electrical characteristics must be obtained from the PDK definition; the name alone is not sufficient to classify them.

## 2. `mac` and `macx` variants

The supplied screenshots show a large group of `*_mac` and `*_macx` devices:

### NMOS

```text
nch_lvt_mac
nch_lvt_macx
nch_mac
nch_macx
nch_mlvt_dnw_mac
nch_mlvt_dnw_macx
nch_mlvt_mac
nch_mlvt_macx
nch_na25_mac
nch_na25_macx
nch_na_mac
nch_na_macx
```

### PMOS

```text
pch_25_mac
pch_25_macx
pch_25od33_mac
pch_25od33_macx
pch_25ud18_mac
pch_25ud18_macx
pch_hv25_mac
pch_hv25_macx
pch_hvt_mac
pch_hvt_macx
pch_lvt_mac
pch_lvt_macx
pch_mac
pch_macx
pch_mlvt_mac
pch_mlvt_macx
```

### Important current-repository note

The current PMOS-input 5T OTA generator explicitly uses:

```text
pch_mac  -> PMOS input pair / PMOS tail
nch_mac  -> NMOS active load
```

The generator's skill records that the `w/l/wf/fingers/simM/totalM/nf/m` CDF fields were successfully exercised for these two masters in the user's live Cadence run. That does **not** prove that every other `*_mac`/`*_macx` device has identical CDF behavior.

## 3. How the AI should choose a device

Do **not** choose a MOS solely from the shortest or most familiar name. Use this decision order:

### Step 1 — Determine polarity

```text
NMOS -> nch family
PMOS -> pch family
```

### Step 2 — Determine voltage requirement

Ask:

- What is VDD?
- What is the maximum VDS/VGS stress?
- Is a special-voltage device required?

Then consider the appropriate `25`, `hv25`, `25od33`, `25ud18`, etc. family **only after confirming its PDK definition**.

### Step 3 — Determine threshold requirement

If speed / low-voltage operation is important, compare the available threshold families:

```text
LVT / MLVT / standard / HVT
```

Do not assume the numerical VTH. Obtain it from characterization or the PDK model.

### Step 4 — Determine isolation / body requirement

If the topology or substrate environment requires deep-N-well isolation, consider the `dnw` family.

### Step 5 — Determine matching / special implementation variant

If the design flow specifically requires a `mac` device, use the corresponding `*_mac` master. If an `macx` alternative exists, treat it as a separate PDK master and inspect its CDF/model before using it.

### Step 6 — Verify the actual CDF interface

Before generation, inspect the selected master and confirm at minimum:

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

The generator should fail explicitly if a required field is absent rather than silently substituting another device.

## 4. Quick selection table

| Design need | First family to inspect | Why | Must verify |
|---|---|---|---|
| Normal core analog design | `nch` / `pch` | Baseline device family | PDK voltage/model |
| Low-VTH / higher-speed option | `*_lvt` / `*_mlvt` | Threshold-family alternatives | Actual VTH, leakage, model |
| Higher-VTH / lower-leakage option | `*_hvt` | Threshold-family alternative | Actual VTH and speed/leakage tradeoff |
| Special higher-voltage operation | `*_25`, `*_hv25`, `*_25od33`, `*_25ud18` | Special-voltage families visible in PDK | Rated voltage, oxide limits, model |
| Deep-well isolation | `*_dnw` | Deep-N-well variant | Body/well connections and rules |
| Current matching-oriented flow | `*_mac` | Dedicated PDK variant visible in current flow | Exact CDF/model semantics |
| `mac` alternative | `*_macx` | Separate PDK variant | Exact CDF/model semantics |

## 5. Device-selection policy for future generators

For every future analog generator, the AI should produce a small device-selection block before writing SKILL:

```text
NMOS master: <selected master>
PMOS master: <selected master>
Reason: <voltage / VTH / isolation / topology reason>
CDF verified: yes/no
Model/sizing data available: yes/no
```

If multiple device families can satisfy the requirement, present the alternatives instead of silently selecting one.

Example:

```text
Input pair candidates:
1. pch_mac   — current validated CDF interface in this repository
2. pch_lvt   — lower-VTH family; characterize before use
3. pch_hvt   — higher-VTH family; characterize before use

Recommended choice:
<choose only after the specification and PDK characterization are available>
```

## 6. Verification boundary

This file is a **selection/catalog reference**, not a substitute for PDK characterization.

The screenshots establish that the listed master names exist in the user's device-selection environment. They do not establish:

- exact VTH values
- maximum voltage ratings
- oxide thickness
- leakage
- gm/ID curves
- ro / intrinsic gain
- noise
- matching coefficients
- CDF field differences between variants
- model-corner behavior

Those properties must be obtained from the actual PDK/CDF/model data before using them for performance-based sizing.

## 7. Source note

Source for the device-name inventory: the PDK device-selection screenshots supplied by the user in the 2026-08-14 conversation.
