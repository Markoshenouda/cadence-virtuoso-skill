;=============================================================================
; Wide-Swing Cascode Current Mirror - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS reference bottom device (G=NB D=NB2 S=VSS B=VSS)
;   M2  NMOS output bottom device (G=NB D=NB2R S=VSS B=VSS)
;   M3  NMOS reference cascode (G=NBIAS D=IREF S=NB2 B=VSS)
;   M4  NMOS output cascode (G=NBIAS D=IOUT S=NB2R B=VSS)
;   M5  NMOS bias diode (G=D=NB S=VSS B=VSS)
;   M6  NMOS bias cascode diode (G=D=NBIAS S=NB D=IREF B=VSS)
;=============================================================================

(setq WSC_LIB "tsmcN65")
(setq WSC_NMOS "nch")
(setq WSC_STUB 0.75)
(setq WSC_WIRE 0.0625)
procedure(WSC_ToFloat(val)
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

procedure(WSC_ValueMatches(got expect)
    let((gn en)
        gn=WSC_ToFloat(got)
        en=WSC_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(WSC_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("WSC: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(WSC_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("WSC: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("WSC: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("WSC: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("WSC: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=WSC_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(WSC_ValueMatches(cdf->w->value WperFinger)
            error("WSC: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(WSC_ValueMatches(cdf->l->value L)
            error("WSC: L read-back mismatch on %s.\n" inst~>name))
        unless(WSC_ValueMatches(cdf->wf->value TotalW)
            error("WSC: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(WSC_ValueMatches(cdf->fingers->value NF)
            error("WSC: fingers read-back mismatch on %s.\n" inst~>name))
        unless(WSC_ValueMatches(cdf->simM->value M)
            error("WSC: simM read-back mismatch on %s.\n" inst~>name))
        unless(WSC_ValueMatches(cdf->totalM->value totalM)
            error("WSC: totalM read-back mismatch on %s.\n" inst~>name))
        unless(WSC_ValueMatches(cdf->nf->value NF)
            error("WSC: nf read-back mismatch on %s.\n" inst~>name))
        unless(WSC_ValueMatches(cdf->m->value M)
            error("WSC: m read-back mismatch on %s.\n" inst~>name))
        printf("WSC: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(WSC_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("WSC: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("WSC: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("WSC: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(WSC_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("WSC: cannot create %s.\n" name))
        WSC_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(WSC_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=WSC_PinCenter(inst "G")
        b=WSC_PinCenter(inst "B")
        s=WSC_PinCenter(inst "S")
        d=WSC_PinCenter(inst "D")
        p=WSC_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("WSC: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-WSC_STUB cadr(p))
                else list(car(p)+WSC_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-WSC_STUB)
                else list(car(p) cadr(p)+WSC_STUB))
        )
    )
)

procedure(WSC_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=WSC_PinCenter(inst pinName)
        e=WSC_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) WSC_WIRE WSC_WIRE 0)
        unless(wire error("WSC: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" WSC_WIRE nil)
        unless(label error("WSC: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("WSC: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(WSC_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("WSC: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("WSC: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(WSC_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("WSC: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("WSC: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("WSC: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(WSC_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("WSC: cannot create VDC %s.\n" name))
        WSC_SetVDC(inst value)
        plus=WSC_VDCPinCenter(inst "PLUS")
        minus=WSC_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+WSC_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) WSC_WIRE WSC_WIRE 0)
        unless(wp error("WSC: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" WSC_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=WSC_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("WSC: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-WSC_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) WSC_WIRE WSC_WIRE 0)
            unless(wm error("WSC: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" WSC_WIRE nil)
        )
        printf("WSC: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(WSC_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("WSC: failed creating external pin %s.\n" name))
        printf("WSC: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(CreateCurrentMirror_WideSwing_NMOS_TotalW_V1_20260817()
    let((cv nmos vdcMaster pinMaster M1 M2 M3 M4 M5 M6  V_IREF_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Wide-Swing Cascode Current Mirror - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VSS=0V  SELF-BIASED: M5/M6 diode stack generates NB and NBIAS internally\n")
        printf("REFERENCE DRIVE: V_IREF = 1.20V  Wide-swing cascode output\n")
        printf("RATIO: 1:1 default  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=WSC/WSC\n" WSC_LIB WSC_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("WSC: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("WSC: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=WSC_OpenMaster(WSC_LIB WSC_NMOS)
        vdcMaster=WSC_OpenMaster("analogLib" "vdc")
        pinMaster=WSC_OpenMaster("basic" "iopin")

        M1=WSC_PlaceMOS(cv nmos "M1" 0:0 "4u" "480n" "1" "1" "R0")
        M2=WSC_PlaceMOS(cv nmos "M2" 8:0 "4u" "480n" "1" "1" "R0")
        M3=WSC_PlaceMOS(cv nmos "M3" 0:6 "4u" "480n" "1" "1" "R0")
        M4=WSC_PlaceMOS(cv nmos "M4" 8:6 "4u" "480n" "1" "1" "R0")
        M5=WSC_PlaceMOS(cv nmos "M5" -7:0 "4u" "480n" "1" "1" "R0")
        M6=WSC_PlaceMOS(cv nmos "M6" -7:6 "4u" "480n" "1" "1" "R0")

        WSC_LabelMOSTerminal(cv M1 "G" "NB")
        WSC_LabelMOSTerminal(cv M1 "D" "NB2")
        WSC_LabelMOSTerminal(cv M1 "S" "VSS")
        WSC_LabelMOSTerminal(cv M1 "B" "VSS")
        WSC_LabelMOSTerminal(cv M2 "G" "NB")
        WSC_LabelMOSTerminal(cv M2 "D" "NB2R")
        WSC_LabelMOSTerminal(cv M2 "S" "VSS")
        WSC_LabelMOSTerminal(cv M2 "B" "VSS")
        WSC_LabelMOSTerminal(cv M3 "G" "NBIAS")
        WSC_LabelMOSTerminal(cv M3 "D" "IREF")
        WSC_LabelMOSTerminal(cv M3 "S" "NB2")
        WSC_LabelMOSTerminal(cv M3 "B" "VSS")
        WSC_LabelMOSTerminal(cv M4 "G" "NBIAS")
        WSC_LabelMOSTerminal(cv M4 "D" "IOUT")
        WSC_LabelMOSTerminal(cv M4 "S" "NB2R")
        WSC_LabelMOSTerminal(cv M4 "B" "VSS")
        WSC_LabelMOSTerminal(cv M5 "G" "NB")
        WSC_LabelMOSTerminal(cv M5 "D" "NB")
        WSC_LabelMOSTerminal(cv M5 "S" "VSS")
        WSC_LabelMOSTerminal(cv M5 "B" "VSS")
        WSC_LabelMOSTerminal(cv M6 "G" "NBIAS")
        WSC_LabelMOSTerminal(cv M6 "D" "IREF")
        WSC_LabelMOSTerminal(cv M6 "S" "NB")
        WSC_LabelMOSTerminal(cv M6 "B" "VSS")

        V_IREF_SRC=WSC_CreateVDC(cv vdcMaster "V_IREF_SRC" -13:10 "1.20" "IREF" "VSS")
        V_VSS_SRC=WSC_CreateVDC(cv vdcMaster "V_VSS_SRC" 13:-4 "0.0" "VSS" "VSS")

        WSC_CreatePin(cv pinMaster "IREF" "input" -11:12)
        WSC_CreatePin(cv pinMaster "IOUT" "output" 13:6)
        WSC_CreatePin(cv pinMaster "VSS" "input" 4:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" WSC GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
