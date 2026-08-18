;=============================================================================
; Complementary Source Follower - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS follower device (G=VIN D=VDD S=VOUT B=VSS)
;   M2  PMOS follower device (G=VIN D=VSS S=VOUT B=VDD)
;=============================================================================

(setq CSB_LIB "tsmcN65")
(setq CSB_NMOS "nch")
(setq CSB_PMOS "pch")
(setq CSB_STUB 0.75)
(setq CSB_WIRE 0.0625)
procedure(CSB_ToFloat(val)
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

procedure(CSB_ValueMatches(got expect)
    let((gn en)
        gn=CSB_ToFloat(got)
        en=CSB_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CSB_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CSB: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CSB_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CSB: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CSB: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CSB: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CSB: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CSB_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CSB_ValueMatches(cdf->w->value WperFinger)
            error("CSB: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CSB_ValueMatches(cdf->l->value L)
            error("CSB: L read-back mismatch on %s.\n" inst~>name))
        unless(CSB_ValueMatches(cdf->wf->value TotalW)
            error("CSB: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CSB_ValueMatches(cdf->fingers->value NF)
            error("CSB: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CSB_ValueMatches(cdf->simM->value M)
            error("CSB: simM read-back mismatch on %s.\n" inst~>name))
        unless(CSB_ValueMatches(cdf->totalM->value totalM)
            error("CSB: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CSB_ValueMatches(cdf->nf->value NF)
            error("CSB: nf read-back mismatch on %s.\n" inst~>name))
        unless(CSB_ValueMatches(cdf->m->value M)
            error("CSB: m read-back mismatch on %s.\n" inst~>name))
        printf("CSB: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CSB_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CSB: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CSB: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CSB: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CSB_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CSB: cannot create %s.\n" name))
        CSB_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CSB_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CSB_PinCenter(inst "G")
        b=CSB_PinCenter(inst "B")
        s=CSB_PinCenter(inst "S")
        d=CSB_PinCenter(inst "D")
        p=CSB_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CSB: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CSB_STUB cadr(p))
                else list(car(p)+CSB_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CSB_STUB)
                else list(car(p) cadr(p)+CSB_STUB))
        )
    )
)

procedure(CSB_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CSB_PinCenter(inst pinName)
        e=CSB_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CSB_WIRE CSB_WIRE 0)
        unless(wire error("CSB: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CSB_WIRE nil)
        unless(label error("CSB: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CSB: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CSB_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CSB: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CSB: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CSB_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CSB: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CSB: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CSB: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CSB_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CSB: cannot create VDC %s.\n" name))
        CSB_SetVDC(inst value)
        plus=CSB_VDCPinCenter(inst "PLUS")
        minus=CSB_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CSB_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CSB_WIRE CSB_WIRE 0)
        unless(wp error("CSB: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CSB_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=CSB_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("CSB: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-CSB_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CSB_WIRE CSB_WIRE 0)
            unless(wm error("CSB: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CSB_WIRE nil)
        )
        printf("CSB: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CSB_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CSB: failed creating external pin %s.\n" name))
        printf("CSB: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CSB_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CSB_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CSB_PinCenter(inst "S")
        d=CSB_PinCenter(inst "D")
        printf("CSB: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CSB_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CSB_PinCenter(inst "S")
                d=CSB_PinCenter(inst "D")
                printf("CSB: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CSB: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateSourceFollower_Complementary_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2  V_VIN_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Complementary Source Follower - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  VSS=0V  SHARED INPUT: VIN = 0.75V (both gates)\n")
        printf("Class-AB inverter-style buffer  OUTPUT: VOUT = M1.S/M2.S\n")
        printf("TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CSB/CSB\n" CSB_LIB CSB_NMOS)
        printf("DEVICE=CSB/CSB\n" CSB_LIB CSB_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CSB: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CSB: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CSB_OpenMaster(CSB_LIB CSB_NMOS)
        pmos=CSB_OpenMaster(CSB_LIB CSB_PMOS)
        vdcMaster=CSB_OpenMaster("analogLib" "vdc")
        pinMaster=CSB_OpenMaster("basic" "iopin")

        M1=CSB_PlaceMOS(cv nmos "M1" 0:4 "4u" "240n" "1" "1" "R0")
        M2=CSB_PlacePMOSAuto(cv pmos "M2" 0:-4 "8u" "480n" "1" "1")

        CSB_LabelMOSTerminal(cv M1 "G" "VIN")
        CSB_LabelMOSTerminal(cv M1 "D" "VDD")
        CSB_LabelMOSTerminal(cv M1 "S" "VOUT")
        CSB_LabelMOSTerminal(cv M1 "B" "VSS")
        CSB_LabelMOSTerminal(cv M2 "G" "VIN")
        CSB_LabelMOSTerminal(cv M2 "D" "VSS")
        CSB_LabelMOSTerminal(cv M2 "S" "VOUT")
        CSB_LabelMOSTerminal(cv M2 "B" "VDD")

        V_VIN_SRC=CSB_CreateVDC(cv vdcMaster "V_VIN_SRC" -10:0 "0.75" "VIN" "VSS")
        V_VDD_SRC=CSB_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:10 "1.50" "VDD" "VSS")
        V_VSS_SRC=CSB_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-10 "0.0" "VSS" "VSS")

        CSB_CreatePin(cv pinMaster "VIN" "input" -10:4)
        CSB_CreatePin(cv pinMaster "VOUT" "output" 9:0)
        CSB_CreatePin(cv pinMaster "VDD" "input" 0:12)
        CSB_CreatePin(cv pinMaster "VSS" "input" 0:-12)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CSB GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
