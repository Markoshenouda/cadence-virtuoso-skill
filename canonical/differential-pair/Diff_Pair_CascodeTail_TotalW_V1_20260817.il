;=============================================================================
; Differential Pair with Cascoded Tail - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input pair (G=VIP D=VOUTP S=TAIL B=VSS)
;   M2  NMOS input pair (G=VIN D=VOUTN S=TAIL B=VSS)
;   M3  NMOS tail device (G=VBN1 D=TAILN S=VSS B=VSS)
;   M4  NMOS tail cascode (G=VBN2 D=TAIL S=TAILN B=VSS)
;=============================================================================

(setq DCT_LIB "tsmcN65")
(setq DCT_NMOS "nch")
(setq DCT_STUB 0.75)
(setq DCT_WIRE 0.0625)
procedure(DCT_ToFloat(val)
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

procedure(DCT_ValueMatches(got expect)
    let((gn en)
        gn=DCT_ToFloat(got)
        en=DCT_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(DCT_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("DCT: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(DCT_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("DCT: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("DCT: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("DCT: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("DCT: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=DCT_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(DCT_ValueMatches(cdf->w->value WperFinger)
            error("DCT: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(DCT_ValueMatches(cdf->l->value L)
            error("DCT: L read-back mismatch on %s.\n" inst~>name))
        unless(DCT_ValueMatches(cdf->wf->value TotalW)
            error("DCT: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(DCT_ValueMatches(cdf->fingers->value NF)
            error("DCT: fingers read-back mismatch on %s.\n" inst~>name))
        unless(DCT_ValueMatches(cdf->simM->value M)
            error("DCT: simM read-back mismatch on %s.\n" inst~>name))
        unless(DCT_ValueMatches(cdf->totalM->value totalM)
            error("DCT: totalM read-back mismatch on %s.\n" inst~>name))
        unless(DCT_ValueMatches(cdf->nf->value NF)
            error("DCT: nf read-back mismatch on %s.\n" inst~>name))
        unless(DCT_ValueMatches(cdf->m->value M)
            error("DCT: m read-back mismatch on %s.\n" inst~>name))
        printf("DCT: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(DCT_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("DCT: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("DCT: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("DCT: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(DCT_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("DCT: cannot create %s.\n" name))
        DCT_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(DCT_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=DCT_PinCenter(inst "G")
        b=DCT_PinCenter(inst "B")
        s=DCT_PinCenter(inst "S")
        d=DCT_PinCenter(inst "D")
        p=DCT_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("DCT: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-DCT_STUB cadr(p))
                else list(car(p)+DCT_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-DCT_STUB)
                else list(car(p) cadr(p)+DCT_STUB))
        )
    )
)

procedure(DCT_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=DCT_PinCenter(inst pinName)
        e=DCT_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) DCT_WIRE DCT_WIRE 0)
        unless(wire error("DCT: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" DCT_WIRE nil)
        unless(label error("DCT: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("DCT: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(DCT_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("DCT: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("DCT: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(DCT_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("DCT: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("DCT: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("DCT: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(DCT_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("DCT: cannot create VDC %s.\n" name))
        DCT_SetVDC(inst value)
        plus=DCT_VDCPinCenter(inst "PLUS")
        minus=DCT_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+DCT_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) DCT_WIRE DCT_WIRE 0)
        unless(wp error("DCT: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" DCT_WIRE nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("DCT: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-DCT_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) DCT_WIRE DCT_WIRE 0)
            unless(wm error("DCT: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" DCT_WIRE nil)
        )
        printf("DCT: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(DCT_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("DCT: failed creating external pin %s.\n" name))
        printf("DCT: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(CreateDiffPair_CascodeTail_TotalW_V1_20260817()
    let((cv nmos vdcMaster pinMaster M1 M2 M3 M4  V_VBN1_SRC V_VBN2_SRC V_VIP_SRC V_VIN_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Differential Pair with Cascoded Tail - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VSS=0V  TAIL BIASES: V_VBN1 = 0.60V  V_VBN2 = 1.05V\n")
        printf("Cascoded tail raises tail output impedance and PSRR\n")
        printf("OUTPUTS: VOUTP / VOUTN (open drains)  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=DCT/DCT\n" DCT_LIB DCT_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("DCT: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("DCT: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=DCT_OpenMaster(DCT_LIB DCT_NMOS)
        vdcMaster=DCT_OpenMaster("analogLib" "vdc")
        pinMaster=DCT_OpenMaster("basic" "iopin")

        M1=DCT_PlaceMOS(cv nmos "M1" -4:6 "2u" "240n" "1" "1" "R0")
        M2=DCT_PlaceMOS(cv nmos "M2" 4:6 "2u" "240n" "1" "1" "R0")
        M3=DCT_PlaceMOS(cv nmos "M3" 0:-6 "6u" "480n" "1" "1" "R0")
        M4=DCT_PlaceMOS(cv nmos "M4" 0:0 "6u" "480n" "1" "1" "R0")

        DCT_LabelMOSTerminal(cv M1 "G" "VIP")
        DCT_LabelMOSTerminal(cv M1 "D" "VOUTP")
        DCT_LabelMOSTerminal(cv M1 "S" "TAIL")
        DCT_LabelMOSTerminal(cv M1 "B" "VSS")
        DCT_LabelMOSTerminal(cv M2 "G" "VIN")
        DCT_LabelMOSTerminal(cv M2 "D" "VOUTN")
        DCT_LabelMOSTerminal(cv M2 "S" "TAIL")
        DCT_LabelMOSTerminal(cv M2 "B" "VSS")
        DCT_LabelMOSTerminal(cv M3 "G" "VBN1")
        DCT_LabelMOSTerminal(cv M3 "D" "TAILN")
        DCT_LabelMOSTerminal(cv M3 "S" "VSS")
        DCT_LabelMOSTerminal(cv M3 "B" "VSS")
        DCT_LabelMOSTerminal(cv M4 "G" "VBN2")
        DCT_LabelMOSTerminal(cv M4 "D" "TAIL")
        DCT_LabelMOSTerminal(cv M4 "S" "TAILN")
        DCT_LabelMOSTerminal(cv M4 "B" "VSS")

        V_VBN1_SRC=DCT_CreateVDC(cv vdcMaster "V_VBN1_SRC" -11:-6 "0.60" "VBN1" "VSS")
        V_VBN2_SRC=DCT_CreateVDC(cv vdcMaster "V_VBN2_SRC" -11:0 "1.05" "VBN2" "VSS")
        V_VIP_SRC=DCT_CreateVDC(cv vdcMaster "V_VIP_SRC" -11:6 "0.75" "VIP" "VSS")
        V_VIN_SRC=DCT_CreateVDC(cv vdcMaster "V_VIN_SRC" 11:6 "0.75" "VIN" "VSS")
        V_VSS_SRC=DCT_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-10 "0.0" "VSS" "VSS")

        DCT_CreatePin(cv pinMaster "VIP" "input" -9:10)
        DCT_CreatePin(cv pinMaster "VIN" "input" 9:10)
        DCT_CreatePin(cv pinMaster "VOUTP" "output" -7:14)
        DCT_CreatePin(cv pinMaster "VOUTN" "output" 7:14)
        DCT_CreatePin(cv pinMaster "VSS" "input" 0:-12)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" DCT GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
