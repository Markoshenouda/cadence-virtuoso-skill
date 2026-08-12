# TotalW MOS Sizing Convention — tsmcN65

Status: **Current repository convention**

Date established: 2026-08-12

## Verified live PDK behavior

The user's live Cadence IC6.1.7 / tsmcN65 CDF inspection showed:

```text
w        -> w (M)
wf       -> total_width(M)
fingers  -> Number of Fingers
simM     -> Multiplier
nf       -> Nf
m        -> m / iPar("simM")
l        -> l (M)
```

The decisive observation was:

```text
BEFORE:
w  = 200n
wf = 200n

AFTER:
w  = 200n
wf = 16u
```

when `cdf->wf->value = "16u"` was assigned directly. Therefore `wf` is the verified total-width field and must be the authoritative TotalW field in the agent architecture.

## Design-level interface

Users and the AI reason about:

```text
TotalW
L
NF
M
```

They should not be required to reason about per-finger `w` unless implementation details are explicitly relevant.

## Cadence-level assignment

Every current generator must explicitly assign the complete CDF state:

```skill
cdf->w->value       = W_PER_FINGER
cdf->l->value       = L
cdf->wf->value      = TOTAL_W
cdf->fingers->value = NF
cdf->simM->value    = M
cdf->nf->value      = NF
cdf->m->value       = M
```

Then print and validate all values.

## Important rule about callbacks

Direct CDF assignment of `wf` was observed to update `wf` itself without changing `w` in the CIW experiment. Therefore the generator must **not** assume that assigning `wf` automatically executes every GUI callback or recomputes every dependent field.

For that reason the repository policy is to explicitly assign the complete CDF state rather than rely on stale/default PCell state.

## Current migration policy

- Current canonical generators: migrate to TotalW-first.
- Current skills and master knowledge: TotalW-first.
- Regression tests: verify explicit `w/l/wf/fingers/simM/nf/m` assignment.
- Historical artifacts: preserve their original W-first state and classify them as legacy; do not rewrite evidence retroactively.

## Example

For `NF=1`, `M=1`:

```text
TotalW = 4u
W/finger = 4u
L = 480n
```

For a future multi-finger design, the sizing layer must explicitly derive the intended implementation `W/finger` from the design-level TotalW and selected finger count, then assign both values to the CDF. The repository must never silently change the user's requested TotalW.
