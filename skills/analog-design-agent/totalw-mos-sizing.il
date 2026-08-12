;=============================================================================
; Total-W MOS sizing infrastructure for verified tsmcN65
; Version: 1.0.0 - 2026-08-12
;
; DESIGN-LEVEL INPUTS
;   totalW  = requested total device width
;   length  = channel length
;   fingers = number of physical fingers
;   multiplier = electrical/device multiplier
;
; VERIFIED tsmcN65 CDF names from live CIW inspection:
;   wf       = total_width(M)
;   w        = w (M)
;   fingers  = Number of Fingers
;   simM     = Multiplier
;   nf       = Nf (implementation mirror)
;   m        = iPar("simM") / m (implementation mirror)
;   l        = l (M)
;
; POLICY
;   The design interface is TotalW, never per-finger W.
;   The generator assigns the complete sizing state explicitly:
;       w, l, wf, fingers, simM, nf, m
;   We do not rely on stale GUI state.
;   TotalW is written to wf.  w is derived as TotalW/fingers for the
;   explicit assignment, while the PDK callback remains authoritative.
;   After assignment, the CDF state is printed for verification.
;=============================================================================

procedure(ADAG_SetMOS_TotalW(inst totalW length fingers multiplier)
    let((cdf wPerFinger)
        cdf = cdfGetInstCDF(inst)
        unless(cdf
            error("ADAG_TotalW: Cannot access CDF for %s.\n" inst~>name)
        )

        unless(cdf->w error("ADAG_TotalW: missing CDF parameter w.\n"))
        unless(cdf->l error("ADAG_TotalW: missing CDF parameter l.\n"))
        unless(cdf->wf error("ADAG_TotalW: missing CDF parameter wf.\n"))
        unless(cdf->fingers error("ADAG_TotalW: missing CDF parameter fingers.\n"))
        unless(cdf->simM error("ADAG_TotalW: missing CDF parameter simM.\n"))
        unless(cdf->nf error("ADAG_TotalW: missing CDF parameter nf.\n"))
        unless(cdf->m error("ADAG_TotalW: missing CDF parameter m.\n"))

        unless(> (atoi(fingers) 0)
            error("ADAG_TotalW: fingers must be >= 1.\n")
        )

        unless(> (atoi(multiplier) 0)
            error("ADAG_TotalW: multiplier must be >= 1.\n")
        )

        wPerFinger = sprintf(nil "%g" (atof(totalW) / atoi(fingers)))

        ; Explicitly assign the complete sizing state.
        cdf->w->value       = strcat(wPerFinger "")
        cdf->l->value       = length
        cdf->wf->value      = totalW
        cdf->fingers->value = fingers
        cdf->simM->value    = multiplier
        cdf->nf->value      = fingers
        cdf->m->value       = multiplier

        printf("ADAG_TotalW: %s TotalW=%s L=%s NF=%s M=%s -> w=%s wf=%s fingers=%s simM=%s nf=%s m=%s\n"
            inst~>name totalW length fingers multiplier
            cdf->w->value cdf->wf->value cdf->fingers->value
            cdf->simM->value cdf->nf->value cdf->m->value)

        t
    )
)
