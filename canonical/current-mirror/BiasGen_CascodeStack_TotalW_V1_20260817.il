;=============================================================================
; Cascode Bias Generator (Diode Stack) - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS bottom diode (G=D=NB1 S=VSS B=VSS)
;   M2  NMOS middle diode (G=D=NB2 S=NB1 B=VSS)
;   M3  NMOS top diode (G=D=NB3 S=NB2 D=IREF B=VSS)
;=============================================================================

(setq CBG_LIB "tsmcN65")
(setq CBG_NMOS "nch")
(setq CBG_STUB 0.75)
(setq CBG_WIRE 0.0625)
procedure(CBG_ToFloat(val)
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

procedure(CBG_ValueMatches(got expect)
    let((gn en)
        gn=CBG_ToFloat(got)
        en=CBG_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CBG_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CBG: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CBG_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CBG: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CBG: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CBG: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CBG: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CBG_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CBG_ValueMatches(cdf->w->value WperFinger)
            error("CBG: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CBG_ValueMatches(cdf->l->value L)
            error("CBG: L read-back mismatch on %s.\n" inst~>name))
        unless(CBG_ValueMatches(cdf->wf->value TotalW)
            error("CBG: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CBG_ValueMatches(cdf->fingers->value NF)
            error("CBG: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CBG_ValueMatches(cdf->simM->value M)
            error("CBG: simM read-back mismatch on %s.\n" inst~>name))
        unless(CBG_ValueMatches(cdf->totalM->value totalM)
            error("CBG: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CBG_ValueMatches(cdf->nf->value NF)
            error("CBG: nf read-back mismatch on %s.\n" inst~>name))
        unless(CBG_ValueMatches(cdf->m->value M)
            error("CBG: m read-back mismatch on %s.\n" inst~>name))
        printf("CBG: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CBG_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CBG: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CBG: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CBG: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CBG_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CBG: cannot create %s.\n" name))
        CBG_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CBG_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CBG_PinCenter(inst "G")
        b=CBG_PinCenter(inst "B")
        s=CBG_PinCenter(inst "S")
        d=CBG_PinCenter(inst "D")
        p=CBG_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CBG: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CBG_STUB cadr(p))
                else list(car(p)+CBG_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CBG_STUB)
                else list(car(p) cadr(p)+CBG_STUB))
        )
    )
)

procedure(CBG_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CBG_PinCenter(inst pinName)
        e=CBG_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CBG_WIRE CBG_WIRE 0)
        unless(wire error("CBG: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CBG_WIRE nil)
        unless(label error("CBG: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CBG: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CBG_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CBG: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CBG: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CBG_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CBG: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CBG: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CBG: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CBG_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CBG: cannot create VDC %s.\n" name))
        CBG_SetVDC(inst value)
        plus=CBG_VDCPinCenter(inst "PLUS")
        minus=CBG_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CBG_STUB)
        em=list(car(minus) cadr(minus)-CBG_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CBG_WIRE CBG_WIRE 0)
        wm=schCreateWire(cv "route" "full" list(minus em) CBG_WIRE CBG_WIRE 0)
        unless(wp && wm error("CBG: VDC wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CBG_WIRE nil)
        schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CBG_WIRE nil)
        printf("CBG: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CBG_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CBG: failed creating external pin %s.\n" name))
        printf("CBG: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(CreateBiasGen_CascodeStack_TotalW_V1_20260817()
    let((cv nmos vdcMaster pinMaster M1 M2 M3  V_IREF_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Cascode Bias Generator (Diode Stack) - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VSS=0V  REFERENCE DRIVE: V_IREF = 1.80V into the top of the stack\n")
        printf("Stacked diodes generate NB1/NB2/NB3 bias taps for cascode gates\n")
        printf("TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CBG/CBG\n" CBG_LIB CBG_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CBG: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CBG: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CBG_OpenMaster(CBG_LIB CBG_NMOS)
        vdcMaster=CBG_OpenMaster("analogLib" "vdc")
        pinMaster=CBG_OpenMaster("basic" "iopin")

        M1=CBG_PlaceMOS(cv nmos "M1" 0:0 "4u" "480n" "1" "1" "R0")
        M2=CBG_PlaceMOS(cv nmos "M2" 0:6 "4u" "480n" "1" "1" "R0")
        M3=CBG_PlaceMOS(cv nmos "M3" 0:12 "4u" "480n" "1" "1" "R0")

        CBG_LabelMOSTerminal(cv M1 "G" "NB1")
        CBG_LabelMOSTerminal(cv M1 "D" "NB1")
        CBG_LabelMOSTerminal(cv M1 "S" "VSS")
        CBG_LabelMOSTerminal(cv M1 "B" "VSS")
        CBG_LabelMOSTerminal(cv M2 "G" "NB2")
        CBG_LabelMOSTerminal(cv M2 "D" "NB2")
        CBG_LabelMOSTerminal(cv M2 "S" "NB1")
        CBG_LabelMOSTerminal(cv M2 "B" "VSS")
        CBG_LabelMOSTerminal(cv M3 "G" "NB3")
        CBG_LabelMOSTerminal(cv M3 "D" "IREF")
        CBG_LabelMOSTerminal(cv M3 "S" "NB2")
        CBG_LabelMOSTerminal(cv M3 "B" "VSS")

        V_IREF_SRC=CBG_CreateVDC(cv vdcMaster "V_IREF_SRC" -10:12 "1.80" "IREF" "VSS")
        V_VSS_SRC=CBG_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-4 "0.0" "VSS" "VSS")

        CBG_CreatePin(cv pinMaster "IREF" "input" -8:14)
        CBG_CreatePin(cv pinMaster "NB1" "output" 8:0)
        CBG_CreatePin(cv pinMaster "NB2" "output" 8:6)
        CBG_CreatePin(cv pinMaster "NB3" "output" 8:12)
        CBG_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CBG GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
