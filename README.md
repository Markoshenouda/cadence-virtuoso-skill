# Cadence Virtuoso SKILL Design Agent

Reusable SKILL knowledge, design skills, reference generators, and runbooks for Cadence Virtuoso IC6.1.7 analog CMOS schematic automation in the verified `tsmcN65` environment.

## Start here — Master Skill

Use:

```text
skills/analog-design-agent/SKILL.md
```

This is the **current master skill v3.0.0**. It is the source of truth for future analog schematic-generation requests.

The master skill now requires the AI to:

1. **Ask for all design specifications before coding.**
2. Confirm a complete design contract.
3. Reuse the verified Cadence infrastructure.
4. Build an explicit device/net table.
5. Generate clean isolated terminal stubs and named nets.
6. Create real external schematic pins.
7. Generate verified `analogLib/vdc` bias sources when requested.
8. Set VDC values through the instance CDF `vdc` parameter.
9. Validate before claiming success.

## Current verified platform

```text
Cadence Virtuoso IC6.1.7
PDK      = tsmcN65
NMOS     = nch
PMOS     = pch
Terminals= S G B D
CDF      = w l nf m
NMOS     = R0
PMOS     = MX when source-top/drain-bottom is required
```

## Critical schematic-routing rule

Every MOS terminal is treated independently.

```text
terminal -> short straight isolated stub -> net label
```

If multiple terminals belong to the same logical net, repeat the same label. Do **not** physically connect the terminals merely to share a net.

Forbidden unless explicitly requested:

```text
G-D
G-B
D-B
D-S
S-B
```

Also forbidden:

- diagonal wires
- wires wrapping around MOS symbols
- wires through MOS bodies
- overlapping/crossing terminal stubs
- standalone internal wires whose only purpose is to display a net name

This architecture was established through the 5T OTA, Telescopic OTA, and Folded-Cascode debugging iterations.

## Verified Voltage Source / Bias Source workflow

The repository now treats voltage-source generation as part of the standard design skill.

Verified source:

```text
Library = analogLib
Cell    = vdc
View    = symbol
```

Verified terminals:

```text
PLUS
MINUS
```

Verified instance-CDF parameter:

```text
vdc
```

Set it with:

```skill
cdf = cdfGetInstCDF(inst)
cdf->vdc->value = "1.5"
```

Standard bias structure:

```text
BIAS_NET
   |
  PLUS
   |
  VDC
   |
 MINUS
   |
  VSS
```

For VDD:

```text
PLUS  -> VDD
MINUS -> VSS
VDC   -> 1.5 V
```

Bias values must be identified as user-specified, reference-derived, or engineering starting values. They are not final until DC operating-point verification supports them.

## Specification-first workflow

When the user says:

> Make a folded cascode OTA

or any other analog circuit, the AI must **not** immediately write SKILL.

It must first ask for:

```text
Input pair
PDK / node
VDD / VSS
Gain
GBW
CL
Temperature
Process corner
Output type
Bias strategy
Power
Slew rate
ICMR
Output swing
gm/ID strategy
L selection
Layout-oriented sizing
External pin names
Other relevant requirements
```

Then confirm the design contract before generating the `.il`.

## Reference designs

### 5T OTA

```text
skills/5t-ota/SKILL.md
```

Includes both:

- NMOS-input 5T OTA
- PMOS-input 5T OTA

with tested named-net/short-stub conventions.

### Telescopic OTA

```text
assets/generators/telescopic_ota_v4_pmos_pins.il
```

This is the canonical tested Telescopic OTA reference. Reuse its low-level infrastructure rather than rewriting it.

### Folded-Cascode OTA

```text
skills/folded-cascode-ota/SKILL.md
```

Current skill version: **2.0.0**.

Reference topology:

```text
M3/M4   PMOS top pair
M5/M6   PMOS folded pair
M7/M8   NMOS folded pair
M9/M10  NMOS lower sinks
M1/M2   NMOS input pair
M11     NMOS tail
```

Latest reference arrangement and biasing lessons are documented in:

```text
references/Folded_Cascode_OTA_V8_REFERENCE.md
```

## How to use this repository with another AI

Tell it:

> Use `skills/analog-design-agent/SKILL.md` as the master skill. Before generating any Cadence SKILL file, ask me for all required design specifications and confirm the design contract. Reuse the verified IC6.1.7/tsmcN65 infrastructure. Use actual MOS pin geometry, one short straight isolated stub per terminal, same net labels for logical connectivity, real external pins, and the verified analogLib/vdc instance-CDF bias-source workflow. Do not physically connect MOS terminals merely to share a net.

For a folded-cascode request, also load:

```text
skills/folded-cascode-ota/SKILL.md
```

For 5T OTA work, also load:

```text
skills/5t-ota/SKILL.md
```

## Runtime workflow

From Windows CMD:

```cmd
scp "C:\Users\marko\Desktop\your_file.il" cadence@192.168.75.216:/home/cadence/
```

In Cadence CIW:

```skill
load("/home/cadence/your_file.il")
```

Then run the documented main procedure.

Always use a new/empty schematic for a generator test unless the generator explicitly supports modification of an existing design.

## Debugging lessons preserved in the skills

The repository records the major failures and their fixes:

- `schCreateLabel` → use `schCreateWireLabel`.
- `hiGetString` / `gets` → do not use them for this workflow.
- `(pinName == "G")` → invalid approach; use valid SKILL branching/comparison.
- `p + list(dx dy)` → use `car/cadr` scalar arithmetic.
- standalone internal wires → remove; label actual terminal stubs.
- physical G/B or G/D connections → isolate terminal stubs and repeat net labels.
- side-dependent G/B routing → derive direction from actual symbol geometry/orientation.
- stale CIW functions → use unique versioned entry points and reload the newest file.
- new Cadence APIs → test them independently before integrating.

## Quality gate

A generated schematic is not declared simulation-ready merely because the SKILL procedure ran.

Gain, GBW, slew rate, operating region, bias point, phase margin, DRC, LVS, and other performance claims require actual Cadence verification.
