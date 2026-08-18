; 5T OTA — PMOS INPUT PAIR — pch_mac / nch_mac DEVICES
; Cadence Virtuoso IC6.1.7 / tsmcN65-style flow
;
; Design-level interface : TotalW, L, NF, M only.
; Complete CDF state     : w, l, wf, fingers, simM, totalM, nf, m.
; totalM = NF*M.  W derived internally as TotalW/NF.
;
; DEVICE MASTERS: pch_mac (PMOS), nch_mac (NMOS).
; NOTE: pch_mac/nch_mac are not in the source repository.
; CDF field names (w/l/wf/fingers/simM/totalM/nf/m) are the
; repository-verified mapping for nch/pch only.  The read-back
; validation will catch any field-name mismatch at run time.
;
; SIZING: placeholder / engineering starting values only.
; NOT derived from the 60dB / 100MHz / 60PM / <=1mW spec.
; No gm/ID model data exists in the repository for pch_mac/nch_mac.
;
; Topology (PMOS input pair):
;   M1/M2 = PMOS differential input pair   (pch_mac)
;   M3/M4 = NMOS current-mirror active load (nch_mac)
;   M5    = PMOS tail current source        (pch_mac)
;   VOUT  = M2.D / M4.D
;
; Net map:
;   M1.G VINP    M2.G VINN
;   M1.D MIRROR  M3.D MIRROR  M3.G MIRROR  M4.G MIRROR
;   M2.D VOUT    M4.D VOUT
;   M1.S TAIL    M2.S TAIL    M5.D TAIL
;   M5.G VBP_TAIL  M5.S VDD   M5.B VDD
;   M1.B VDD       M2.B VDD
;   M3.S VSS       M4.S VSS   M3.B VSS      M4.B VSS
;
; SIZING (placeholder starting values):
;   M1/M2 TotalW=4u  L=240n NF=1 M=1
;   M3/M4 TotalW=2u  L=480n NF=1 M=1
;   M5    TotalW=6u  L=480n NF=1 M=1
;
; VSS SOURCE CONTRACT:
;   VDC PLUS  -> existing wire + net label
;   VDC MINUS -> direct analogLib/gnd, no wire, no VSS label

setq(T5TW_LIB "tsmcN65")
(setq T5TW_NCH "nch_mac")
(setq T5TW_PCH "pch_mac")
(setq T5TW_STUB 0.75)
(setq T5TW_W 0.0625)

procedure(T5TW_DeriveW(TotalW NF)
    let((tw nfInt wp)
        tw    = cdfParseFloatString(TotalW)
        nfInt = atoi(NF)
        unless(nfInt > 0 error("T5TW: NF must be >= 1.\n"))
        wp = tw / float(nfInt)
        sprintf(nil "%g" wp)
    )
)

procedure(T5TW_ToFloat(val)
    cond(
        (numberp(val) float(val))
        (stringp(val)
            let((parsed)
                parsed = nil
                errset(parsed = cdfParseFloatString(val) t)
                parsed
            )
        )
        (t nil)
    )
)

procedure(T5TW_ValueMatches(gotVal expectVal)
    let((gotNum expectNum)
        gotNum = T5TW_ToFloat(gotVal)
        expectNum = T5TW_ToFloat(expectVal)
        if(gotNum && expectNum
            then abs(gotNum - expectNum) < 1e-12 * max(1.0 abs(expectNum))
            else equal(gotVal expectVal)
        )
    )
)

