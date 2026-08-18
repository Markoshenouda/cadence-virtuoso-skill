;=============================================================================
; Two-Stage Comparator - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input pair (G=VINP D=MIRROR S=TAIL B=VSS)
;   M2  NMOS input pair (G=VINN D=VOUT1 S=TAIL B=VSS)
;   M3  PMOS diode mirror (G=D=MIRROR S=VDD B=VDD)
;   M4  PMOS mirror load (G=MIRROR D=VOUT1 S=VDD B=VDD)
;   M5  NMOS tail source (G=VBN_TAIL D=TAIL S=VSS B=VSS)
;   M6  NMOS gain-stage input (G=VOUT1 D=VOUT S=VSS B=VSS)
;   M7  PMOS gain-stage load (G=VBP D=VOUT S=VDD B=VDD)
;=============================================================================

(setq TSC_LIB "tsmcN65")
(setq TSC_NMOS "nch")
(setq TSC_PMOS "pch")
(setq TSC_STUB 0.75)
(setq TSC_WIRE 0.0625)
procedure(TSC_ToFloat(val)
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

procedure(TSC_ValueMatches(got expect)
    let((gn en)
        gn=TSC_ToFloat(got)
        en=TSC_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(TSC_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("TSC: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(TSC_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("TSC: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("TSC: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("TSC: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("TSC: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=TSC_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(TSC_ValueMatches(cdf->w->value WperFinger)
            error("TSC: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(TSC_ValueMatches(cdf->l->value L)
            error("TSC: L read-back mismatch on %s.\n" inst~>name))
        unless(TSC_ValueMatches(cdf->wf->value TotalW)
            error("TSC: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(TSC_ValueMatches(cdf->fingers->value NF)
            error("TSC: fingers read-back mismatch on %s.\n" inst~>name))
        unless(TSC_ValueMatches(cdf->simM->value M)
            error("TSC: simM read-back mismatch on %s.\n" inst~>name))
        unless(TSC_ValueMatches(cdf->totalM->value totalM)
            error("TSC: totalM read-back mismatch on %s.\n" inst~>name))
        unless(TSC_ValueMatches(cdf->nf->value NF)
            error("TSC: nf read-back mismatch on %s.\n" inst~>name))
        unless(TSC_ValueMatches(cdf->m->value M)
            error("TSC: m read-back mismatch on %s.\n" inst~>name))
        printf("TSC: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(TSC_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("TSC: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("TSC: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("TSC: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(TSC_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("TSC: cannot create %s.\n" name))
        TSC_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(TSC_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=TSC_PinCenter(inst "G")
        b=TSC_PinCenter(inst "B")
        s=TSC_PinCenter(inst "S")
        d=TSC_PinCenter(inst "D")
        p=TSC_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("TSC: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-TSC_STUB cadr(p))
                else list(car(p)+TSC_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-TSC_STUB)
                else list(car(p) cadr(p)+TSC_STUB))
        )
    )
)

procedure(TSC_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=TSC_PinCenter(inst pinName)
        e=TSC_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) TSC_WIRE TSC_WIRE 0)
        unless(wire error("TSC: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" TSC_WIRE nil)
        unless(label error("TSC: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("TSC: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(TSC_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("TSC: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("TSC: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(TSC_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("TSC: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("TSC: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("TSC: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(TSC_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("TSC: cannot create VDC %s.\n" name))
        TSC_SetVDC(inst value)
        plus=TSC_VDCPinCenter(inst "PLUS")
        minus=TSC_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+TSC_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) TSC_WIRE TSC_WIRE 0)
        unless(wp error("TSC: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" TSC_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=TSC_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("TSC: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-TSC_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) TSC_WIRE TSC_WIRE 0)
            unless(wm error("TSC: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" TSC_WIRE nil)
        )
        printf("TSC: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(TSC_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("TSC: failed creating external pin %s.\n" name))
        printf("TSC: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(TSC_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=TSC_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=TSC_PinCenter(inst "S")
        d=TSC_PinCenter(inst "D")
        printf("TSC: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=TSC_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=TSC_PinCenter(inst "S")
                d=TSC_PinCenter(inst "D")
                printf("TSC: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("TSC: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateComparator_TwoStage_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4 M5 M6 M7  V_VDD_SRC V_VBN_TAIL_SRC V_VBP_SRC V_VINP_SRC V_VINN_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Two-Stage Comparator - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  TAIL BIAS: V_VBN_TAIL = 0.60V  LOAD BIAS: V_VBP = 0.90V\n")
        printf("5T preamp stage plus common-source gain stage (no latch)\n")
        printf("OUTPUT: VOUT = M6.D/M7.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=TSC/TSC\n" TSC_LIB TSC_NMOS)
        printf("DEVICE=TSC/TSC\n" TSC_LIB TSC_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("TSC: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("TSC: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=TSC_OpenMaster(TSC_LIB TSC_NMOS)
        pmos=TSC_OpenMaster(TSC_LIB TSC_PMOS)
        vdcMaster=TSC_OpenMaster("analogLib" "vdc")
        pinMaster=TSC_OpenMaster("basic" "iopin")

        M1=TSC_PlaceMOS(cv nmos "M1" -3:0 "2u" "240n" "1" "1" "R0")
        M2=TSC_PlaceMOS(cv nmos "M2" 3:0 "2u" "240n" "1" "1" "R0")
        M3=TSC_PlacePMOSAuto(cv pmos "M3" -3:6 "4u" "480n" "1" "1")
        M4=TSC_PlacePMOSAuto(cv pmos "M4" 3:6 "4u" "480n" "1" "1")
        M5=TSC_PlaceMOS(cv nmos "M5" 0:-6 "6u" "480n" "1" "1" "R0")
        M6=TSC_PlaceMOS(cv nmos "M6" 9:-2 "4u" "480n" "1" "1" "R0")
        M7=TSC_PlacePMOSAuto(cv pmos "M7" 9:4 "8u" "480n" "1" "1")

        TSC_LabelMOSTerminal(cv M1 "G" "VINP")
        TSC_LabelMOSTerminal(cv M1 "D" "MIRROR")
        TSC_LabelMOSTerminal(cv M1 "S" "TAIL")
        TSC_LabelMOSTerminal(cv M1 "B" "VSS")
        TSC_LabelMOSTerminal(cv M2 "G" "VINN")
        TSC_LabelMOSTerminal(cv M2 "D" "VOUT1")
        TSC_LabelMOSTerminal(cv M2 "S" "TAIL")
        TSC_LabelMOSTerminal(cv M2 "B" "VSS")
        TSC_LabelMOSTerminal(cv M3 "G" "MIRROR")
        TSC_LabelMOSTerminal(cv M3 "D" "MIRROR")
        TSC_LabelMOSTerminal(cv M3 "S" "VDD")
        TSC_LabelMOSTerminal(cv M3 "B" "VDD")
        TSC_LabelMOSTerminal(cv M4 "G" "MIRROR")
        TSC_LabelMOSTerminal(cv M4 "D" "VOUT1")
        TSC_LabelMOSTerminal(cv M4 "S" "VDD")
        TSC_LabelMOSTerminal(cv M4 "B" "VDD")
        TSC_LabelMOSTerminal(cv M5 "G" "VBN_TAIL")
        TSC_LabelMOSTerminal(cv M5 "D" "TAIL")
        TSC_LabelMOSTerminal(cv M5 "S" "VSS")
        TSC_LabelMOSTerminal(cv M5 "B" "VSS")
        TSC_LabelMOSTerminal(cv M6 "G" "VOUT1")
        TSC_LabelMOSTerminal(cv M6 "D" "VOUT")
        TSC_LabelMOSTerminal(cv M6 "S" "VSS")
        TSC_LabelMOSTerminal(cv M6 "B" "VSS")
        TSC_LabelMOSTerminal(cv M7 "G" "VBP")
        TSC_LabelMOSTerminal(cv M7 "D" "VOUT")
        TSC_LabelMOSTerminal(cv M7 "S" "VDD")
        TSC_LabelMOSTerminal(cv M7 "B" "VDD")

        V_VDD_SRC=TSC_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:12 "1.50" "VDD" "VSS")
        V_VBN_TAIL_SRC=TSC_CreateVDC(cv vdcMaster "V_VBN_TAIL_SRC" -12:0 "0.60" "VBN_TAIL" "VSS")
        V_VBP_SRC=TSC_CreateVDC(cv vdcMaster "V_VBP_SRC" 12:8 "0.90" "VBP" "VSS")
        V_VINP_SRC=TSC_CreateVDC(cv vdcMaster "V_VINP_SRC" -12:-4 "0.75" "VINP" "VSS")
        V_VINN_SRC=TSC_CreateVDC(cv vdcMaster "V_VINN_SRC" -12:-8 "0.75" "VINN" "VSS")
        V_VSS_SRC=TSC_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-10 "0.0" "VSS" "VSS")

        TSC_CreatePin(cv pinMaster "VINP" "input" -10:-10)
        TSC_CreatePin(cv pinMaster "VINN" "input" -7:-10)
        TSC_CreatePin(cv pinMaster "VOUT" "output" 13:1)
        TSC_CreatePin(cv pinMaster "VDD" "input" 0:14)
        TSC_CreatePin(cv pinMaster "VSS" "input" 0:-12)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" TSC GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
