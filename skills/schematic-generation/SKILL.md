---
name: analog-schematic-generation
description: Generate a complete Cadence SKILL artifact after design and sizing confirmation.
---

# Schematic Generation

Emit one complete `.il` file with CDF helpers, numeric readback checks, terminal-coordinate lookup, local stubs and labels, VDC creation, output pins at true stub endpoints, logging, and `dbSave`. Do not emit incremental patches. Never create device-to-device wires. Bias/input/supply sources use `analogLib/vdc`; outputs use `basic/iopin` only where user-facing.
