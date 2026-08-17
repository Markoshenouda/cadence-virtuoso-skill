;=============================================================================
; Common-Source with Diode Load - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input device (G=VIN D=VOUT S=VSS B=VSS)
;   M2  PMOS diode-connected load (G=VOUT D=VOUT S=VDD B=VDD)
;=============================================================================

(setq CDL_LIB "tsmcN65")
(setq CDL_NMOS "nch")
(setq CDL_PMOS "pch")
(setq CDL_STUB 0.75)
(setq CDL_WIRE 0.0625)
procedure(CDL_ToFloat(val)
    cond(
        (numberp(val) float(val))
        (stringp(val)
            let((parsed)
                parsed=nil
                errset(parsed=cdfParseFloatString(val) t)
                parsed
            )
        )
        (t nil)
    )
)

procedure(CDL_ValueMatches(got expect)
    let((gn en)
        gn=CDL_ToFloat(got)
        en=CDL_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CDL_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CDL: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CDL_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CDL: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CDL: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CDL: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CDL: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CDL_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CDL_ValueMatches(cdf->w->value WperFinger)
            error("CDL: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CDL_ValueMatches(cdf->l->value L)
            error("CDL: L read-back mismatch on %s.\n" inst~>name))
        unless(CDL_ValueMatches(cdf->wf->value TotalW)
            error("CDL: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CDL_ValueMatches(cdf->fingers->value NF)
            error("CDL: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CDL_ValueMatches(cdf->simM->value M)
            error("CDL: simM read-back mismatch on %s.\n" inst~>name))
        unless(CDL_ValueMatches(cdf->totalM->value totalM)
            error("CDL: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CDL_ValueMatches(cdf->nf->value NF)
            error("CDL: nf read-back mismatch on %s.\n" inst~>name))
        unless(CDL_ValueMatches(cdf->m->value M)
            error("CDL: m read-back mismatch on %s.\n" inst~>name))
        printf("CDL: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CDL_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CDL: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CDL: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CDL: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CDL_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CDL: cannot create %s.\n" name))
        CDL_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CDL_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CDL_PinCenter(inst "G")
        b=CDL_PinCenter(inst "B")
        s=CDL_PinCenter(inst "S")
        d=CDL_PinCenter(inst "D")
        p=CDL_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CDL: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CDL_STUB cadr(p))
                else list(car(p)+CDL_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CDL_STUB)
                else list(car(p) cadr(p)+CDL_STUB))
        )
    )
)

procedure(CDL_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CDL_PinCenter(inst pinName)
        e=CDL_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CDL_WIRE CDL_WIRE 0)
        unless(wire error("CDL: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CDL_WIRE nil)
        unless(label error("CDL: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CDL: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CDL_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CDL: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CDL: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CDL_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CDL: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CDL: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CDL: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CDL_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CDL: cannot create VDC %s.\n" name))
        CDL_SetVDC(inst value)
        plus=CDL_VDCPinCenter(inst "PLUS")
        minus=CDL_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CDL_STUB)
        em=list(car(minus) cadr(minus)-CDL_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CDL_WIRE CDL_WIRE 0)
        wm=schCreateWire(cv "route" "full" list(minus em) CDL_WIRE CDL_WIRE 0)
        unless(wp && wm error("CDL: VDC wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CDL_WIRE nil)
        schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CDL_WIRE nil)
        printf("CDL: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CDL_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CDL: failed creating external pin %s.\n" name))
        printf("CDL: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CDL_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CDL_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CDL_PinCenter(inst "S")
        d=CDL_PinCenter(inst "D")
        printf("CDL: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CDL_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CDL_PinCenter(inst "S")
                d=CDL_PinCenter(inst "D")
                printf("CDL: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CDL: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateCommonSource_DiodeLoad_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2  V_VIN_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Common-Source with Diode Load - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  VSS=0V  INPUT: VIN = 0.75V\n")
        printf("Diode-connected PMOS load sets a low, well-defined gain\n")
        printf("OUTPUT: VOUT = M1.D/M2.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CDL/CDL\n" CDL_LIB CDL_NMOS)
        printf("DEVICE=CDL/CDL\n" CDL_LIB CDL_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CDL: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CDL: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CDL_OpenMaster(CDL_LIB CDL_NMOS)
        pmos=CDL_OpenMaster(CDL_LIB CDL_PMOS)
        vdcMaster=CDL_OpenMaster("analogLib" "vdc")
        pinMaster=CDL_OpenMaster("basic" "iopin")

        M1=CDL_PlaceMOS(cv nmos "M1" 0:0 "4u" "240n" "1" "1" "R0")
        M2=CDL_PlacePMOSAuto(cv pmos "M2" 0:6 "8u" "480n" "1" "1")

        CDL_LabelMOSTerminal(cv M1 "G" "VIN")
        CDL_LabelMOSTerminal(cv M1 "D" "VOUT")
        CDL_LabelMOSTerminal(cv M1 "S" "VSS")
        CDL_LabelMOSTerminal(cv M1 "B" "VSS")
        CDL_LabelMOSTerminal(cv M2 "G" "VOUT")
        CDL_LabelMOSTerminal(cv M2 "D" "VOUT")
        CDL_LabelMOSTerminal(cv M2 "S" "VDD")
        CDL_LabelMOSTerminal(cv M2 "B" "VDD")

        V_VIN_SRC=CDL_CreateVDC(cv vdcMaster "V_VIN_SRC" -10:0 "0.75" "VIN" "VSS")
        V_VDD_SRC=CDL_CreateVDC(cv vdcMaster "V_VDD_SRC" 10:6 "1.50" "VDD" "VSS")
        V_VSS_SRC=CDL_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-4 "0.0" "VSS" "VSS")

        CDL_CreatePin(cv pinMaster "VIN" "input" -10:-6)
        CDL_CreatePin(cv pinMaster "VOUT" "output" 9:3)
        CDL_CreatePin(cv pinMaster "VDD" "input" 9:8)
        CDL_CreatePin(cv pinMaster "VSS" "input" 0:-6)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CDL GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
