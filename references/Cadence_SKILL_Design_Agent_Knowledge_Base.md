# Cadence Virtuoso IC6.1.7 — SKILL Design-Agent Knowledge Base
## Proven Environment, APIs, Conventions, and Reusable Generator Architecture

> PURPOSE
>
> This file is an operating manual for an AI agent that will generate Cadence Virtuoso schematics using SKILL in the user's actual environment.
>
> The central rule is:
>
> **KEEP THE VERIFIED INFRASTRUCTURE. CHANGE ONLY THE DESIGN-SPECIFIC PARTS.**
>
> When the user asks for a new circuit, do not redesign the working SKILL framework from scratch. Reuse the proven environment, helper functions, pin handling, wire handling, CDF sizing, and loading/running workflow. Only change topology, device count, placement, W/L/NF/M values, nets, and external pins as required by the new circuit.

---

# 1. VERIFIED ENVIRONMENT

The following facts were established directly from the user's working Cadence setup.

## Cadence

- Cadence Virtuoso IC6.1.7
- SKILL environment
- Current schematic is accessed with:

```skill
geGetEditCellView()
```

## PDK

```text
PDK library = tsmcN65
```

## MOS masters

```text
NMOS = tsmcN65 / nch / symbol
PMOS = tsmcN65 / pch / symbol
```

## MOS terminal names

Both `nch` and `pch` were tested and returned:

```text
S
G
B
D
```

Therefore use these exact terminal names unless a future PDK/device is explicitly different.

## CDF parameters

The working MOS sizing function accesses:

```text
w
l
nf
m
```

through the instance CDF.

The proven pattern is:

```skill
cdf = cdfGetInstCDF(inst)

cdf->w->value  = W
cdf->l->value  = L
cdf->nf->value = NF
cdf->m->value  = M
```

---

# 2. VERIFIED SKILL APIs

These APIs/functions were actually tested in the user's Cadence environment.

## 2.1 Current schematic

```skill
cv = geGetEditCellView()
```

Use this to obtain the currently edited schematic.

Always check:

```skill
unless(cv
    error("Please open a schematic first.\n")
)
```

---

## 2.2 Open a symbol master

Working pattern:

```skill
master = dbOpenCellViewByType(
            "tsmcN65"
            "nch"
            "symbol"
            ""
            "r"
         )
```

PMOS:

```skill
master = dbOpenCellViewByType(
            "tsmcN65"
            "pch"
            "symbol"
            ""
            "r"
         )
```

---

## 2.3 Create an instance

Verified pattern:

```skill
inst = dbCreateInst(
           cv
           master
           instName
           origin
           orientation
       )
```

Example NMOS orientation:

```skill
"R0"
```

Example PMOS orientation that worked for the desired top/bottom direction:

```skill
"MX"
```

### Orientation convention established in the successful Telescopic OTA

NMOS:

```skill
"R0"
```

PMOS:

```skill
"MX"
```

The requested visual convention is:

```text
NMOS:
    D
    |
   MOS
    |
    S

PMOS:
    S
    |
   MOS
    |
    D
```

Use `MX` for the PMOS symbols when this orientation is required.

---

# 3. VERIFIED MOS SIZING METHOD

The successful design uses a dedicated helper rather than directly manipulating instance properties.

Recommended reusable helper:

```skill
procedure(SetMOS(inst W L NF M)

    let((cdf)

        cdf = cdfGetInstCDF(inst)

        unless(cdf
            error("Cannot access instance CDF.\n")
        )

        cdf->w->value  = W
        cdf->l->value  = L
        cdf->nf->value = NF
        cdf->m->value  = M

    )
)
```

Use this infrastructure unchanged for future designs.

Example:

```skill
SetMOS(M1 "2u" "240n" "1" "1")
```

---

# 4. VERIFIED PIN GEOMETRY METHOD

This was tested successfully on the user's actual `nch` symbol.

To find a terminal:

```skill
term = dbFindTermByName(inst~>master "G")
```

To access the pin:

```skill
pin = car(term~>pins)
```

To access its figure:

```skill
fig = pin~>fig
```

To get its master coordinate:

```skill
masterXY = centerBox(fig~>bBox)
```

To transform it into schematic coordinates:

```skill
instXY = dbTransformPoint(
             masterXY
             inst~>transform
         )
```

This successfully returned a real schematic coordinate in the user's environment.

Example verified result:

```text
Master pin XY = (0.0 0.0)
Instance pin XY = (1.875 6.625)
```

---

# 5. IMPORTANT SKILL POINT-ARITHMETIC RULE

DO NOT use:

```skill
p + list(dx dy)
```