procedure(T5TW_SetMOS(inst TotalW L NF M)
    let((cdf WperFinger nfInt mInt totalMInt totalM)
        cdf = cdfGetInstCDF(inst)
        unless(cdf error("T5TW: CDF missing on %s.\n" inst~>name))
        unless(cdf->w error("T5TW: w field missing on %s.\n" inst~>name))
        unless(cdf->l error("T5TW: l field missing on %s.\n" inst~>name))
        unless(cdf->wf error("T5TW: wf field missing on %s.\n" inst~>name))
        unless(cdf->fingers error("T5TW: fingers field missing on %s.\n" inst~>name))
        unless(cdf->simM error("T5TW: simM field missing on %s.\n" inst~>name))
        unless(cdf->totalM error("T5TW: totalM field missing on %s.\n" inst~>name))
        unless(cdf->nf error("T5TW: nf field missing on %s.\n" inst~>name))
        unless(cdf->m error("T5TW: m field missing on %s.\n" inst~>name))
        WperFinger = T5TW_DeriveW(TotalW NF)
        nfInt = atoi(NF)
        mInt = atoi(M)
        totalMInt = nfInt * mInt
        totalM = sprintf(nil "%d" totalMInt)
        cdf->w->value = WperFinger
        cdf->l->value = L
        cdf->wf->value = TotalW
        cdf->fingers->value = NF
        cdf->simM->value = M
        cdf->totalM->value = totalM
        cdf->nf->value = NF
        cdf->m->value = M
        printf("T5TW: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s WF=%s totalM=%s\n" inst~>name TotalW WperFinger L NF M cdf->wf->value cdf->totalM->value)
        unless(T5TW_ValueMatches(cdf->w->value WperFinger) error("T5TW: W mismatch on %s.\n" inst~>name))
        unless(T5TW_ValueMatches(cdf->l->value L) error("T5TW: L mismatch on %s.\n" inst~>name))
        unless(T5TW_ValueMatches(cdf->wf->value TotalW) error("T5TW: WF mismatch on %s.\n" inst~>name))
        unless(T5TW_ValueMatches(cdf->fingers->value NF) error("T5TW: fingers mismatch on %s.\n" inst~>name))
        unless(T5TW_ValueMatches(cdf->simM->value M) error("T5TW: simM mismatch on %s.\n" inst~>name))
        unless(T5TW_ValueMatches(cdf->totalM->value totalM) error("T5TW: totalM mismatch on %s.\n" inst~>name))
        unless(T5TW_ValueMatches(cdf->nf->value NF) error("T5TW: nf mismatch on %s.\n" inst~>name))
        unless(T5TW_ValueMatches(cdf->m->value M) error("T5TW: m mismatch on %s.\n" inst~>name))
        t
    )
)

