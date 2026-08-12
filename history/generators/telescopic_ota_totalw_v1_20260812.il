;=============================================================================
; Telescopic OTA TotalW V1 - PMOS input / single-ended output
; Cadence Virtuoso IC6.1.7 / tsmcN65
;
; Current sizing contract:
;   TotalW -> wf
;   L      -> l
;   NF     -> fingers + nf
;   M      -> simM + m
;   W      -> explicit per-finger implementation width
;
; All current reference devices use NF=1/M=1, so W/finger=TotalW.
; VOUT is generated from the actual M4.D terminal stub endpoint.
;=============================================================================

setq(TOTA_TW_LIB "tsmcN65")
setq(TOTA_TW_NMOS "nch")
(setq TOTA_TW_PMOS "pch")
setq(TOTA_TW_STUB 0.75)
setq(TOTA_TW_WIRE 0.0625)
setq(TOTA_TW_PIN_LIB "basic")
setq(TOTA_TW_PIN_CELL "iopin")

procedure(TOTA_TW_SetMOS(inst TotalW W L NF M)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("TOTA_TW: Cannot access CDF for %s.\n" inst~>name))
        unless(cdf->w error("TOTA_TW: missing w.\n"))
        unless(cdf->l error("TOTA_TW: missing l.\n"))
        unless(cdf->wf error("TOTA_TW: missing wf.\n"))
        unless(cdf->fingers error("TOTA_TW: missing fingers.\n"))
        unless(cdf->simM error("TOTA_TW: missing simM.\n"))
        unless(cdf->nf error("TOTA_TW: missing nf.\n"))
        unless(cdf->m error("TOTA_TW: missing m.\n"))

        cdf->w->value=W
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->nf->value=NF
        cdf->m->value=M

        printf("TOTA_TW: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s wf=%s fingers=%s simM=%s nf=%s m=%s\n"
            inst~>name TotalW W L NF M cdf->wf->value
            cdf->fingers->value cdf->simM->value cdf->nf->value cdf->m->value)

        unless(equal(cdf->wf->value TotalW)
            error("TOTA_TW: TotalW/wf mismatch on %s.\n" inst~>name))
        unless(equal(cdf->l->value L)
            error("TOTA_TW: L mismatch on %s.\n" inst~>name))
        t
    )
)

procedure(TOTA_TW_PlaceMOS(cv master name xy TotalW W L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("TOTA_TW: Cannot create %s.\n" name))
        TOTA_TW_SetMOS(inst TotalW W L NF M)
        inst
    )
)

