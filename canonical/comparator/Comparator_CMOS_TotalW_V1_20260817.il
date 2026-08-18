;=============================================================================
; CMOS Comparator - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input pair (G=VINP D=MIRROR S=TAIL B=VSS)
;   M2  NMOS input pair (G=VINN D=VOUT1 S=TAIL B=VSS)
;   M3  PMOS diode mirror (G=MIRROR D=MIRROR S=VDD B=VDD)
;   M4  PMOS mirror load (G=MIRROR D=VOUT1 S=VDD B=VDD)
;   M5  NMOS tail source (G=VBN_TAIL D=TAIL S=VSS B=VSS)
;   M6  NMOS inverter device (G=VOUT1 D=VOUT S=VSS B=VSS)
;   M7  PMOS inverter device (G=VOUT1 D=VOUT S=VDD B=VDD)
;=============================================================================

(setq CMP_LIB "tsmcN65")
(setq CMP_NMOS "nch")
(setq CMP_PMOS "pch")
(setq CMP_STUB 0.75)
(setq CMP_WIRE 0.0625)
procedure(CMP_ToFloat(val)
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

procedure(CMP_ValueMatches(got expect)
    let((gn en)
        gn=CMP_ToFloat(got)
        en=CMP_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CMP_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CMP: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CMP_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CMP: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CMP: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CMP: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CMP: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CMP_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CMP_ValueMatches(cdf->w->value WperFinger)
            error("CMP: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CMP_ValueMatches(cdf->l->value L)
            error("CMP: L read-back mismatch on %s.\n" inst~>name))
        unless(CMP_ValueMatches(cdf->wf->value TotalW)
            error("CMP: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CMP_ValueMatches(cdf->fingers->value NF)
            error("CMP: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CMP_ValueMatches(cdf->simM->value M)
            error("CMP: simM read-back mismatch on %s.\n" inst~>name))
        unless(CMP_ValueMatches(cdf->totalM->value totalM)
            error("CMP: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CMP_ValueMatches(cdf->nf->value NF)
            error("CMP: nf read-back mismatch on %s.\n" inst~>name))
        unless(CMP_ValueMatches(cdf->m->value M)
            error("CMP: m read-back mismatch on %s.\n" inst~>name))
        printf("CMP: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CMP_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CMP: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CMP: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CMP: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CMP_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CMP: cannot create %s.\n" name))
        CMP_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CMP_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CMP_PinCenter(inst "G")
        b=CMP_PinCenter(inst "B")
        s=CMP_PinCenter(inst "S")
        d=CMP_PinCenter(inst "D")
        p=CMP_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CMP: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CMP_STUB cadr(p))
                else list(car(p)+CMP_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CMP_STUB)
                else list(car(p) cadr(p)+CMP_STUB))
        )
    )
)

