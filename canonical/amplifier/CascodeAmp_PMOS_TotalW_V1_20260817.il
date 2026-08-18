;=============================================================================
; PMOS-Input Cascode Amplifier - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  PMOS input device (G=VIN D=PCAS S=VDD B=VDD)
;   M2  PMOS cascode device (G=VBP_CAS D=VOUT S=PCAS B=VDD)
;   M3  NMOS current-source load (G=VBN D=VOUT S=VSS B=VSS)
;=============================================================================

(setq PCA_LIB "tsmcN65")
(setq PCA_NMOS "nch")
(setq PCA_PMOS "pch")
(setq PCA_STUB 0.75)
(setq PCA_WIRE 0.0625)
procedure(PCA_ToFloat(val)
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

procedure(PCA_ValueMatches(got expect)
    let((gn en)
        gn=PCA_ToFloat(got)
        en=PCA_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(PCA_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("PCA: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(PCA_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PCA: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("PCA: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("PCA: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("PCA: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=PCA_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(PCA_ValueMatches(cdf->w->value WperFinger)
            error("PCA: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(PCA_ValueMatches(cdf->l->value L)
            error("PCA: L read-back mismatch on %s.\n" inst~>name))
        unless(PCA_ValueMatches(cdf->wf->value TotalW)
            error("PCA: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(PCA_ValueMatches(cdf->fingers->value NF)
            error("PCA: fingers read-back mismatch on %s.\n" inst~>name))
        unless(PCA_ValueMatches(cdf->simM->value M)
            error("PCA: simM read-back mismatch on %s.\n" inst~>name))
        unless(PCA_ValueMatches(cdf->totalM->value totalM)
            error("PCA: totalM read-back mismatch on %s.\n" inst~>name))
        unless(PCA_ValueMatches(cdf->nf->value NF)
            error("PCA: nf read-back mismatch on %s.\n" inst~>name))
        unless(PCA_ValueMatches(cdf->m->value M)
            error("PCA: m read-back mismatch on %s.\n" inst~>name))
        printf("PCA: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(PCA_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PCA: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PCA: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PCA: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PCA_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("PCA: cannot create %s.\n" name))
        PCA_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(PCA_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=PCA_PinCenter(inst "G")
        b=PCA_PinCenter(inst "B")
        s=PCA_PinCenter(inst "S")
        d=PCA_PinCenter(inst "D")
        p=PCA_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("PCA: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-PCA_STUB cadr(p))
                else list(car(p)+PCA_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-PCA_STUB)
                else list(car(p) cadr(p)+PCA_STUB))
        )
    )
)

procedure(PCA_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=PCA_PinCenter(inst pinName)
        e=PCA_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) PCA_WIRE PCA_WIRE 0)
        unless(wire error("PCA: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" PCA_WIRE nil)
        unless(label error("PCA: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("PCA: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(PCA_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("PCA: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("PCA: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(PCA_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("PCA: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("PCA: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("PCA: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(PCA_CreateVDC(cv master gndMaster name xy value plusNet)
    let((inst gnd plus minus ep wp)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("PCA: cannot create VDC %s.\n" name))
        PCA_SetVDC(inst value)
        plus=PCA_VDCPinCenter(inst "PLUS")
        minus=PCA_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+PCA_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) PCA_WIRE PCA_WIRE 0)
        unless(wp error("PCA: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" PCA_WIRE nil)
        gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
        unless(gnd error("PCA: cannot create GND for VDC %s.\n" name))
        printf("PCA: VDC %s = %sV PLUS=%s MINUS=GND\n" name value plusNet)
        inst
    )
)

procedure(PCA_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("PCA: failed creating external pin %s.\n" name))
        printf("PCA: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(PCA_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=PCA_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=PCA_PinCenter(inst "S")
        d=PCA_PinCenter(inst "D")
        printf("PCA: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=PCA_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=PCA_PinCenter(inst "S")
                d=PCA_PinCenter(inst "D")
                printf("PCA: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("PCA: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateCascodeAmp_PMOS_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster gndMaster pinMaster M1 M2 M3  V_VIN_SRC V_VBP_CAS_SRC V_VBN_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" PMOS-Input Cascode Amplifier - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=2.00V  VSS=0V  CASCODE BIAS: V_VBP_CAS = 1.55V  V_VBN = 0.60V\n")
        printf("VIN = 1.25V  OUTPUT: VOUT = M2.D/M3.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=PCA/PCA\n" PCA_LIB PCA_NMOS)
        printf("DEVICE=PCA/PCA\n" PCA_LIB PCA_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("PCA: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("PCA: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=PCA_OpenMaster(PCA_LIB PCA_NMOS)
        pmos=PCA_OpenMaster(PCA_LIB PCA_PMOS)
        vdcMaster=PCA_OpenMaster("analogLib" "vdc")
        gndMaster=PCA_OpenMaster("analogLib" "gnd")
        pinMaster=PCA_OpenMaster("basic" "iopin")

        M1=PCA_PlacePMOSAuto(cv pmos "M1" 0:9 "8u" "240n" "1" "1")
        M2=PCA_PlacePMOSAuto(cv pmos "M2" 0:3 "8u" "480n" "1" "1")
        M3=PCA_PlaceMOS(cv nmos "M3" 0:-3 "8u" "480n" "1" "1" "R0")

        PCA_LabelMOSTerminal(cv M1 "G" "VIN")
        PCA_LabelMOSTerminal(cv M1 "D" "PCAS")
        PCA_LabelMOSTerminal(cv M1 "S" "VDD")
        PCA_LabelMOSTerminal(cv M1 "B" "VDD")
        PCA_LabelMOSTerminal(cv M2 "G" "VBP_CAS")
        PCA_LabelMOSTerminal(cv M2 "D" "VOUT")
        PCA_LabelMOSTerminal(cv M2 "S" "PCAS")
        PCA_LabelMOSTerminal(cv M2 "B" "VDD")
        PCA_LabelMOSTerminal(cv M3 "G" "VBN")
        PCA_LabelMOSTerminal(cv M3 "D" "VOUT")
        PCA_LabelMOSTerminal(cv M3 "S" "VSS")
        PCA_LabelMOSTerminal(cv M3 "B" "VSS")

        V_VIN_SRC=PCA_CreateVDC(cv vdcMaster gndMaster "V_VIN_SRC" -11:9 "1.25" "VIN")
        V_VBP_CAS_SRC=PCA_CreateVDC(cv vdcMaster gndMaster "V_VBP_CAS_SRC" -11:3 "1.55" "VBP_CAS")
        V_VBN_SRC=PCA_CreateVDC(cv vdcMaster gndMaster "V_VBN_SRC" -11:-3 "0.60" "VBN")
        V_VDD_SRC=PCA_CreateVDC(cv vdcMaster gndMaster "V_VDD_SRC" 11:9 "2.00" "VDD")
        V_VSS_SRC=PCA_CreateVDC(cv vdcMaster gndMaster "V_VSS_SRC" 11:-6 "0.0" "VSS")

        PCA_CreatePin(cv pinMaster "VIN" "input" -11:12)
        PCA_CreatePin(cv pinMaster "VOUT" "output" 10:0)
        PCA_CreatePin(cv pinMaster "VDD" "input" 10:12)
        PCA_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" PCA GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
