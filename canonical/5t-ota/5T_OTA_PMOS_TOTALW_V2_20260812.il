; 5T OTA PMOS + VDC RULE TEST — TOTALW V2
; Cadence Virtuoso IC6.1.7 / tsmcN65
;
; Design-level interface: TotalW, L, NF, M only.
; Complete CDF state: w, l, wf, fingers, simM, totalM, nf, m.
; totalM = NF*M. W is derived internally as TotalW/NF.

setq(T5TW_LIB "tsmcN65")
(setq T5TW_NCH "nch")
(setq T5TW_PCH "pch")
(setq T5TW_STUB 0.75)
(setq T5TW_W 0.0625)

procedure(T5TW_DeriveW(TotalW NF)
    let((tw nf wp)
        tw=cdfParseFloatString(TotalW)
        nf=atoi(NF)
        unless(nf>0 error("T5TW: NF must be >= 1.\n"))
        wp=tw/nf
        sprintf(nil "%g" wp)
    )
)

procedure(T5TW_SetMOS(inst TotalW L NF M)
    let((cdf WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("T5TW: CDF missing on %s.\n" inst~>name))
        unless(cdf->w error("T5TW: w missing.\n"))
        unless(cdf->l error("T5TW: l missing.\n"))
        unless(cdf->wf error("T5TW: wf missing.\n"))
        unless(cdf->fingers error("T5TW: fingers missing.\n"))
        unless(cdf->simM error("T5TW: simM missing.\n"))
        unless(cdf->totalM error("T5TW: totalM missing.\n"))
        unless(cdf->nf error("T5TW: nf missing.\n"))
        unless(cdf->m error("T5TW: m missing.\n"))
        WperFinger=T5TW_DeriveW(TotalW NF)
        totalM=sprintf(nil "%d" (* (atoi(NF)) (atoi(M))))
        cdf->w->value=WperFinger
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        printf("T5TW: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s WF=%s totalM=%s\n" inst~>name TotalW WperFinger L NF M cdf->wf->value cdf->totalM->value)
        unless(equal(cdf->w->value WperFinger) error("T5TW: W mismatch.\n"))
        unless(equal(cdf->l->value L) error("T5TW: L mismatch.\n"))
        unless(equal(cdf->wf->value TotalW) error("T5TW: WF mismatch.\n"))
        unless(equal(cdf->fingers->value NF) error("T5TW: fingers mismatch.\n"))
        unless(equal(cdf->simM->value M) error("T5TW: simM mismatch.\n"))
        unless(equal(cdf->totalM->value totalM) error("T5TW: totalM mismatch.\n"))
        unless(equal(cdf->nf->value NF) error("T5TW: nf mismatch.\n"))
        unless(equal(cdf->m->value M) error("T5TW: m mismatch.\n"))
        t
    )
)