procedure(T5TW_PinCenter(inst name)
    let((term pin fig)
        term = dbFindTermByName(inst~>master name)
        unless(term error("T5TW: missing terminal %s on %s.\n" name inst~>name))
        pin = car(term~>pins)
        fig = pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(T5TW_Place(cv master name xy TotalW L NF M orient)
    let((inst)
        inst = dbCreateInst(cv master name xy orient)
        unless(inst error("T5TW: cannot create %s.\n" name))
        T5TW_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(T5TW_PMOSPass(inst)
    let((s d sy dy)
        s = T5TW_PinCenter(inst "S")
        d = T5TW_PinCenter(inst "D")
        sy = cadr(s)
        dy = cadr(d)
        printf("T5TW: %s %L S=%L D=%L\n" inst~>name inst~>orient s d)
        if(sy > dy
            then printf("T5TW: PASS source-top/drain-bottom.\n") t
            else printf("T5TW: FAIL source-top/drain-bottom.\n") nil
        )
    )
)

procedure(T5TW_PlaceVerifiedPMOS(cv master name xy TotalW L NF M)
    let((orientList inst pass)
        orientList = list("MX" "MY" "R0" "R180")
        pass = nil
        foreach(o orientList
            unless(pass
                inst = dbCreateInst(cv master name xy o)
                unless(inst error("T5TW: PMOS create failed for %s.\n" name))
                T5TW_SetMOS(inst TotalW L NF M)
                if(T5TW_PMOSPass(inst)
                    then pass = t
                    else dbDeleteObject(inst) inst = nil
                )
            )
        )
        unless(pass error("T5TW: no source-top orientation found for %s.\n" name))
        inst
    )
)

procedure(T5TW_StubEnd(inst pinName)
    let((g b s d p dx dy absDx absDy)
        g = T5TW_PinCenter(inst "G")
        b = T5TW_PinCenter(inst "B")
        s = T5TW_PinCenter(inst "S")
        d = T5TW_PinCenter(inst "D")
        p = T5TW_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") dx = car(g)-car(b) dy = cadr(g)-cadr(b))
            (equal(pinName "B") dx = car(b)-car(g) dy = cadr(b)-cadr(g))
            (equal(pinName "S") dx = car(s)-car(d) dy = cadr(s)-cadr(d))
            (equal(pinName "D") dx = car(d)-car(s) dy = cadr(d)-cadr(s))
            (t error("T5TW: unsupported terminal %s.\n" pinName))
        )
        absDx = abs(dx)
        absDy = abs(dy)
        if(absDx >= absDy
            then if(dx < 0.0 then list(car(p)-T5TW_STUB cadr(p)) else list(car(p)+T5TW_STUB cadr(p)))
            else if(dy < 0.0 then list(car(p) cadr(p)-T5TW_STUB) else list(car(p) cadr(p)+T5TW_STUB))
        )
    )
)

procedure(T5TW_Label(cv inst pinName netName)
    let((p e w l)
        p = T5TW_PinCenter(inst pinName)
        e = T5TW_StubEnd(inst pinName)
        w = schCreateWire(cv "route" "full" list(p e) T5TW_W T5TW_W 0)
        unless(w error("T5TW: wire failed on %s.%s.\n" inst~>name pinName))
        l = schCreateWireLabel(cv car(w) e netName "lowerLeft" "R0" "stick" T5TW_W nil)
        unless(l error("T5TW: label failed on %s.%s.\n" inst~>name pinName)) l
    )
)

procedure(T5TW_SetVDC(inst value)
    let((cdf)
        cdf = cdfGetInstCDF(inst)
        unless(cdf error("T5TW: no VDC CDF.\n"))
        unless(cdf->vdc error("T5TW: VDC parameter missing.\n"))
        cdf->vdc->value = value
    )
)

procedure(T5TW_VPin(inst name)
    let((term pin fig)
        term = dbFindTermByName(inst~>master name)
        pin = car(term~>pins)
        fig = pin~>fig
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

procedure(Create5TOTA_PMOSIN_MAC_V1_20260814()
    let((cv nmos pmos pinMaster vdcMaster gndMaster M1 M2 M3 M4 M5)
        cv = geGetEditCellView()
        unless(cv error("T5TW: open an EMPTY editable schematic first.\n"))
        nmos = dbOpenCellViewByType(T5TW_LIB T5TW_NCH "symbol" "" "r")
        unless(nmos error("T5TW: cannot open %s/%s/symbol.\n" T5TW_LIB T5TW_NCH))
        pmos = dbOpenCellViewByType(T5TW_LIB T5TW_PCH "symbol" "" "r")
        unless(pmos error("T5TW: cannot open %s/%s/symbol.\n" T5TW_LIB T5TW_PCH))
        pinMaster = dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
        vdcMaster = dbOpenCellViewByType("analogLib" "vdc" "symbol" "" "r")
        gndMaster = dbOpenCellViewByType("analogLib" "gnd" "symbol" "" "r")

        M1 = T5TW_PlaceVerifiedPMOS(cv pmos "M1" 0:6 "4u" "240n" "1" "1")
        M2 = T5TW_PlaceVerifiedPMOS(cv pmos "M2" 6:6 "4u" "240n" "1" "1")
        M5 = T5TW_PlaceVerifiedPMOS(cv pmos "M5" 3:10 "6u" "480n" "1" "1")
        M3 = T5TW_Place(cv nmos "M3" 0:2 "2u" "480n" "1" "1" "R0")
        M4 = T5TW_Place(cv nmos "M4" 6:2 "2u" "480n" "1" "1" "R0")

        T5TW_Label(cv M1 "G" "VINP") T5TW_Label(cv M1 "D" "MIRROR") T5TW_Label(cv M1 "S" "TAIL") T5TW_Label(cv M1 "B" "VDD")
        T5TW_Label(cv M2 "G" "VINN") T5TW_Label(cv M2 "D" "VOUT") T5TW_Label(cv M2 "S" "TAIL") T5TW_Label(cv M2 "B" "VDD")
        T5TW_Label(cv M5 "G" "VBP_TAIL") T5TW_Label(cv M5 "D" "TAIL") T5TW_Label(cv M5 "S" "VDD") T5TW_Label(cv M5 "B" "VDD")
        T5TW_Label(cv M3 "G" "MIRROR") T5TW_Label(cv M3 "D" "MIRROR") T5TW_Label(cv M3 "S" "VSS") T5TW_Label(cv M3 "B" "VSS")
        T5TW_Label(cv M4 "G" "MIRROR") T5TW_Label(cv M4 "D" "VOUT") T5TW_Label(cv M4 "S" "VSS") T5TW_Label(cv M4 "B" "VSS")

        T5TW_Pin(cv pinMaster "VOUT" "output" 9:4)
        T5TW_VDC(cv vdcMaster gndMaster "V_VDD" 12:14 "VDD" "1.2" "VSS")
        T5TW_VDC(cv vdcMaster gndMaster "V_VBP_TAIL" 12:9 "VBP_TAIL" "0.6" "VSS")
        T5TW_VDC(cv vdcMaster gndMaster "V_VINP" 12:4 "VINP" "0.6" "VSS")
        T5TW_VDC(cv vdcMaster gndMaster "V_VINN" 12:-1 "VINN" "0.6" "VSS")
        T5TW_VDC(cv vdcMaster gndMaster "V_VSS" 18:4 "VSS" "0.0" "GND")

        unless(T5TW_PMOSPass(M1) error("T5TW: M1 orientation failed.\n"))
        unless(T5TW_PMOSPass(M2) error("T5TW: M2 orientation failed.\n"))
        unless(T5TW_PMOSPass(M5) error("T5TW: M5 orientation failed.\n"))

        dbSave(cv)
        printf("T5TW: PMOS-input 5T OTA (pch_mac/nch_mac) generated.\n")
        printf("T5TW: SIZING IS PLACEHOLDER ONLY -- no gain/GBW/PM/power claim is made or verifiable from repository data.\n")
        t
    )
)
