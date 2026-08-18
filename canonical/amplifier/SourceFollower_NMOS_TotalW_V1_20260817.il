;=============================================================================
; Source Follower - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS follower device (G=VIN D=VDD S=VOUT B=VSS)
;   M2  NMOS sink device    (G=VBN D=VOUT S=VSS B=VSS)
;=============================================================================

(setq CSF_LIB "tsmcN65")
(setq CSF_NMOS "nch")
(setq CSF_STUB 0.75)
(setq CSF_WIRE 0.0625)
procedure(CSF_ToFloat(val)
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

procedure(CSF_ValueMatches(got expect)
    let((gn en)
        gn=CSF_ToFloat(got)
        en=CSF_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CSF_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CSF: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CSF_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CSF: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CSF: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CSF: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CSF: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CSF_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CSF_ValueMatches(cdf->w->value WperFinger)
            error("CSF: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CSF_ValueMatches(cdf->l->value L)
            error("CSF: L read-back mismatch on %s.\n" inst~>name))
        unless(CSF_ValueMatches(cdf->wf->value TotalW)
            error("CSF: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CSF_ValueMatches(cdf->fingers->value NF)
            error("CSF: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CSF_ValueMatches(cdf->simM->value M)
            error("CSF: simM read-back mismatch on %s.\n" inst~>name))
        unless(CSF_ValueMatches(cdf->totalM->value totalM)
            error("CSF: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CSF_ValueMatches(cdf->nf->value NF)
            error("CSF: nf read-back mismatch on %s.\n" inst~>name))
        unless(CSF_ValueMatches(cdf->m->value M)
            error("CSF: m read-back mismatch on %s.\n" inst~>name))
        printf("CSF: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CSF_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CSF: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CSF: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CSF: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CSF_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CSF: cannot create %s.\n" name))
        CSF_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CSF_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CSF_PinCenter(inst "G")
        b=CSF_PinCenter(inst "B")
        s=CSF_PinCenter(inst "S")
        d=CSF_PinCenter(inst "D")
        p=CSF_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CSF: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CSF_STUB cadr(p))
                else list(car(p)+CSF_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CSF_STUB)
                else list(car(p) cadr(p)+CSF_STUB))
        )
    )
)

procedure(CSF_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CSF_PinCenter(inst pinName)
        e=CSF_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CSF_WIRE CSF_WIRE 0)
        unless(wire error("CSF: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CSF_WIRE nil)
        unless(label error("CSF: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CSF: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CSF_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CSF: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CSF: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CSF_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CSF: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CSF: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CSF: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CSF_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CSF: cannot create VDC %s.\n" name))
        CSF_SetVDC(inst value)
        plus=CSF_VDCPinCenter(inst "PLUS")
        minus=CSF_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CSF_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CSF_WIRE CSF_WIRE 0)
        unless(wp error("CSF: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CSF_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=CSF_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("CSF: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-CSF_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CSF_WIRE CSF_WIRE 0)
            unless(wm error("CSF: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CSF_WIRE nil)
        )
        printf("CSF: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CSF_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CSF: failed creating external pin %s.\n" name))
        printf("CSF: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(CreateSourceFollower_NMOS_TotalW_V1_20260817()()
    let((cv nmos vdcMaster pinMaster M1 M2 V_VIN_SRC V_VBN_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Source Follower - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  VSS=0V  SINK BIAS: V_VBN = 0.60V  VIN = 1.00V\n")
        printf("OUTPUT: VOUT = M1.S/M2.D logical net  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CSF/CSF\n" CSF_LIB CSF_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CSF: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CSF: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CSF_OpenMaster(CSF_LIB CSF_NMOS)
        vdcMaster=CSF_OpenMaster("analogLib" "vdc")
        pinMaster=CSF_OpenMaster("basic" "iopin")

        M1=CSF_PlaceMOS(cv nmos "M1" 0:3 "4u" "240n" "1" "1" "R0")
        M2=CSF_PlaceMOS(cv nmos "M2" 0:-3 "6u" "480n" "1" "1" "R0")

        CSF_LabelMOSTerminal(cv M1 "G" "VIN")
        CSF_LabelMOSTerminal(cv M1 "D" "VDD")
        CSF_LabelMOSTerminal(cv M1 "S" "VOUT")
        CSF_LabelMOSTerminal(cv M1 "B" "VSS")
        CSF_LabelMOSTerminal(cv M2 "G" "VBN")
        CSF_LabelMOSTerminal(cv M2 "D" "VOUT")
        CSF_LabelMOSTerminal(cv M2 "S" "VSS")
        CSF_LabelMOSTerminal(cv M2 "B" "VSS")

        V_VIN_SRC=CSF_CreateVDC(cv vdcMaster "V_VIN_SRC" -10:3 "1.00" "VIN" "VSS")
        V_VBN_SRC=CSF_CreateVDC(cv vdcMaster "V_VBN_SRC" -10:-3 "0.60" "VBN" "VSS")
        V_VDD_SRC=CSF_CreateVDC(cv vdcMaster "V_VDD_SRC" 10:6 "1.50" "VDD" "VSS")
        V_VSS_SRC=CSF_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-6 "0.0" "VSS" "VSS")

        CSF_CreatePin(cv pinMaster "VIN" "input" -10:0)
        CSF_CreatePin(cv pinMaster "VOUT" "output" 9:0)
        CSF_CreatePin(cv pinMaster "VDD" "input" 9:8)
        CSF_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CSF GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
