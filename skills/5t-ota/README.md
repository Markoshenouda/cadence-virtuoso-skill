# 5T OTA Skill

Current canonical generator: `../../canonical/5t-ota/5T_OTA_PMOS_TOTALW_V2_20260812.il`.

Historical generators remain preserved under `../../history/generators/`.

## Current sizing contract

Every MOS uses:

```text
TotalW, L, NF, M
```

and the generator explicitly assigns:

```text
w, l, wf, fingers, simM, totalM, nf, m
```

with:

```text
W/finger = TotalW/NF
wf = TotalW
totalM = NF*M
```

## Topology

- M1/M2: differential input pair
- M3/M4: PMOS current-mirror active load
- M5: NMOS tail current source

The sizing contract is shared with `skills/analog-design-agent/SKILL.md` and the golden regression under `tests/mos-sizing/`.