procedure(T5TW_PinCenter(inst name)
    let((term pin fig)
        term=dbFindTermByName(inst~>master name)
        unless(term error("T5TW: missing terminal %s.\n" name))
        pin=car(term~>pins)
        fig=pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(T5TW_Place(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("T5TW: cannot create %s.\n" name))
        T5TW_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(T5TW_PMOSPass(inst)
    let((s d)
        s=T5TW_PinCenter(inst "S")
        d=T5TW_PinCenter(inst "D")
        printf("T5TW: %s %L S=%L D=%L\n" inst~>name inst~>orient s d)
        if(cadr(s)>cadr(d) then printf("T5TW: PASS source-top/drain-bottom.\n") t printf("T5TW: FAIL source-top/drain-bottom.\n") nil)
    )
)

procedure(T5TW_PlaceVerifiedPMOS(cv master name xy TotalW L NF M)
    let((orient inst pass)
        orient=list("MX" "MY" "R0" "R180")
        pass=nil
        foreach(o orient
            unless(pass
                inst=dbCreateInst(cv master name xy o)
                unless(inst error("T5TW: PMOS create failed.\n"))
                T5TW_SetMOS(inst TotalW L NF M)
                if(T5TW_PMOSPass(inst) then pass=t else dbDeleteObject(inst) inst=nil)
            )
        )
        unless(pass error("T5TW: no source-top PMOS orientation found.\n"))
        inst
    )
)

procedure(T5TW_StubEnd(inst pinName)
    let((g b s d p dx dy)
        g=T5TW_PinCenter(inst "G") b=T5TW_PinCenter(inst "B")
        s=T5TW_PinCenter(inst "S") d=T5TW_PinCenter(inst "D")
        p=T5TW_PinCenter(inst pinName)
        if(equal(pinName "G") then dx=car(g)-car(b) dy=cadr(g)-cadr(b)
        else if(equal(pinName "B") then dx=car(b)-car(g) dy=cadr(b)-cadr(g)
        else if(equal(pinName "S") then dx=car(s)-car(d) dy=cadr(s)-cadr(d)
        else if(equal(pinName "D") then dx=car(d)-car(s) dy=cadr(d)-cadr(s)
        else error("T5TW: unsupported terminal.\n"))))
        if(abs(dx)>=abs(dy) then
            if(dx<0.0 then list(car(p)-T5TW_STUB cadr(p)) else list(car(p)+T5TW_STUB cadr(p)))
        else
            if(dy<0.0 then list(car(p) cadr(p)-T5TW_STUB) else list(car(p) cadr(p)+T5TW_STUB))
        )
    )
)

procedure(T5TW_Label(cv inst pinName netName)
    let((p e w l)
        p=T5TW_PinCenter(inst pinName) e=T5TW_StubEnd(inst pinName)
        w=schCreateWire(cv "route" "full" list(p e) T5TW_W T5TW_W 0)
        unless(w error("T5TW: wire failed.\n"))
        l=schCreateWireLabel(cv car(w) e netName "lowerLeft" "R0" "stick" T5TW_W nil)
        unless(l error("T5TW: label failed.\n")) l
    )
)

procedure(T5TW_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("T5TW: no VDC CDF.\n"))
        unless(cdf->vdc error("T5TW: VDC parameter missing.\n"))
        cdf->vdc->value=value
    )
)

procedure(T5TW_VPin(inst name)
    let((term pin fig)
        term=dbFindTermByName(inst~>master name) pin=car(term~>pins) fig=pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(T5TW_VDC(cv master name xy netName value)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        T5TW_SetVDC(inst value)
        plus=T5TW_VPin(inst "PLUS") minus=T5TW_VPin(inst "MINUS")
        ep=list(car(plus) cadr(plus)+T5TW_STUB) em=list(car(minus) cadr(minus)-T5TW_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) T5TW_W T5TW_W 0)
        wm=schCreateWire(cv "route" "full" list(minus em) T5TW_W T5TW_W 0)
        schCreateWireLabel(cv car(wp) ep netName "lowerLeft" "R0" "stick" T5TW_W nil)
        schCreateWireLabel(cv car(wm) em "VSS" "lowerLeft" "R0" "stick" T5TW_W nil)
        inst
    )
)

procedure(T5TW_Pin(cv pinMaster netName direction xy)
    schCreatePin(cv pinMaster netName direction nil xy "R0")
)

procedure(Create5TOTA_PMOS_TOTALW_V2_20260812()
    let((cv nmos pmos pinMaster vdcMaster M1 M2 M3 M4 M5)
        cv=geGetEditCellView()
        unless(cv error("T5TW: open an EMPTY editable schematic.\n"))
        nmos=dbOpenCellViewByType(T5TW_LIB T5TW_NCH "symbol" "" "r")
        pmos=dbOpenCellViewByType(T5TW_LIB T5TW_PCH "symbol" "" "r")
        pinMaster=dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
        vdcMaster=dbOpenCellViewByType("analogLib" "vdc" "symbol" "" "r")
        M1=T5TW_Place(cv nmos "M1" 0:6 "2u" "240n" "1" "1" "R0")
        M2=T5TW_Place(cv nmos "M2" 6:6 "2u" "240n" "1" "1" "R0")
        M5=T5TW_Place(cv nmos "M5" 3:2 "6u" "480n" "1" "1" "R0")
        M3=T5TW_PlaceVerifiedPMOS(cv pmos "M3" 0:10 "4u" "480n" "1" "1")
        M4=T5TW_PlaceVerifiedPMOS(cv pmos "M4" 6:10 "4u" "480n" "1" "1")
        T5TW_Label(cv M1 "G" "VINP") T5TW_Label(cv M1 "D" "MIRROR") T5TW_Label(cv M1 "S" "TAIL") T5TW_Label(cv M1 "B" "VSS")
        T5TW_Label(cv M2 "G" "VINN") T5TW_Label(cv M2 "D" "VOUT") T5TW_Label(cv M2 "S" "TAIL") T5TW_Label(cv M2 "B" "VSS")
        T5TW_Label(cv M3 "G" "MIRROR") T5TW_Label(cv M3 "D" "MIRROR") T5TW_Label(cv M3 "S" "VDD") T5TW_Label(cv M3 "B" "VDD")
        T5TW_Label(cv M4 "G" "MIRROR") T5TW_Label(cv M4 "D" "VOUT") T5TW_Label(cv M4 "S" "VDD") T5TW_Label(cv M4 "B" "VDD")
        T5TW_Label(cv M5 "G" "VBN_TAIL") T5TW_Label(cv M5 "D" "TAIL") T5TW_Label(cv M5 "S" "VSS") T5TW_Label(cv M5 "B" "VSS")
        T5TW_Pin(cv pinMaster "VOUT" "output" 9:8)
        T5TW_VDC(cv vdcMaster "V_VDD_RULETEST" 12:14 "VDD" "1.5")
        T5TW_VDC(cv vdcMaster "V_VBN_RULETEST" 12:9 "VBN_TAIL" "0.6")
        T5TW_VDC(cv vdcMaster "V_VINP_RULETEST" 12:4 "VINP" "0.75")
        T5TW_VDC(cv vdcMaster "V_VINN_RULETEST" 12:-1 "VINN" "0.75")
        T5TW_VDC(cv vdcMaster "V_VSS_RULETEST" 18:4 "VSS" "0.0")
        unless(T5TW_PMOSPass(M3) error("T5TW: M3 orientation failed.\n"))
        unless(T5TW_PMOSPass(M4) error("T5TW: M4 orientation failed.\n"))
        dbSave(cv)
        printf("T5TW: TotalW/L/NF/M interface active; complete CDF state explicitly assigned.\n")
        t
    )
)
