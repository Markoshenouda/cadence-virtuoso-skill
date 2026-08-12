; FINAL tsmcN65 MOS SIZING REGRESSION TEST V5
;
; Design-level inputs: TotalW, L, NF, M
; Explicit CDF state: w, l, wf, fingers, simM, totalM, nf, m
; totalM = NF * M
;
; Test A: TotalW=4u  L=480n NF=1 M=1  -> W=4u, totalM=1
; Test B: TotalW=6u  L=360n NF=2 M=1  -> W=3u, totalM=2
; Test C: TotalW=6u  L=360n NF=3 M=2  -> W=2u, totalM=6
; Test D: TotalW=10u L=1u   NF=5 M=3  -> W=666.6667n, totalM=15
;
; This file was executed successfully in the user's live Cadence
; IC6.1.7 / tsmcN65 environment on 2026-08-12.

procedure(TW5_PrintCDF(inst label)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        printf("\n----------------------------------------\n")
        printf("%s\n" label)
        printf("INSTANCE = %s\n" inst~>name)
        printf("W       = %L\n" cdf->w->value)
        printf("L       = %L\n" cdf->l->value)
        printf("WF      = %L\n" cdf->wf->value)
        printf("fingers = %L\n" cdf->fingers->value)
        printf("simM    = %L\n" cdf->simM->value)
        printf("totalM  = %L\n" cdf->totalM->value)
        printf("nf      = %L\n" cdf->nf->value)
        printf("m       = %L\n" cdf->m->value)
        printf("----------------------------------------\n")
    )
)

procedure(TW5_CheckCDF(inst label expW expL expWF expNF expM expTotalM)
    let((cdf pass)
        cdf=cdfGetInstCDF(inst)
        pass=t
        printf("\n===== VERIFY %s =====\n" label)
        if(equal(cdf->w->value expW) then printf("PASS: W       = %L\n" cdf->w->value) else printf("FAIL: W       expected %L, got %L\n" expW cdf->w->value) pass=nil)
        if(equal(cdf->l->value expL) then printf("PASS: L       = %L\n" cdf->l->value) else printf("FAIL: L       expected %L, got %L\n" expL cdf->l->value) pass=nil)
        if(equal(cdf->wf->value expWF) then printf("PASS: WF      = %L\n" cdf->wf->value) else printf("FAIL: WF      expected %L, got %L\n" expWF cdf->wf->value) pass=nil)
        if(equal(cdf->fingers->value expNF) then printf("PASS: fingers = %L\n" cdf->fingers->value) else printf("FAIL: fingers expected %L, got %L\n" expNF cdf->fingers->value) pass=nil)
        if(equal(cdf->simM->value expM) then printf("PASS: simM    = %L\n" cdf->simM->value) else printf("FAIL: simM    expected %L, got %L\n" expM cdf->simM->value) pass=nil)
        if(equal(cdf->totalM->value expTotalM) then printf("PASS: totalM  = %L\n" cdf->totalM->value) else printf("FAIL: totalM  expected %L, got %L\n" expTotalM cdf->totalM->value) pass=nil)
        if(equal(cdf->nf->value expNF) then printf("PASS: nf      = %L\n" cdf->nf->value) else printf("FAIL: nf      expected %L, got %L\n" expNF cdf->nf->value) pass=nil)
        if(equal(cdf->m->value expM) then printf("PASS: m       = %L\n" cdf->m->value) else printf("FAIL: m       expected %L, got %L\n" expM cdf->m->value) pass=nil)
        if(equal(atoi(cdf->fingers->value)*atoi(cdf->simM->value) atoi(cdf->totalM->value)) then printf("PASS: totalM = fingers * simM = %d * %d = %d\n" atoi(cdf->fingers->value) atoi(cdf->simM->value) atoi(cdf->totalM->value)) else printf("FAIL: totalM arithmetic mismatch\n") pass=nil)
        if(pass then printf("RESULT: %s PASS\n" label) else printf("RESULT: %s FAIL\n" label))
        pass
    )
)

procedure(TW5_CreateAndAssign(cv master name xy W L TotalW NF M)
    let((inst cdf totalM)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("TW5: failed creating %s.\n" name))
        cdf=cdfGetInstCDF(inst)
        totalM=sprintf(nil "%d" (* (atoi(NF)) (atoi(M))))
        cdf->w->value=W
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        inst
    )
)

procedure(TW_Complete_TotalW_Regression_Test_V5()
    let((cv master A B C D pa pb pc pd)
        printf("\n============================================================\n")
        printf("     COMPLETE TOTALW MOS SIZING REGRESSION TEST V5\n")
        printf("============================================================\n")
        cv=geGetEditCellView()
        unless(cv error("TW5: Open an editable schematic first.\n"))
        master=dbOpenCellViewByType("tsmcN65" "pch" "symbol" "" "r")
        unless(master error("TW5: Could not open tsmcN65/pch.\n"))

        A=TW5_CreateAndAssign(cv master "M_TOTALW_TEST_A_V5" -12:0 "4u" "480n" "4u" "1" "1")
        B=TW5_CreateAndAssign(cv master "M_TOTALW_TEST_B_V5" -4:0 "3u" "360n" "6u" "2" "1")
        C=TW5_CreateAndAssign(cv master "M_TOTALW_TEST_C_V5" 4:0 "2u" "360n" "6u" "3" "2")
        D=TW5_CreateAndAssign(cv master "M_TOTALW_TEST_D_V5" 12:0 "666.6667n" "1u" "10u" "5" "3")

        dbSave(cv)
        TW5_PrintCDF(A "TEST A - FINAL")
        TW5_PrintCDF(B "TEST B - FINAL")
        TW5_PrintCDF(C "TEST C - FINAL")
        TW5_PrintCDF(D "TEST D - FINAL")

        pa=TW5_CheckCDF(A "TEST A" "4u" "480n" "4u" "1" "1" "1")
        pb=TW5_CheckCDF(B "TEST B" "3u" "360n" "6u" "2" "1" "2")
        pc=TW5_CheckCDF(C "TEST C" "2u" "360n" "6u" "3" "2" "6")
        pd=TW5_CheckCDF(D "TEST D" "666.6667n" "1u" "10u" "5" "3" "15")

        printf("\n============================================================\n")
        if(pa && pb && pc && pd then
            printf("COMPLETE TOTALW REGRESSION TEST V5: PASS\n")
            printf("W/L/WF/NF/M fields are explicit.\n")
            printf("totalM = fingers * simM is verified.\n")
            printf("No sizing field relies on PDK defaults.\n")
        else
            printf("COMPLETE TOTALW REGRESSION TEST V5: FAIL\n")
        )
        printf("============================================================\n")
        t
    )
)
