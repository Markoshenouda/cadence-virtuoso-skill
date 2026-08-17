;=============================================================================
; Complementary Current Mirror - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS diode reference (G=IREF D=IREF S=VSS B=VSS)
;   M2  NMOS output device (G=IREF D=IOUTN S=VSS B=VSS)
;   M3  PMOS diode reference (G=IREF D=IREF S=VDD B=VDD)
;   M4  PMOS output device (G=IREF D=IOUTP S=VDD B=VDD)
;=============================================================================

(setq CCMP_LIB "tsmcN65")
(setq CCMP_NMOS "nch")
(setq CCMP_PMOS "pch")
(setq CCMP_STUB 0.75)
(setq CCMP_WIRE 0.0625)
procedure(CCMP_ToFloat(val)
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

procedure(CCMP_ValueMatches(got expect)
    let((gn en)
        gn=CCMP_ToFloat(got)
        en=CCMP_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CCMP_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CCMP: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CCMP_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CCMP: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CCMP: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CCMP: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CCMP: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CCMP_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CCMP_ValueMatches(cdf->w->value WperFinger)
            error("CCMP: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CCMP_ValueMatches(cdf->l->value L)
            error("CCMP: L read-back mismatch on %s.\n" inst~>name))
        unless(CCMP_ValueMatches(cdf->wf->value TotalW)
            error("CCMP: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CCMP_ValueMatches(cdf->fingers->value NF)
            error("CCMP: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CCMP_ValueMatches(cdf->simM->value M)
            error("CCMP: simM read-back mismatch on %s.\n" inst~>name))
        unless(CCMP_ValueMatches(cdf->totalM->value totalM)
            error("CCMP: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CCMP_ValueMatches(cdf->nf->value NF)
            error("CCMP: nf read-back mismatch on %s.\n" inst~>name))
        unless(CCMP_ValueMatches(cdf->m->value M)
            error("CCMP: m read-back mismatch on %s.\n" inst~>name))
        printf("CCMP: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CCMP_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CCMP: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CCMP: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CCMP: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CCMP_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CCMP: cannot create %s.\n" name))
        CCMP_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CCMP_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CCMP_PinCenter(inst "G")
        b=CCMP_PinCenter(inst "B")
        s=CCMP_PinCenter(inst "S")
        d=CCMP_PinCenter(inst "D")
        p=CCMP_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CCMP: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CCMP_STUB cadr(p))
                else list(car(p)+CCMP_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CCMP_STUB)
                else list(car(p) cadr(p)+CCMP_STUB))
        )
    )
)

procedure(CCMP_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CCMP_PinCenter(inst pinName)
        e=CCMP_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CCMP_WIRE CCMP_WIRE 0)
        unless(wire error("CCMP: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CCMP_WIRE nil)
        unless(label error("CCMP: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CCMP: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CCMP_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CCMP: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CCMP: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CCMP_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CCMP: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CCMP: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CCMP: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CCMP_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CCMP: cannot create VDC %s.\n" name))
        CCMP_SetVDC(inst value)
        plus=CCMP_VDCPinCenter(inst "PLUS")
        minus=CCMP_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CCMP_STUB)
        em=list(car(minus) cadr(minus)-CCMP_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CCMP_WIRE CCMP_WIRE 0)
        wm=schCreateWire(cv "route" "full" list(minus em) CCMP_WIRE CCMP_WIRE 0)
        unless(wp && wm error("CCMP: VDC wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CCMP_WIRE nil)
        schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CCMP_WIRE nil)
        printf("CCMP: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CCMP_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CCMP: failed creating external pin %s.\n" name))
        printf("CCMP: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CCMP_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CCMP_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CCMP_PinCenter(inst "S")
        d=CCMP_PinCenter(inst "D")
        printf("CCMP: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CCMP_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CCMP_PinCenter(inst "S")
                d=CCMP_PinCenter(inst "D")
                printf("CCMP: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CCMP: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateCurrentMirror_Complementary_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4  V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Complementary Current Mirror - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  REFERENCE NODE IREF = 0.75V biases both polarity mirrors\n")
        printf("Single reference distributes an NMOS sink mirror and a PMOS source mirror\n")
        printf("TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CCMP/CCMP\n" CCMP_LIB CCMP_NMOS)
        printf("DEVICE=CCMP/CCMP\n" CCMP_LIB CCMP_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CCMP: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CCMP: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CCMP_OpenMaster(CCMP_LIB CCMP_NMOS)
        pmos=CCMP_OpenMaster(CCMP_LIB CCMP_PMOS)
        vdcMaster=CCMP_OpenMaster("analogLib" "vdc")
        pinMaster=CCMP_OpenMaster("basic" "iopin")

        M1=CCMP_PlaceMOS(cv nmos "M1" -4:0 "4u" "480n" "1" "1" "R0")
        M2=CCMP_PlaceMOS(cv nmos "M2" 4:0 "4u" "480n" "1" "1" "R0")
        M3=CCMP_PlacePMOSAuto(cv pmos "M3" -4:8 "8u" "480n" "1" "1")
        M4=CCMP_PlacePMOSAuto(cv pmos "M4" 4:8 "8u" "480n" "1" "1")

        CCMP_LabelMOSTerminal(cv M1 "G" "IREF")
        CCMP_LabelMOSTerminal(cv M1 "D" "IREF")
        CCMP_LabelMOSTerminal(cv M1 "S" "VSS")
        CCMP_LabelMOSTerminal(cv M1 "B" "VSS")
        CCMP_LabelMOSTerminal(cv M2 "G" "IREF")
        CCMP_LabelMOSTerminal(cv M2 "D" "IOUTN")
        CCMP_LabelMOSTerminal(cv M2 "S" "VSS")
        CCMP_LabelMOSTerminal(cv M2 "B" "VSS")
        CCMP_LabelMOSTerminal(cv M3 "G" "IREF")
        CCMP_LabelMOSTerminal(cv M3 "D" "IREF")
        CCMP_LabelMOSTerminal(cv M3 "S" "VDD")
        CCMP_LabelMOSTerminal(cv M3 "B" "VDD")
        CCMP_LabelMOSTerminal(cv M4 "G" "IREF")
        CCMP_LabelMOSTerminal(cv M4 "D" "IOUTP")
        CCMP_LabelMOSTerminal(cv M4 "S" "VDD")
        CCMP_LabelMOSTerminal(cv M4 "B" "VDD")

        V_VDD_SRC=CCMP_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:14 "1.50" "VDD" "VSS")
        V_VSS_SRC=CCMP_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-8 "0.0" "VSS" "VSS")

        CCMP_CreatePin(cv pinMaster "IOUTP" "output" 9:12)
        CCMP_CreatePin(cv pinMaster "IOUTN" "output" 9:-4)
        CCMP_CreatePin(cv pinMaster "VDD" "input" 0:16)
        CCMP_CreatePin(cv pinMaster "VSS" "input" 0:-10)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CCMP GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