This failed in the user's SKILL environment with:

```text
*Error* plus: can't handle ((1.875 6.625) + (1.0 0.0))
```

Instead use scalar arithmetic:

```skill
p2 = list(
        car(p1) + dx
        cadr(p1) + dy
     )
```

Example:

```skill
p2 = list(
        car(p1) + 1.0
        cadr(p1)
     )
```

This was verified successfully.

---

# 6. VERIFIED WIRE CREATION

A real wire was successfully created from a MOS gate using:

```skill
wire = schCreateWire(
            cv
            "route"
            "full"
            list(p1 p2)
            0.0625
            0.0625
            0
        )
```

The test returned a valid wire object list:

```text
WIRE = (db:... db:... db:...)
```

and the wire visibly appeared in Virtuoso.

Therefore `schCreateWire()` is verified and can be reused.

---

# 7. VERIFIED NET LABEL CREATION

A real net label was successfully created using:

```skill
label = schCreateWireLabel(
            cv
            car(wire)
            p2
            "TEST_NET"
            "lowerLeft"
            "R0"
            "stick"
            0.0625
            nil
        )
```

The label visibly appeared attached to the wire.

This is the proven label method.

---

# 8. FAILED / DO NOT USE METHODS

## 8.1 `schCreateLabel`

Do NOT use:

```skill
schCreateLabel(...)
```

It failed in the user's Cadence environment:

```text
*Error* eval: undefined function - schCreateLabel
```

Use:

```skill
schCreateWireLabel(...)
```

instead.

---

## 8.2 Vector addition

Do NOT use:

```skill
p + list(dx dy)
```

Use:

```skill
list(
    car(p) + dx
    cadr(p) + dy
)
```

---

## 8.3 Do not assume new APIs

The debugging process showed that introducing many untested SKILL APIs at once makes diagnosis difficult.

Rule:

> **Every new Cadence API must be tested independently before integrating it into the full generator.**

For example, when introducing schematic pin creation, test pin creation on one empty schematic before generating the whole OTA.

---

# 9. REAL SCHEMATIC PIN CREATION

The successful final generator used the standard:

```text
basic / iopin / symbol
```

as the pin master and created real schematic pins with:

```skill
schCreatePin(
    cv
    pinMaster
    netName
    direction
    nil
    point
    orientation
)
```

The external pin test succeeded in the user's environment.

Use:

```skill
pinMaster = dbOpenCellViewByType(
                "basic"
                "iopin"
                "symbol"
                ""
                "r"
            )
```

Then create pins with `schCreatePin()`.

### External pin directions used in the successful generator

Inputs:

```text
input
```

Output:

```text
output
```

Bidirectional/power-style external connections:

```text
inputOutput
```

The successful Telescopic OTA used:

```text
VINP       input
VINN       input
VOUT       output
VDD        inputOutput
VSS        inputOutput
VBN_CAS    input
VBP_CAS    input
VBP        input
VBN_TAIL   input
```

---

# 10. PROVEN HELPER ARCHITECTURE

Future generators should preserve this architecture.

## SetMOS

Responsible only for:

```text
W
L
NF
M
```

through CDF.

---

## PlaceMOS

Responsible only for:

- opening/receiving the master
- creating the instance
- selecting its orientation
- calling SetMOS

Recommended structure:

```skill
procedure(PlaceMOS(cv master instName origin width length orientation)

    let((inst)

        inst = dbCreateInst(
                   cv
                   master
                   instName
                   origin
                   orientation
               )

        unless(inst
            error("Cannot create instance %s.\n" instName)
        )

        SetMOS(inst width length "1" "1")

        inst
    )
)
```

---

## PinCenter

Responsible for:

1. `dbFindTermByName`
2. `term~>pins`
3. `pin~>fig`
4. `centerBox`
5. `dbTransformPoint`

Do not replace this with guessed coordinates.

---

## StubEnd

Responsible for creating a short wire endpoint from an actual pin.

Use scalar point arithmetic.

For a generic orientation-aware design, calculate the endpoint based on the actual pin direction/orientation. If direction detection is not already verified, use the proven simple orientation convention and test it separately.

---

## LabelPinNet

Responsible for:

1. get real pin coordinate
2. calculate stub endpoint
3. `schCreateWire`
4. `schCreateWireLabel`

This creates a short local wire and assigns its net name.

---

## CreateExternalPin

Responsible for:

1. opening `basic/iopin/symbol`
2. creating a real schematic pin
3. placing it at the intended external wire endpoint

---

## PinFromTerminal

Useful combined helper:

```text
actual transistor pin
        ↓
short wire
        ↓
net label
        ↓
external pin if requested
```

