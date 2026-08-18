;=============================================================================
; Common-Gate TIA - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS common-gate device (G=VBN S=IIN D=VOUT B=VSS)
;   M2  PMOS diode-connected load (G=D=VOUT S=VDD B=VDD)
;=============================================================================

(setq CGT_LIB "tsmcN65")
(setq CGT_NMOS "nch")
(setq CGT_PMOS "pch")
(setq CGT_STUB 0.75)
(setq CGT_WIRE 0.0625)
procedure(CGT_ToFloat(val)
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

procedure(CGT_ValueMatches(got expect)
    let((gn en)
        gn=CGT_ToFloat(got)
        en=CGT_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CGT_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CGT: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CGT_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CGT: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CGT: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CGT: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CGT: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CGT_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CGT_ValueMatches(cdf->w->value WperFinger)
            error("CGT: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CGT_ValueMatches(cdf->l->value L)
            error("CGT: L read-back mismatch on %s.\n" inst~>name))
        unless(CGT_ValueMatches(cdf->wf->value TotalW)
            error("CGT: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CGT_ValueMatches(cdf->fingers->value NF)
            error("CGT: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CGT_ValueMatches(cdf->simM->value M)
            error("CGT: simM read-back mismatch on %s.\n" inst~>name))
        unless(CGT_ValueMatches(cdf->totalM->value totalM)
            error("CGT: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CGT_ValueMatches(cdf->nf->value NF)
            error("CGT: nf read-back mismatch on %s.\n" inst~>name))
        unless(CGT_ValueMatches(cdf->m->value M)
            error("CGT: m read-back mismatch on %s.\n" inst~>name))
        printf("CGT: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CGT_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CGT: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CGT: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CGT: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CGT_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CGT: cannot create %s.\n" name))
        CGT_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CGT_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CGT_PinCenter(inst "G")
        b=CGT_PinCenter(inst "B")
        s=CGT_PinCenter(inst "S")
        d=CGT_PinCenter(inst "D")
        p=CGT_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CGT: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CGT_STUB cadr(p))
                else list(car(p)+CGT_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CGT_STUB)
                else list(car(p) cadr(p)+CGT_STUB))
        )
    )
)

procedure(CGT_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CGT_PinCenter(inst pinName)
        e=CGT_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CGT_WIRE CGT_WIRE 0)
        unless(wire error("CGT: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CGT_WIRE nil)
        unless(label error("CGT: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CGT: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CGT_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CGT: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CGT: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CGT_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CGT: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CGT: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CGT: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CGT_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CGT: cannot create VDC %s.\n" name))
        CGT_SetVDC(inst value)
        plus=CGT_VDCPinCenter(inst "PLUS")
        minus=CGT_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CGT_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CGT_WIRE CGT_WIRE 0)
        unless(wp error("CGT: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CGT_WIRE nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("CGT: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-CGT_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CGT_WIRE CGT_WIRE 0)
            unless(wm error("CGT: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CGT_WIRE nil)
        )
        printf("CGT: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CGT_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CGT: failed creating external pin %s.\n" name))
        printf("CGT: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CGT_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CGT_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CGT_PinCenter(inst "S")
        d=CGT_PinCenter(inst "D")
        printf("CGT: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CGT_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CGT_PinCenter(inst "S")
                d=CGT_PinCenter(inst "D")
                printf("CGT: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CGT: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateTIA_CommonGate_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2  V_VBN_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Common-Gate TIA - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  GATE BIAS: V_VBN = 0.75V  INPUT current into the source node IIN\n")
        printf("Diode-connected load sets ~1/gm transimpedance; bandwidth follows gm/C\n")
        printf("OUTPUT: VOUT = M1.D/M2.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CGT/CGT\n" CGT_LIB CGT_NMOS)
        printf("DEVICE=CGT/CGT\n" CGT_LIB CGT_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CGT: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CGT: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CGT_OpenMaster(CGT_LIB CGT_NMOS)
        pmos=CGT_OpenMaster(CGT_LIB CGT_PMOS)
        vdcMaster=CGT_OpenMaster("analogLib" "vdc")
        pinMaster=CGT_OpenMaster("basic" "iopin")

        M1=CGT_PlaceMOS(cv nmos "M1" 0:0 "4u" "240n" "1" "1" "R0")
        M2=CGT_PlacePMOSAuto(cv pmos "M2" 0:6 "8u" "480n" "1" "1")

        CGT_LabelMOSTerminal(cv M1 "G" "VBN")
        CGT_LabelMOSTerminal(cv M1 "D" "VOUT")
        CGT_LabelMOSTerminal(cv M1 "S" "IIN")
        CGT_LabelMOSTerminal(cv M1 "B" "VSS")
        CGT_LabelMOSTerminal(cv M2 "G" "VOUT")
        CGT_LabelMOSTerminal(cv M2 "D" "VOUT")
        CGT_LabelMOSTerminal(cv M2 "S" "VDD")
        CGT_LabelMOSTerminal(cv M2 "B" "VDD")

        V_VBN_SRC=CGT_CreateVDC(cv vdcMaster "V_VBN_SRC" -10:0 "0.75" "VBN" "VSS")
        V_VDD_SRC=CGT_CreateVDC(cv vdcMaster "V_VDD_SRC" 10:8 "1.50" "VDD" "VSS")
        V_VSS_SRC=CGT_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-6 "0.0" "VSS" "VSS")

        CGT_CreatePin(cv pinMaster "IIN" "input" -9:-6)
        CGT_CreatePin(cv pinMaster "VOUT" "output" 9:3)
        CGT_CreatePin(cv pinMaster "VDD" "input" 9:10)
        CGT_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CGT GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
