;=============================================================================
; PMOS Source Follower - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  PMOS follower device (G=VIN D=VSS S=VOUT B=VDD)
;   M2  PMOS current source (G=VBP D=VOUT S=VDD B=VDD)
;=============================================================================

(setq PSF_LIB "tsmcN65")
(setq PSF_NMOS "nch")
(setq PSF_PMOS "pch")
(setq PSF_STUB 0.75)
(setq PSF_WIRE 0.0625)
procedure(PSF_ToFloat(val)
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

procedure(PSF_ValueMatches(got expect)
    let((gn en)
        gn=PSF_ToFloat(got)
        en=PSF_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(PSF_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("PSF: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(PSF_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PSF: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("PSF: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("PSF: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("PSF: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=PSF_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(PSF_ValueMatches(cdf->w->value WperFinger)
            error("PSF: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(PSF_ValueMatches(cdf->l->value L)
            error("PSF: L read-back mismatch on %s.\n" inst~>name))
        unless(PSF_ValueMatches(cdf->wf->value TotalW)
            error("PSF: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(PSF_ValueMatches(cdf->fingers->value NF)
            error("PSF: fingers read-back mismatch on %s.\n" inst~>name))
        unless(PSF_ValueMatches(cdf->simM->value M)
            error("PSF: simM read-back mismatch on %s.\n" inst~>name))
        unless(PSF_ValueMatches(cdf->totalM->value totalM)
            error("PSF: totalM read-back mismatch on %s.\n" inst~>name))
        unless(PSF_ValueMatches(cdf->nf->value NF)
            error("PSF: nf read-back mismatch on %s.\n" inst~>name))
        unless(PSF_ValueMatches(cdf->m->value M)
            error("PSF: m read-back mismatch on %s.\n" inst~>name))
        printf("PSF: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(PSF_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PSF: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PSF: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PSF: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PSF_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("PSF: cannot create %s.\n" name))
        PSF_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(PSF_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=PSF_PinCenter(inst "G")
        b=PSF_PinCenter(inst "B")
        s=PSF_PinCenter(inst "S")
        d=PSF_PinCenter(inst "D")
        p=PSF_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("PSF: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-PSF_STUB cadr(p))
                else list(car(p)+PSF_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-PSF_STUB)
                else list(car(p) cadr(p)+PSF_STUB))
        )
    )
)

procedure(PSF_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=PSF_PinCenter(inst pinName)
        e=PSF_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) PSF_WIRE PSF_WIRE 0)
        unless(wire error("PSF: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" PSF_WIRE nil)
        unless(label error("PSF: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("PSF: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(PSF_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PSF: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("PSF: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(PSF_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PSF: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PSF: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PSF: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PSF_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("PSF: cannot create VDC %s.\n" name))
        PSF_SetVDC(inst value)
        plus=PSF_VDCPinCenter(inst "PLUS")
        minus=PSF_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+PSF_STUB)
        em=list(car(minus) cadr(minus)-PSF_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) PSF_WIRE PSF_WIRE 0)
        wm=schCreateWire(cv "route" "full" list(minus em) PSF_WIRE PSF_WIRE 0)
        unless(wp && wm error("PSF: VDC wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" PSF_WIRE nil)
        schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" PSF_WIRE nil)
        printf("PSF: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(PSF_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("PSF: failed creating external pin %s.\n" name))
        printf("PSF: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(PSF_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=PSF_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=PSF_PinCenter(inst "S")
        d=PSF_PinCenter(inst "D")
        printf("PSF: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=PSF_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=PSF_PinCenter(inst "S")
                d=PSF_PinCenter(inst "D")
                printf("PSF: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("PSF: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateSourceFollower_PMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2  V_VIN_SRC V_VBP_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" PMOS Source Follower - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  VSS=0V  SOURCE BIAS: V_VBP = 0.75V  INPUT: VIN = 0.75V\n")
        printf("OUTPUT: VOUT = M1.S/M2.D (source-side buffer)  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=PSF/PSF\n" PSF_LIB PSF_NMOS)
        printf("DEVICE=PSF/PSF\n" PSF_LIB PSF_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("PSF: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("PSF: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=PSF_OpenMaster(PSF_LIB PSF_NMOS)
        pmos=PSF_OpenMaster(PSF_LIB PSF_PMOS)
        vdcMaster=PSF_OpenMaster("analogLib" "vdc")
        pinMaster=PSF_OpenMaster("basic" "iopin")

        M1=PSF_PlacePMOSAuto(cv pmos "M1" 0:3 "8u" "240n" "1" "1")
        M2=PSF_PlacePMOSAuto(cv pmos "M2" 0:-3 "8u" "480n" "1" "1")

        PSF_LabelMOSTerminal(cv M1 "G" "VIN")
        PSF_LabelMOSTerminal(cv M1 "D" "VSS")
        PSF_LabelMOSTerminal(cv M1 "S" "VOUT")
        PSF_LabelMOSTerminal(cv M1 "B" "VDD")
        PSF_LabelMOSTerminal(cv M2 "G" "VBP")
        PSF_LabelMOSTerminal(cv M2 "D" "VOUT")
        PSF_LabelMOSTerminal(cv M2 "S" "VDD")
        PSF_LabelMOSTerminal(cv M2 "B" "VDD")

        V_VIN_SRC=PSF_CreateVDC(cv vdcMaster "V_VIN_SRC" -10:3 "0.75" "VIN" "VSS")
        V_VBP_SRC=PSF_CreateVDC(cv vdcMaster "V_VBP_SRC" -10:-3 "0.75" "VBP" "VSS")
        V_VDD_SRC=PSF_CreateVDC(cv vdcMaster "V_VDD_SRC" 10:6 "1.50" "VDD" "VSS")
        V_VSS_SRC=PSF_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-6 "0.0" "VSS" "VSS")

        PSF_CreatePin(cv pinMaster "VIN" "input" -10:8)
        PSF_CreatePin(cv pinMaster "VOUT" "output" 9:-3)
        PSF_CreatePin(cv pinMaster "VDD" "input" 9:8)
        PSF_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" PSF GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
