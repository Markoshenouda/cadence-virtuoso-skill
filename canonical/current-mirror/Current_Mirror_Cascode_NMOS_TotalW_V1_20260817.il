;=============================================================================
; Cascode Current Mirror - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS diode-connected reference (G=NB  D=NB  S=VSS B=VSS)
;   M2  NMOS output device             (G=NB  D=NB2 S=VSS B=VSS)
;   M3  NMOS reference cascode         (G=VBC S=NB  D=IREF B=VSS)
;   M4  NMOS output cascode            (G=VBC S=NB2 D=IOUT B=VSS)
;=============================================================================

(setq CCM_LIB "tsmcN65")
(setq CCM_NMOS "nch")
(setq CCM_STUB 0.75)
(setq CCM_WIRE 0.0625)
procedure(CCM_ToFloat(val)
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

procedure(CCM_ValueMatches(got expect)
    let((gn en)
        gn=CCM_ToFloat(got)
        en=CCM_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CCM_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CCM: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CCM_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CCM: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CCM: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CCM: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CCM: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CCM_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CCM_ValueMatches(cdf->w->value WperFinger)
            error("CCM: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CCM_ValueMatches(cdf->l->value L)
            error("CCM: L read-back mismatch on %s.\n" inst~>name))
        unless(CCM_ValueMatches(cdf->wf->value TotalW)
            error("CCM: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CCM_ValueMatches(cdf->fingers->value NF)
            error("CCM: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CCM_ValueMatches(cdf->simM->value M)
            error("CCM: simM read-back mismatch on %s.\n" inst~>name))
        unless(CCM_ValueMatches(cdf->totalM->value totalM)
            error("CCM: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CCM_ValueMatches(cdf->nf->value NF)
            error("CCM: nf read-back mismatch on %s.\n" inst~>name))
        unless(CCM_ValueMatches(cdf->m->value M)
            error("CCM: m read-back mismatch on %s.\n" inst~>name))
        printf("CCM: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CCM_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CCM: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CCM: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CCM: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CCM_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CCM: cannot create %s.\n" name))
        CCM_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CCM_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CCM_PinCenter(inst "G")
        b=CCM_PinCenter(inst "B")
        s=CCM_PinCenter(inst "S")
        d=CCM_PinCenter(inst "D")
        p=CCM_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CCM: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CCM_STUB cadr(p))
                else list(car(p)+CCM_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CCM_STUB)
                else list(car(p) cadr(p)+CCM_STUB))
        )
    )
)

procedure(CCM_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CCM_PinCenter(inst pinName)
        e=CCM_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CCM_WIRE CCM_WIRE 0)
        unless(wire error("CCM: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CCM_WIRE nil)
        unless(label error("CCM: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CCM: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CCM_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CCM: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CCM: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CCM_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CCM: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CCM: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CCM: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CCM_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CCM: cannot create VDC %s.\n" name))
        CCM_SetVDC(inst value)
        plus=CCM_VDCPinCenter(inst "PLUS")
        minus=CCM_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CCM_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CCM_WIRE CCM_WIRE 0)
        unless(wp error("CCM: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CCM_WIRE nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("CCM: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-CCM_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CCM_WIRE CCM_WIRE 0)
            unless(wm error("CCM: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CCM_WIRE nil)
        )
        printf("CCM: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CCM_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CCM: failed creating external pin %s.\n" name))
        printf("CCM: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(CreateCurrentMirror_Cascode_NMOS_TotalW_V1_20260817()()
    let((cv nmos vdcMaster pinMaster M1 M2 M3 M4 V_VBC_SRC V_IREF_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Cascode Current Mirror - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VSS=0V  CASCODE BIAS: V_VBC = 0.90V  REFERENCE DRIVE: V_IREF = 1.20V\n")
        printf("RATIO: 1:1 default; set by M1/M2 and M3/M4 TotalW/NF/M\n")
        printf("OUTPUT: IOUT = M4.D logical net  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CCM/CCM\n" CCM_LIB CCM_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CCM: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CCM: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CCM_OpenMaster(CCM_LIB CCM_NMOS)
        vdcMaster=CCM_OpenMaster("analogLib" "vdc")
        pinMaster=CCM_OpenMaster("basic" "iopin")

        M1=CCM_PlaceMOS(cv nmos "M1" 0:-3 "4u" "480n" "1" "1" "R0")
        M2=CCM_PlaceMOS(cv nmos "M2" 6:-3 "4u" "480n" "1" "1" "R0")
        M3=CCM_PlaceMOS(cv nmos "M3" 0:3 "4u" "480n" "1" "1" "R0")
        M4=CCM_PlaceMOS(cv nmos "M4" 6:3 "4u" "480n" "1" "1" "R0")

        CCM_LabelMOSTerminal(cv M1 "G" "NB")
        CCM_LabelMOSTerminal(cv M1 "D" "NB")
        CCM_LabelMOSTerminal(cv M1 "S" "VSS")
        CCM_LabelMOSTerminal(cv M1 "B" "VSS")
        CCM_LabelMOSTerminal(cv M2 "G" "NB")
        CCM_LabelMOSTerminal(cv M2 "D" "NB2")
        CCM_LabelMOSTerminal(cv M2 "S" "VSS")
        CCM_LabelMOSTerminal(cv M2 "B" "VSS")
        CCM_LabelMOSTerminal(cv M3 "G" "VBC")
        CCM_LabelMOSTerminal(cv M3 "S" "NB")
        CCM_LabelMOSTerminal(cv M3 "D" "IREF")
        CCM_LabelMOSTerminal(cv M3 "B" "VSS")
        CCM_LabelMOSTerminal(cv M4 "G" "VBC")
        CCM_LabelMOSTerminal(cv M4 "S" "NB2")
        CCM_LabelMOSTerminal(cv M4 "D" "IOUT")
        CCM_LabelMOSTerminal(cv M4 "B" "VSS")

        V_VBC_SRC=CCM_CreateVDC(cv vdcMaster "V_VBC_SRC" -11:3 "0.90" "VBC" "VSS")
        V_IREF_SRC=CCM_CreateVDC(cv vdcMaster "V_IREF_SRC" -11:6 "1.20" "IREF" "VSS")
        V_VSS_SRC=CCM_CreateVDC(cv vdcMaster "V_VSS_SRC" 11:-3 "0.0" "VSS" "VSS")

        CCM_CreatePin(cv pinMaster "IREF" "input" -9:0)
        CCM_CreatePin(cv pinMaster "IOUT" "output" 11:0)
        CCM_CreatePin(cv pinMaster "VSS" "input" 3:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CCM GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
