;=============================================================================
; Cascode PMOS Current Source - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  PMOS bottom device (G=VBP1 D=NC S=VDD B=VDD)
;   M2  PMOS cascode device (G=VBP2 D=IOUT S=NC B=VDD)
;=============================================================================

(setq PCS_LIB "tsmcN65")
(setq PCS_NMOS "nch")
(setq PCS_PMOS "pch")
(setq PCS_STUB 0.75)
(setq PCS_WIRE 0.0625)
procedure(PCS_ToFloat(val)
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

procedure(PCS_ValueMatches(got expect)
    let((gn en)
        gn=PCS_ToFloat(got)
        en=PCS_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(PCS_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("PCS: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(PCS_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PCS: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("PCS: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("PCS: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("PCS: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=PCS_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(PCS_ValueMatches(cdf->w->value WperFinger)
            error("PCS: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(PCS_ValueMatches(cdf->l->value L)
            error("PCS: L read-back mismatch on %s.\n" inst~>name))
        unless(PCS_ValueMatches(cdf->wf->value TotalW)
            error("PCS: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(PCS_ValueMatches(cdf->fingers->value NF)
            error("PCS: fingers read-back mismatch on %s.\n" inst~>name))
        unless(PCS_ValueMatches(cdf->simM->value M)
            error("PCS: simM read-back mismatch on %s.\n" inst~>name))
        unless(PCS_ValueMatches(cdf->totalM->value totalM)
            error("PCS: totalM read-back mismatch on %s.\n" inst~>name))
        unless(PCS_ValueMatches(cdf->nf->value NF)
            error("PCS: nf read-back mismatch on %s.\n" inst~>name))
        unless(PCS_ValueMatches(cdf->m->value M)
            error("PCS: m read-back mismatch on %s.\n" inst~>name))
        printf("PCS: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(PCS_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PCS: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PCS: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PCS: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PCS_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("PCS: cannot create %s.\n" name))
        PCS_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(PCS_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=PCS_PinCenter(inst "G")
        b=PCS_PinCenter(inst "B")
        s=PCS_PinCenter(inst "S")
        d=PCS_PinCenter(inst "D")
        p=PCS_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("PCS: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-PCS_STUB cadr(p))
                else list(car(p)+PCS_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-PCS_STUB)
                else list(car(p) cadr(p)+PCS_STUB))
        )
    )
)

procedure(PCS_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=PCS_PinCenter(inst pinName)
        e=PCS_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) PCS_WIRE PCS_WIRE 0)
        unless(wire error("PCS: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" PCS_WIRE nil)
        unless(label error("PCS: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("PCS: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(PCS_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PCS: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("PCS: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(PCS_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PCS: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PCS: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PCS: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PCS_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("PCS: cannot create VDC %s.\n" name))
        PCS_SetVDC(inst value)
        plus=PCS_VDCPinCenter(inst "PLUS")
        minus=PCS_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+PCS_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) PCS_WIRE PCS_WIRE 0)
        unless(wp error("PCS: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" PCS_WIRE nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("PCS: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-PCS_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) PCS_WIRE PCS_WIRE 0)
            unless(wm error("PCS: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" PCS_WIRE nil)
        )
        printf("PCS: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(PCS_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("PCS: failed creating external pin %s.\n" name))
        printf("PCS: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(PCS_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=PCS_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=PCS_PinCenter(inst "S")
        d=PCS_PinCenter(inst "D")
        printf("PCS: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=PCS_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=PCS_PinCenter(inst "S")
                d=PCS_PinCenter(inst "D")
                printf("PCS: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("PCS: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateCurrentSource_Cascode_PMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2  V_VDD_SRC V_VBP1_SRC V_VBP2_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Cascode PMOS Current Source - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  BIASES: V_VBP1 = 0.90V  V_VBP2 = 0.45V  OUTPUT: IOUT source\n")
        printf("High-output-impedance cascoded bias current source  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=PCS/PCS\n" PCS_LIB PCS_NMOS)
        printf("DEVICE=PCS/PCS\n" PCS_LIB PCS_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("PCS: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("PCS: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=PCS_OpenMaster(PCS_LIB PCS_NMOS)
        pmos=PCS_OpenMaster(PCS_LIB PCS_PMOS)
        vdcMaster=PCS_OpenMaster("analogLib" "vdc")
        pinMaster=PCS_OpenMaster("basic" "iopin")

        M1=PCS_PlacePMOSAuto(cv pmos "M1" 0:0 "8u" "480n" "1" "1")
        M2=PCS_PlacePMOSAuto(cv pmos "M2" 0:6 "8u" "480n" "1" "1")

        PCS_LabelMOSTerminal(cv M1 "G" "VBP1")
        PCS_LabelMOSTerminal(cv M1 "D" "NC")
        PCS_LabelMOSTerminal(cv M1 "S" "VDD")
        PCS_LabelMOSTerminal(cv M1 "B" "VDD")
        PCS_LabelMOSTerminal(cv M2 "G" "VBP2")
        PCS_LabelMOSTerminal(cv M2 "D" "IOUT")
        PCS_LabelMOSTerminal(cv M2 "S" "NC")
        PCS_LabelMOSTerminal(cv M2 "B" "VDD")

        V_VDD_SRC=PCS_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:12 "1.50" "VDD" "VSS")
        V_VBP1_SRC=PCS_CreateVDC(cv vdcMaster "V_VBP1_SRC" -10:0 "0.90" "VBP1" "VSS")
        V_VBP2_SRC=PCS_CreateVDC(cv vdcMaster "V_VBP2_SRC" -10:6 "0.45" "VBP2" "VSS")
        V_VSS_SRC=PCS_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-4 "0.0" "VSS" "VSS")

        PCS_CreatePin(cv pinMaster "IOUT" "output" 9:9)
        PCS_CreatePin(cv pinMaster "VDD" "input" 0:14)
        PCS_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" PCS GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
