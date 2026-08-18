;=============================================================================
; Cascode Amplifier - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input device   (G=VIN D=NCAS S=VSS B=VSS)
;   M2  NMOS cascode device (G=VBN_CAS D=VOUT S=NCAS B=VSS)
;   M3  PMOS load device    (G=VBP D=VOUT S=VDD B=VDD)
;=============================================================================

(setq CCA_LIB "tsmcN65")
(setq CCA_NMOS "nch")
(setq CCA_PMOS "pch")
(setq CCA_STUB 0.75)
(setq CCA_WIRE 0.0625)
procedure(CCA_ToFloat(val)
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

procedure(CCA_ValueMatches(got expect)
    let((gn en)
        gn=CCA_ToFloat(got)
        en=CCA_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CCA_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CCA: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CCA_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CCA: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CCA: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CCA: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CCA: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CCA_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CCA_ValueMatches(cdf->w->value WperFinger)
            error("CCA: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CCA_ValueMatches(cdf->l->value L)
            error("CCA: L read-back mismatch on %s.\n" inst~>name))
        unless(CCA_ValueMatches(cdf->wf->value TotalW)
            error("CCA: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CCA_ValueMatches(cdf->fingers->value NF)
            error("CCA: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CCA_ValueMatches(cdf->simM->value M)
            error("CCA: simM read-back mismatch on %s.\n" inst~>name))
        unless(CCA_ValueMatches(cdf->totalM->value totalM)
            error("CCA: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CCA_ValueMatches(cdf->nf->value NF)
            error("CCA: nf read-back mismatch on %s.\n" inst~>name))
        unless(CCA_ValueMatches(cdf->m->value M)
            error("CCA: m read-back mismatch on %s.\n" inst~>name))
        printf("CCA: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CCA_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CCA: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CCA: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CCA: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CCA_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CCA: cannot create %s.\n" name))
        CCA_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CCA_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CCA_PinCenter(inst "G")
        b=CCA_PinCenter(inst "B")
        s=CCA_PinCenter(inst "S")
        d=CCA_PinCenter(inst "D")
        p=CCA_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CCA: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CCA_STUB cadr(p))
                else list(car(p)+CCA_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CCA_STUB)
                else list(car(p) cadr(p)+CCA_STUB))
        )
    )
)

procedure(CCA_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CCA_PinCenter(inst pinName)
        e=CCA_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CCA_WIRE CCA_WIRE 0)
        unless(wire error("CCA: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CCA_WIRE nil)
        unless(label error("CCA: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CCA: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CCA_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CCA: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CCA: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CCA_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CCA: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CCA: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CCA: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CCA_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CCA: cannot create VDC %s.\n" name))
        CCA_SetVDC(inst value)
        plus=CCA_VDCPinCenter(inst "PLUS")
        minus=CCA_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CCA_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CCA_WIRE CCA_WIRE 0)
        unless(wp error("CCA: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CCA_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=CCA_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("CCA: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-CCA_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CCA_WIRE CCA_WIRE 0)
            unless(wm error("CCA: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CCA_WIRE nil)
        )
        printf("CCA: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CCA_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CCA: failed creating external pin %s.\n" name))
        printf("CCA: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CCA_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CCA_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CCA_PinCenter(inst "S")
        d=CCA_PinCenter(inst "D")
        printf("CCA: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CCA_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CCA_PinCenter(inst "S")
                d=CCA_PinCenter(inst "D")
                printf("CCA: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CCA: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateCascodeAmp_NMOS_TotalW_V1_20260817()()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 V_VIN_SRC V_VBN_CAS_SRC V_VBP_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Cascode Amplifier - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=2.00V  VSS=0V  CASCODE BIAS: V_VBN_CAS = 1.05V  V_VBP = 1.25V\n")
        printf("VIN = 0.75V  OUTPUT: VOUT = M2.D/M3.D logical net  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=CCA/CCA\n" CCA_LIB CCA_NMOS)
        printf("DEVICE=CCA/CCA\n" CCA_LIB CCA_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CCA: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CCA: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CCA_OpenMaster(CCA_LIB CCA_NMOS)
        pmos=CCA_OpenMaster(CCA_LIB CCA_PMOS)
        vdcMaster=CCA_OpenMaster("analogLib" "vdc")
        pinMaster=CCA_OpenMaster("basic" "iopin")

        M1=CCA_PlaceMOS(cv nmos "M1" 0:-3 "4u" "240n" "1" "1" "R0")
        M2=CCA_PlaceMOS(cv nmos "M2" 0:3 "4u" "480n" "1" "1" "R0")
        M3=CCA_PlacePMOSAuto(cv pmos "M3" 0:9 "8u" "480n" "1" "1")

        CCA_LabelMOSTerminal(cv M1 "G" "VIN")
        CCA_LabelMOSTerminal(cv M1 "D" "NCAS")
        CCA_LabelMOSTerminal(cv M1 "S" "VSS")
        CCA_LabelMOSTerminal(cv M1 "B" "VSS")
        CCA_LabelMOSTerminal(cv M2 "G" "VBN_CAS")
        CCA_LabelMOSTerminal(cv M2 "D" "VOUT")
        CCA_LabelMOSTerminal(cv M2 "S" "NCAS")
        CCA_LabelMOSTerminal(cv M2 "B" "VSS")
        CCA_LabelMOSTerminal(cv M3 "G" "VBP")
        CCA_LabelMOSTerminal(cv M3 "D" "VOUT")
        CCA_LabelMOSTerminal(cv M3 "S" "VDD")
        CCA_LabelMOSTerminal(cv M3 "B" "VDD")

        V_VIN_SRC=CCA_CreateVDC(cv vdcMaster "V_VIN_SRC" -11:-3 "0.75" "VIN" "VSS")
        V_VBN_CAS_SRC=CCA_CreateVDC(cv vdcMaster "V_VBN_CAS_SRC" -11:3 "1.05" "VBN_CAS" "VSS")
        V_VBP_SRC=CCA_CreateVDC(cv vdcMaster "V_VBP_SRC" -11:9 "1.25" "VBP" "VSS")
        V_VDD_SRC=CCA_CreateVDC(cv vdcMaster "V_VDD_SRC" 11:9 "2.00" "VDD" "VSS")
        V_VSS_SRC=CCA_CreateVDC(cv vdcMaster "V_VSS_SRC" 11:-6 "0.0" "VSS" "VSS")

        CCA_CreatePin(cv pinMaster "VIN" "input" -11:-7)
        CCA_CreatePin(cv pinMaster "VOUT" "output" 10:6)
        CCA_CreatePin(cv pinMaster "VDD" "input" 10:10)
        CCA_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CCA GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