---

# 11. SUCCESSFUL TELESCOPIC OTA STRUCTURE

The successful generator used 9 MOS devices:

```text
M1/M2 = NMOS differential input pair
M3/M4 = NMOS cascodes
M5/M6 = PMOS cascodes
M7/M8 = PMOS current-source loads
M9    = NMOS tail current source
```

The logical structure was:

```text
                         VDD
                          |
                    M7          M8
                    |           |
                    M5          M6
                    |           |
                    M3          M4
                    |           |
                    M1          M2
                     \          /
                          M9
                          |
                         VSS
```

Single-ended output:

```text
VOUT = right branch
```

---

# 12. SUCCESSFUL TELESCOPIC OTA NET LIST

The proven generator used:

```text
M1.G -> VINP
M1.D -> NLEFT
M1.S -> TAIL
M1.B -> VSS

M2.G -> VINN
M2.D -> NRIGHT
M2.S -> TAIL
M2.B -> VSS

M3.G -> VBN_CAS
M3.D -> NLEFT_CAS
M3.S -> NLEFT
M3.B -> VSS

M4.G -> VBN_CAS
M4.D -> VOUT
M4.S -> NRIGHT
M4.B -> VSS

M5.G -> VBP_CAS
M5.D -> NLEFT_CAS
M5.S -> NLEFT_LOAD
M5.B -> VDD

M6.G -> VBP_CAS
M6.D -> VOUT
M6.S -> NRIGHT_LOAD
M6.B -> VDD

M7.G -> VBP
M7.D -> NLEFT_LOAD
M7.S -> VDD
M7.B -> VDD

M8.G -> VBP
M8.D -> NRIGHT_LOAD
M8.S -> NRIGHT_LOAD
M8.B -> VDD

M9.G -> VBN_TAIL
M9.D -> TAIL
M9.S -> VSS
M9.B -> VSS
```

---

# 13. SUCCESSFUL HIGH-GAIN STARTING SIZING

The tested generator used:

```text
M1/M2:
W = 2u
L = 240n

M3/M4:
W = 4u
L = 480n

M5/M6:
W = 4u
L = 480n

M7/M8:
W = 6u
L = 480n

M9:
W = 6u
L = 480n

NF = 1
M  = 1
```

This is a starting point for a high-gain-oriented design.

Do not claim a specific final gain from these dimensions alone. Final gain depends on bias point, process models, load, output resistance, and operating conditions.

---

# 14. LOADING AND RUNNING A SKILL FILE

## Transfer from Windows to Debian

The user's passwordless SSH setup works.

From Windows CMD:

```cmd
scp "C:\Users\marko\Desktop\your_file.il" cadence@192.168.75.216:/home/cadence/
```

Do NOT run the Windows path command from inside the Debian shell.

---

## Load in Virtuoso CIW

```skill
load("/home/cadence/your_file.il")
```

---

## Run the generator

For the successful Telescopic OTA:

```skill
CreateTelescopicOTA_V3()
```

---

# 15. IMPORTANT DEBUGGING LESSON: STALE FUNCTIONS

During development, older SKILL function definitions remained in the CIW session.

This produced confusing errors where an old function was executed even after a new file had been written.

Therefore:

1. Use unique helper names for major revisions when necessary.
2. Always `load()` the newest file before running it.
3. If a function was changed, confirm the new function is actually loaded.
4. If an old helper error appears unexpectedly, use a unique helper name rather than continuing to patch the old name.

Example:

```skill
TOTA_V3_StubEnd_20260810
```

was used to avoid collision with older definitions.

---

# 16. GENERATOR DESIGN RULES FOR FUTURE CIRCUITS

When the user asks:

> "Make me a new OTA / amplifier / current mirror / bandgap / differential pair / filter / etc."

the AI should NOT rewrite the complete SKILL infrastructure.

Instead:

## Keep unchanged

```text
PDK library handling
MOS master loading
SetMOS
PlaceMOS architecture
pin coordinate extraction
dbTransformPoint
wire creation
wire label creation
real pin creation
loading/running workflow
```

## Change only

```text
number of devices
device types
instance names
placement coordinates
orientation
W/L/NF/M
net names
topology
external pins
bias pins
output pins
```

---

# 17. RECOMMENDED GENERATOR TEMPLATE

Every future generator should follow this order:

```text
1. Configuration
2. SetMOS helper
3. PlaceMOS helper
4. PinCenter helper
5. Point/stub helper
6. Wire + label helper
7. External pin helper
8. Optional single-API test
9. Main generator
10. Device placement
11. Device sizing
12. Net assignment
13. External pin creation
14. Save
15. Report
```

