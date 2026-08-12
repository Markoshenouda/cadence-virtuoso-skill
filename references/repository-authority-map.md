# Repository Authority Map

## Authority chain

```text
Root SKILL.md
  -> skills/analog-design-agent/SKILL.md (workflow authority)
     -> skills/specification-analysis, topology-selection, transistor-sizing
     -> skills/schematic-generation, cadence-execution, schematic-verification
        -> references/design-contract.md (non-negotiable generator contract)
        -> canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il
        -> runbooks/RUN_telescopic_ota_v7_20260812.md
        -> tests/test_telescopic_ota_v7_contract.py and tests/telescopic-ota-v7-regression.md
```

## Artifact status

| Artifact family | Authority | Status |
| --- | --- | --- |
| Telescopic OTA V7 | `canonical/telescopic-ota/Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il` | Canonical; schematic generation and Check & Save verified on 2026-08-12. Performance not verified. |
| Telescopic V1/V2 and legacy V1–V4 | `history/generators/` and `assets/generators/` | Historical evidence only; never use for a new design. |
| TotalW CDF V5 | `tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il` | Canonical sizing regression, Cadence-verified. |
| 5T and folded-cascode generators | their `canonical/` entries | Separate topology-specific candidates; their status is defined by their runbooks. |

## Resolved conflicts

- The former Telescopic V2 entries were labelled current/canonical but their runbook said that they needed a Cadence run. They are superseded by V7 and retained in history.
- Earlier Telescopic V1–V4 use older naming, topology variants, external-bias policies, or incomplete CDF flows. They remain useful debugging history, not implementation authority.
- A `load()` result is not verification. V7 is marked schematic-generation verified only because the recorded CIW result contains `SCH-1426` and `SCH-1181`.

## Promotion rule

A candidate becomes canonical only when its exact artifact, dated Cadence evidence, runbook, and regression checks are updated together. Analog performance claims additionally require recorded simulation results.
