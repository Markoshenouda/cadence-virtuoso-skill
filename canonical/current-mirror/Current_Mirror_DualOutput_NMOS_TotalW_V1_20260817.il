;=============================================================================
; Dual-Output NMOS Current Mirror - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS diode reference (G=IREF D=IREF S=VSS B=VSS)
;   M2  NMOS output device 1 (G=IREF D=IOUT1 S=VSS B=VSS)
;   M3  NMOS output device 2 (G=IREF D=IOUT2 S=VSS B=VSS)
;=============================================================================

(setq DOM_LIB "tsmcN65")
(setq DOM_NMOS "nch")
(setq DOM_STUB 0.75)
(setq DOM_WIRE 0.0625)
procedure(DOM_ToFloat(val)
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

procedure(DOM_ValueMatches(got expect)
    let((gn en)
        gn=DOM_ToFloat(got)
        en=DOM_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(DOM_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("DOM: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(DOM_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("DOM: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("DOM: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("DOM: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("DOM: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=DOM_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(DOM_ValueMatches(cdf->w->value WperFinger)
            error("DOM: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(DOM_ValueMatches(cdf->l->value L)
            error("DOM: L read-back mismatch on %s.\n" inst~>name))
        unless(DOM_ValueMatches(cdf->wf->value TotalW)
            error("DOM: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(DOM_ValueMatches(cdf->fingers->value NF)
            error("DOM: fingers read-back mismatch on %s.\n" inst~>name))
        unless(DOM_ValueMatches(cdf->simM->value M)
            error("DOM: simM read-back mismatch on %s.\n" inst~>name))
        unless(DOM_ValueMatches(cdf->totalM->value totalM)
            error("DOM: totalM read-back mismatch on %s.\n" inst~>name))
        unless(DOM_ValueMatches(cdf->nf->value NF)
            error("DOM: nf read-back mismatch on %s.\n" inst~>name))
        unless(DOM_ValueMatches(cdf->m->value M)
            error("DOM: m read-back mismatch on %s.\n" inst~>name))
        printf("DOM: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(DOM_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("DOM: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("DOM: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("DOM: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(DOM_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("DOM: cannot create %s.\n" name))
        DOM_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(DOM_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=DOM_PinCenter(inst "G")
        b=DOM_PinCenter(inst "B")
        s=DOM_PinCenter(inst "S")
        d=DOM_PinCenter(inst "D")
        p=DOM_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("DOM: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-DOM_STUB cadr(p))
                else list(car(p)+DOM_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-DOM_STUB)
                else list(car(p) cadr(p)+DOM_STUB))
        )
    )
)

procedure(DOM_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=DOM_PinCenter(inst pinName)
        e=DOM_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) DOM_WIRE DOM_WIRE 0)
        unless(wire error("DOM: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" DOM_WIRE nil)
        unless(label error("DOM: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("DOM: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(DOM_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("DOM: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("DOM: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(DOM_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("DOM: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("DOM: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("DOM: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(DOM_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("DOM: cannot create VDC %s.\n" name))
        DOM_SetVDC(inst value)
        plus=DOM_VDCPinCenter(inst "PLUS")
        minus=DOM_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+DOM_STUB)
        em=list(car(minus) cadr(minus)-DOM_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) DOM_WIRE DOM_WIRE 0)
        wm=schCreateWire(cv "route" "full" list(minus em) DOM_WIRE DOM_WIRE 0)
        unless(wp && wm error("DOM: VDC wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" DOM_WIRE nil)
        schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" DOM_WIRE nil)
        printf("DOM: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(DOM_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("DOM: failed creating external pin %s.\n" name))
        printf("DOM: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(CreateCurrentMirror_DualOutput_NMOS_TotalW_V1_20260817()
    let((cv nmos vdcMaster pinMaster M1 M2 M3  V_IREF_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Dual-Output NMOS Current Mirror - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VSS=0V  REFERENCE DRIVE: V_IREF = 0.75V\n")
        printf("One reference biases two independent output branches for bias distribution\n")
        printf("RATIO: 1:1:1 default  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=DOM/DOM\n" DOM_LIB DOM_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("DOM: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("DOM: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=DOM_OpenMaster(DOM_LIB DOM_NMOS)
        vdcMaster=DOM_OpenMaster("analogLib" "vdc")
        pinMaster=DOM_OpenMaster("basic" "iopin")

        M1=DOM_PlaceMOS(cv nmos "M1" -4:0 "4u" "480n" "1" "1" "R0")
        M2=DOM_PlaceMOS(cv nmos "M2" 4:0 "4u" "480n" "1" "1" "R0")
        M3=DOM_PlaceMOS(cv nmos "M3" 12:0 "4u" "480n" "1" "1" "R0")

        DOM_LabelMOSTerminal(cv M1 "G" "IREF")
        DOM_LabelMOSTerminal(cv M1 "D" "IREF")
        DOM_LabelMOSTerminal(cv M1 "S" "VSS")
        DOM_LabelMOSTerminal(cv M1 "B" "VSS")
        DOM_LabelMOSTerminal(cv M2 "G" "IREF")
        DOM_LabelMOSTerminal(cv M2 "D" "IOUT1")
        DOM_LabelMOSTerminal(cv M2 "S" "VSS")
        DOM_LabelMOSTerminal(cv M2 "B" "VSS")
        DOM_LabelMOSTerminal(cv M3 "G" "IREF")
        DOM_LabelMOSTerminal(cv M3 "D" "IOUT2")
        DOM_LabelMOSTerminal(cv M3 "S" "VSS")
        DOM_LabelMOSTerminal(cv M3 "B" "VSS")

        V_IREF_SRC=DOM_CreateVDC(cv vdcMaster "V_IREF_SRC" -11:6 "0.75" "IREF" "VSS")
        V_VSS_SRC=DOM_CreateVDC(cv vdcMaster "V_VSS_SRC" 8:-6 "0.0" "VSS" "VSS")

        DOM_CreatePin(cv pinMaster "IREF" "input" -9:8)
        DOM_CreatePin(cv pinMaster "IOUT1" "output" 7:8)
        DOM_CreatePin(cv pinMaster "IOUT2" "output" 15:8)
        DOM_CreatePin(cv pinMaster "VSS" "input" 4:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" DOM GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
