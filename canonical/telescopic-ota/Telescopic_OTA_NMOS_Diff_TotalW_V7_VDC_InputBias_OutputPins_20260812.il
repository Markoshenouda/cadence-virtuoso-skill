; TELESCOPIC OTA V7 — NMOS input / differential output / VDC bias
; Cadence Virtuoso IC6.1.7 / tsmcN65
;
; Repository status: Cadence schematic-generation verified on 2026-08-12.
; Evidence: SCH-1426 (no schematic-check errors), SCH-1181 (saved).
; Performance has NOT been simulated or verified.
;
; Design inputs are TotalW, L, NF, M.  W/finger is derived internally.
; Explicit CDF state: w, l, wf, fingers, simM, totalM, nf, m.
; Routing contract: terminal -> local stub -> net label only.
; No device-to-device wires are created.

setq(TOTA7_LIB "tsmcN65")
setq(TOTA7_NMOS "nch")
setq(TOTA7_PMOS "pch")
setq(TOTA7_STUB 0.75)
setq(TOTA7_WIRE 0.0625)

procedure(TOTA7_DeriveW(TotalW NF)
    let((tw nf)
        tw=cdfParseFloatString(TotalW)
        nf=atoi(NF)
        unless(nf>0 error("TOTA7: NF must be >= 1.\n"))
        sprintf(nil "%g" tw/nf)
    )
)

; Compare CDF physical values numerically instead of requiring identical
; string representations. Cadence PCells may normalize values such as
; "1u" into a different but physically equivalent CDF representation.
procedure(TOTA7_CDFValueMatches(actual expected)
    let((a e tol)
        a=cdfParseFloatString(actual)
        e=cdfParseFloatString(expected)
        tol=max(1e-12 (* 1e-9 (max 1.0 abs(e))))
        <=(abs(- a e) tol)
    )
)

