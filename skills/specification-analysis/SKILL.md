---
name: analog-specification-analysis
description: Extract and gate specifications before analog schematic generation.
---

# Specification Analysis

Extract topology, PDK/device masters, supplies, gain, GBW, load, power, slew, ICMR, swing, corner, temperature, input common mode, output/CMFB, bias policy, and layout constraints. Return a Known / Unknown / Assumed / Derived table. Ask only questions that block a defensible design. Never generate sizing or SKILL before user confirmation of the design summary.
