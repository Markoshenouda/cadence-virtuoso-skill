;=============================================================================
; Folded Cascode Amplifier - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input device (G=VIN D=NFOLD S=VSS B=VSS)
;   M2  PMOS folded cascode (G=VBP S=NFOLD D=VOUT B=VDD)
;   M3  PMOS fold current source (G=VBP2 S=VDD D=NFOLD B=VDD)
;   M4  NMOS sink device (G=VBN D=VOUT S=VSS B=VSS)
;=============================================================================

(setq FCA_LIB "tsmcN65")
(setq FCA_NMOS "nch")
(setq FCA_PMOS "pch")
(setq FCA_STUB 0.75)
(setq FCA_WIRE 0.0625)
procedure(FCA_ToFloat(val)
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

procedure(FCA_ValueMatches(got expect)
    let((gn en)
        gn=FCA_ToFloat(got)
        en=FCA_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(FCA_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("FCA: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(FCA_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("FCA: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("FCA: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("FCA: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("FCA: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=FCA_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(FCA_ValueMatches(cdf->w->value WperFinger)
            error("FCA: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(FCA_ValueMatches(cdf->l->value L)
            error("FCA: L read-back mismatch on %s.\n" inst~>name))
        unless(FCA_ValueMatches(cdf->wf->value TotalW)
            error("FCA: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(FCA_ValueMatches(cdf->fingers->value NF)
            error("FCA: fingers read-back mismatch on %s.\n" inst~>name))
        unless(FCA_ValueMatches(cdf->simM->value M)
            error("FCA: simM read-back mismatch on %s.\n" inst~>name))
        unless(FCA_ValueMatches(cdf->totalM->value totalM)
            error("FCA: totalM read-back mismatch on %s.\n" inst~>name))
        unless(FCA_ValueMatches(cdf->nf->value NF)
            error("FCA: nf read-back mismatch on %s.\n" inst~>name))
        unless(FCA_ValueMatches(cdf->m->value M)
            error("FCA: m read-back mismatch on %s.\n" inst~>name))
        printf("FCA: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(FCA_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("FCA: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("FCA: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("FCA: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(FCA_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("FCA: cannot create %s.\n" name))
        FCA_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(FCA_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=FCA_PinCenter(inst "G")
        b=FCA_PinCenter(inst "B")
        s=FCA_PinCenter(inst "S")
        d=FCA_PinCenter(inst "D")
        p=FCA_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("FCA: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-FCA_STUB cadr(p))
                else list(car(p)+FCA_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-FCA_STUB)
                else list(car(p) cadr(p)+FCA_STUB))
        )
    )
)

procedure(FCA_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=FCA_PinCenter(inst pinName)
        e=FCA_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) FCA_WIRE FCA_WIRE 0)
        unless(wire error("FCA: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" FCA_WIRE nil)
        unless(label error("FCA: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("FCA: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(FCA_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("FCA: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("FCA: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(FCA_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("FCA: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("FCA: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("FCA: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(FCA_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("FCA: cannot create VDC %s.\n" name))
        FCA_SetVDC(inst value)
        plus=FCA_VDCPinCenter(inst "PLUS")
        minus=FCA_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+FCA_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) FCA_WIRE FCA_WIRE 0)
        unless(wp error("FCA: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" FCA_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=FCA_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("FCA: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-FCA_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) FCA_WIRE FCA_WIRE 0)
            unless(wm error("FCA: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" FCA_WIRE nil)
        )
        printf("FCA: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(FCA_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("FCA: failed creating external pin %s.\n" name))
        printf("FCA: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(FCA_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=FCA_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=FCA_PinCenter(inst "S")
        d=FCA_PinCenter(inst "D")
        printf("FCA: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=FCA_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=FCA_PinCenter(inst "S")
                d=FCA_PinCenter(inst "D")
                printf("FCA: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("FCA: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateFoldedCascodeAmp_NMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4  V_VIN_SRC V_VBP2_SRC V_VBP_SRC V_VBN_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Folded Cascode Amplifier - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=2.00V  VSS=0V  FOLD BIAS: V_VBP2 = 1.55V  V_VBP = 1.30V  V_VBN = 0.60V\n")
        printf("VIN = 0.75V  OUTPUT: VOUT = M2.D/M4.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=FCA/FCA\n" FCA_LIB FCA_NMOS)
        printf("DEVICE=FCA/FCA\n" FCA_LIB FCA_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("FCA: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("FCA: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=FCA_OpenMaster(FCA_LIB FCA_NMOS)
        pmos=FCA_OpenMaster(FCA_LIB FCA_PMOS)
        vdcMaster=FCA_OpenMaster("analogLib" "vdc")
        pinMaster=FCA_OpenMaster("basic" "iopin")

        M1=FCA_PlaceMOS(cv nmos "M1" -6:-3 "4u" "240n" "1" "1" "R0")
        M2=FCA_PlacePMOSAuto(cv pmos "M2" 3:3 "8u" "480n" "1" "1")
        M3=FCA_PlacePMOSAuto(cv pmos "M3" -6:6 "8u" "480n" "1" "1")
        M4=FCA_PlaceMOS(cv nmos "M4" 3:-3 "6u" "480n" "1" "1" "R0")

        FCA_LabelMOSTerminal(cv M1 "G" "VIN")
        FCA_LabelMOSTerminal(cv M1 "D" "NFOLD")
        FCA_LabelMOSTerminal(cv M1 "S" "VSS")
        FCA_LabelMOSTerminal(cv M1 "B" "VSS")
        FCA_LabelMOSTerminal(cv M2 "G" "VBP")
        FCA_LabelMOSTerminal(cv M2 "D" "VOUT")
        FCA_LabelMOSTerminal(cv M2 "S" "NFOLD")
        FCA_LabelMOSTerminal(cv M2 "B" "VDD")
        FCA_LabelMOSTerminal(cv M3 "G" "VBP2")
        FCA_LabelMOSTerminal(cv M3 "D" "NFOLD")
        FCA_LabelMOSTerminal(cv M3 "S" "VDD")
        FCA_LabelMOSTerminal(cv M3 "B" "VDD")
        FCA_LabelMOSTerminal(cv M4 "G" "VBN")
        FCA_LabelMOSTerminal(cv M4 "D" "VOUT")
        FCA_LabelMOSTerminal(cv M4 "S" "VSS")
        FCA_LabelMOSTerminal(cv M4 "B" "VSS")

        V_VIN_SRC=FCA_CreateVDC(cv vdcMaster "V_VIN_SRC" -13:-3 "0.75" "VIN" "VSS")
        V_VBP2_SRC=FCA_CreateVDC(cv vdcMaster "V_VBP2_SRC" -13:6 "1.55" "VBP2" "VSS")
        V_VBP_SRC=FCA_CreateVDC(cv vdcMaster "V_VBP_SRC" -13:3 "1.30" "VBP" "VSS")
        V_VBN_SRC=FCA_CreateVDC(cv vdcMaster "V_VBN_SRC" 11:-3 "0.60" "VBN" "VSS")
        V_VDD_SRC=FCA_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:12 "2.00" "VDD" "VSS")
        V_VSS_SRC=FCA_CreateVDC(cv vdcMaster "V_VSS_SRC" 11:-8 "0.0" "VSS" "VSS")

        FCA_CreatePin(cv pinMaster "VIN" "input" -13:-7)
        FCA_CreatePin(cv pinMaster "VOUT" "output" 10:6)
        FCA_CreatePin(cv pinMaster "VDD" "input" 0:14)
        FCA_CreatePin(cv pinMaster "VSS" "input" 0:-10)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" FCA GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
