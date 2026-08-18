;==============================================================================
; 5T OTA PMOS + VDC RULE TEST — TOTALW V1
; Cadence Virtuoso IC6.1.7 / tsmcN65
;
; VSS SOURCE CONTRACT:
;   VDC PLUS  -> existing wire + net label
;   VDC MINUS -> direct analogLib/gnd, no wire, no VSS label
;==============================================================================

setq(T5TW_LIB "tsmcN65")
setq(T5TW_NCH "nch")
(setq T5TW_PCH "pch")
(setq T5TW_STUB 0.75)
(setq T5TW_W 0.0625)

procedure(T5TW_SetMOS(inst TotalW W L NF M)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("T5TW: no MOS CDF on %s.\n" inst~>name))
        unless(cdf->w error("T5TW: missing w.\n"))
        unless(cdf->l error("T5TW: missing l.\n"))
        unless(cdf->wf error("T5TW: missing wf.\n"))
        unless(cdf->fingers error("T5TW: missing fingers.\n"))
        unless(cdf->simM error("T5TW: missing simM.\n"))
        unless(cdf->nf error("T5TW: missing nf.\n"))
        unless(cdf->m error("T5TW: missing m.\n"))
        cdf->w->value=W
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->nf->value=NF
        cdf->m->value=M
        printf("T5TW: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s wf=%s fingers=%s simM=%s nf=%s m=%s\n"
            inst~>name TotalW W L NF M cdf->wf->value
            cdf->fingers->value cdf->simM->value cdf->nf->value cdf->m->value)
        unless(equal(cdf->wf->value TotalW)
            error("T5TW: TotalW/wf mismatch on %s.\n" inst~>name))
        unless(equal(cdf->l->value L)
            error("T5TW: L mismatch on %s.\n" inst~>name))
        t
    )
)

