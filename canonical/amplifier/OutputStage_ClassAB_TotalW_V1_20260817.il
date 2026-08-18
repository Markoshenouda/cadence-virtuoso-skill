;=============================================================================
; Class-AB Output Stage - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M3  NMOS diode bias device (G=NB D=NB S=VSS B=VSS)
;   M4  PMOS diode bias device (G=NP D=NP S=VDD B=VDD)
;   M1  NMOS output device (G=NB D=VOUT S=VSS B=VSS)
;   M2  PMOS output device (G=NP D=VOUT S=VDD B=VDD)
;=============================================================================

(setq CAB_LIB "tsmcN65")
(setq CAB_NMOS "nch")
(setq CAB_PMOS "pch")
(setq CAB_STUB 0.75)
(setq CAB_WIRE 0.0625)
procedure(CAB_ToFloat(val)
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

procedure(CAB_ValueMatches(got expect)
    let((gn en)
        gn=CAB_ToFloat(got)
        en=CAB_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CAB_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CAB: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CAB_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CAB: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CAB: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CAB: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CAB: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CAB_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CAB_ValueMatches(cdf->w->value WperFinger)
            error("CAB: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CAB_ValueMatches(cdf->l->value L)
            error("CAB: L read-back mismatch on %s.\n" inst~>name))
        unless(CAB_ValueMatches(cdf->wf->value TotalW)
            error("CAB: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CAB_ValueMatches(cdf->fingers->value NF)
            error("CAB: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CAB_ValueMatches(cdf->simM->value M)
            error("CAB: simM read-back mismatch on %s.\n" inst~>name))
        unless(CAB_ValueMatches(cdf->totalM->value totalM)
            error("CAB: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CAB_ValueMatches(cdf->nf->value NF)
            error("CAB: nf read-back mismatch on %s.\n" inst~>name))
        unless(CAB_ValueMatches(cdf->m->value M)
            error("CAB: m read-back mismatch on %s.\n" inst~>name))
        printf("CAB: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CAB_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CAB: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CAB: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CAB: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CAB_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CAB: cannot create %s.\n" name))
        CAB_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CAB_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CAB_PinCenter(inst "G")
        b=CAB_PinCenter(inst "B")
        s=CAB_PinCenter(inst "S")
        d=CAB_PinCenter(inst "D")
        p=CAB_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CAB: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CAB_STUB cadr(p))
                else list(car(p)+CAB_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CAB_STUB)
                else list(car(p) cadr(p)+CAB_STUB))
        )
    )
)

procedure(CAB_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CAB_PinCenter(inst pinName)
        e=CAB_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CAB_WIRE CAB_WIRE 0)
        unless(wire error("CAB: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CAB_WIRE nil)
        unless(label error("CAB: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CAB: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CAB_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CAB: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CAB: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CAB_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CAB: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CAB: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CAB: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CAB_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CAB: cannot create VDC %s.\n" name))
        CAB_SetVDC(inst value)
        plus=CAB_VDCPinCenter(inst "PLUS")
        minus=CAB_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CAB_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CAB_WIRE CAB_WIRE 0)
        unless(wp error("CAB: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CAB_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=CAB_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("CAB: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-CAB_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CAB_WIRE CAB_WIRE 0)
            unless(wm error("CAB: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CAB_WIRE nil)
        )
        printf("CAB: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CAB_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CAB: failed creating external pin %s.\n" name))
        printf("CAB: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CAB_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CAB_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CAB_PinCenter(inst "S")
        d=CAB_PinCenter(inst "D")
        printf("CAB: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CAB_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CAB_PinCenter(inst "S")
                d=CAB_PinCenter(inst "D")
                printf("CAB: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CAB: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateOutputStage_ClassAB_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M3 M4 M1 M2  V_VDD_SRC V_VNP_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Class-AB Output Stage - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  BIAS STRING: V_VNP = 0.75V drives the NMOS/PMOS diode chain\n")
        printf("Diode bias sets the class-AB dead zone; output at the M1/M2 drains\n")
        printf("TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CAB/CAB\n" CAB_LIB CAB_NMOS)
        printf("DEVICE=CAB/CAB\n" CAB_LIB CAB_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CAB: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CAB: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CAB_OpenMaster(CAB_LIB CAB_NMOS)
        pmos=CAB_OpenMaster(CAB_LIB CAB_PMOS)
        vdcMaster=CAB_OpenMaster("analogLib" "vdc")
        pinMaster=CAB_OpenMaster("basic" "iopin")

        M3=CAB_PlaceMOS(cv nmos "M3" -4:0 "2u" "480n" "1" "1" "R0")
        M4=CAB_PlacePMOSAuto(cv pmos "M4" -4:6 "4u" "480n" "1" "1")
        M1=CAB_PlaceMOS(cv nmos "M1" 4:0 "8u" "240n" "1" "1" "R0")
        M2=CAB_PlacePMOSAuto(cv pmos "M2" 4:6 "16u" "240n" "1" "1")

        CAB_LabelMOSTerminal(cv M3 "G" "NB")
        CAB_LabelMOSTerminal(cv M3 "D" "NB")
        CAB_LabelMOSTerminal(cv M3 "S" "VSS")
        CAB_LabelMOSTerminal(cv M3 "B" "VSS")
        CAB_LabelMOSTerminal(cv M4 "G" "NP")
        CAB_LabelMOSTerminal(cv M4 "D" "NP")
        CAB_LabelMOSTerminal(cv M4 "S" "VDD")
        CAB_LabelMOSTerminal(cv M4 "B" "VDD")
        CAB_LabelMOSTerminal(cv M1 "G" "NB")
        CAB_LabelMOSTerminal(cv M1 "D" "VOUT")
        CAB_LabelMOSTerminal(cv M1 "S" "VSS")
        CAB_LabelMOSTerminal(cv M1 "B" "VSS")
        CAB_LabelMOSTerminal(cv M2 "G" "NP")
        CAB_LabelMOSTerminal(cv M2 "D" "VOUT")
        CAB_LabelMOSTerminal(cv M2 "S" "VDD")
        CAB_LabelMOSTerminal(cv M2 "B" "VDD")

        V_VDD_SRC=CAB_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:14 "1.50" "VDD" "VSS")
        V_VNP_SRC=CAB_CreateVDC(cv vdcMaster "V_VNP_SRC" -12:3 "0.75" "VNP" "VSS")
        V_VSS_SRC=CAB_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-8 "0.0" "VSS" "VSS")

        CAB_CreatePin(cv pinMaster "VNP" "input" -10:3)
        CAB_CreatePin(cv pinMaster "VOUT" "output" 10:3)
        CAB_CreatePin(cv pinMaster "VDD" "input" 0:16)
        CAB_CreatePin(cv pinMaster "VSS" "input" 0:-10)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CAB GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
