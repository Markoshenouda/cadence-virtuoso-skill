; DEPRECATED COMPATIBILITY TEST
; Superseded by:
;   tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5_20260812.il
;
; The current golden contract is:
;   Design inputs = TotalW, L, NF, M
;   Explicit CDF = w, l, wf, fingers, simM, totalM, nf, m
;   totalM = NF * M
;
; Keep this file only so old references remain discoverable. Do not use it
; as the current regression test.

procedure(TW_Test_TotalW_CDF_Assignment()
    printf("\nDEPRECATED: use TW_Complete_TotalW_Regression_Test_V5() from\n")
    printf("TotalW_CDF_Assignment_Complete_Test_V5_20260812.il\n")
    t
)
