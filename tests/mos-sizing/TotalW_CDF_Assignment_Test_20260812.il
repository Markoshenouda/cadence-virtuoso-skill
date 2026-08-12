;=============================================================================
; TotalW CDF assignment regression test - 2026-08-12
; Verified platform: Virtuoso IC6.1.7 / tsmcN65
;
; Purpose:
;   Establish the repository-wide sizing contract:
;       TotalW -> wf
;       L      -> l
;       NF     -> fingers + nf
;       M      -> simM + m
;       W      -> explicit per-finger implementation width
;
; This test intentionally reports the live CDF state after assignment.
; Run it in an empty schematic containing one tsmcN65 pch instance.
;=============================================================================

procedure(TotalW_CDF_Assignment_Test_20260812()
    let((cv inst cdf)
        cv = geGetEditCellView()
        unless(cv error("TOTALW_TEST: Open a schematic containing one tsmcN65 pch instance.\n"))

        inst = car(cv~>instances)
        unless(inst error("TOTALW_TEST: No instance found.\n"))

        cdf = cdfGetInstCDF(inst)
        unless(cdf error("TOTALW_TEST: No CDF found.\n"))

        printf("\n====================================================\n")
        printf("TOTALW CDF ASSIGNMENT TEST\n")
        printf("====================================================\n")
        printf("INSTANCE=%s MASTER=%s/%s\n"
            inst~>name inst~>master~>libName inst~>master~>cellName)

        ; Example design state. NF=1/M=1 keeps W/finger equal to TotalW.
        cdf->w->value       = "8u"
        cdf->l->value       = "480n"
        cdf->wf->value      = "8u"
        cdf->fingers->value = "1"
        cdf->simM->value    = "1"
        cdf->nf->value      = "1"
        cdf->m->value       = "1"

        printf("w       = %L\n" cdf->w->value)
        printf("l       = %L\n" cdf->l->value)
        printf("wf      = %L\n" cdf->wf->value)
        printf("fingers = %L\n" cdf->fingers->value)
        printf("simM    = %L\n" cdf->simM->value)
        printf("nf      = %L\n" cdf->nf->value)
        printf("m       = %L\n" cdf->m->value)

        unless(equal(cdf->w->value "8u") error("TOTALW_TEST: W mismatch.\n"))
        unless(equal(cdf->l->value "480n") error("TOTALW_TEST: L mismatch.\n"))
        unless(equal(cdf->wf->value "8u") error("TOTALW_TEST: WF mismatch.\n"))
        unless(equal(cdf->fingers->value "1") error("TOTALW_TEST: FINGERS mismatch.\n"))
        unless(equal(cdf->simM->value "1") error("TOTALW_TEST: SIMM mismatch.\n"))
        unless(equal(cdf->nf->value "1") error("TOTALW_TEST: NF mismatch.\n"))
        unless(equal(cdf->m->value "1") error("TOTALW_TEST: M mismatch.\n"))

        printf("TOTALW_TEST: PASS - all sizing fields explicitly assigned.\n")
        t
    )
)
