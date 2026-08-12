# TotalW MOS Sizing Convention — tsmcN65

Status: **Current repository convention**  
Date established: **2026-08-12**

## 1. Design-level interface

The AI/designer specifies only:

```text
TotalW
L
NF
M
```

`W` is never a user-facing sizing input. It is derived internally as the per-finger implementation width.

## 2. Verified live PDK mapping

The user's live Cadence IC6.1.7 / tsmcN65 CDF inspection established:

```text
w        -> w (M)
wf       -> total_width(M)       <-- authoritative TotalW field
l        -> l (M)
fingers  -> Number of Fingers
simM     -> Multiplier
nf       -> Nf
m        -> m / iPar("simM")
totalM   -> total_m
```

## 3. Complete CDF state

Every current generator must explicitly assign all eight sizing fields for every MOS:

```skill
cdf->w->value       = W_PER_FINGER
cdf->l->value       = L
cdf->wf->value      = TOTAL_W
cdf->fingers->value = NF
cdf->simM->value    = M
cdf->totalM->value  = NF * M
cdf->nf->value      = NF
cdf->m->value       = M
```

No field may depend on PDK defaults, an old instance value, or an implicit callback.

## 4. Width relation

```text
W_PER_FINGER = TotalW / NF
WF           = TotalW
```

`M` is a multiplier and does **not** change `WF` in this design-level convention.

## 5. totalM relation

The verified repository convention is:

```text
totalM = NF * M
```

Examples:

```text
NF=1, M=1 -> totalM=1
NF=2, M=1 -> totalM=2
NF=3, M=2 -> totalM=6
NF=5, M=3 -> totalM=15
```

## 6. Validation gate

After assignment, generators must read back and validate:

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

Generation must stop on any mismatch.

## 7. Regression evidence

`tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il` is the golden regression test. It verifies explicit assignment, NF/M combinations, save persistence, and `totalM = fingers * simM`. The test was executed successfully in the user's live Cadence IC6.1.7 / tsmcN65 environment on 2026-08-12.

## 8. Legacy policy

Historical W-first artifacts remain unchanged as evidence. They must be classified as legacy and must not be used as current canonical generators.
