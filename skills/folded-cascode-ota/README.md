# Folded-Cascode OTA Skill

The folded-cascode skill now follows the repository-wide TotalW-first sizing contract.

## Current sizing contract

Every MOS is specified with:

```text
TotalW, L, NF, M
```

The generator must explicitly assign:

```text
w, l, wf, fingers, simM, totalM, nf, m
```

with:

```text
W/finger = TotalW/NF
wf = TotalW
totalM = NF*M
```

## Current executable status

The existing V9 `.il` remains a legacy/reference artifact until a TotalW-migrated executable is run and verified in the user's Cadence environment. It is not silently relabeled as current.

## Verified routing rules

- Every MOS terminal gets one short straight isolated stub.
- Same-net connectivity uses repeated net labels.
- Terminal directions are derived from actual transformed pin coordinates.
- PMOS source-top is accepted only after actual S/D coordinate verification.
- VDC-driven nets do not receive redundant external pins.

## Bias reference

The existing V8 reference bias values remain starting values only and are not performance claims.
