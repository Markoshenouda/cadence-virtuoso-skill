;=============================================================================
; StrongARM Comparator - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M5  NMOS clock tail (G=CLK D=TAIL S=VSS B=VSS)
;   M1  NMOS input pair (G=VINP D=ND1 S=TAIL B=VSS)
;   M2  NMOS input pair (G=VINN D=ND2 S=TAIL B=VSS)
;   M6  PMOS precharge L (G=CLK D=ND1 S=VDD B=VDD)
;   M7  PMOS precharge R (G=CLK D=ND2 S=VDD B=VDD)
;   M3  NMOS cross-coupled L (G=ND2 D=ND1 S=VSS B=VSS)
;   M4  NMOS cross-coupled R (G=ND1 D=ND2 S=VSS B=VSS)
;=============================================================================

(setq SAC_LIB "tsmcN65")
(setq SAC_NMOS "nch")
(setq SAC_PMOS "pch")
(setq SAC_STUB 0.75)
(setq SAC_WIRE 0.0625)
procedure(SAC_ToFloat(val)
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

procedure(SAC_ValueMatches(got expect)
    let((gn en)
        gn=SAC_ToFloat(got)
        en=SAC_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(SAC_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("SAC: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(SAC_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("SAC: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("SAC: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("SAC: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("SAC: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=SAC_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(SAC_ValueMatches(cdf->w->value WperFinger)
            error("SAC: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(SAC_ValueMatches(cdf->l->value L)
            error("SAC: L read-back mismatch on %s.\n" inst~>name))
        unless(SAC_ValueMatches(cdf->wf->value TotalW)
            error("SAC: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(SAC_ValueMatches(cdf->fingers->value NF)
            error("SAC: fingers read-back mismatch on %s.\n" inst~>name))
        unless(SAC_ValueMatches(cdf->simM->value M)
            error("SAC: simM read-back mismatch on %s.\n" inst~>name))
        unless(SAC_ValueMatches(cdf->totalM->value totalM)
            error("SAC: totalM read-back mismatch on %s.\n" inst~>name))
        unless(SAC_ValueMatches(cdf->nf->value NF)
            error("SAC: nf read-back mismatch on %s.\n" inst~>name))
        unless(SAC_ValueMatches(cdf->m->value M)
            error("SAC: m read-back mismatch on %s.\n" inst~>name))
        printf("SAC: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(SAC_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("SAC: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("SAC: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("SAC: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(SAC_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("SAC: cannot create %s.\n" name))
        SAC_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(SAC_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=SAC_PinCenter(inst "G")
        b=SAC_PinCenter(inst "B")
        s=SAC_PinCenter(inst "S")
        d=SAC_PinCenter(inst "D")
        p=SAC_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("SAC: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-SAC_STUB cadr(p))
                else list(car(p)+SAC_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-SAC_STUB)
                else list(car(p) cadr(p)+SAC_STUB))
        )
    )
)

procedure(SAC_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=SAC_PinCenter(inst pinName)
        e=SAC_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) SAC_WIRE SAC_WIRE 0)
        unless(wire error("SAC: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" SAC_WIRE nil)
        unless(label error("SAC: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("SAC: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(SAC_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("SAC: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("SAC: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(SAC_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("SAC: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("SAC: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("SAC: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(SAC_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("SAC: cannot create VDC %s.\n" name))
        SAC_SetVDC(inst value)
        plus=SAC_VDCPinCenter(inst "PLUS")
        minus=SAC_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+SAC_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) SAC_WIRE SAC_WIRE 0)
        unless(wp error("SAC: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" SAC_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=SAC_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("SAC: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-SAC_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) SAC_WIRE SAC_WIRE 0)
            unless(wm error("SAC: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" SAC_WIRE nil)
        )
        printf("SAC: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(SAC_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("SAC: failed creating external pin %s.\n" name))
        printf("SAC: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(SAC_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=SAC_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=SAC_PinCenter(inst "S")
        d=SAC_PinCenter(inst "D")
        printf("SAC: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=SAC_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=SAC_PinCenter(inst "S")
                d=SAC_PinCenter(inst "D")
                printf("SAC: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("SAC: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateComparator_StrongARM_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M5 M1 M2 M6 M7 M3 M4  V_VDD_SRC V_CLK_SRC V_VINP_SRC V_VINN_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" StrongARM Comparator - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  CLOCK: V_CLK = 0.75V (static DC stand-in for the clock)\n")
        printf("DYNAMIC latching comparator: precharge + cross-coupled latch + clocked tail\n")
        printf("OUTPUTS: ND1 / ND2 (regenerative nodes)  TEMP=27C  CORNER=TT\n")
        printf("DYNAMIC CIRCUIT: static DC simulation is not meaningful\n")
        printf("DEVICE=SAC/SAC\n" SAC_LIB SAC_NMOS)
        printf("DEVICE=SAC/SAC\n" SAC_LIB SAC_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("SAC: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("SAC: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=SAC_OpenMaster(SAC_LIB SAC_NMOS)
        pmos=SAC_OpenMaster(SAC_LIB SAC_PMOS)
        vdcMaster=SAC_OpenMaster("analogLib" "vdc")
        pinMaster=SAC_OpenMaster("basic" "iopin")

        M5=SAC_PlaceMOS(cv nmos "M5" 0:-6 "6u" "480n" "1" "1" "R0")
        M1=SAC_PlaceMOS(cv nmos "M1" -3:0 "2u" "240n" "1" "1" "R0")
        M2=SAC_PlaceMOS(cv nmos "M2" 3:0 "2u" "240n" "1" "1" "R0")
        M6=SAC_PlacePMOSAuto(cv pmos "M6" -3:6 "2u" "240n" "1" "1")
        M7=SAC_PlacePMOSAuto(cv pmos "M7" 3:6 "2u" "240n" "1" "1")
        M3=SAC_PlaceMOS(cv nmos "M3" -8:0 "2u" "240n" "1" "1" "R0")
        M4=SAC_PlaceMOS(cv nmos "M4" 8:0 "2u" "240n" "1" "1" "R0")

        SAC_LabelMOSTerminal(cv M5 "G" "CLK")
        SAC_LabelMOSTerminal(cv M5 "D" "TAIL")
        SAC_LabelMOSTerminal(cv M5 "S" "VSS")
        SAC_LabelMOSTerminal(cv M5 "B" "VSS")
        SAC_LabelMOSTerminal(cv M1 "G" "VINP")
        SAC_LabelMOSTerminal(cv M1 "D" "ND1")
        SAC_LabelMOSTerminal(cv M1 "S" "TAIL")
        SAC_LabelMOSTerminal(cv M1 "B" "VSS")
        SAC_LabelMOSTerminal(cv M2 "G" "VINN")
        SAC_LabelMOSTerminal(cv M2 "D" "ND2")
        SAC_LabelMOSTerminal(cv M2 "S" "TAIL")
        SAC_LabelMOSTerminal(cv M2 "B" "VSS")
        SAC_LabelMOSTerminal(cv M6 "G" "CLK")
        SAC_LabelMOSTerminal(cv M6 "D" "ND1")
        SAC_LabelMOSTerminal(cv M6 "S" "VDD")
        SAC_LabelMOSTerminal(cv M6 "B" "VDD")
        SAC_LabelMOSTerminal(cv M7 "G" "CLK")
        SAC_LabelMOSTerminal(cv M7 "D" "ND2")
        SAC_LabelMOSTerminal(cv M7 "S" "VDD")
        SAC_LabelMOSTerminal(cv M7 "B" "VDD")
        SAC_LabelMOSTerminal(cv M3 "G" "ND2")
        SAC_LabelMOSTerminal(cv M3 "D" "ND1")
        SAC_LabelMOSTerminal(cv M3 "S" "VSS")
        SAC_LabelMOSTerminal(cv M3 "B" "VSS")
        SAC_LabelMOSTerminal(cv M4 "G" "ND1")
        SAC_LabelMOSTerminal(cv M4 "D" "ND2")
        SAC_LabelMOSTerminal(cv M4 "S" "VSS")
        SAC_LabelMOSTerminal(cv M4 "B" "VSS")

        V_VDD_SRC=SAC_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:12 "1.50" "VDD" "VSS")
        V_CLK_SRC=SAC_CreateVDC(cv vdcMaster "V_CLK_SRC" -12:0 "0.75" "CLK" "VSS")
        V_VINP_SRC=SAC_CreateVDC(cv vdcMaster "V_VINP_SRC" -12:-4 "0.75" "VINP" "VSS")
        V_VINN_SRC=SAC_CreateVDC(cv vdcMaster "V_VINN_SRC" 12:-4 "0.75" "VINN" "VSS")
        V_VSS_SRC=SAC_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-10 "0.0" "VSS" "VSS")

        SAC_CreatePin(cv pinMaster "VINP" "input" -10:-10)
        SAC_CreatePin(cv pinMaster "VINN" "input" 10:-10)
        SAC_CreatePin(cv pinMaster "ND1" "output" -9:8)
        SAC_CreatePin(cv pinMaster "ND2" "output" 9:8)
        SAC_CreatePin(cv pinMaster "CLK" "input" -10:4)
        SAC_CreatePin(cv pinMaster "VDD" "input" 0:14)
        SAC_CreatePin(cv pinMaster "VSS" "input" 0:-12)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" SAC GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
