;=============================================================================
; Cascode PMOS Current Mirror - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  PMOS diode reference (G=NB D=NB S=VDD B=VDD)
;   M2  PMOS output device (G=NB D=NB2 S=VDD B=VDD)
;   M3  PMOS reference cascode (G=VBC S=NB D=IREF B=VDD)
;   M4  PMOS output cascode (G=VBC S=NB2 D=IOUT B=VDD)
;=============================================================================

(setq CPM2_LIB "tsmcN65")
(setq CPM2_NMOS "nch")
(setq CPM2_PMOS "pch")
(setq CPM2_STUB 0.75)
(setq CPM2_WIRE 0.0625)
procedure(CPM2_ToFloat(val)
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

procedure(CPM2_ValueMatches(got expect)
    let((gn en)
        gn=CPM2_ToFloat(got)
        en=CPM2_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CPM2_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CPM2: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CPM2_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CPM2: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CPM2: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CPM2: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CPM2: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CPM2_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CPM2_ValueMatches(cdf->w->value WperFinger)
            error("CPM2: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CPM2_ValueMatches(cdf->l->value L)
            error("CPM2: L read-back mismatch on %s.\n" inst~>name))
        unless(CPM2_ValueMatches(cdf->wf->value TotalW)
            error("CPM2: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CPM2_ValueMatches(cdf->fingers->value NF)
            error("CPM2: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CPM2_ValueMatches(cdf->simM->value M)
            error("CPM2: simM read-back mismatch on %s.\n" inst~>name))
        unless(CPM2_ValueMatches(cdf->totalM->value totalM)
            error("CPM2: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CPM2_ValueMatches(cdf->nf->value NF)
            error("CPM2: nf read-back mismatch on %s.\n" inst~>name))
        unless(CPM2_ValueMatches(cdf->m->value M)
            error("CPM2: m read-back mismatch on %s.\n" inst~>name))
        printf("CPM2: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CPM2_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CPM2: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CPM2: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CPM2: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CPM2_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CPM2: cannot create %s.\n" name))
        CPM2_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CPM2_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CPM2_PinCenter(inst "G")
        b=CPM2_PinCenter(inst "B")
        s=CPM2_PinCenter(inst "S")
        d=CPM2_PinCenter(inst "D")
        p=CPM2_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CPM2: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CPM2_STUB cadr(p))
                else list(car(p)+CPM2_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CPM2_STUB)
                else list(car(p) cadr(p)+CPM2_STUB))
        )
    )
)

procedure(CPM2_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CPM2_PinCenter(inst pinName)
        e=CPM2_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CPM2_WIRE CPM2_WIRE 0)
        unless(wire error("CPM2: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CPM2_WIRE nil)
        unless(label error("CPM2: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CPM2: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CPM2_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CPM2: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CPM2: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CPM2_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CPM2: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CPM2: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CPM2: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CPM2_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CPM2: cannot create VDC %s.\n" name))
        CPM2_SetVDC(inst value)
        plus=CPM2_VDCPinCenter(inst "PLUS")
        minus=CPM2_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CPM2_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CPM2_WIRE CPM2_WIRE 0)
        unless(wp error("CPM2: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CPM2_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=CPM2_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("CPM2: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-CPM2_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CPM2_WIRE CPM2_WIRE 0)
            unless(wm error("CPM2: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CPM2_WIRE nil)
        )
        printf("CPM2: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CPM2_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CPM2: failed creating external pin %s.\n" name))
        printf("CPM2: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CPM2_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CPM2_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CPM2_PinCenter(inst "S")
        d=CPM2_PinCenter(inst "D")
        printf("CPM2: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CPM2_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CPM2_PinCenter(inst "S")
                d=CPM2_PinCenter(inst "D")
                printf("CPM2: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CPM2: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateCurrentMirror_Cascode_PMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4  V_VDD_SRC V_VBC_SRC V_IREF_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Cascode PMOS Current Mirror - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  CASCODE BIAS: V_VBC = 0.60V  REFERENCE DRIVE: V_IREF = 0.80V\n")
        printf("PMOS orientation selected from actual S/D geometry\n")
        printf("RATIO: 1:1 default  OUTPUT: IOUT = M4.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CPM2/CPM2\n" CPM2_LIB CPM2_NMOS)
        printf("DEVICE=CPM2/CPM2\n" CPM2_LIB CPM2_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CPM2: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CPM2: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CPM2_OpenMaster(CPM2_LIB CPM2_NMOS)
        pmos=CPM2_OpenMaster(CPM2_LIB CPM2_PMOS)
        vdcMaster=CPM2_OpenMaster("analogLib" "vdc")
        pinMaster=CPM2_OpenMaster("basic" "iopin")

        M1=CPM2_PlacePMOSAuto(cv pmos "M1" -4:4 "8u" "480n" "1" "1")
        M2=CPM2_PlacePMOSAuto(cv pmos "M2" 6:4 "8u" "480n" "1" "1")
        M3=CPM2_PlacePMOSAuto(cv pmos "M3" -4:-4 "8u" "480n" "1" "1")
        M4=CPM2_PlacePMOSAuto(cv pmos "M4" 6:-4 "8u" "480n" "1" "1")

        CPM2_LabelMOSTerminal(cv M1 "G" "NB")
        CPM2_LabelMOSTerminal(cv M1 "D" "NB")
        CPM2_LabelMOSTerminal(cv M1 "S" "VDD")
        CPM2_LabelMOSTerminal(cv M1 "B" "VDD")
        CPM2_LabelMOSTerminal(cv M2 "G" "NB")
        CPM2_LabelMOSTerminal(cv M2 "D" "NB2")
        CPM2_LabelMOSTerminal(cv M2 "S" "VDD")
        CPM2_LabelMOSTerminal(cv M2 "B" "VDD")
        CPM2_LabelMOSTerminal(cv M3 "G" "VBC")
        CPM2_LabelMOSTerminal(cv M3 "D" "IREF")
        CPM2_LabelMOSTerminal(cv M3 "S" "NB")
        CPM2_LabelMOSTerminal(cv M3 "B" "VDD")
        CPM2_LabelMOSTerminal(cv M4 "G" "VBC")
        CPM2_LabelMOSTerminal(cv M4 "D" "IOUT")
        CPM2_LabelMOSTerminal(cv M4 "S" "NB2")
        CPM2_LabelMOSTerminal(cv M4 "B" "VDD")

        V_VDD_SRC=CPM2_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:10 "1.50" "VDD" "VSS")
        V_VBC_SRC=CPM2_CreateVDC(cv vdcMaster "V_VBC_SRC" -12:0 "0.60" "VBC" "VSS")
        V_IREF_SRC=CPM2_CreateVDC(cv vdcMaster "V_IREF_SRC" -12:6 "0.80" "IREF" "VSS")
        V_VSS_SRC=CPM2_CreateVDC(cv vdcMaster "V_VSS_SRC" 12:-6 "0.0" "VSS" "VSS")

        CPM2_CreatePin(cv pinMaster "IREF" "input" -10:-8)
        CPM2_CreatePin(cv pinMaster "IOUT" "output" 11:-8)
        CPM2_CreatePin(cv pinMaster "VDD" "input" 0:12)
        CPM2_CreatePin(cv pinMaster "VSS" "input" 0:-10)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CPM2 GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
