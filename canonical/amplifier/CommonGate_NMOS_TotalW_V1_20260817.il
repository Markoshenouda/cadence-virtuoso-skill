;=============================================================================
; NMOS Common-Gate Amplifier - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS common-gate device (G=VBN S=VIN D=VOUT B=VSS)
;   M2  PMOS current-source load (G=VBP D=VOUT S=VDD B=VDD)
;=============================================================================

(setq NCG_LIB "tsmcN65")
(setq NCG_NMOS "nch")
(setq NCG_PMOS "pch")
(setq NCG_STUB 0.75)
(setq NCG_WIRE 0.0625)
procedure(NCG_ToFloat(val)
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

procedure(NCG_ValueMatches(got expect)
    let((gn en)
        gn=NCG_ToFloat(got)
        en=NCG_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(NCG_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("NCG: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(NCG_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("NCG: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("NCG: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("NCG: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("NCG: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=NCG_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(NCG_ValueMatches(cdf->w->value WperFinger)
            error("NCG: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(NCG_ValueMatches(cdf->l->value L)
            error("NCG: L read-back mismatch on %s.\n" inst~>name))
        unless(NCG_ValueMatches(cdf->wf->value TotalW)
            error("NCG: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(NCG_ValueMatches(cdf->fingers->value NF)
            error("NCG: fingers read-back mismatch on %s.\n" inst~>name))
        unless(NCG_ValueMatches(cdf->simM->value M)
            error("NCG: simM read-back mismatch on %s.\n" inst~>name))
        unless(NCG_ValueMatches(cdf->totalM->value totalM)
            error("NCG: totalM read-back mismatch on %s.\n" inst~>name))
        unless(NCG_ValueMatches(cdf->nf->value NF)
            error("NCG: nf read-back mismatch on %s.\n" inst~>name))
        unless(NCG_ValueMatches(cdf->m->value M)
            error("NCG: m read-back mismatch on %s.\n" inst~>name))
        printf("NCG: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(NCG_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("NCG: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("NCG: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("NCG: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(NCG_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("NCG: cannot create %s.\n" name))
        NCG_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(NCG_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=NCG_PinCenter(inst "G")
        b=NCG_PinCenter(inst "B")
        s=NCG_PinCenter(inst "S")
        d=NCG_PinCenter(inst "D")
        p=NCG_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("NCG: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-NCG_STUB cadr(p))
                else list(car(p)+NCG_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-NCG_STUB)
                else list(car(p) cadr(p)+NCG_STUB))
        )
    )
)

procedure(NCG_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=NCG_PinCenter(inst pinName)
        e=NCG_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) NCG_WIRE NCG_WIRE 0)
        unless(wire error("NCG: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" NCG_WIRE nil)
        unless(label error("NCG: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("NCG: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(NCG_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("NCG: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("NCG: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(NCG_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("NCG: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("NCG: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("NCG: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(NCG_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("NCG: cannot create VDC %s.\n" name))
        NCG_SetVDC(inst value)
        plus=NCG_VDCPinCenter(inst "PLUS")
        minus=NCG_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+NCG_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) NCG_WIRE NCG_WIRE 0)
        unless(wp error("NCG: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" NCG_WIRE nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("NCG: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-NCG_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) NCG_WIRE NCG_WIRE 0)
            unless(wm error("NCG: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" NCG_WIRE nil)
        )
        printf("NCG: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(NCG_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("NCG: failed creating external pin %s.\n" name))
        printf("NCG: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(NCG_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=NCG_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=NCG_PinCenter(inst "S")
        d=NCG_PinCenter(inst "D")
        printf("NCG: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=NCG_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=NCG_PinCenter(inst "S")
                d=NCG_PinCenter(inst "D")
                printf("NCG: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("NCG: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateCommonGate_NMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster gndMaster pinMaster M1 M2  V_VBN_SRC V_VBP_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" NMOS Common-Gate Amplifier - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  GATE BIAS: V_VBN = 0.75V  LOAD BIAS: V_VBP = 0.90V\n")
        printf("Input at the source, output at the drain; low input impedance stage\n")
        printf("TEMP=27C  CORNER=TT\n")
        printf("DEVICE=NCG/NCG\n" NCG_LIB NCG_NMOS)
        printf("DEVICE=NCG/NCG\n" NCG_LIB NCG_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("NCG: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("NCG: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=NCG_OpenMaster(NCG_LIB NCG_NMOS)
        pmos=NCG_OpenMaster(NCG_LIB NCG_PMOS)
        vdcMaster=NCG_OpenMaster("analogLib" "vdc")
        gndMaster=NCG_OpenMaster("analogLib" "gnd")
        pinMaster=NCG_OpenMaster("basic" "iopin")

        M1=NCG_PlaceMOS(cv nmos "M1" 0:0 "4u" "240n" "1" "1" "R0")
        M2=NCG_PlacePMOSAuto(cv pmos "M2" 0:6 "8u" "480n" "1" "1")

        NCG_LabelMOSTerminal(cv M1 "G" "VBN")
        NCG_LabelMOSTerminal(cv M1 "D" "VOUT")
        NCG_LabelMOSTerminal(cv M1 "S" "VIN")
        NCG_LabelMOSTerminal(cv M1 "B" "VSS")
        NCG_LabelMOSTerminal(cv M2 "G" "VBP")
        NCG_LabelMOSTerminal(cv M2 "D" "VOUT")
        NCG_LabelMOSTerminal(cv M2 "S" "VDD")
        NCG_LabelMOSTerminal(cv M2 "B" "VDD")

        V_VBN_SRC=NCG_CreateVDC(cv vdcMaster gndMaster "V_VBN_SRC" -10:0 "0.75" "VBN")
        V_VBP_SRC=NCG_CreateVDC(cv vdcMaster gndMaster "V_VBP_SRC" -10:6 "0.90" "VBP")
        V_VDD_SRC=NCG_CreateVDC(cv vdcMaster gndMaster "V_VDD_SRC" 10:8 "1.50" "VDD")
        V_VSS_SRC=NCG_CreateVDC(cv vdcMaster gndMaster "V_VSS_SRC" 10:-6 "0.0" "VSS")

        NCG_CreatePin(cv pinMaster "VIN" "input" -9:-6)
        NCG_CreatePin(cv pinMaster "VOUT" "output" 9:3)
        NCG_CreatePin(cv pinMaster "VDD" "input" 9:10)
        NCG_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" NCG GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
