;=============================================================================
; Folded Differential Pair - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input pair (G=VIP D=NFOLD1 S=TAIL B=VSS)
;   M2  NMOS input pair (G=VIN D=NFOLD2 S=TAIL B=VSS)
;   M3  NMOS tail source (G=VBN_TAIL D=TAIL S=VSS B=VSS)
;   M4  PMOS fold current source (G=VBP D=NFOLD1 S=VDD B=VDD)
;   M5  PMOS fold current source (G=VBP D=NFOLD2 S=VDD B=VDD)
;=============================================================================

(setq FDP_LIB "tsmcN65")
(setq FDP_NMOS "nch")
(setq FDP_PMOS "pch")
(setq FDP_STUB 0.75)
(setq FDP_WIRE 0.0625)
procedure(FDP_ToFloat(val)
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

procedure(FDP_ValueMatches(got expect)
    let((gn en)
        gn=FDP_ToFloat(got)
        en=FDP_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(FDP_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("FDP: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(FDP_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("FDP: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("FDP: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("FDP: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("FDP: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=FDP_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(FDP_ValueMatches(cdf->w->value WperFinger)
            error("FDP: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(FDP_ValueMatches(cdf->l->value L)
            error("FDP: L read-back mismatch on %s.\n" inst~>name))
        unless(FDP_ValueMatches(cdf->wf->value TotalW)
            error("FDP: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(FDP_ValueMatches(cdf->fingers->value NF)
            error("FDP: fingers read-back mismatch on %s.\n" inst~>name))
        unless(FDP_ValueMatches(cdf->simM->value M)
            error("FDP: simM read-back mismatch on %s.\n" inst~>name))
        unless(FDP_ValueMatches(cdf->totalM->value totalM)
            error("FDP: totalM read-back mismatch on %s.\n" inst~>name))
        unless(FDP_ValueMatches(cdf->nf->value NF)
            error("FDP: nf read-back mismatch on %s.\n" inst~>name))
        unless(FDP_ValueMatches(cdf->m->value M)
            error("FDP: m read-back mismatch on %s.\n" inst~>name))
        printf("FDP: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(FDP_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("FDP: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("FDP: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("FDP: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(FDP_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("FDP: cannot create %s.\n" name))
        FDP_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(FDP_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=FDP_PinCenter(inst "G")
        b=FDP_PinCenter(inst "B")
        s=FDP_PinCenter(inst "S")
        d=FDP_PinCenter(inst "D")
        p=FDP_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("FDP: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-FDP_STUB cadr(p))
                else list(car(p)+FDP_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-FDP_STUB)
                else list(car(p) cadr(p)+FDP_STUB))
        )
    )
)

procedure(FDP_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=FDP_PinCenter(inst pinName)
        e=FDP_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) FDP_WIRE FDP_WIRE 0)
        unless(wire error("FDP: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" FDP_WIRE nil)
        unless(label error("FDP: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("FDP: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(FDP_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("FDP: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("FDP: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(FDP_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("FDP: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("FDP: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("FDP: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(FDP_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("FDP: cannot create VDC %s.\n" name))
        FDP_SetVDC(inst value)
        plus=FDP_VDCPinCenter(inst "PLUS")
        minus=FDP_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+FDP_STUB)
        em=list(car(minus) cadr(minus)-FDP_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) FDP_WIRE FDP_WIRE 0)
        wm=schCreateWire(cv "route" "full" list(minus em) FDP_WIRE FDP_WIRE 0)
        unless(wp && wm error("FDP: VDC wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" FDP_WIRE nil)
        schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" FDP_WIRE nil)
        printf("FDP: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(FDP_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("FDP: failed creating external pin %s.\n" name))
        printf("FDP: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(FDP_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=FDP_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=FDP_PinCenter(inst "S")
        d=FDP_PinCenter(inst "D")
        printf("FDP: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=FDP_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=FDP_PinCenter(inst "S")
                d=FDP_PinCenter(inst "D")
                printf("FDP: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("FDP: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateDiffPair_Folded_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4 M5  V_VDD_SRC V_VBN_TAIL_SRC V_VBP_SRC V_VIP_SRC V_VIN_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Folded Differential Pair - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  TAIL BIAS: V_VBN_TAIL = 0.60V  FOLD BIAS: V_VBP = 0.90V\n")
        printf("Input pair currents fold upward into PMOS sources; outputs at NFOLD1/NFOLD2\n")
        printf("TEMP=27C  CORNER=TT\n")
        printf("DEVICE=FDP/FDP\n" FDP_LIB FDP_NMOS)
        printf("DEVICE=FDP/FDP\n" FDP_LIB FDP_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("FDP: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("FDP: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=FDP_OpenMaster(FDP_LIB FDP_NMOS)
        pmos=FDP_OpenMaster(FDP_LIB FDP_PMOS)
        vdcMaster=FDP_OpenMaster("analogLib" "vdc")
        pinMaster=FDP_OpenMaster("basic" "iopin")

        M1=FDP_PlaceMOS(cv nmos "M1" -4:-2 "2u" "240n" "1" "1" "R0")
        M2=FDP_PlaceMOS(cv nmos "M2" 4:-2 "2u" "240n" "1" "1" "R0")
        M3=FDP_PlaceMOS(cv nmos "M3" 0:-8 "6u" "480n" "1" "1" "R0")
        M4=FDP_PlacePMOSAuto(cv pmos "M4" -4:6 "8u" "480n" "1" "1")
        M5=FDP_PlacePMOSAuto(cv pmos "M5" 4:6 "8u" "480n" "1" "1")

        FDP_LabelMOSTerminal(cv M1 "G" "VIP")
        FDP_LabelMOSTerminal(cv M1 "D" "NFOLD1")
        FDP_LabelMOSTerminal(cv M1 "S" "TAIL")
        FDP_LabelMOSTerminal(cv M1 "B" "VSS")
        FDP_LabelMOSTerminal(cv M2 "G" "VIN")
        FDP_LabelMOSTerminal(cv M2 "D" "NFOLD2")
        FDP_LabelMOSTerminal(cv M2 "S" "TAIL")
        FDP_LabelMOSTerminal(cv M2 "B" "VSS")
        FDP_LabelMOSTerminal(cv M3 "G" "VBN_TAIL")
        FDP_LabelMOSTerminal(cv M3 "D" "TAIL")
        FDP_LabelMOSTerminal(cv M3 "S" "VSS")
        FDP_LabelMOSTerminal(cv M3 "B" "VSS")
        FDP_LabelMOSTerminal(cv M4 "G" "VBP")
        FDP_LabelMOSTerminal(cv M4 "D" "NFOLD1")
        FDP_LabelMOSTerminal(cv M4 "S" "VDD")
        FDP_LabelMOSTerminal(cv M4 "B" "VDD")
        FDP_LabelMOSTerminal(cv M5 "G" "VBP")
        FDP_LabelMOSTerminal(cv M5 "D" "NFOLD2")
        FDP_LabelMOSTerminal(cv M5 "S" "VDD")
        FDP_LabelMOSTerminal(cv M5 "B" "VDD")

        V_VDD_SRC=FDP_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:14 "1.50" "VDD" "VSS")
        V_VBN_TAIL_SRC=FDP_CreateVDC(cv vdcMaster "V_VBN_TAIL_SRC" -12:-4 "0.60" "VBN_TAIL" "VSS")
        V_VBP_SRC=FDP_CreateVDC(cv vdcMaster "V_VBP_SRC" 12:6 "0.90" "VBP" "VSS")
        V_VIP_SRC=FDP_CreateVDC(cv vdcMaster "V_VIP_SRC" -12:-2 "0.75" "VIP" "VSS")
        V_VIN_SRC=FDP_CreateVDC(cv vdcMaster "V_VIN_SRC" 12:-2 "0.75" "VIN" "VSS")
        V_VSS_SRC=FDP_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-12 "0.0" "VSS" "VSS")

        FDP_CreatePin(cv pinMaster "VIP" "input" -10:-12)
        FDP_CreatePin(cv pinMaster "VIN" "input" 10:-12)
        FDP_CreatePin(cv pinMaster "NFOLD1" "output" -7:12)
        FDP_CreatePin(cv pinMaster "NFOLD2" "output" 7:12)
        FDP_CreatePin(cv pinMaster "VDD" "input" 0:16)
        FDP_CreatePin(cv pinMaster "VSS" "input" 0:-14)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" FDP GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