procedure(CMP_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CMP_PinCenter(inst pinName)
        e=CMP_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CMP_WIRE CMP_WIRE 0)
        unless(wire error("CMP: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CMP_WIRE nil)
        unless(label error("CMP: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CMP: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CMP_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CMP: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CMP: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CMP_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CMP: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CMP: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CMP: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CMP_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CMP: cannot create VDC %s.\n" name))
        CMP_SetVDC(inst value)
        plus=CMP_VDCPinCenter(inst "PLUS")
        minus=CMP_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CMP_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CMP_WIRE CMP_WIRE 0)
        unless(wp error("CMP: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CMP_WIRE nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("CMP: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-CMP_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CMP_WIRE CMP_WIRE 0)
            unless(wm error("CMP: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CMP_WIRE nil)
        )
        printf("CMP: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CMP_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CMP: failed creating external pin %s.\n" name))
        printf("CMP: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CMP_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CMP_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CMP_PinCenter(inst "S")
        d=CMP_PinCenter(inst "D")
        printf("CMP: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CMP_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CMP_PinCenter(inst "S")
                d=CMP_PinCenter(inst "D")
                printf("CMP: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CMP: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateComparator_CMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4 M5 M6 M7  V_VDD_SRC V_VBN_TAIL_SRC V_VINP_SRC V_VINN_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" CMOS Comparator - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  VSS=0V  TAIL BIAS: V_VBN_TAIL = 0.60V  INPUTS: 0.75V\n")
        printf("Open-loop 5T preamp stage plus CMOS inverter decision stage\n")
        printf("OUTPUT: VOUT = M6.D/M7.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CMP/CMP\n" CMP_LIB CMP_NMOS)
        printf("DEVICE=CMP/CMP\n" CMP_LIB CMP_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CMP: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CMP: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CMP_OpenMaster(CMP_LIB CMP_NMOS)
        pmos=CMP_OpenMaster(CMP_LIB CMP_PMOS)
        vdcMaster=CMP_OpenMaster("analogLib" "vdc")
        pinMaster=CMP_OpenMaster("basic" "iopin")

        M1=CMP_PlaceMOS(cv nmos "M1" -3:0 "2u" "240n" "1" "1" "R0")
        M2=CMP_PlaceMOS(cv nmos "M2" 3:0 "2u" "240n" "1" "1" "R0")
        M3=CMP_PlacePMOSAuto(cv pmos "M3" -3:6 "4u" "480n" "1" "1")
        M4=CMP_PlacePMOSAuto(cv pmos "M4" 3:6 "4u" "480n" "1" "1")
        M5=CMP_PlaceMOS(cv nmos "M5" 0:-6 "6u" "480n" "1" "1" "R0")
        M6=CMP_PlaceMOS(cv nmos "M6" 9:-2 "2u" "240n" "1" "1" "R0")
        M7=CMP_PlacePMOSAuto(cv pmos "M7" 9:4 "4u" "240n" "1" "1")

        CMP_LabelMOSTerminal(cv M1 "G" "VINP")
        CMP_LabelMOSTerminal(cv M1 "D" "MIRROR")
        CMP_LabelMOSTerminal(cv M1 "S" "TAIL")
        CMP_LabelMOSTerminal(cv M1 "B" "VSS")
        CMP_LabelMOSTerminal(cv M2 "G" "VINN")
        CMP_LabelMOSTerminal(cv M2 "D" "VOUT1")
        CMP_LabelMOSTerminal(cv M2 "S" "TAIL")
        CMP_LabelMOSTerminal(cv M2 "B" "VSS")
        CMP_LabelMOSTerminal(cv M3 "G" "MIRROR")
        CMP_LabelMOSTerminal(cv M3 "D" "MIRROR")
        CMP_LabelMOSTerminal(cv M3 "S" "VDD")
        CMP_LabelMOSTerminal(cv M3 "B" "VDD")
        CMP_LabelMOSTerminal(cv M4 "G" "MIRROR")
        CMP_LabelMOSTerminal(cv M4 "D" "VOUT1")
        CMP_LabelMOSTerminal(cv M4 "S" "VDD")
        CMP_LabelMOSTerminal(cv M4 "B" "VDD")
        CMP_LabelMOSTerminal(cv M5 "G" "VBN_TAIL")
        CMP_LabelMOSTerminal(cv M5 "D" "TAIL")
        CMP_LabelMOSTerminal(cv M5 "S" "VSS")
        CMP_LabelMOSTerminal(cv M5 "B" "VSS")
        CMP_LabelMOSTerminal(cv M6 "G" "VOUT1")
        CMP_LabelMOSTerminal(cv M6 "D" "VOUT")
        CMP_LabelMOSTerminal(cv M6 "S" "VSS")
        CMP_LabelMOSTerminal(cv M6 "B" "VSS")
        CMP_LabelMOSTerminal(cv M7 "G" "VOUT1")
        CMP_LabelMOSTerminal(cv M7 "D" "VOUT")
        CMP_LabelMOSTerminal(cv M7 "S" "VDD")
        CMP_LabelMOSTerminal(cv M7 "B" "VDD")

        V_VDD_SRC=CMP_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:12 "1.50" "VDD" "VSS")
        V_VBN_TAIL_SRC=CMP_CreateVDC(cv vdcMaster "V_VBN_TAIL_SRC" -12:0 "0.60" "VBN_TAIL" "VSS")
        V_VINP_SRC=CMP_CreateVDC(cv vdcMaster "V_VINP_SRC" -12:-4 "0.75" "VINP" "VSS")
        V_VINN_SRC=CMP_CreateVDC(cv vdcMaster "V_VINN_SRC" -12:-8 "0.75" "VINN" "VSS")
        V_VSS_SRC=CMP_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-10 "0.0" "VSS" "VSS")

        CMP_CreatePin(cv pinMaster "VINP" "input" -10:-10)
        CMP_CreatePin(cv pinMaster "VINN" "input" -7:-10)
        CMP_CreatePin(cv pinMaster "VOUT" "output" 13:1)
        CMP_CreatePin(cv pinMaster "VDD" "input" 0:14)
        CMP_CreatePin(cv pinMaster "VSS" "input" 0:-12)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CMP GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
