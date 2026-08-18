;=============================================================================
; Common-Source Amplifier - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input device (G=VIN D=VOUT S=VSS B=VSS)
;   M2  PMOS load device (G=VBP D=VOUT S=VDD B=VDD)
;=============================================================================

(setq CCS_LIB "tsmcN65")
(setq CCS_NMOS "nch")
(setq CCS_PMOS "pch")
(setq CCS_STUB 0.75)
(setq CCS_WIRE 0.0625)
procedure(CCS_ToFloat(val)
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

procedure(CCS_ValueMatches(got expect)
    let((gn en)
        gn=CCS_ToFloat(got)
        en=CCS_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CCS_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CCS: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CCS_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CCS: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CCS: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CCS: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CCS: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CCS_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CCS_ValueMatches(cdf->w->value WperFinger)
            error("CCS: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CCS_ValueMatches(cdf->l->value L)
            error("CCS: L read-back mismatch on %s.\n" inst~>name))
        unless(CCS_ValueMatches(cdf->wf->value TotalW)
            error("CCS: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CCS_ValueMatches(cdf->fingers->value NF)
            error("CCS: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CCS_ValueMatches(cdf->simM->value M)
            error("CCS: simM read-back mismatch on %s.\n" inst~>name))
        unless(CCS_ValueMatches(cdf->totalM->value totalM)
            error("CCS: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CCS_ValueMatches(cdf->nf->value NF)
            error("CCS: nf read-back mismatch on %s.\n" inst~>name))
        unless(CCS_ValueMatches(cdf->m->value M)
            error("CCS: m read-back mismatch on %s.\n" inst~>name))
        printf("CCS: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CCS_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CCS: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CCS: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CCS: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CCS_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CCS: cannot create %s.\n" name))
        CCS_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CCS_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CCS_PinCenter(inst "G")
        b=CCS_PinCenter(inst "B")
        s=CCS_PinCenter(inst "S")
        d=CCS_PinCenter(inst "D")
        p=CCS_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CCS: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CCS_STUB cadr(p))
                else list(car(p)+CCS_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CCS_STUB)
                else list(car(p) cadr(p)+CCS_STUB))
        )
    )
)

procedure(CCS_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CCS_PinCenter(inst pinName)
        e=CCS_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CCS_WIRE CCS_WIRE 0)
        unless(wire error("CCS: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CCS_WIRE nil)
        unless(label error("CCS: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CCS: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CCS_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CCS: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CCS: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CCS_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CCS: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CCS: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CCS: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CCS_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CCS: cannot create VDC %s.\n" name))
        CCS_SetVDC(inst value)
        plus=CCS_VDCPinCenter(inst "PLUS")
        minus=CCS_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CCS_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CCS_WIRE CCS_WIRE 0)
        unless(wp error("CCS: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CCS_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=CCS_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("CCS: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-CCS_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CCS_WIRE CCS_WIRE 0)
            unless(wm error("CCS: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CCS_WIRE nil)
        )
        printf("CCS: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CCS_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CCS: failed creating external pin %s.\n" name))
        printf("CCS: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CCS_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CCS_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CCS_PinCenter(inst "S")
        d=CCS_PinCenter(inst "D")
        printf("CCS: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CCS_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CCS_PinCenter(inst "S")
                d=CCS_PinCenter(inst "D")
                printf("CCS: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CCS: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateCommonSource_NMOS_TotalW_V1_20260817()()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 V_VIN_SRC V_VBP_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Common-Source Amplifier - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  VSS=0V  LOAD BIAS: V_VBP = 1.20V  VIN = 0.75V\n")
        printf("OUTPUT: VOUT = M1.D/M2.D logical net  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CCS/CCS\n" CCS_LIB CCS_NMOS)
        printf("DEVICE=CCS/CCS\n" CCS_LIB CCS_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CCS: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CCS: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CCS_OpenMaster(CCS_LIB CCS_NMOS)
        pmos=CCS_OpenMaster(CCS_LIB CCS_PMOS)
        vdcMaster=CCS_OpenMaster("analogLib" "vdc")
        pinMaster=CCS_OpenMaster("basic" "iopin")

        M1=CCS_PlaceMOS(cv nmos "M1" 0:0 "4u" "240n" "1" "1" "R0")
        M2=CCS_PlacePMOSAuto(cv pmos "M2" 0:6 "8u" "480n" "1" "1")

        CCS_LabelMOSTerminal(cv M1 "G" "VIN")
        CCS_LabelMOSTerminal(cv M1 "D" "VOUT")
        CCS_LabelMOSTerminal(cv M1 "S" "VSS")
        CCS_LabelMOSTerminal(cv M1 "B" "VSS")
        CCS_LabelMOSTerminal(cv M2 "G" "VBP")
        CCS_LabelMOSTerminal(cv M2 "D" "VOUT")
        CCS_LabelMOSTerminal(cv M2 "S" "VDD")
        CCS_LabelMOSTerminal(cv M2 "B" "VDD")

        V_VIN_SRC=CCS_CreateVDC(cv vdcMaster "V_VIN_SRC" -10:0 "0.75" "VIN" "VSS")
        V_VBP_SRC=CCS_CreateVDC(cv vdcMaster "V_VBP_SRC" -10:6 "1.20" "VBP" "VSS")
        V_VDD_SRC=CCS_CreateVDC(cv vdcMaster "V_VDD_SRC" 10:6 "1.50" "VDD" "VSS")
        V_VSS_SRC=CCS_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-4 "0.0" "VSS" "VSS")

        CCS_CreatePin(cv pinMaster "VIN" "input" -10:-6)
        CCS_CreatePin(cv pinMaster "VOUT" "output" 9:3)
        CCS_CreatePin(cv pinMaster "VDD" "input" 9:8)
        CCS_CreatePin(cv pinMaster "VSS" "input" 0:-6)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CCS GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
