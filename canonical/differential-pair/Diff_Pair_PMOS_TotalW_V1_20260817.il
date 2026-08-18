;=============================================================================
; PMOS Differential Pair - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  PMOS input device (G=VIP D=VOUTP S=TAIL B=VDD)
;   M2  PMOS input device (G=VIN D=VOUTN S=TAIL B=VDD)
;   M3  PMOS tail source (G=VBP_TAIL D=TAIL S=VDD B=VDD)
;=============================================================================

(setq PDP_LIB "tsmcN65")
(setq PDP_NMOS "nch")
(setq PDP_PMOS "pch")
(setq PDP_STUB 0.75)
(setq PDP_WIRE 0.0625)
procedure(PDP_ToFloat(val)
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

procedure(PDP_ValueMatches(got expect)
    let((gn en)
        gn=PDP_ToFloat(got)
        en=PDP_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(PDP_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("PDP: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(PDP_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PDP: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("PDP: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("PDP: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("PDP: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=PDP_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(PDP_ValueMatches(cdf->w->value WperFinger)
            error("PDP: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(PDP_ValueMatches(cdf->l->value L)
            error("PDP: L read-back mismatch on %s.\n" inst~>name))
        unless(PDP_ValueMatches(cdf->wf->value TotalW)
            error("PDP: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(PDP_ValueMatches(cdf->fingers->value NF)
            error("PDP: fingers read-back mismatch on %s.\n" inst~>name))
        unless(PDP_ValueMatches(cdf->simM->value M)
            error("PDP: simM read-back mismatch on %s.\n" inst~>name))
        unless(PDP_ValueMatches(cdf->totalM->value totalM)
            error("PDP: totalM read-back mismatch on %s.\n" inst~>name))
        unless(PDP_ValueMatches(cdf->nf->value NF)
            error("PDP: nf read-back mismatch on %s.\n" inst~>name))
        unless(PDP_ValueMatches(cdf->m->value M)
            error("PDP: m read-back mismatch on %s.\n" inst~>name))
        printf("PDP: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(PDP_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PDP: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PDP: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PDP: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PDP_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("PDP: cannot create %s.\n" name))
        PDP_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(PDP_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=PDP_PinCenter(inst "G")
        b=PDP_PinCenter(inst "B")
        s=PDP_PinCenter(inst "S")
        d=PDP_PinCenter(inst "D")
        p=PDP_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("PDP: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-PDP_STUB cadr(p))
                else list(car(p)+PDP_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-PDP_STUB)
                else list(car(p) cadr(p)+PDP_STUB))
        )
    )
)

procedure(PDP_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=PDP_PinCenter(inst pinName)
        e=PDP_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) PDP_WIRE PDP_WIRE 0)
        unless(wire error("PDP: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" PDP_WIRE nil)
        unless(label error("PDP: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("PDP: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(PDP_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PDP: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("PDP: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(PDP_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PDP: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PDP: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PDP: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PDP_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("PDP: cannot create VDC %s.\n" name))
        PDP_SetVDC(inst value)
        plus=PDP_VDCPinCenter(inst "PLUS")
        minus=PDP_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+PDP_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) PDP_WIRE PDP_WIRE 0)
        unless(wp error("PDP: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" PDP_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=PDP_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("PDP: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-PDP_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) PDP_WIRE PDP_WIRE 0)
            unless(wm error("PDP: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" PDP_WIRE nil)
        )
        printf("PDP: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(PDP_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("PDP: failed creating external pin %s.\n" name))
        printf("PDP: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(PDP_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=PDP_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=PDP_PinCenter(inst "S")
        d=PDP_PinCenter(inst "D")
        printf("PDP: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=PDP_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=PDP_PinCenter(inst "S")
                d=PDP_PinCenter(inst "D")
                printf("PDP: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("PDP: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateDiffPair_PMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3  V_VDD_SRC V_VBP_TAIL_SRC V_VIP_SRC V_VIN_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" PMOS Differential Pair - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  TAIL BIAS: V_VBP_TAIL = 0.75V  INPUTS: VIP = VIN = 0.75V\n")
        printf("OUTPUTS: VOUTP / VOUTN (open drains at the bottom)\n")
        printf("TEMP=27C  CORNER=TT  RATIO: 1:1 default\n")
        printf("DEVICE=PDP/PDP\n" PDP_LIB PDP_NMOS)
        printf("DEVICE=PDP/PDP\n" PDP_LIB PDP_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("PDP: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("PDP: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=PDP_OpenMaster(PDP_LIB PDP_NMOS)
        pmos=PDP_OpenMaster(PDP_LIB PDP_PMOS)
        vdcMaster=PDP_OpenMaster("analogLib" "vdc")
        pinMaster=PDP_OpenMaster("basic" "iopin")

        M1=PDP_PlacePMOSAuto(cv pmos "M1" -3:4 "8u" "240n" "1" "1")
        M2=PDP_PlacePMOSAuto(cv pmos "M2" 3:4 "8u" "240n" "1" "1")
        M3=PDP_PlacePMOSAuto(cv pmos "M3" 0:10 "8u" "480n" "1" "1")

        PDP_LabelMOSTerminal(cv M1 "G" "VIP")
        PDP_LabelMOSTerminal(cv M1 "D" "VOUTP")
        PDP_LabelMOSTerminal(cv M1 "S" "TAIL")
        PDP_LabelMOSTerminal(cv M1 "B" "VDD")
        PDP_LabelMOSTerminal(cv M2 "G" "VIN")
        PDP_LabelMOSTerminal(cv M2 "D" "VOUTN")
        PDP_LabelMOSTerminal(cv M2 "S" "TAIL")
        PDP_LabelMOSTerminal(cv M2 "B" "VDD")
        PDP_LabelMOSTerminal(cv M3 "G" "VBP_TAIL")
        PDP_LabelMOSTerminal(cv M3 "D" "TAIL")
        PDP_LabelMOSTerminal(cv M3 "S" "VDD")
        PDP_LabelMOSTerminal(cv M3 "B" "VDD")

        V_VDD_SRC=PDP_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:14 "1.50" "VDD" "VSS")
        V_VBP_TAIL_SRC=PDP_CreateVDC(cv vdcMaster "V_VBP_TAIL_SRC" -12:10 "0.75" "VBP_TAIL" "VSS")
        V_VIP_SRC=PDP_CreateVDC(cv vdcMaster "V_VIP_SRC" -12:4 "0.75" "VIP" "VSS")
        V_VIN_SRC=PDP_CreateVDC(cv vdcMaster "V_VIN_SRC" 12:4 "0.75" "VIN" "VSS")
        V_VSS_SRC=PDP_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-8 "0.0" "VSS" "VSS")

        PDP_CreatePin(cv pinMaster "VIP" "input" -10:-4)
        PDP_CreatePin(cv pinMaster "VIN" "input" 10:-4)
        PDP_CreatePin(cv pinMaster "VOUTP" "output" -7:-6)
        PDP_CreatePin(cv pinMaster "VOUTN" "output" 7:-6)
        PDP_CreatePin(cv pinMaster "VDD" "input" 0:16)
        PDP_CreatePin(cv pinMaster "VSS" "input" 0:-10)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" PDP GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
