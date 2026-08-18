;=============================================================================
; Differential Pair with PMOS Current Load - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input pair (G=VIP D=VOUTP S=TAIL B=VSS)
;   M2  NMOS input pair (G=VIN D=VOUTN S=TAIL B=VSS)
;   M3  NMOS tail source (G=VBN_TAIL D=TAIL S=VSS B=VSS)
;   M4  PMOS current load (G=VBP D=VOUTP S=VDD B=VDD)
;   M5  PMOS current load (G=VBP D=VOUTN S=VDD B=VDD)
;=============================================================================

(setq DPL_LIB "tsmcN65")
(setq DPL_NMOS "nch")
(setq DPL_PMOS "pch")
(setq DPL_STUB 0.75)
(setq DPL_WIRE 0.0625)
procedure(DPL_ToFloat(val)
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

procedure(DPL_ValueMatches(got expect)
    let((gn en)
        gn=DPL_ToFloat(got)
        en=DPL_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(DPL_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("DPL: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(DPL_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("DPL: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("DPL: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("DPL: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("DPL: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=DPL_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(DPL_ValueMatches(cdf->w->value WperFinger)
            error("DPL: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(DPL_ValueMatches(cdf->l->value L)
            error("DPL: L read-back mismatch on %s.\n" inst~>name))
        unless(DPL_ValueMatches(cdf->wf->value TotalW)
            error("DPL: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(DPL_ValueMatches(cdf->fingers->value NF)
            error("DPL: fingers read-back mismatch on %s.\n" inst~>name))
        unless(DPL_ValueMatches(cdf->simM->value M)
            error("DPL: simM read-back mismatch on %s.\n" inst~>name))
        unless(DPL_ValueMatches(cdf->totalM->value totalM)
            error("DPL: totalM read-back mismatch on %s.\n" inst~>name))
        unless(DPL_ValueMatches(cdf->nf->value NF)
            error("DPL: nf read-back mismatch on %s.\n" inst~>name))
        unless(DPL_ValueMatches(cdf->m->value M)
            error("DPL: m read-back mismatch on %s.\n" inst~>name))
        printf("DPL: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(DPL_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("DPL: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("DPL: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("DPL: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(DPL_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("DPL: cannot create %s.\n" name))
        DPL_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(DPL_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=DPL_PinCenter(inst "G")
        b=DPL_PinCenter(inst "B")
        s=DPL_PinCenter(inst "S")
        d=DPL_PinCenter(inst "D")
        p=DPL_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("DPL: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-DPL_STUB cadr(p))
                else list(car(p)+DPL_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-DPL_STUB)
                else list(car(p) cadr(p)+DPL_STUB))
        )
    )
)

procedure(DPL_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=DPL_PinCenter(inst pinName)
        e=DPL_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) DPL_WIRE DPL_WIRE 0)
        unless(wire error("DPL: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" DPL_WIRE nil)
        unless(label error("DPL: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("DPL: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(DPL_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("DPL: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("DPL: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(DPL_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("DPL: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("DPL: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("DPL: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(DPL_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("DPL: cannot create VDC %s.\n" name))
        DPL_SetVDC(inst value)
        plus=DPL_VDCPinCenter(inst "PLUS")
        minus=DPL_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+DPL_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) DPL_WIRE DPL_WIRE 0)
        unless(wp error("DPL: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" DPL_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=DPL_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("DPL: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-DPL_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) DPL_WIRE DPL_WIRE 0)
            unless(wm error("DPL: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" DPL_WIRE nil)
        )
        printf("DPL: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(DPL_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("DPL: failed creating external pin %s.\n" name))
        printf("DPL: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(DPL_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=DPL_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=DPL_PinCenter(inst "S")
        d=DPL_PinCenter(inst "D")
        printf("DPL: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=DPL_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=DPL_PinCenter(inst "S")
                d=DPL_PinCenter(inst "D")
                printf("DPL: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("DPL: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateDiffPair_PMOSLoad_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4 M5  V_VDD_SRC V_VBN_TAIL_SRC V_VBP_SRC V_VIP_SRC V_VIN_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Differential Pair with PMOS Current Load - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  TAIL BIAS: V_VBN_TAIL = 0.60V  LOAD BIAS: V_VBP = 0.90V\n")
        printf("INPUTS: VIP = VIN = 0.75V  OUTPUTS: VOUTP / VOUTN  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=DPL/DPL\n" DPL_LIB DPL_NMOS)
        printf("DEVICE=DPL/DPL\n" DPL_LIB DPL_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("DPL: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("DPL: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=DPL_OpenMaster(DPL_LIB DPL_NMOS)
        pmos=DPL_OpenMaster(DPL_LIB DPL_PMOS)
        vdcMaster=DPL_OpenMaster("analogLib" "vdc")
        pinMaster=DPL_OpenMaster("basic" "iopin")

        M1=DPL_PlaceMOS(cv nmos "M1" -4:0 "2u" "240n" "1" "1" "R0")
        M2=DPL_PlaceMOS(cv nmos "M2" 4:0 "2u" "240n" "1" "1" "R0")
        M3=DPL_PlaceMOS(cv nmos "M3" 0:-6 "6u" "480n" "1" "1" "R0")
        M4=DPL_PlacePMOSAuto(cv pmos "M4" -4:8 "8u" "480n" "1" "1")
        M5=DPL_PlacePMOSAuto(cv pmos "M5" 4:8 "8u" "480n" "1" "1")

        DPL_LabelMOSTerminal(cv M1 "G" "VIP")
        DPL_LabelMOSTerminal(cv M1 "D" "VOUTP")
        DPL_LabelMOSTerminal(cv M1 "S" "TAIL")
        DPL_LabelMOSTerminal(cv M1 "B" "VSS")
        DPL_LabelMOSTerminal(cv M2 "G" "VIN")
        DPL_LabelMOSTerminal(cv M2 "D" "VOUTN")
        DPL_LabelMOSTerminal(cv M2 "S" "TAIL")
        DPL_LabelMOSTerminal(cv M2 "B" "VSS")
        DPL_LabelMOSTerminal(cv M3 "G" "VBN_TAIL")
        DPL_LabelMOSTerminal(cv M3 "D" "TAIL")
        DPL_LabelMOSTerminal(cv M3 "S" "VSS")
        DPL_LabelMOSTerminal(cv M3 "B" "VSS")
        DPL_LabelMOSTerminal(cv M4 "G" "VBP")
        DPL_LabelMOSTerminal(cv M4 "D" "VOUTP")
        DPL_LabelMOSTerminal(cv M4 "S" "VDD")
        DPL_LabelMOSTerminal(cv M4 "B" "VDD")
        DPL_LabelMOSTerminal(cv M5 "G" "VBP")
        DPL_LabelMOSTerminal(cv M5 "D" "VOUTN")
        DPL_LabelMOSTerminal(cv M5 "S" "VDD")
        DPL_LabelMOSTerminal(cv M5 "B" "VDD")

        V_VDD_SRC=DPL_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:14 "1.50" "VDD" "VSS")
        V_VBN_TAIL_SRC=DPL_CreateVDC(cv vdcMaster "V_VBN_TAIL_SRC" -12:-2 "0.60" "VBN_TAIL" "VSS")
        V_VBP_SRC=DPL_CreateVDC(cv vdcMaster "V_VBP_SRC" 12:8 "0.90" "VBP" "VSS")
        V_VIP_SRC=DPL_CreateVDC(cv vdcMaster "V_VIP_SRC" -12:0 "0.75" "VIP" "VSS")
        V_VIN_SRC=DPL_CreateVDC(cv vdcMaster "V_VIN_SRC" 12:0 "0.75" "VIN" "VSS")
        V_VSS_SRC=DPL_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-10 "0.0" "VSS" "VSS")

        DPL_CreatePin(cv pinMaster "VIP" "input" -10:-10)
        DPL_CreatePin(cv pinMaster "VIN" "input" 10:-10)
        DPL_CreatePin(cv pinMaster "VOUTP" "output" -7:12)
        DPL_CreatePin(cv pinMaster "VOUTN" "output" 7:12)
        DPL_CreatePin(cv pinMaster "VDD" "input" 0:16)
        DPL_CreatePin(cv pinMaster "VSS" "input" 0:-12)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" DPL GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
