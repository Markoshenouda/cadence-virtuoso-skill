;=============================================================================
; Super Source Follower - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS follower device (G=VIN D=VDD S=VA B=VSS)
;   M2  NMOS feedback device (G=VA D=VOUT S=VSS B=VSS)
;   M3  NMOS sink device (G=VBN D=VA S=VSS B=VSS)
;   M4  PMOS load device (G=VBP D=VOUT S=VDD B=VDD)
;=============================================================================

(setq SSF_LIB "tsmcN65")
(setq SSF_NMOS "nch")
(setq SSF_PMOS "pch")
(setq SSF_STUB 0.75)
(setq SSF_WIRE 0.0625)
procedure(SSF_ToFloat(val)
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

procedure(SSF_ValueMatches(got expect)
    let((gn en)
        gn=SSF_ToFloat(got)
        en=SSF_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(SSF_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("SSF: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(SSF_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("SSF: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("SSF: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("SSF: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("SSF: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=SSF_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(SSF_ValueMatches(cdf->w->value WperFinger)
            error("SSF: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(SSF_ValueMatches(cdf->l->value L)
            error("SSF: L read-back mismatch on %s.\n" inst~>name))
        unless(SSF_ValueMatches(cdf->wf->value TotalW)
            error("SSF: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(SSF_ValueMatches(cdf->fingers->value NF)
            error("SSF: fingers read-back mismatch on %s.\n" inst~>name))
        unless(SSF_ValueMatches(cdf->simM->value M)
            error("SSF: simM read-back mismatch on %s.\n" inst~>name))
        unless(SSF_ValueMatches(cdf->totalM->value totalM)
            error("SSF: totalM read-back mismatch on %s.\n" inst~>name))
        unless(SSF_ValueMatches(cdf->nf->value NF)
            error("SSF: nf read-back mismatch on %s.\n" inst~>name))
        unless(SSF_ValueMatches(cdf->m->value M)
            error("SSF: m read-back mismatch on %s.\n" inst~>name))
        printf("SSF: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(SSF_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("SSF: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("SSF: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("SSF: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(SSF_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("SSF: cannot create %s.\n" name))
        SSF_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(SSF_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=SSF_PinCenter(inst "G")
        b=SSF_PinCenter(inst "B")
        s=SSF_PinCenter(inst "S")
        d=SSF_PinCenter(inst "D")
        p=SSF_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("SSF: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-SSF_STUB cadr(p))
                else list(car(p)+SSF_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-SSF_STUB)
                else list(car(p) cadr(p)+SSF_STUB))
        )
    )
)

procedure(SSF_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=SSF_PinCenter(inst pinName)
        e=SSF_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) SSF_WIRE SSF_WIRE 0)
        unless(wire error("SSF: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" SSF_WIRE nil)
        unless(label error("SSF: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("SSF: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(SSF_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("SSF: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("SSF: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(SSF_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("SSF: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("SSF: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("SSF: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(SSF_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("SSF: cannot create VDC %s.\n" name))
        SSF_SetVDC(inst value)
        plus=SSF_VDCPinCenter(inst "PLUS")
        minus=SSF_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+SSF_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) SSF_WIRE SSF_WIRE 0)
        unless(wp error("SSF: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" SSF_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=SSF_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("SSF: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-SSF_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) SSF_WIRE SSF_WIRE 0)
            unless(wm error("SSF: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" SSF_WIRE nil)
        )
        printf("SSF: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(SSF_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("SSF: failed creating external pin %s.\n" name))
        printf("SSF: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(SSF_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=SSF_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=SSF_PinCenter(inst "S")
        d=SSF_PinCenter(inst "D")
        printf("SSF: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=SSF_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=SSF_PinCenter(inst "S")
                d=SSF_PinCenter(inst "D")
                printf("SSF: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("SSF: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateSourceFollower_Super_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4  V_VIN_SRC V_VBN_SRC V_VBP_SRC V_VDD_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Super Source Follower - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  VSS=0V  SINK BIAS: V_VBN = 0.60V  LOAD BIAS: V_VBP = 0.90V\n")
        printf("VIN = 1.00V  M2 feedback boosts the follower output drive\n")
        printf("OUTPUT: VOUT = M2.D/M4.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=SSF/SSF\n" SSF_LIB SSF_NMOS)
        printf("DEVICE=SSF/SSF\n" SSF_LIB SSF_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("SSF: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("SSF: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=SSF_OpenMaster(SSF_LIB SSF_NMOS)
        pmos=SSF_OpenMaster(SSF_LIB SSF_PMOS)
        vdcMaster=SSF_OpenMaster("analogLib" "vdc")
        pinMaster=SSF_OpenMaster("basic" "iopin")

        M1=SSF_PlaceMOS(cv nmos "M1" 0:9 "4u" "240n" "1" "1" "R0")
        M2=SSF_PlaceMOS(cv nmos "M2" 6:0 "4u" "480n" "1" "1" "R0")
        M3=SSF_PlaceMOS(cv nmos "M3" -6:0 "6u" "480n" "1" "1" "R0")
        M4=SSF_PlacePMOSAuto(cv pmos "M4" 6:8 "8u" "480n" "1" "1")

        SSF_LabelMOSTerminal(cv M1 "G" "VIN")
        SSF_LabelMOSTerminal(cv M1 "D" "VDD")
        SSF_LabelMOSTerminal(cv M1 "S" "VA")
        SSF_LabelMOSTerminal(cv M1 "B" "VSS")
        SSF_LabelMOSTerminal(cv M2 "G" "VA")
        SSF_LabelMOSTerminal(cv M2 "D" "VOUT")
        SSF_LabelMOSTerminal(cv M2 "S" "VSS")
        SSF_LabelMOSTerminal(cv M2 "B" "VSS")
        SSF_LabelMOSTerminal(cv M3 "G" "VBN")
        SSF_LabelMOSTerminal(cv M3 "D" "VA")
        SSF_LabelMOSTerminal(cv M3 "S" "VSS")
        SSF_LabelMOSTerminal(cv M3 "B" "VSS")
        SSF_LabelMOSTerminal(cv M4 "G" "VBP")
        SSF_LabelMOSTerminal(cv M4 "D" "VOUT")
        SSF_LabelMOSTerminal(cv M4 "S" "VDD")
        SSF_LabelMOSTerminal(cv M4 "B" "VDD")

        V_VIN_SRC=SSF_CreateVDC(cv vdcMaster "V_VIN_SRC" -11:9 "1.00" "VIN" "VSS")
        V_VBN_SRC=SSF_CreateVDC(cv vdcMaster "V_VBN_SRC" -11:0 "0.60" "VBN" "VSS")
        V_VBP_SRC=SSF_CreateVDC(cv vdcMaster "V_VBP_SRC" 11:8 "0.90" "VBP" "VSS")
        V_VDD_SRC=SSF_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:14 "1.50" "VDD" "VSS")
        V_VSS_SRC=SSF_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-8 "0.0" "VSS" "VSS")

        SSF_CreatePin(cv pinMaster "VIN" "input" -11:12)
        SSF_CreatePin(cv pinMaster "VOUT" "output" 11:4)
        SSF_CreatePin(cv pinMaster "VDD" "input" 0:16)
        SSF_CreatePin(cv pinMaster "VSS" "input" 0:-10)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" SSF GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
