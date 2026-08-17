;=============================================================================
; Regulated Cascode Current Mirror - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS diode reference (G=NB D=NB S=VSS B=VSS)
;   M2  NMOS output device (G=NB D=NB2 S=VSS B=VSS)
;   M3  NMOS reference cascode (G=NA S=NB D=IREF B=VSS)
;   M4  NMOS output cascode (G=NA S=NB2 D=IOUT B=VSS)
;   M5  NMOS regulating amplifier (G=NB2 D=NA S=VSS B=VSS)
;=============================================================================

(setq CRM_LIB "tsmcN65")
(setq CRM_NMOS "nch")
(setq CRM_STUB 0.75)
(setq CRM_WIRE 0.0625)
procedure(CRM_ToFloat(val)
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

procedure(CRM_ValueMatches(got expect)
    let((gn en)
        gn=CRM_ToFloat(got)
        en=CRM_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CRM_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CRM: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CRM_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CRM: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CRM: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CRM: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CRM: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CRM_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CRM_ValueMatches(cdf->w->value WperFinger)
            error("CRM: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CRM_ValueMatches(cdf->l->value L)
            error("CRM: L read-back mismatch on %s.\n" inst~>name))
        unless(CRM_ValueMatches(cdf->wf->value TotalW)
            error("CRM: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CRM_ValueMatches(cdf->fingers->value NF)
            error("CRM: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CRM_ValueMatches(cdf->simM->value M)
            error("CRM: simM read-back mismatch on %s.\n" inst~>name))
        unless(CRM_ValueMatches(cdf->totalM->value totalM)
            error("CRM: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CRM_ValueMatches(cdf->nf->value NF)
            error("CRM: nf read-back mismatch on %s.\n" inst~>name))
        unless(CRM_ValueMatches(cdf->m->value M)
            error("CRM: m read-back mismatch on %s.\n" inst~>name))
        printf("CRM: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CRM_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CRM: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CRM: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CRM: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CRM_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CRM: cannot create %s.\n" name))
        CRM_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CRM_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CRM_PinCenter(inst "G")
        b=CRM_PinCenter(inst "B")
        s=CRM_PinCenter(inst "S")
        d=CRM_PinCenter(inst "D")
        p=CRM_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CRM: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CRM_STUB cadr(p))
                else list(car(p)+CRM_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CRM_STUB)
                else list(car(p) cadr(p)+CRM_STUB))
        )
    )
)

procedure(CRM_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CRM_PinCenter(inst pinName)
        e=CRM_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CRM_WIRE CRM_WIRE 0)
        unless(wire error("CRM: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CRM_WIRE nil)
        unless(label error("CRM: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CRM: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CRM_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CRM: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CRM: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CRM_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CRM: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CRM: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CRM: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CRM_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CRM: cannot create VDC %s.\n" name))
        CRM_SetVDC(inst value)
        plus=CRM_VDCPinCenter(inst "PLUS")
        minus=CRM_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CRM_STUB)
        em=list(car(minus) cadr(minus)-CRM_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CRM_WIRE CRM_WIRE 0)
        wm=schCreateWire(cv "route" "full" list(minus em) CRM_WIRE CRM_WIRE 0)
        unless(wp && wm error("CRM: VDC wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CRM_WIRE nil)
        schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CRM_WIRE nil)
        printf("CRM: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CRM_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CRM: failed creating external pin %s.\n" name))
        printf("CRM: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(CreateCurrentMirror_RegCascode_NMOS_TotalW_V1_20260817()
    let((cv nmos vdcMaster pinMaster M1 M2 M3 M4 M5  V_IREF_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Regulated Cascode Current Mirror - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VSS=0V  REFERENCE DRIVE: V_IREF = 1.20V  REGULATED CASCODE GATE: NA\n")
        printf("M5 senses NB2 and regulates the cascode gates for very high Rout\n")
        printf("RATIO: 1:1 default  OUTPUT: IOUT = M4.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CRM/CRM\n" CRM_LIB CRM_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CRM: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CRM: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CRM_OpenMaster(CRM_LIB CRM_NMOS)
        vdcMaster=CRM_OpenMaster("analogLib" "vdc")
        pinMaster=CRM_OpenMaster("basic" "iopin")

        M1=CRM_PlaceMOS(cv nmos "M1" -4:-4 "4u" "480n" "1" "1" "R0")
        M2=CRM_PlaceMOS(cv nmos "M2" 6:-4 "4u" "480n" "1" "1" "R0")
        M3=CRM_PlaceMOS(cv nmos "M3" -4:4 "4u" "480n" "1" "1" "R0")
        M4=CRM_PlaceMOS(cv nmos "M4" 6:4 "4u" "480n" "1" "1" "R0")
        M5=CRM_PlaceMOS(cv nmos "M5" 1:8 "2u" "480n" "1" "1" "R0")

        CRM_LabelMOSTerminal(cv M1 "G" "NB")
        CRM_LabelMOSTerminal(cv M1 "D" "NB")
        CRM_LabelMOSTerminal(cv M1 "S" "VSS")
        CRM_LabelMOSTerminal(cv M1 "B" "VSS")
        CRM_LabelMOSTerminal(cv M2 "G" "NB")
        CRM_LabelMOSTerminal(cv M2 "D" "NB2")
        CRM_LabelMOSTerminal(cv M2 "S" "VSS")
        CRM_LabelMOSTerminal(cv M2 "B" "VSS")
        CRM_LabelMOSTerminal(cv M3 "G" "NA")
        CRM_LabelMOSTerminal(cv M3 "D" "IREF")
        CRM_LabelMOSTerminal(cv M3 "S" "NB")
        CRM_LabelMOSTerminal(cv M3 "B" "VSS")
        CRM_LabelMOSTerminal(cv M4 "G" "NA")
        CRM_LabelMOSTerminal(cv M4 "D" "IOUT")
        CRM_LabelMOSTerminal(cv M4 "S" "NB2")
        CRM_LabelMOSTerminal(cv M4 "B" "VSS")
        CRM_LabelMOSTerminal(cv M5 "G" "NB2")
        CRM_LabelMOSTerminal(cv M5 "D" "NA")
        CRM_LabelMOSTerminal(cv M5 "S" "VSS")
        CRM_LabelMOSTerminal(cv M5 "B" "VSS")

        V_IREF_SRC=CRM_CreateVDC(cv vdcMaster "V_IREF_SRC" -12:8 "1.20" "IREF" "VSS")
        V_VSS_SRC=CRM_CreateVDC(cv vdcMaster "V_VSS_SRC" 12:-4 "0.0" "VSS" "VSS")

        CRM_CreatePin(cv pinMaster "IREF" "input" -10:8)
        CRM_CreatePin(cv pinMaster "IOUT" "output" 12:4)
        CRM_CreatePin(cv pinMaster "VSS" "input" 1:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CRM GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