procedure(TOTA7_SetMOS(inst TotalW L NF M)
    let((cdf WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("TOTA7: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("TOTA7: incomplete MOS CDF on %s.\n" inst~>name))
        WperFinger=TOTA7_DeriveW(TotalW NF)
        totalM=sprintf(nil "%d" (atoi(NF) * atoi(M)))

        cdf->w->value=WperFinger
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M

        unless(TOTA7_CDFValueMatches(cdf->w->value WperFinger)
            error("TOTA7: width CDF readback mismatch on %s (expected=%s actual=%s).\n"
                inst~>name WperFinger cdf->w->value))
        unless(TOTA7_CDFValueMatches(cdf->l->value L)
            error("TOTA7: length CDF readback mismatch on %s (expected=%s actual=%s).\n"
                inst~>name L cdf->l->value))
        unless(TOTA7_CDFValueMatches(cdf->wf->value TotalW)
            error("TOTA7: total-width CDF readback mismatch on %s (expected=%s actual=%s).\n"
                inst~>name TotalW cdf->wf->value))
        unless(equal(cdf->fingers->value NF) && equal(cdf->simM->value M) && equal(cdf->totalM->value totalM)
            error("TOTA7: multiplicity CDF readback mismatch on %s.\n" inst~>name))
        unless(equal(cdf->nf->value NF) && equal(cdf->m->value M)
            error("TOTA7: nf/m CDF readback mismatch on %s.\n" inst~>name))
        printf("TOTA7: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW WperFinger L NF M totalM)
        t
    )
)

procedure(TOTA7_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("TOTA7: cannot create %s.\n" name))
        TOTA7_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(TOTA7_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("TOTA7: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("TOTA7: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(TOTA7_StubEnd(inst pinName)
    let((g b s d p dx dy)
        g=TOTA7_PinCenter(inst "G")
        b=TOTA7_PinCenter(inst "B")
        s=TOTA7_PinCenter(inst "S")
        d=TOTA7_PinCenter(inst "D")
        p=TOTA7_PinCenter(inst pinName)
        if(equal(pinName "G") then dx=car(g)-car(b) dy=cadr(g)-cadr(b)
        else if(equal(pinName "B") then dx=car(b)-car(g) dy=cadr(b)-cadr(g)
        else if(equal(pinName "S") then dx=car(s)-car(d) dy=cadr(s)-cadr(d)
        else if(equal(pinName "D") then dx=car(d)-car(s) dy=cadr(d)-cadr(s)
        else error("TOTA7: unsupported terminal %s.\n" pinName)))))
        if(abs(dx)>=abs(dy) then
            if(dx<0.0 then list(car(p)-TOTA7_STUB cadr(p)) else list(car(p)+TOTA7_STUB cadr(p)))
        else
            if(dy<0.0 then list(car(p) cadr(p)-TOTA7_STUB) else list(car(p) cadr(p)+TOTA7_STUB))
        )
    )
)

procedure(TOTA7_LabelTerminal(cv inst pinName netName)
    let((p e wire label)
        p=TOTA7_PinCenter(inst pinName)
        e=TOTA7_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) TOTA7_WIRE TOTA7_WIRE 0)
        unless(wire error("TOTA7: stub failed %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" TOTA7_WIRE nil)
        unless(label error("TOTA7: label failed %s.%s.\n" inst~>name pinName))
        printf("TOTA7: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(TOTA7_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("TOTA7: VDC CDF missing on %s.\n" inst~>name))
        if(cdf->vdc then cdf->vdc->value=value
        else if(cdf->dc then cdf->dc->value=value
        else error("TOTA7: vdc/dc parameter missing on %s.\n" inst~>name)))
        t
    )
)

procedure(TOTA7_CreateVDC(cv master name xy plusNet minusNet value)
    let((inst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("TOTA7: cannot create VDC %s.\n" name))
        TOTA7_SetVDC(inst value)
        TOTA7_LabelTerminal(cv inst "PLUS" plusNet)
        TOTA7_LabelTerminal(cv inst "MINUS" minusNet)
        printf("TOTA7: %s DC=%s\n" name value)
        printf("TOTA7: VDC %s PLUS=%s MINUS=%s VALUE=%s\n" name plusNet minusNet value)
        inst
    )
)

procedure(TOTA7_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("TOTA7: cannot create output pin %s.\n" name))
        printf("TOTA7: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(TOTA7_CellEmpty(cv)
    null(cv~>instances)
)

procedure(CreateTelescopicOTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4 M5 M6 M7 M8 M9 voutpEnd voutnEnd)
        printf("\n============================================================\n")
        printf(" TELESCOPIC OTA V7 - NMOS INPUT / DIFFERENTIAL / VDC BIAS\n")
        printf("============================================================\n")
        printf("PDK       : tsmcN65 standard nch/pch\n")
        printf("VDD/VSS   : 2V / 0V\nGain      : 55dB target\nGBW       : 50MHz target\nCL        : 1pF\n")
        printf("Corner/T  : TT / 27C\nOutput    : VOUTP / VOUTN\nCMFB      : NONE\n")
        printf("Bias      : analogLib/vdc instances\nWiring    : STUB + NET LABEL ONLY; NO DEVICE-TO-DEVICE WIRES\n")
        printf("Sizing    : TotalW / L / NF / M\n============================================================\n")
        cv=geGetEditCellView()
        unless(cv error("TOTA7: open an editable schematic first.\n"))
        unless(TOTA7_CellEmpty(cv) error("TOTA7: use a new EMPTY schematic.\n"))
        nmos=dbOpenCellViewByType(TOTA7_LIB TOTA7_NMOS "symbol" "" "r")
        pmos=dbOpenCellViewByType(TOTA7_LIB TOTA7_PMOS "symbol" "" "r")
        vdcMaster=dbOpenCellViewByType("analogLib" "vdc" "symbol" "" "r")
        pinMaster=dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
        unless(nmos && pmos && vdcMaster && pinMaster error("TOTA7: required symbol master is unavailable.\n"))

        M7=TOTA7_PlaceMOS(cv pmos "M7" -5:10 "10u" "1u" "1" "1" "R0")
        M8=TOTA7_PlaceMOS(cv pmos "M8" 5:10 "10u" "1u" "1" "1" "R0")
        M5=TOTA7_PlaceMOS(cv pmos "M5" -5:6 "8u" "1u" "1" "1" "R0")
        M6=TOTA7_PlaceMOS(cv pmos "M6" 5:6 "8u" "1u" "1" "1" "R0")
        M3=TOTA7_PlaceMOS(cv nmos "M3" -5:2 "6u" "1u" "1" "1" "R0")
        M4=TOTA7_PlaceMOS(cv nmos "M4" 5:2 "6u" "1u" "1" "1" "R0")
        M1=TOTA7_PlaceMOS(cv nmos "M1" -5:-2 "10u" "1u" "1" "1" "R0")
        M2=TOTA7_PlaceMOS(cv nmos "M2" 5:-2 "10u" "1u" "1" "1" "R0")
        M9=TOTA7_PlaceMOS(cv nmos "M9" 0:-6 "12u" "1u" "1" "1" "R0")

        TOTA7_LabelTerminal(cv M1 "G" "VINP") TOTA7_LabelTerminal(cv M1 "D" "NLEFT") TOTA7_LabelTerminal(cv M1 "S" "TAIL") TOTA7_LabelTerminal(cv M1 "B" "VSS")
        TOTA7_LabelTerminal(cv M2 "G" "VINN") TOTA7_LabelTerminal(cv M2 "D" "NRIGHT") TOTA7_LabelTerminal(cv M2 "S" "TAIL") TOTA7_LabelTerminal(cv M2 "B" "VSS")
        TOTA7_LabelTerminal(cv M3 "G" "VBN_CAS") voutpEnd=TOTA7_LabelTerminal(cv M3 "D" "VOUTP") TOTA7_LabelTerminal(cv M3 "S" "NLEFT") TOTA7_LabelTerminal(cv M3 "B" "VSS")
        TOTA7_LabelTerminal(cv M4 "G" "VBN_CAS") voutnEnd=TOTA7_LabelTerminal(cv M4 "D" "VOUTN") TOTA7_LabelTerminal(cv M4 "S" "NRIGHT") TOTA7_LabelTerminal(cv M4 "B" "VSS")
        TOTA7_LabelTerminal(cv M5 "G" "VBP_CAS") TOTA7_LabelTerminal(cv M5 "D" "VOUTP") TOTA7_LabelTerminal(cv M5 "S" "PLEFT") TOTA7_LabelTerminal(cv M5 "B" "VDD")
        TOTA7_LabelTerminal(cv M6 "G" "VBP_CAS") TOTA7_LabelTerminal(cv M6 "D" "VOUTN") TOTA7_LabelTerminal(cv M6 "S" "PRIGHT") TOTA7_LabelTerminal(cv M6 "B" "VDD")
        TOTA7_LabelTerminal(cv M7 "G" "VBP_LOAD") TOTA7_LabelTerminal(cv M7 "D" "PLEFT") TOTA7_LabelTerminal(cv M7 "S" "VDD") TOTA7_LabelTerminal(cv M7 "B" "VDD")
        TOTA7_LabelTerminal(cv M8 "G" "VBP_LOAD") TOTA7_LabelTerminal(cv M8 "D" "PRIGHT") TOTA7_LabelTerminal(cv M8 "S" "VDD") TOTA7_LabelTerminal(cv M8 "B" "VDD")
        TOTA7_LabelTerminal(cv M9 "G" "VBN_TAIL") TOTA7_LabelTerminal(cv M9 "D" "TAIL") TOTA7_LabelTerminal(cv M9 "S" "VSS") TOTA7_LabelTerminal(cv M9 "B" "VSS")

        TOTA7_CreateVDC(cv vdcMaster "VDD_SRC" -15:10 "VDD" "VSS" "2")
        TOTA7_CreateVDC(cv vdcMaster "VSS_SRC" -15:6 "VSS" "VSS" "0")
        TOTA7_CreateVDC(cv vdcMaster "VBN_TAIL_SRC" -15:2 "VBN_TAIL" "VSS" "0.60")
        TOTA7_CreateVDC(cv vdcMaster "VBN_CAS_SRC" -15:-2 "VBN_CAS" "VSS" "1.05")
        TOTA7_CreateVDC(cv vdcMaster "VBP_CAS_SRC" 15:2 "VBP_CAS" "VSS" "1.25")
        TOTA7_CreateVDC(cv vdcMaster "VBP_LOAD_SRC" 15:6 "VBP_LOAD" "VSS" "1.00")
        TOTA7_CreateVDC(cv vdcMaster "VINP_SRC" -15:-6 "VINP" "VSS" "0.80")
        TOTA7_CreateVDC(cv vdcMaster "VINN_SRC" 15:-6 "VINN" "VSS" "0.80")
        TOTA7_CreatePin(cv pinMaster "VOUTP" "output" voutpEnd)
        TOTA7_CreatePin(cv pinMaster "VOUTN" "output" voutnEnd)
        dbSave(cv)
        printf("\n============================================================\n TOTA7 GENERATOR COMPLETED\n============================================================\n")
        printf("MOS      : M1..M9\nOUTPUTS  : VOUTP / VOUTN\nBIAS VDC : VBN_TAIL / VBN_CAS / VBP_CAS / VBP_LOAD / VINP / VINN\n")
        printf("POWER VDC: VDD / VSS\nOUTPUT PIN: VOUTP / VOUTN\nWIRING   : local stub + net label ONLY\n")
        printf("CDF      : w/l/wf/fingers/simM/totalM/nf/m explicit\ntotalM   : NF * M\n")
        printf("STATUS   : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n============================================================\n")
        t
    )
)
