;=============================================================================
; Two-Stage Miller OTA - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input pair (G=VINP D=MIRROR S=TAIL B=VSS)
;   M2  NMOS input pair (G=VINN D=VOUT1 S=TAIL B=VSS)
;   M3  PMOS diode mirror (G=MIRROR D=MIRROR S=VDD B=VDD)
;   M4  PMOS mirror load (G=MIRROR D=VOUT1 S=VDD B=VDD)
;   M5  NMOS tail source (G=VBN_TAIL D=TAIL S=VSS B=VSS)
;   M6  NMOS second-stage input (G=VOUT1 D=VOUT S=VSS B=VSS)
;   M7  PMOS second-stage load (G=MIRROR D=VOUT S=VDD B=VDD)
;   CC  Miller compensation capacitor (VOUT1 -> VOUT, c=1p)
;=============================================================================

(setq TSM_LIB "tsmcN65")
(setq TSM_NMOS "nch")
(setq TSM_PMOS "pch")
(setq TSM_STUB 0.75)
(setq TSM_WIRE 0.0625)
procedure(TSM_ToFloat(val)
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

procedure(TSM_ValueMatches(got expect)
    let((gn en)
        gn=TSM_ToFloat(got)
        en=TSM_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(TSM_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("TSM: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(TSM_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("TSM: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("TSM: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("TSM: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("TSM: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=TSM_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(TSM_ValueMatches(cdf->w->value WperFinger)
            error("TSM: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(TSM_ValueMatches(cdf->l->value L)
            error("TSM: L read-back mismatch on %s.\n" inst~>name))
        unless(TSM_ValueMatches(cdf->wf->value TotalW)
            error("TSM: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(TSM_ValueMatches(cdf->fingers->value NF)
            error("TSM: fingers read-back mismatch on %s.\n" inst~>name))
        unless(TSM_ValueMatches(cdf->simM->value M)
            error("TSM: simM read-back mismatch on %s.\n" inst~>name))
        unless(TSM_ValueMatches(cdf->totalM->value totalM)
            error("TSM: totalM read-back mismatch on %s.\n" inst~>name))
        unless(TSM_ValueMatches(cdf->nf->value NF)
            error("TSM: nf read-back mismatch on %s.\n" inst~>name))
        unless(TSM_ValueMatches(cdf->m->value M)
            error("TSM: m read-back mismatch on %s.\n" inst~>name))
        printf("TSM: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(TSM_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("TSM: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("TSM: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("TSM: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(TSM_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("TSM: cannot create %s.\n" name))
        TSM_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(TSM_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=TSM_PinCenter(inst "G")
        b=TSM_PinCenter(inst "B")
        s=TSM_PinCenter(inst "S")
        d=TSM_PinCenter(inst "D")
        p=TSM_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("TSM: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-TSM_STUB cadr(p))
                else list(car(p)+TSM_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-TSM_STUB)
                else list(car(p) cadr(p)+TSM_STUB))
        )
    )
)

procedure(TSM_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=TSM_PinCenter(inst pinName)
        e=TSM_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) TSM_WIRE TSM_WIRE 0)
        unless(wire error("TSM: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" TSM_WIRE nil)
        unless(label error("TSM: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("TSM: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(TSM_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("TSM: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("TSM: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(TSM_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("TSM: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("TSM: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("TSM: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(TSM_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("TSM: cannot create VDC %s.\n" name))
        TSM_SetVDC(inst value)
        plus=TSM_VDCPinCenter(inst "PLUS")
        minus=TSM_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+TSM_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) TSM_WIRE TSM_WIRE 0)
        unless(wp error("TSM: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" TSM_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=TSM_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("TSM: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-TSM_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) TSM_WIRE TSM_WIRE 0)
            unless(wm error("TSM: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" TSM_WIRE nil)
        )
        printf("TSM: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(TSM_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("TSM: failed creating external pin %s.\n" name))
        printf("TSM: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(TSM_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=TSM_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=TSM_PinCenter(inst "S")
        d=TSM_PinCenter(inst "D")
        printf("TSM: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=TSM_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=TSM_PinCenter(inst "S")
                d=TSM_PinCenter(inst "D")
                printf("TSM: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("TSM: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)
procedure(TSM_CreateCap(cv master name xy capValue plusNet minusNet)
    let((inst cdf plus minus)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("TSM: cannot create capacitor %s.\n" name))
        cdf=cdfGetInstCDF(inst)
        unless(cdf && cdf->c error("TSM: capacitor CDF parameter c missing on %s.\n" name))
        cdf->c->value=capValue
        plus=TSM_PinCenter(inst "PLUS")
        minus=TSM_PinCenter(inst "MINUS")
        unless(plus && minus error("TSM: capacitor terminals missing on %s.\n" name))
        printf("TSM: CAP %s c=%s PLUS=%s MINUS=%s\n" name capValue plusNet minusNet)
        t
    )
)

procedure(CreateTwoStageMiller_OTA_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4 M5 M6 M7 capMaster CC V_VDD_SRC V_VBN_TAIL_SRC V_VINP_SRC V_VINN_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" Two-Stage Miller OTA - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  VSS=0V  TAIL BIAS: V_VBN_TAIL = 0.60V  INPUTS: 0.75V\n")
        printf("Stage 1: 5T OTA (VOUT1)  Stage 2: common-source output (VOUT)\n")
        printf("CC = 1p Miller compensation between VOUT1 and VOUT\n")
        printf("TEMP=27C  CORNER=TT\n")
        printf("DEVICE=TSM/TSM\n" TSM_LIB TSM_NMOS)
        printf("DEVICE=TSM/TSM\n" TSM_LIB TSM_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("TSM: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("TSM: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=TSM_OpenMaster(TSM_LIB TSM_NMOS)
        pmos=TSM_OpenMaster(TSM_LIB TSM_PMOS)
        vdcMaster=TSM_OpenMaster("analogLib" "vdc")
        capMaster=TSM_OpenMaster("analogLib" "cap")
        pinMaster=TSM_OpenMaster("basic" "iopin")

        M1=TSM_PlaceMOS(cv nmos "M1" -3:0 "2u" "240n" "1" "1" "R0")
        M2=TSM_PlaceMOS(cv nmos "M2" 3:0 "2u" "240n" "1" "1" "R0")
        M3=TSM_PlacePMOSAuto(cv pmos "M3" -3:6 "4u" "480n" "1" "1")
        M4=TSM_PlacePMOSAuto(cv pmos "M4" 3:6 "4u" "480n" "1" "1")
        M5=TSM_PlaceMOS(cv nmos "M5" 0:-6 "6u" "480n" "1" "1" "R0")
        M6=TSM_PlaceMOS(cv nmos "M6" 6:-6 "4u" "480n" "1" "1" "R0")
        M7=TSM_PlacePMOSAuto(cv pmos "M7" 6:2 "8u" "480n" "1" "1")

        TSM_LabelMOSTerminal(cv M1 "G" "VINP")
        TSM_LabelMOSTerminal(cv M1 "D" "MIRROR")
        TSM_LabelMOSTerminal(cv M1 "S" "TAIL")
        TSM_LabelMOSTerminal(cv M1 "B" "VSS")
        TSM_LabelMOSTerminal(cv M2 "G" "VINN")
        TSM_LabelMOSTerminal(cv M2 "D" "VOUT1")
        TSM_LabelMOSTerminal(cv M2 "S" "TAIL")
        TSM_LabelMOSTerminal(cv M2 "B" "VSS")
        TSM_LabelMOSTerminal(cv M3 "G" "MIRROR")
        TSM_LabelMOSTerminal(cv M3 "D" "MIRROR")
        TSM_LabelMOSTerminal(cv M3 "S" "VDD")
        TSM_LabelMOSTerminal(cv M3 "B" "VDD")
        TSM_LabelMOSTerminal(cv M4 "G" "MIRROR")
        TSM_LabelMOSTerminal(cv M4 "D" "VOUT1")
        TSM_LabelMOSTerminal(cv M4 "S" "VDD")
        TSM_LabelMOSTerminal(cv M4 "B" "VDD")
        TSM_LabelMOSTerminal(cv M5 "G" "VBN_TAIL")
        TSM_LabelMOSTerminal(cv M5 "D" "TAIL")
        TSM_LabelMOSTerminal(cv M5 "S" "VSS")
        TSM_LabelMOSTerminal(cv M5 "B" "VSS")
        TSM_LabelMOSTerminal(cv M6 "G" "VOUT1")
        TSM_LabelMOSTerminal(cv M6 "D" "VOUT")
        TSM_LabelMOSTerminal(cv M6 "S" "VSS")
        TSM_LabelMOSTerminal(cv M6 "B" "VSS")
        TSM_LabelMOSTerminal(cv M7 "G" "MIRROR")
        TSM_LabelMOSTerminal(cv M7 "D" "VOUT")
        TSM_LabelMOSTerminal(cv M7 "S" "VDD")
        TSM_LabelMOSTerminal(cv M7 "B" "VDD")

        CC=TSM_CreateCap(cv capMaster "CC" 10:-1 "1p" "VOUT1" "VOUT")

        V_VDD_SRC=TSM_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:12 "1.50" "VDD" "VSS")
        V_VBN_TAIL_SRC=TSM_CreateVDC(cv vdcMaster "V_VBN_TAIL_SRC" -12:0 "0.60" "VBN_TAIL" "VSS")
        V_VINP_SRC=TSM_CreateVDC(cv vdcMaster "V_VINP_SRC" -12:-4 "0.75" "VINP" "VSS")
        V_VINN_SRC=TSM_CreateVDC(cv vdcMaster "V_VINN_SRC" 12:-4 "0.75" "VINN" "VSS")
        V_VSS_SRC=TSM_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-10 "0.0" "VSS" "VSS")

        TSM_CreatePin(cv pinMaster "VINP" "input" -10:-10)
        TSM_CreatePin(cv pinMaster "VINN" "input" -7:-10)
        TSM_CreatePin(cv pinMaster "VOUT" "output" 11:0)
        TSM_CreatePin(cv pinMaster "VDD" "input" 0:14)
        TSM_CreatePin(cv pinMaster "VSS" "input" 0:-12)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" TSM GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
