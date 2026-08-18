;=============================================================================
; Cascode NMOS Current Source - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS bottom device (G=VBN1 D=NC S=VSS B=VSS)
;   M2  NMOS cascode device (G=VBN2 D=IOUT S=NC B=VSS)
;=============================================================================

(setq NCS_LIB "tsmcN65")
(setq NCS_NMOS "nch")
(setq NCS_STUB 0.75)
(setq NCS_WIRE 0.0625)
procedure(NCS_ToFloat(val)
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

procedure(NCS_ValueMatches(got expect)
    let((gn en)
        gn=NCS_ToFloat(got)
        en=NCS_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(NCS_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("NCS: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(NCS_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("NCS: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("NCS: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("NCS: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("NCS: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=NCS_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(NCS_ValueMatches(cdf->w->value WperFinger)
            error("NCS: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(NCS_ValueMatches(cdf->l->value L)
            error("NCS: L read-back mismatch on %s.\n" inst~>name))
        unless(NCS_ValueMatches(cdf->wf->value TotalW)
            error("NCS: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(NCS_ValueMatches(cdf->fingers->value NF)
            error("NCS: fingers read-back mismatch on %s.\n" inst~>name))
        unless(NCS_ValueMatches(cdf->simM->value M)
            error("NCS: simM read-back mismatch on %s.\n" inst~>name))
        unless(NCS_ValueMatches(cdf->totalM->value totalM)
            error("NCS: totalM read-back mismatch on %s.\n" inst~>name))
        unless(NCS_ValueMatches(cdf->nf->value NF)
            error("NCS: nf read-back mismatch on %s.\n" inst~>name))
        unless(NCS_ValueMatches(cdf->m->value M)
            error("NCS: m read-back mismatch on %s.\n" inst~>name))
        printf("NCS: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(NCS_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("NCS: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("NCS: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("NCS: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(NCS_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("NCS: cannot create %s.\n" name))
        NCS_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(NCS_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=NCS_PinCenter(inst "G")
        b=NCS_PinCenter(inst "B")
        s=NCS_PinCenter(inst "S")
        d=NCS_PinCenter(inst "D")
        p=NCS_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("NCS: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-NCS_STUB cadr(p))
                else list(car(p)+NCS_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-NCS_STUB)
                else list(car(p) cadr(p)+NCS_STUB))
        )
    )
)

procedure(NCS_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=NCS_PinCenter(inst pinName)
        e=NCS_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) NCS_WIRE NCS_WIRE 0)
        unless(wire error("NCS: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" NCS_WIRE nil)
        unless(label error("NCS: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("NCS: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(NCS_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("NCS: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("NCS: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(NCS_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("NCS: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("NCS: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("NCS: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(NCS_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("NCS: cannot create VDC %s.\n" name))
        NCS_SetVDC(inst value)
        plus=NCS_VDCPinCenter(inst "PLUS")
        minus=NCS_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+NCS_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) NCS_WIRE NCS_WIRE 0)
        unless(wp error("NCS: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" NCS_WIRE nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("NCS: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-NCS_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) NCS_WIRE NCS_WIRE 0)
            unless(wm error("NCS: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" NCS_WIRE nil)
        )
        printf("NCS: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(NCS_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("NCS: failed creating external pin %s.\n" name))
        printf("NCS: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(CreateCurrentSource_Cascode_NMOS_TotalW_V1_20260817()
    let((cv nmos vdcMaster pinMaster M1 M2  V_VBN1_SRC V_VBN2_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Cascode NMOS Current Source - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VSS=0V  BIASES: V_VBN1 = 0.60V  V_VBN2 = 1.05V  OUTPUT: IOUT sink\n")
        printf("High-output-impedance cascoded bias current sink  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=NCS/NCS\n" NCS_LIB NCS_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("NCS: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("NCS: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=NCS_OpenMaster(NCS_LIB NCS_NMOS)
        vdcMaster=NCS_OpenMaster("analogLib" "vdc")
        pinMaster=NCS_OpenMaster("basic" "iopin")

        M1=NCS_PlaceMOS(cv nmos "M1" 0:0 "6u" "480n" "1" "1" "R0")
        M2=NCS_PlaceMOS(cv nmos "M2" 0:6 "6u" "480n" "1" "1" "R0")

        NCS_LabelMOSTerminal(cv M1 "G" "VBN1")
        NCS_LabelMOSTerminal(cv M1 "D" "NC")
        NCS_LabelMOSTerminal(cv M1 "S" "VSS")
        NCS_LabelMOSTerminal(cv M1 "B" "VSS")
        NCS_LabelMOSTerminal(cv M2 "G" "VBN2")
        NCS_LabelMOSTerminal(cv M2 "D" "IOUT")
        NCS_LabelMOSTerminal(cv M2 "S" "NC")
        NCS_LabelMOSTerminal(cv M2 "B" "VSS")

        V_VBN1_SRC=NCS_CreateVDC(cv vdcMaster "V_VBN1_SRC" -10:0 "0.60" "VBN1" "VSS")
        V_VBN2_SRC=NCS_CreateVDC(cv vdcMaster "V_VBN2_SRC" -10:6 "1.05" "VBN2" "VSS")
        V_VSS_SRC=NCS_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-4 "0.0" "VSS" "VSS")

        NCS_CreatePin(cv pinMaster "IOUT" "output" 9:9)
        NCS_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" NCS GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