procedure(T5TW_PinCenter(inst name)
    let((term pin fig)
        term=dbFindTermByName(inst~>master name)
        unless(term error("T5TW: missing terminal %s.\n" name))
        pin=car(term~>pins)
        unless(pin error("T5TW: missing pin figure %s.\n" name))
        fig=pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(T5TW_Place(cv master name xy TotalW W L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("T5TW: cannot create %s.\n" name))
        T5TW_SetMOS(inst TotalW W L NF M)
        inst
    )
)

procedure(T5TW_PMOSPass(inst)
    let((s d)
        s=T5TW_PinCenter(inst "S")
        d=T5TW_PinCenter(inst "D")
        printf("T5TW: %s %L S=%L D=%L\n" inst~>name inst~>orient s d)
        if(cadr(s)>cadr(d) then
            printf("T5TW: PASS source-top/drain-bottom.\n")
            t
            printf("T5TW: FAIL source-top/drain-bottom.\n")
            nil
        )
    )
)

procedure(T5TW_PlaceVerifiedPMOS(cv master name xy TotalW W L NF M)
    let((orient inst pass)
        orient=list("MX" "MY" "R0" "R180")
        pass=nil
        foreach(o orient
            unless(pass
                inst=dbCreateInst(cv master name xy o)
                unless(inst error("T5TW: PMOS create failed.\n"))
                T5TW_SetMOS(inst TotalW W L NF M)
                if(T5TW_PMOSPass(inst) then
                    pass=t
                    else
                    dbDeleteObject(inst)
                    inst=nil
                )
            )
        )
        unless(pass error("T5TW: no source-top PMOS orientation found for %s.\n" name))
        inst
    )
)

procedure(T5TW_StubEnd(inst pinName)
    let((g b s d p dx dy)
        g=T5TW_PinCenter(inst "G")
        b=T5TW_PinCenter(inst "B")
        s=T5TW_PinCenter(inst "S")
        d=T5TW_PinCenter(inst "D")
        p=T5TW_PinCenter(inst pinName)
        if(equal(pinName "G") then
            dx=car(g)-car(b) dy=cadr(g)-cadr(b)
        else if(equal(pinName "B") then
            dx=car(b)-car(g) dy=cadr(b)-cadr(g)
        else if(equal(pinName "S") then
            dx=car(s)-car(d) dy=cadr(s)-cadr(d)
        else if(equal(pinName "D") then
            dx=car(d)-car(s) dy=cadr(d)-cadr(s)
        else error("T5TW: unsupported terminal %s.\n" pinName)
        ))))
        if(abs(dx)>=abs(dy) then
            if(dx<0.0 then list(car(p)-T5TW_STUB cadr(p)) else list(car(p)+T5TW_STUB cadr(p)))
        else
            if(dy<0.0 then list(car(p) cadr(p)-T5TW_STUB) else list(car(p) cadr(p)+T5TW_STUB))
        )
    )
)

procedure(T5TW_Label(cv inst pinName netName)
    let((p e w l)
        p=T5TW_PinCenter(inst pinName)
        e=T5TW_StubEnd(inst pinName)
        w=schCreateWire(cv "route" "full" list(p e) T5TW_W T5TW_W 0)
        unless(w error("T5TW: wire failed %s.%s.\n" inst~>name pinName))
        l=schCreateWireLabel(cv car(w) e netName "lowerLeft" "R0" "stick" T5TW_W nil)
        unless(l error("T5TW: label failed %s.\n" netName))
        l
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
        term=dbFindTermByName(inst~>master name)
        unless(term error("T5TW: missing VDC terminal %s.\n" name))
        pin=car(term~>pins)
        fig=pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(T5TW_VDC(cv master gndMaster name xy plusNet value minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("T5TW: cannot create VDC %s.\n" name))
        T5TW_SetVDC(inst value)
        plus=T5TW_VPin(inst "PLUS")
        minus=T5TW_VPin(inst "MINUS")
        ep=list(car(plus) cadr(plus)+T5TW_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) T5TW_W T5TW_W 0)
        unless(wp error("T5TW: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" T5TW_W nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("T5TW: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-T5TW_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) T5TW_W T5TW_W 0)
            unless(wm error("T5TW: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" T5TW_W nil)
        )
        printf("T5TW: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(T5TW_Pin(cv pinMaster netName direction xy)
    schCreatePin(cv pinMaster netName direction nil xy "R0")
)

procedure(Create5TOTA_PMOS_TOTALW_V1_20260812()
    let((cv nmos pmos pinMaster vdcMaster gndMaster M1 M2 M3 M4 M5)
        printf("\n====================================================\n")
        printf("  5T OTA PMOS TOTALW V1\n")
        printf("====================================================\n")
        cv=geGetEditCellView()
        unless(cv error("T5TW: open an EMPTY editable schematic.\n"))
        nmos=dbOpenCellViewByType(T5TW_LIB T5TW_NCH "symbol" "" "r")
        pmos=dbOpenCellViewByType(T5TW_LIB T5TW_PCH "symbol" "" "r")
        pinMaster=dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
        vdcMaster=dbOpenCellViewByType("analogLib" "vdc" "symbol" "" "r")
        gndMaster=dbOpenCellViewByType("analogLib" "gnd" "symbol" "" "r")
        unless(nmos error("T5TW: cannot open nch.\n"))
        unless(pmos error("T5TW: cannot open pch.\n"))
        unless(pinMaster error("T5TW: cannot open iopin.\n"))
        unless(vdcMaster error("T5TW: cannot open vdc.\n"))
        unless(gndMaster error("T5TW: cannot open gnd.\n"))

        M1=T5TW_Place(cv nmos "M1" 0:6 "2u" "2u" "240n" "1" "1" "R0")
        M2=T5TW_Place(cv nmos "M2" 6:6 "2u" "2u" "240n" "1" "1" "R0")
        M5=T5TW_Place(cv nmos "M5" 3:2 "6u" "6u" "480n" "1" "1" "R0")
        M3=T5TW_PlaceVerifiedPMOS(cv pmos "M3" 0:10 "4u" "4u" "480n" "1" "1")
        M4=T5TW_PlaceVerifiedPMOS(cv pmos "M4" 6:10 "4u" "4u" "480n" "1" "1")

        T5TW_Label(cv M1 "G" "VINP")
        T5TW_Label(cv M1 "D" "MIRROR")
        T5TW_Label(cv M1 "S" "TAIL")
        T5TW_Label(cv M1 "B" "VSS")
        T5TW_Label(cv M2 "G" "VINN")
        T5TW_Label(cv M2 "D" "VOUT")
        T5TW_Label(cv M2 "S" "TAIL")
        T5TW_Label(cv M2 "B" "VSS")
        T5TW_Label(cv M3 "G" "MIRROR")
        T5TW_Label(cv M3 "D" "MIRROR")
        T5TW_Label(cv M3 "S" "VDD")
        T5TW_Label(cv M3 "B" "VDD")
        T5TW_Label(cv M4 "G" "MIRROR")
        T5TW_Label(cv M4 "D" "VOUT")
        T5TW_Label(cv M4 "S" "VDD")
        T5TW_Label(cv M4 "B" "VDD")
        T5TW_Label(cv M5 "G" "VBN_TAIL")
        T5TW_Label(cv M5 "D" "TAIL")
        T5TW_Label(cv M5 "S" "VSS")
        T5TW_Label(cv M5 "B" "VSS")

        T5TW_Pin(cv pinMaster "VOUT" "output" 9:8)
        T5TW_VDC(cv vdcMaster gndMaster "V_VDD_RULETEST" 12:14 "VDD" "1.5" "VSS")
        T5TW_VDC(cv vdcMaster gndMaster "V_VBN_RULETEST" 12:9 "VBN_TAIL" "0.6" "VSS")
        T5TW_VDC(cv vdcMaster gndMaster "V_VINP_RULETEST" 12:4 "VINP" "0.75" "VSS")
        T5TW_VDC(cv vdcMaster gndMaster "V_VINN_RULETEST" 12:-1 "VINN" "0.75" "VSS")
        T5TW_VDC(cv vdcMaster gndMaster "V_VSS_RULETEST" 18:4 "VSS" "0.0" "GND")

        unless(T5TW_PMOSPass(M3) error("T5TW: M3 orientation failed.\n"))
        unless(T5TW_PMOSPass(M4) error("T5TW: M4 orientation failed.\n"))
        dbSave(cv)
        printf("T5TW: GENERATOR COMPLETED. TotalW-first sizing active.\n")
        t
    )
)
