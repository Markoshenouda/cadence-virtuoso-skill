;=============================================================================
; PMOS-Input Folded Cascode Amplifier - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  PMOS input device (G=VIN D=PFOLD S=VDD B=VDD)
;   M2  NMOS folded cascode (G=VBN S=PFOLD D=VOUT B=VSS)
;   M3  NMOS fold current source (G=VBN2 S=VSS D=PFOLD B=VSS)
;   M4  PMOS load device (G=VBP D=VOUT S=VDD B=VDD)
;=============================================================================

(setq PFA_LIB "tsmcN65")
(setq PFA_NMOS "nch")
(setq PFA_PMOS "pch")
(setq PFA_STUB 0.75)
(setq PFA_WIRE 0.0625)
procedure(PFA_ToFloat(val)
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

procedure(PFA_ValueMatches(got expect)
    let((gn en)
        gn=PFA_ToFloat(got)
        en=PFA_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(PFA_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("PFA: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(PFA_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PFA: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("PFA: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("PFA: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("PFA: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=PFA_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(PFA_ValueMatches(cdf->w->value WperFinger)
            error("PFA: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(PFA_ValueMatches(cdf->l->value L)
            error("PFA: L read-back mismatch on %s.\n" inst~>name))
        unless(PFA_ValueMatches(cdf->wf->value TotalW)
            error("PFA: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(PFA_ValueMatches(cdf->fingers->value NF)
            error("PFA: fingers read-back mismatch on %s.\n" inst~>name))
        unless(PFA_ValueMatches(cdf->simM->value M)
            error("PFA: simM read-back mismatch on %s.\n" inst~>name))
        unless(PFA_ValueMatches(cdf->totalM->value totalM)
            error("PFA: totalM read-back mismatch on %s.\n" inst~>name))
        unless(PFA_ValueMatches(cdf->nf->value NF)
            error("PFA: nf read-back mismatch on %s.\n" inst~>name))
        unless(PFA_ValueMatches(cdf->m->value M)
            error("PFA: m read-back mismatch on %s.\n" inst~>name))
        printf("PFA: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(PFA_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PFA: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PFA: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PFA: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PFA_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("PFA: cannot create %s.\n" name))
        PFA_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(PFA_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=PFA_PinCenter(inst "G")
        b=PFA_PinCenter(inst "B")
        s=PFA_PinCenter(inst "S")
        d=PFA_PinCenter(inst "D")
        p=PFA_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("PFA: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-PFA_STUB cadr(p))
                else list(car(p)+PFA_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-PFA_STUB)
                else list(car(p) cadr(p)+PFA_STUB))
        )
    )
)

procedure(PFA_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=PFA_PinCenter(inst pinName)
        e=PFA_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) PFA_WIRE PFA_WIRE 0)
        unless(wire error("PFA: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" PFA_WIRE nil)
        unless(label error("PFA: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("PFA: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(PFA_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PFA: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("PFA: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(PFA_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PFA: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PFA: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PFA: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PFA_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("PFA: cannot create VDC %s.\n" name))
        PFA_SetVDC(inst value)
        plus=PFA_VDCPinCenter(inst "PLUS")
        minus=PFA_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+PFA_STUB)
        em=list(car(minus) cadr(minus)-PFA_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) PFA_WIRE PFA_WIRE 0)
        wm=schCreateWire(cv "route" "full" list(minus em) PFA_WIRE PFA_WIRE 0)
        unless(wp && wm error("PFA: VDC wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" PFA_WIRE nil)
        schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" PFA_WIRE nil)
        printf("PFA: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(PFA_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("PFA: failed creating external pin %s.\n" name))
        printf("PFA: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(PFA_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=PFA_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=PFA_PinCenter(inst "S")
        d=PFA_PinCenter(inst "D")
        printf("PFA: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=PFA_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=PFA_PinCenter(inst "S")
                d=PFA_PinCenter(inst "D")
                printf("PFA: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("PFA: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateFoldedCascodeAmp_PMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4  V_VIN_SRC V_VBN2_SRC V_VBN_SRC V_VBP_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" PMOS-Input Folded Cascode Amplifier - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=2.00V  FOLD BIASES: V_VBN2 = 0.60V  V_VBN = 0.95V  V_VBP = 1.55V  VIN = 1.25V\n")
        printf("PMOS input folds downward into an NMOS cascode\n")
        printf("OUTPUT: VOUT = M2.D/M4.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=PFA/PFA\n" PFA_LIB PFA_NMOS)
        printf("DEVICE=PFA/PFA\n" PFA_LIB PFA_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("PFA: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("PFA: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=PFA_OpenMaster(PFA_LIB PFA_NMOS)
        pmos=PFA_OpenMaster(PFA_LIB PFA_PMOS)
        vdcMaster=PFA_OpenMaster("analogLib" "vdc")
        pinMaster=PFA_OpenMaster("basic" "iopin")

        M1=PFA_PlacePMOSAuto(cv pmos "M1" -6:8 "8u" "240n" "1" "1")
        M2=PFA_PlaceMOS(cv nmos "M2" 3:3 "4u" "480n" "1" "1" "R0")
        M3=PFA_PlaceMOS(cv nmos "M3" -6:0 "6u" "480n" "1" "1" "R0")
        M4=PFA_PlacePMOSAuto(cv pmos "M4" 3:9 "8u" "480n" "1" "1")

        PFA_LabelMOSTerminal(cv M1 "G" "VIN")
        PFA_LabelMOSTerminal(cv M1 "D" "PFOLD")
        PFA_LabelMOSTerminal(cv M1 "S" "VDD")
        PFA_LabelMOSTerminal(cv M1 "B" "VDD")
        PFA_LabelMOSTerminal(cv M2 "G" "VBN")
        PFA_LabelMOSTerminal(cv M2 "D" "VOUT")
        PFA_LabelMOSTerminal(cv M2 "S" "PFOLD")
        PFA_LabelMOSTerminal(cv M2 "B" "VSS")
        PFA_LabelMOSTerminal(cv M3 "G" "VBN2")
        PFA_LabelMOSTerminal(cv M3 "D" "PFOLD")
        PFA_LabelMOSTerminal(cv M3 "S" "VSS")
        PFA_LabelMOSTerminal(cv M3 "B" "VSS")
        PFA_LabelMOSTerminal(cv M4 "G" "VBP")
        PFA_LabelMOSTerminal(cv M4 "D" "VOUT")
        PFA_LabelMOSTerminal(cv M4 "S" "VDD")
        PFA_LabelMOSTerminal(cv M4 "B" "VDD")

        V_VIN_SRC=PFA_CreateVDC(cv vdcMaster "V_VIN_SRC" -13:8 "1.25" "VIN" "VSS")
        V_VBN2_SRC=PFA_CreateVDC(cv vdcMaster "V_VBN2_SRC" -13:0 "0.60" "VBN2" "VSS")
        V_VBN_SRC=PFA_CreateVDC(cv vdcMaster "V_VBN_SRC" -13:3 "0.95" "VBN" "VSS")
        V_VBP_SRC=PFA_CreateVDC(cv vdcMaster "V_VBP_SRC" 11:9 "1.55" "VBP" "VSS")
        V_VDD_SRC=PFA_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:14 "2.00" "VDD" "VSS")
        V_VSS_SRC=PFA_CreateVDC(cv vdcMaster "V_VSS_SRC" 11:-8 "0.0" "VSS" "VSS")

        PFA_CreatePin(cv pinMaster "VIN" "input" -13:12)
        PFA_CreatePin(cv pinMaster "VOUT" "output" 10:6)
        PFA_CreatePin(cv pinMaster "VDD" "input" 0:16)
        PFA_CreatePin(cv pinMaster "VSS" "input" 0:-10)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" PFA GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
