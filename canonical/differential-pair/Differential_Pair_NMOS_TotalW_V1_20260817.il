;=============================================================================
; Differential Pair - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input device  (G=VIP  D=VOUTP S=TAIL B=VSS)
;   M2  NMOS input device  (G=VIN  D=VOUTN S=TAIL B=VSS)
;   M3  NMOS tail source   (G=VBN_TAIL D=TAIL S=VSS B=VSS)
;=============================================================================

(setq CDP_LIB "tsmcN65")
(setq CDP_NMOS "nch")
(setq CDP_STUB 0.75)
(setq CDP_WIRE 0.0625)
procedure(CDP_ToFloat(val)
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

procedure(CDP_ValueMatches(got expect)
    let((gn en)
        gn=CDP_ToFloat(got)
        en=CDP_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CDP_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CDP: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CDP_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CDP: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CDP: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CDP: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CDP: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CDP_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CDP_ValueMatches(cdf->w->value WperFinger)
            error("CDP: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CDP_ValueMatches(cdf->l->value L)
            error("CDP: L read-back mismatch on %s.\n" inst~>name))
        unless(CDP_ValueMatches(cdf->wf->value TotalW)
            error("CDP: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CDP_ValueMatches(cdf->fingers->value NF)
            error("CDP: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CDP_ValueMatches(cdf->simM->value M)
            error("CDP: simM read-back mismatch on %s.\n" inst~>name))
        unless(CDP_ValueMatches(cdf->totalM->value totalM)
            error("CDP: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CDP_ValueMatches(cdf->nf->value NF)
            error("CDP: nf read-back mismatch on %s.\n" inst~>name))
        unless(CDP_ValueMatches(cdf->m->value M)
            error("CDP: m read-back mismatch on %s.\n" inst~>name))
        printf("CDP: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CDP_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CDP: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CDP: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CDP: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CDP_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CDP: cannot create %s.\n" name))
        CDP_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CDP_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CDP_PinCenter(inst "G")
        b=CDP_PinCenter(inst "B")
        s=CDP_PinCenter(inst "S")
        d=CDP_PinCenter(inst "D")
        p=CDP_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CDP: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CDP_STUB cadr(p))
                else list(car(p)+CDP_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CDP_STUB)
                else list(car(p) cadr(p)+CDP_STUB))
        )
    )
)

procedure(CDP_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CDP_PinCenter(inst pinName)
        e=CDP_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CDP_WIRE CDP_WIRE 0)
        unless(wire error("CDP: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CDP_WIRE nil)
        unless(label error("CDP: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CDP: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CDP_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CDP: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CDP: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CDP_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CDP: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CDP: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CDP: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CDP_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CDP: cannot create VDC %s.\n" name))
        CDP_SetVDC(inst value)
        plus=CDP_VDCPinCenter(inst "PLUS")
        minus=CDP_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CDP_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CDP_WIRE CDP_WIRE 0)
        unless(wp error("CDP: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CDP_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=CDP_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("CDP: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-CDP_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CDP_WIRE CDP_WIRE 0)
            unless(wm error("CDP: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CDP_WIRE nil)
        )
        printf("CDP: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CDP_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CDP: failed creating external pin %s.\n" name))
        printf("CDP: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

procedure(CreateDiffPair_NMOS_TotalW_V1_20260817()()
    let((cv nmos vdcMaster pinMaster M1 M2 M3 V_VIP_SRC V_VIN_SRC V_VBN_TAIL_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Differential Pair - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VSS=0V  TAIL BIAS: V_VBN_TAIL = 0.60V\n")
        printf("INPUTS: VIP = VIN = 0.75V  OUTPUTS: VOUTP / VOUTN (drains)\n")
        printf("TEMP=27C  CORNER=TT  RATIO: 1:1 default\n")
        printf("DEVICE=CDP/CDP\n" CDP_LIB CDP_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CDP: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CDP: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CDP_OpenMaster(CDP_LIB CDP_NMOS)
        vdcMaster=CDP_OpenMaster("analogLib" "vdc")
        pinMaster=CDP_OpenMaster("basic" "iopin")

        M1=CDP_PlaceMOS(cv nmos "M1" -3:0 "4u" "240n" "1" "1" "R0")
        M2=CDP_PlaceMOS(cv nmos "M2" 3:0 "4u" "240n" "1" "1" "R0")
        M3=CDP_PlaceMOS(cv nmos "M3" 0:-6 "6u" "480n" "1" "1" "R0")

        CDP_LabelMOSTerminal(cv M1 "G" "VIP")
        CDP_LabelMOSTerminal(cv M1 "D" "VOUTP")
        CDP_LabelMOSTerminal(cv M1 "S" "TAIL")
        CDP_LabelMOSTerminal(cv M1 "B" "VSS")
        CDP_LabelMOSTerminal(cv M2 "G" "VIN")
        CDP_LabelMOSTerminal(cv M2 "D" "VOUTN")
        CDP_LabelMOSTerminal(cv M2 "S" "TAIL")
        CDP_LabelMOSTerminal(cv M2 "B" "VSS")
        CDP_LabelMOSTerminal(cv M3 "G" "VBN_TAIL")
        CDP_LabelMOSTerminal(cv M3 "D" "TAIL")
        CDP_LabelMOSTerminal(cv M3 "S" "VSS")
        CDP_LabelMOSTerminal(cv M3 "B" "VSS")

        V_VIP_SRC=CDP_CreateVDC(cv vdcMaster "V_VIP_SRC" -12:6 "0.75" "VIP" "VSS")
        V_VIN_SRC=CDP_CreateVDC(cv vdcMaster "V_VIN_SRC" -12:3 "0.75" "VIN" "VSS")
        V_VBN_TAIL_SRC=CDP_CreateVDC(cv vdcMaster "V_VBN_TAIL_SRC" -12:0 "0.60" "VBN_TAIL" "VSS")
        V_VSS_SRC=CDP_CreateVDC(cv vdcMaster "V_VSS_SRC" 12:0 "0.0" "VSS" "VSS")

        CDP_CreatePin(cv pinMaster "VIP" "input" -10:-6)
        CDP_CreatePin(cv pinMaster "VIN" "input" -7:-6)
        CDP_CreatePin(cv pinMaster "VOUTP" "output" 7:4)
        CDP_CreatePin(cv pinMaster "VOUTN" "output" 10:4)
        CDP_CreatePin(cv pinMaster "VSS" "input" 0:-10)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CDP GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