procedure(TOTA_TW_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("TOTA_TW: Terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("TOTA_TW: Pin figure %s missing on %s.\n" pinName inst~>name))
        fig=pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(TOTA_TW_StubEnd(inst pinName)
    let((g b s d p dx dy)
        g=TOTA_TW_PinCenter(inst "G")
        b=TOTA_TW_PinCenter(inst "B")
        s=TOTA_TW_PinCenter(inst "S")
        d=TOTA_TW_PinCenter(inst "D")
        p=TOTA_TW_PinCenter(inst pinName)
        if(equal(pinName "G") then
            dx=car(g)-car(b) dy=cadr(g)-cadr(b)
        else if(equal(pinName "B") then
            dx=car(b)-car(g) dy=cadr(b)-cadr(g)
        else if(equal(pinName "S") then
            dx=car(s)-car(d) dy=cadr(s)-cadr(d)
        else if(equal(pinName "D") then
            dx=car(d)-car(s) dy=cadr(d)-cadr(s)
        else error("TOTA_TW: unsupported terminal %s.\n" pinName)
        ))))
        if(abs(dx)>=abs(dy) then
            if(dx<0.0 then list(car(p)-TOTA_TW_STUB cadr(p)) else list(car(p)+TOTA_TW_STUB cadr(p)))
        else
            if(dy<0.0 then list(car(p) cadr(p)-TOTA_TW_STUB) else list(car(p) cadr(p)+TOTA_TW_STUB))
        )
    )
)

procedure(TOTA_TW_Label(cv inst pinName netName)
    let((p e wire label)
        p=TOTA_TW_PinCenter(inst pinName)
        e=TOTA_TW_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) TOTA_TW_WIRE TOTA_TW_WIRE 0)
        unless(wire error("TOTA_TW: wire failed %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" TOTA_TW_WIRE nil)
        unless(label error("TOTA_TW: label failed %s.%s.\n" inst~>name pinName))
        e
    )
)

procedure(TOTA_TW_PMOSSourceTopPass(inst)
    let((s d)
        s=TOTA_TW_PinCenter(inst "S")
        d=TOTA_TW_PinCenter(inst "D")
        printf("TOTA_TW: %s orient=%s S=%L D=%L\n" inst~>name inst~>orient s d)
        if(cadr(s)>cadr(d) then
            printf("TOTA_TW: %s PASS source-top.\n" inst~>name)
            t
            printf("TOTA_TW: %s FAIL source-top.\n" inst~>name)
            nil
        )
    )
)

procedure(TOTA_TW_PlaceVerifiedPMOS(cv master name xy TotalW W L NF M)
    let((orientations inst pass)
        orientations=list("R0" "R180" "MX" "MY")
        pass=nil
        foreach(o orientations
            unless(pass
                inst=dbCreateInst(cv master name xy o)
                unless(inst error("TOTA_TW: failed creating PMOS %s.\n" name))
                TOTA_TW_SetMOS(inst TotalW W L NF M)
                if(TOTA_TW_PMOSSourceTopPass(inst) then
                    pass=t
                    else
                    dbDeleteObject(inst)
                    inst=nil
                )
            )
        )
        unless(pass error("TOTA_TW: no source-top PMOS orientation found for %s.\n" name))
        inst
    )
)

procedure(TOTA_TW_CreatePin(cv pinMaster netName direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster netName direction nil xy "R0")
        unless(pin error("TOTA_TW: failed creating pin %s.\n" netName))
        pin
    )
)

