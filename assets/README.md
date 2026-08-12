# Assets / compatibility layer

The files under `assets/` preserve the original generator and runbook paths used during development. They are retained for compatibility and historical reproducibility.

They are **not current canonical generators** unless a file is explicitly marked TotalW-current in `canonical/` and its runbook.

Current design-level MOS sizing is always:

```text
TotalW, L, NF, M
```

with explicit tsmcN65 CDF assignment:

```text
w, l, wf, fingers, simM, totalM, nf, m
```

and:

```text
totalM = NF * M
```

Do not use the legacy `assets/generators/telescopic_ota_v1.il` through `v4` as current sizing implementations. Their preserved copies are historical evidence; current work must use the TotalW generators under `canonical/`.
