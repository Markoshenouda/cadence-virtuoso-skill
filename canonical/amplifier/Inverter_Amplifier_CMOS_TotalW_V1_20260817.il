;=============================================================================
; CMOS Inverter Amplifier - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS device (G=VIN D=VOUT S=VSS B=VSS)
;   M2  PMOS device (G=VIN D=VOUT S=VDD B=VDD)
;=============================================================================

(setq CIA_LIB "tsmcN65")
(setq CIA_NMOS "nch")
(setq CIA_PMOS "pch")
(setq CIA_STUB 0.75)
(setq CIA_WIRE 0.0625)
procedure(CIA_ToFloat(val)
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

procedure(CIA_ValueMatches(got expect)
    let((gn en)
        gn=CIA_ToFloat(got)
        en=CIA_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CIA_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CIA: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CIA_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CIA: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CIA: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CIA: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CIA: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CIA_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CIA_ValueMatches(cdf->w->value WperFinger)
            error("CIA: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CIA_ValueMatches(cdf->l->value L)
            error("CIA: L read-back mismatch on %s.\n" inst~>name))
        unless(CIA_ValueMatches(cdf->wf->value TotalW)
            error("CIA: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CIA_ValueMatches(cdf->fingers->value NF)
            error("CIA: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CIA_ValueMatches(cdf->simM->value M)
            error("CIA: simM read-back mismatch on %s.\n" inst~>name))
        unless(CIA_ValueMatches(cdf->totalM->value totalM)
            error("CIA: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CIA_ValueMatches(cdf->nf->value NF)
            error("CIA: nf read-back mismatch on %s.\n" inst~>name))
        unless(CIA_ValueMatches(cdf->m->value M)
            error("CIA: m read-back mismatch on %s.\n" inst~>name))
        printf("CIA: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CIA_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CIA: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CIA: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CIA: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CIA_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CIA: cannot create %s.\n" name))
        CIA_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CIA_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CIA_PinCenter(inst "G")
        b=CIA_PinCenter(inst "B")
        s=CIA_PinCenter(inst "S")
        d=CIA_PinCenter(inst "D")
        p=CIA_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CIA: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CIA_STUB cadr(p))
                else list(car(p)+CIA_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CIA_STUB)
                else list(car(p) cadr(p)+CIA_STUB))
        )
    )
)

procedure(CIA_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CIA_PinCenter(inst pinName)
        e=CIA_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CIA_WIRE CIA_WIRE 0)
        unless(wire error("CIA: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CIA_WIRE nil)
        unless(label error("CIA: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CIA: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CIA_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CIA: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CIA: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CIA_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CIA: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CIA: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CIA: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CIA_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CIA: cannot create VDC %s.\n" name))
        CIA_SetVDC(inst value)
        plus=CIA_VDCPinCenter(inst "PLUS")
        minus=CIA_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CIA_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CIA_WIRE CIA_WIRE 0)
        unless(wp error("CIA: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CIA_WIRE nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("CIA: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-CIA_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CIA_WIRE CIA_WIRE 0)
            unless(wm error("CIA: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CIA_WIRE nil)
        )
        printf("CIA: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CIA_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CIA: failed creating external pin %s.\n" name))
        printf("CIA: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CIA_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CIA_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CIA_PinCenter(inst "S")
        d=CIA_PinCenter(inst "D")
        printf("CIA: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CIA_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CIA_PinCenter(inst "S")
                d=CIA_PinCenter(inst "D")
                printf("CIA: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CIA: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateInverter_Amplifier_CMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2  V_VIN_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" CMOS Inverter Amplifier - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  VSS=0V  INPUT BIAS: VIN = 0.75V (self-biased trip region)\n")
        printf("CMOS inverter used as a high-gain inverting amplifier stage\n")
        printf("OUTPUT: VOUT = M1.D/M2.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CIA/CIA\n" CIA_LIB CIA_NMOS)
        printf("DEVICE=CIA/CIA\n" CIA_LIB CIA_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CIA: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CIA: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CIA_OpenMaster(CIA_LIB CIA_NMOS)
        pmos=CIA_OpenMaster(CIA_LIB CIA_PMOS)
        vdcMaster=CIA_OpenMaster("analogLib" "vdc")
        pinMaster=CIA_OpenMaster("basic" "iopin")

        M1=CIA_PlaceMOS(cv nmos "M1" 0:-2 "4u" "240n" "1" "1" "R0")
        M2=CIA_PlacePMOSAuto(cv pmos "M2" 0:4 "8u" "480n" "1" "1")

        CIA_LabelMOSTerminal(cv M1 "G" "VIN")
        CIA_LabelMOSTerminal(cv M1 "D" "VOUT")
        CIA_LabelMOSTerminal(cv M1 "S" "VSS")
        CIA_LabelMOSTerminal(cv M1 "B" "VSS")
        CIA_LabelMOSTerminal(cv M2 "G" "VIN")
        CIA_LabelMOSTerminal(cv M2 "D" "VOUT")
        CIA_LabelMOSTerminal(cv M2 "S" "VDD")
        CIA_LabelMOSTerminal(cv M2 "B" "VDD")

        V_VIN_SRC=CIA_CreateVDC(cv vdcMaster "V_VIN_SRC" -10:0 "0.75" "VIN" "VSS")
        V_VDD_SRC=CIA_CreateVDC(cv vdcMaster "V_VDD_SRC" 10:6 "1.50" "VDD" "VSS")
        V_VSS_SRC=CIA_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-6 "0.0" "VSS" "VSS")

        CIA_CreatePin(cv pinMaster "VIN" "input" -10:-4)
        CIA_CreatePin(cv pinMaster "VOUT" "output" 9:0)
        CIA_CreatePin(cv pinMaster "VDD" "input" 9:8)
        CIA_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CIA GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