procedure(CreateTelescopicOTA_TotalW_V1_20260812()
    let((cv nmos pmos pinMaster M1 M2 M3 M4 M5 M6 M7 M8 M9 voutEnd)
        printf("\n====================================================\n")
        printf("  TELESCOPIC OTA TOTALW V1 - PMOS INPUT\n")
        printf("====================================================\n")

        cv=geGetEditCellView()
        unless(cv error("TOTA_TW: Open an EMPTY editable schematic first.\n"))

        nmos=dbOpenCellViewByType(TOTA_TW_LIB TOTA_TW_NMOS "symbol" "" "r")
        pmos=dbOpenCellViewByType(TOTA_TW_LIB TOTA_TW_PMOS "symbol" "" "r")
        pinMaster=dbOpenCellViewByType(TOTA_TW_PIN_LIB TOTA_TW_PIN_CELL "symbol" "" "r")
        unless(nmos error("TOTA_TW: Cannot open tsmcN65/nch/symbol.\n"))
        unless(pmos error("TOTA_TW: Cannot open tsmcN65/pch/symbol.\n"))
        unless(pinMaster error("TOTA_TW: Cannot open basic/iopin/symbol.\n"))

        ; TotalW, W/finger, L, NF, M are all explicit.
        M1=TOTA_TW_PlaceVerifiedPMOS(cv pmos "M1" 0:10 "4u" "4u" "240n" "1" "1")
        M2=TOTA_TW_PlaceVerifiedPMOS(cv pmos "M2" 6:10 "4u" "4u" "240n" "1" "1")
        M3=TOTA_TW_PlaceMOS(cv nmos "M3" 0:6 "6u" "6u" "480n" "1" "1" "R0")
        M4=TOTA_TW_PlaceMOS(cv nmos "M4" 6:6 "6u" "6u" "480n" "1" "1" "R0")
        M5=TOTA_TW_PlaceMOS(cv nmos "M5" 0:2 "6u" "6u" "480n" "1" "1" "R0")
        M6=TOTA_TW_PlaceMOS(cv nmos "M6" 6:2 "6u" "6u" "480n" "1" "1" "R0")
        M7=TOTA_TW_PlaceMOS(cv nmos "M7" 0:-2 "6u" "6u" "480n" "1" "1" "R0")
        M8=TOTA_TW_PlaceMOS(cv nmos "M8" 6:-2 "6u" "6u" "480n" "1" "1" "R0")
        M9=TOTA_TW_PlaceVerifiedPMOS(cv pmos "M9" 3:14 "6u" "6u" "480n" "1" "1")

        TOTA_TW_Label(cv M1 "G" "VINP")
        TOTA_TW_Label(cv M1 "D" "NLEFT")
        TOTA_TW_Label(cv M1 "S" "VTAILP")
        TOTA_TW_Label(cv M1 "B" "VDD")
        TOTA_TW_Label(cv M2 "G" "VINN")
        TOTA_TW_Label(cv M2 "D" "VOUT")
        TOTA_TW_Label(cv M2 "S" "VTAILP")
        TOTA_TW_Label(cv M2 "B" "VDD")
        TOTA_TW_Label(cv M3 "G" "VBN_CAS")
        TOTA_TW_Label(cv M3 "D" "NLEFT")
        TOTA_TW_Label(cv M3 "S" "LEFT_MID")
        TOTA_TW_Label(cv M3 "B" "VSS")
        TOTA_TW_Label(cv M4 "G" "VBN_CAS")
        voutEnd=TOTA_TW_Label(cv M4 "D" "VOUT")
        TOTA_TW_Label(cv M4 "S" "RIGHT_MID")
        TOTA_TW_Label(cv M4 "B" "VSS")
        TOTA_TW_Label(cv M5 "G" "VBN_LOAD")
        TOTA_TW_Label(cv M5 "D" "LEFT_MID")
        TOTA_TW_Label(cv M5 "S" "LEFT_SINK")
        TOTA_TW_Label(cv M5 "B" "VSS")
        TOTA_TW_Label(cv M6 "G" "VBN_LOAD")
        TOTA_TW_Label(cv M6 "D" "RIGHT_MID")
        TOTA_TW_Label(cv M6 "S" "RIGHT_SINK")
        TOTA_TW_Label(cv M6 "B" "VSS")
        TOTA_TW_Label(cv M7 "G" "VBN_SINK")
        TOTA_TW_Label(cv M7 "D" "LEFT_SINK")
        TOTA_TW_Label(cv M7 "S" "VSS")
        TOTA_TW_Label(cv M7 "B" "VSS")
        TOTA_TW_Label(cv M8 "G" "VBN_SINK")
        TOTA_TW_Label(cv M8 "D" "RIGHT_SINK")
        TOTA_TW_Label(cv M8 "S" "VSS")
        TOTA_TW_Label(cv M8 "B" "VSS")
        TOTA_TW_Label(cv M9 "G" "VBP_TAIL")
        TOTA_TW_Label(cv M9 "D" "VTAILP")
        TOTA_TW_Label(cv M9 "S" "VDD")
        TOTA_TW_Label(cv M9 "B" "VDD")

        ; Real external output pin at the actual M4.D stub endpoint.
        TOTA_TW_CreatePin(cv pinMaster "VOUT" "output" voutEnd)

        dbSave(cv)
        printf("TOTA_TW: GENERATOR COMPLETED.\n")
        printf("TOTA_TW: TotalW-first sizing active.\n")
        printf("TOTA_TW: M2.D and M4.D are VOUT.\n")
        printf("TOTA_TW: VOUT pin uses actual M4.D stub endpoint.\n")
        t
    )
)
