;=============================================================================
; Wilson Current Mirror - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS diode reference (G=A D=A S=VSS B=VSS)
;   M2  NMOS degeneration device (G=A D=B S=VSS B=VSS)
;   M3  NMOS output device (G=A D=IOUT S=B B=VSS)
;=============================================================================

(setq CWM_LIB "tsmcN65")
(setq CWM_NMOS "nch")
(setq CWM_STUB 0.75)
(setq CWM_WIRE 0.0625)
procedure(CWM_ToFloat(val)
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

procedure(CWM_ValueMatches(got expect)
    let((gn en)
        gn=CWM_ToFloat(got)
        en=CWM_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CWM_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CWM: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CWM_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CWM: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CWM: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CWM: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CWM: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CWM_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CWM_ValueMatches(cdf->w->value WperFinger)
            error("CWM: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CWM_ValueMatches(cdf->l->value L)
            error("CWM: L read-back mismatch on %s.\n" inst~>name))
        unless(CWM_ValueMatches(cdf->wf->value TotalW)
            error("CWM: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CWM_ValueMatches(cdf->fingers->value NF)
            error("CWM: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CWM_ValueMatches(cdf->simM->value M)
            error("CWM: simM read-back mismatch on %s.\n" inst~>name))
        unless(CWM_ValueMatches(cdf->totalM->value totalM)
            error("CWM: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CWM_ValueMatches(cdf->nf->value NF)
            error("CWM: nf read-back mismatch on %s.\n" inst~>name))
        unless(CWM_ValueMatches(cdf->m->value M)
            error("CWM: m read-back mismatch on %s.\n" inst~>name))
        printf("CWM: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CWM_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CWM: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CWM: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CWM: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CWM_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CWM: cannot create %s.\n" name))
        CWM_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CWM_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CWM_PinCenter(inst "G")
        b=CWM_PinCenter(inst "B")
        s=CWM_PinCenter(inst "S")
        d=CWM_PinCenter(inst "D")
        p=CWM_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CWM: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CWM_STUB cadr(p))
                else list(car(p)+CWM_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CWM_STUB)
                else list(car(p) cadr(p)+CWM_STUB))
        )
    )
)

procedure(CWM_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CWM_PinCenter(inst pinName)
        e=CWM_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CWM_WIRE CWM_WIRE 0)
        unless(wire error("CWM: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CWM_WIRE nil)
        unless(label error("CWM: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CWM: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CWM_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CWM: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CWM: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CWM_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CWM: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CWM: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CWM: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CWM_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CWM: cannot create VDC %s.\n" name))
        CWM_SetVDC(inst value)
        plus=CWM_VDCPinCenter(inst "PLUS")
        minus=CWM_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CWM_STUB)
        em=list(car(minus) cadr(minus)-CWM_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CWM_WIRE CWM_WIRE 0)
        wm=schCreateWire(cv "route" "full" list(minus em) CWM_WIRE CWM_WIRE 0)
        unless(wp && wm error("CWM: VDC wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CWM_WIRE nil)
        schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CWM_WIRE nil)
        printf("CWM: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CWM_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CWM: failed creating external pin %s.\n" name))
        printf("CWM: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(CreateCurrentMirror_Wilson_NMOS_TotalW_V1_20260817()
    let((cv nmos vdcMaster pinMaster M1 M2 M3  V_IREF_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Wilson Current Mirror - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VSS=0V  REFERENCE DRIVE: V_IREF = 0.75V on node A\n")
        printf("WILSON feedback: M2 degenerates M3 for high output impedance\n")
        printf("RATIO: 1:1 default  OUTPUT: IOUT = M3.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CWM/CWM\n" CWM_LIB CWM_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CWM: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CWM: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CWM_OpenMaster(CWM_LIB CWM_NMOS)
        vdcMaster=CWM_OpenMaster("analogLib" "vdc")
        pinMaster=CWM_OpenMaster("basic" "iopin")

        M1=CWM_PlaceMOS(cv nmos "M1" -4:0 "4u" "480n" "1" "1" "R0")
        M2=CWM_PlaceMOS(cv nmos "M2" 4:-4 "4u" "480n" "1" "1" "R0")
        M3=CWM_PlaceMOS(cv nmos "M3" 4:4 "4u" "480n" "1" "1" "R0")

        CWM_LabelMOSTerminal(cv M1 "G" "A")
        CWM_LabelMOSTerminal(cv M1 "D" "A")
        CWM_LabelMOSTerminal(cv M1 "S" "VSS")
        CWM_LabelMOSTerminal(cv M1 "B" "VSS")
        CWM_LabelMOSTerminal(cv M2 "G" "A")
        CWM_LabelMOSTerminal(cv M2 "D" "B")
        CWM_LabelMOSTerminal(cv M2 "S" "VSS")
        CWM_LabelMOSTerminal(cv M2 "B" "VSS")
        CWM_LabelMOSTerminal(cv M3 "G" "A")
        CWM_LabelMOSTerminal(cv M3 "D" "IOUT")
        CWM_LabelMOSTerminal(cv M3 "S" "B")
        CWM_LabelMOSTerminal(cv M3 "B" "VSS")

        V_IREF_SRC=CWM_CreateVDC(cv vdcMaster "V_IREF_SRC" -11:6 "0.75" "A" "VSS")
        V_VSS_SRC=CWM_CreateVDC(cv vdcMaster "V_VSS_SRC" 11:-4 "0.0" "VSS" "VSS")

        CWM_CreatePin(cv pinMaster "IREF" "input" -9:8)
        CWM_CreatePin(cv pinMaster "IOUT" "output" 10:4)
        CWM_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CWM GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