---

# 18. VALIDATION CHECKLIST

Before declaring a generated schematic successful:

## Device validation

- [ ] Correct library
- [ ] Correct NMOS/PMOS masters
- [ ] Correct number of devices
- [ ] Correct instance names
- [ ] Correct W
- [ ] Correct L
- [ ] Correct NF
- [ ] Correct M
- [ ] Correct orientation

## Pin validation

- [ ] Every transistor has S/G/B/D
- [ ] External inputs are real schematic pins
- [ ] External output is a real schematic pin
- [ ] Supply pins are real schematic pins
- [ ] Bias pins are real schematic pins
- [ ] Pin names match net names

## Connectivity validation

- [ ] Every transistor terminal has intended net
- [ ] No accidental floating terminal
- [ ] No unintended short
- [ ] Differential pair is correctly connected
- [ ] Cascode devices are correctly stacked
- [ ] Load/current source devices are correctly connected
- [ ] Tail device is correctly connected
- [ ] Output node is correct

## Visual validation

- [ ] PMOS source is visually on top when requested
- [ ] NMOS source is visually on bottom when requested
- [ ] Input pins are placed logically
- [ ] Output pin is placed logically
- [ ] VDD is placed logically above the circuit
- [ ] VSS is placed logically below the circuit
- [ ] Bias pins are not tangled
- [ ] Wires are short/clean
- [ ] Labels are readable

---

# 19. TEST-FIRST RULE FOR NEW APIs

If the user requests a new feature that needs an API not already verified:

DO NOT immediately integrate it into the complete generator.

Instead:

```text
new API
   ↓
minimal 5–20 line test
   ↓
run in user's Cadence
   ↓
confirm success
   ↓
integrate into generator
```

This is especially important for:

```text
schCreatePin
pin direction/orientation handling
symbol transformations
instance deletion
netlist manipulation
simulation setup
ADE automation
```

---

# 20. DO NOT GUESS PDK DETAILS

For this exact environment, use:

```text
tsmcN65
nch
pch
S G B D
w l nf m
```

If a future design uses a different PDK or device, explicitly verify:

- library name
- cell name
- terminal names
- CDF parameter names
- symbol pin geometry
- available pin master
- supported schematic APIs

Do not silently substitute names from another PDK.

---

# 21. HOW AN AI SHOULD INTERPRET A FUTURE DESIGN REQUEST

If the user says:

> "Make a folded cascode OTA."

the AI should think:

```text
Reuse:
    tsmcN65
    nch/pch
    SetMOS
    PlaceMOS
    PinCenter
    schCreateWire
    schCreateWireLabel
    schCreatePin

Change:
    device count
    topology
    placement
    W/L
    net names
    external pins
```

If the user says:

> "Make a current mirror."

Reuse the same infrastructure.

If the user says:

> "Make a bandgap."

Reuse the same infrastructure, but add only the necessary device types and verified helpers.

---

# 22. DESIGN-AGENT PRINCIPLE

The working environment should be treated like a known hardware/software platform.

The AI should behave as if it has a local platform profile:

```text
Platform:
    Cadence Virtuoso IC6.1.7

Technology:
    TSMC65

Library:
    tsmcN65

MOS:
    nch
    pch

Terminals:
    S
    G
    B
    D

CDF:
    w
    l
    nf
    m

Proven schematic APIs:
    geGetEditCellView
    dbOpenCellViewByType
    dbCreateInst
    cdfGetInstCDF
    dbFindTermByName
    dbTransformPoint
    schCreateWire
    schCreateWireLabel
    schCreatePin

Orientation:
    NMOS = R0
    PMOS = MX when Source-top/Drain-bottom is required
```

Do not repeatedly rediscover these facts for every new design.

---

# 23. FINAL RULE

**The user has a working Cadence environment. Protect it.**

When generating a new SKILL file:

1. Start from the proven architecture.
2. Reuse verified function names.
3. Reuse verified APIs.
4. Reuse the PDK names exactly.
5. Reuse the CDF field names exactly.
6. Preserve the working PMOS/NMOS orientation convention.
7. Use actual transformed pin coordinates.
8. Use short wire stubs.
9. Use `schCreateWireLabel` for nets.
10. Use `schCreatePin` for real external pins.
11. Test every genuinely new API separately.
12. Keep topology-specific changes isolated.
13. Never replace a working method with a generic/unverified method just because it looks cleaner.
14. If an error occurs, debug the smallest failing helper first.
15. Do not claim a design is simulation-ready merely because the schematic was generated.

This file is the persistent knowledge base for future Cadence SKILL schematic-generation tasks in this environment.
