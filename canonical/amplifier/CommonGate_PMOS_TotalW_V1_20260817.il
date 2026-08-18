;=============================================================================
; PMOS Common-Gate Amplifier - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  PMOS common-gate device (G=VBP S=VIN D=VOUT B=VDD)
;   M2  NMOS current-source load (G=VBN D=VOUT S=VSS B=VSS)
;=============================================================================

(setq PCG_LIB "tsmcN65")
(setq PCG_NMOS "nch")
(setq PCG_PMOS "pch")
(setq PCG_STUB 0.75)
(setq PCG_WIRE 0.0625)
procedure(PCG_ToFloat(val)
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

procedure(PCG_ValueMatches(got expect)
    let((gn en)
        gn=PCG_ToFloat(got)
        en=PCG_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(PCG_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("PCG: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(PCG_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PCG: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("PCG: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("PCG: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("PCG: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=PCG_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(PCG_ValueMatches(cdf->w->value WperFinger)
            error("PCG: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(PCG_ValueMatches(cdf->l->value L)
            error("PCG: L read-back mismatch on %s.\n" inst~>name))
        unless(PCG_ValueMatches(cdf->wf->value TotalW)
            error("PCG: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(PCG_ValueMatches(cdf->fingers->value NF)
            error("PCG: fingers read-back mismatch on %s.\n" inst~>name))
        unless(PCG_ValueMatches(cdf->simM->value M)
            error("PCG: simM read-back mismatch on %s.\n" inst~>name))
        unless(PCG_ValueMatches(cdf->totalM->value totalM)
            error("PCG: totalM read-back mismatch on %s.\n" inst~>name))
        unless(PCG_ValueMatches(cdf->nf->value NF)
            error("PCG: nf read-back mismatch on %s.\n" inst~>name))
        unless(PCG_ValueMatches(cdf->m->value M)
            error("PCG: m read-back mismatch on %s.\n" inst~>name))
        printf("PCG: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(PCG_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PCG: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PCG: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PCG: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PCG_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("PCG: cannot create %s.\n" name))
        PCG_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(PCG_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=PCG_PinCenter(inst "G")
        b=PCG_PinCenter(inst "B")
        s=PCG_PinCenter(inst "S")
        d=PCG_PinCenter(inst "D")
        p=PCG_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("PCG: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-PCG_STUB cadr(p))
                else list(car(p)+PCG_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-PCG_STUB)
                else list(car(p) cadr(p)+PCG_STUB))
        )
    )
)

procedure(PCG_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=PCG_PinCenter(inst pinName)
        e=PCG_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) PCG_WIRE PCG_WIRE 0)
        unless(wire error("PCG: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" PCG_WIRE nil)
        unless(label error("PCG: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("PCG: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(PCG_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PCG: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("PCG: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(PCG_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PCG: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PCG: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PCG: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PCG_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("PCG: cannot create VDC %s.\n" name))
        PCG_SetVDC(inst value)
        plus=PCG_VDCPinCenter(inst "PLUS")
        minus=PCG_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+PCG_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) PCG_WIRE PCG_WIRE 0)
        unless(wp error("PCG: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" PCG_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=PCG_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("PCG: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-PCG_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) PCG_WIRE PCG_WIRE 0)
            unless(wm error("PCG: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" PCG_WIRE nil)
        )
        printf("PCG: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(PCG_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("PCG: failed creating external pin %s.\n" name))
        printf("PCG: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(PCG_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=PCG_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=PCG_PinCenter(inst "S")
        d=PCG_PinCenter(inst "D")
        printf("PCG: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=PCG_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=PCG_PinCenter(inst "S")
                d=PCG_PinCenter(inst "D")
                printf("PCG: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("PCG: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateCommonGate_PMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2  V_VBP_SRC V_VBN_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" PMOS Common-Gate Amplifier - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  GATE BIAS: V_VBP = 0.75V  LOAD BIAS: V_VBN = 0.60V\n")
        printf("PMOS common-gate: input at the source, output at the drain\n")
        printf("TEMP=27C  CORNER=TT\n")
        printf("DEVICE=PCG/PCG\n" PCG_LIB PCG_NMOS)
        printf("DEVICE=PCG/PCG\n" PCG_LIB PCG_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("PCG: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("PCG: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=PCG_OpenMaster(PCG_LIB PCG_NMOS)
        pmos=PCG_OpenMaster(PCG_LIB PCG_PMOS)
        vdcMaster=PCG_OpenMaster("analogLib" "vdc")
        pinMaster=PCG_OpenMaster("basic" "iopin")

        M1=PCG_PlacePMOSAuto(cv pmos "M1" 0:6 "8u" "240n" "1" "1")
        M2=PCG_PlaceMOS(cv nmos "M2" 0:0 "6u" "480n" "1" "1" "R0")

        PCG_LabelMOSTerminal(cv M1 "G" "VBP")
        PCG_LabelMOSTerminal(cv M1 "D" "VOUT")
        PCG_LabelMOSTerminal(cv M1 "S" "VIN")
        PCG_LabelMOSTerminal(cv M1 "B" "VDD")
        PCG_LabelMOSTerminal(cv M2 "G" "VBN")
        PCG_LabelMOSTerminal(cv M2 "D" "VOUT")
        PCG_LabelMOSTerminal(cv M2 "S" "VSS")
        PCG_LabelMOSTerminal(cv M2 "B" "VSS")

        V_VBP_SRC=PCG_CreateVDC(cv vdcMaster "V_VBP_SRC" -10:6 "0.75" "VBP" "VSS")
        V_VBN_SRC=PCG_CreateVDC(cv vdcMaster "V_VBN_SRC" -10:0 "0.60" "VBN" "VSS")
        V_VDD_SRC=PCG_CreateVDC(cv vdcMaster "V_VDD_SRC" 10:10 "1.50" "VDD" "VSS")
        V_VSS_SRC=PCG_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-6 "0.0" "VSS" "VSS")

        PCG_CreatePin(cv pinMaster "VIN" "input" -9:10)
        PCG_CreatePin(cv pinMaster "VOUT" "output" 9:3)
        PCG_CreatePin(cv pinMaster "VDD" "input" 9:12)
        PCG_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" PCG GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
