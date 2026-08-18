;=============================================================================
; gm-C Integrator - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  NMOS input pair (G=VINP D=MIRROR S=TAIL B=VSS)
;   M2  NMOS input pair (G=VINN D=VOUT S=TAIL B=VSS)
;   M3  PMOS diode mirror (G=D=MIRROR S=VDD B=VDD)
;   M4  PMOS mirror load (G=MIRROR D=VOUT S=VDD B=VDD)
;   M5  NMOS tail source (G=VBN_TAIL D=TAIL S=VSS B=VSS)
;   CINT integrating capacitor 1p between VOUT and VSS
;=============================================================================

(setq GMC_LIB "tsmcN65")
(setq GMC_NMOS "nch")
(setq GMC_PMOS "pch")
(setq GMC_STUB 0.75)
(setq GMC_WIRE 0.0625)
procedure(GMC_ToFloat(val)
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

procedure(GMC_ValueMatches(got expect)
    let((gn en)
        gn=GMC_ToFloat(got)
        en=GMC_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(GMC_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("GMC: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(GMC_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("GMC: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("GMC: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("GMC: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("GMC: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=GMC_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(GMC_ValueMatches(cdf->w->value WperFinger)
            error("GMC: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(GMC_ValueMatches(cdf->l->value L)
            error("GMC: L read-back mismatch on %s.\n" inst~>name))
        unless(GMC_ValueMatches(cdf->wf->value TotalW)
            error("GMC: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(GMC_ValueMatches(cdf->fingers->value NF)
            error("GMC: fingers read-back mismatch on %s.\n" inst~>name))
        unless(GMC_ValueMatches(cdf->simM->value M)
            error("GMC: simM read-back mismatch on %s.\n" inst~>name))
        unless(GMC_ValueMatches(cdf->totalM->value totalM)
            error("GMC: totalM read-back mismatch on %s.\n" inst~>name))
        unless(GMC_ValueMatches(cdf->nf->value NF)
            error("GMC: nf read-back mismatch on %s.\n" inst~>name))
        unless(GMC_ValueMatches(cdf->m->value M)
            error("GMC: m read-back mismatch on %s.\n" inst~>name))
        printf("GMC: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(GMC_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("GMC: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("GMC: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("GMC: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(GMC_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("GMC: cannot create %s.\n" name))
        GMC_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(GMC_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=GMC_PinCenter(inst "G")
        b=GMC_PinCenter(inst "B")
        s=GMC_PinCenter(inst "S")
        d=GMC_PinCenter(inst "D")
        p=GMC_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("GMC: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-GMC_STUB cadr(p))
                else list(car(p)+GMC_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-GMC_STUB)
                else list(car(p) cadr(p)+GMC_STUB))
        )
    )
)

procedure(GMC_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=GMC_PinCenter(inst pinName)
        e=GMC_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) GMC_WIRE GMC_WIRE 0)
        unless(wire error("GMC: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" GMC_WIRE nil)
        unless(label error("GMC: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("GMC: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(GMC_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("GMC: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("GMC: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(GMC_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("GMC: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("GMC: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("GMC: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(GMC_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("GMC: cannot create VDC %s.\n" name))
        GMC_SetVDC(inst value)
        plus=GMC_VDCPinCenter(inst "PLUS")
        minus=GMC_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+GMC_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) GMC_WIRE GMC_WIRE 0)
        unless(wp error("GMC: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" GMC_WIRE nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("GMC: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-GMC_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) GMC_WIRE GMC_WIRE 0)
            unless(wm error("GMC: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" GMC_WIRE nil)
        )
        printf("GMC: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(GMC_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("GMC: failed creating external pin %s.\n" name))
        printf("GMC: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(GMC_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=GMC_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=GMC_PinCenter(inst "S")
        d=GMC_PinCenter(inst "D")
        printf("GMC: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=GMC_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=GMC_PinCenter(inst "S")
                d=GMC_PinCenter(inst "D")
                printf("GMC: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("GMC: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)
procedure(GMC_CreateCap(cv master name xy capValue plusNet minusNet)
    let((inst cdf plus minus)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("GMC: cannot create capacitor %s.\n" name))
        cdf=cdfGetInstCDF(inst)
        unless(cdf && cdf->c error("GMC: capacitor CDF parameter c missing on %s.\n" name))
        cdf->c->value=capValue
        plus=GMC_PinCenter(inst "PLUS")
        minus=GMC_PinCenter(inst "MINUS")
        unless(plus && minus error("GMC: capacitor terminals missing on %s.\n" name))
        printf("GMC: CAP %s c=%s PLUS=%s MINUS=%s\n" name capValue plusNet minusNet)
        t
    )
)

procedure(CreateGmC_Integrator_TotalW_V1_20260817()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4 M5 capMaster CINT V_VDD_SRC V_VBN_TAIL_SRC V_VINP_SRC V_VINN_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" gm-C Integrator - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  TAIL BIAS: V_VBN_TAIL = 0.60V  INPUTS: 0.75V\n")
        printf("5T transconductor driving an integrating capacitor (CINT = 1p)\n")
        printf("OUTPUT: VOUT = M2.D/M4.D  TEMP=27C  CORNER=TT\n")
        printf("DEVICE=GMC/GMC\n" GMC_LIB GMC_NMOS)
        printf("DEVICE=GMC/GMC\n" GMC_LIB GMC_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("GMC: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("GMC: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=GMC_OpenMaster(GMC_LIB GMC_NMOS)
        pmos=GMC_OpenMaster(GMC_LIB GMC_PMOS)
        vdcMaster=GMC_OpenMaster("analogLib" "vdc")
        capMaster=GMC_OpenMaster("analogLib" "cap")
        pinMaster=GMC_OpenMaster("basic" "iopin")

        M1=GMC_PlaceMOS(cv nmos "M1" -3:0 "2u" "240n" "1" "1" "R0")
        M2=GMC_PlaceMOS(cv nmos "M2" 3:0 "2u" "240n" "1" "1" "R0")
        M3=GMC_PlacePMOSAuto(cv pmos "M3" -3:6 "4u" "480n" "1" "1")
        M4=GMC_PlacePMOSAuto(cv pmos "M4" 3:6 "4u" "480n" "1" "1")
        M5=GMC_PlaceMOS(cv nmos "M5" 0:-6 "6u" "480n" "1" "1" "R0")

        GMC_LabelMOSTerminal(cv M1 "G" "VINP")
        GMC_LabelMOSTerminal(cv M1 "D" "MIRROR")
        GMC_LabelMOSTerminal(cv M1 "S" "TAIL")
        GMC_LabelMOSTerminal(cv M1 "B" "VSS")
        GMC_LabelMOSTerminal(cv M2 "G" "VINN")
        GMC_LabelMOSTerminal(cv M2 "D" "VOUT")
        GMC_LabelMOSTerminal(cv M2 "S" "TAIL")
        GMC_LabelMOSTerminal(cv M2 "B" "VSS")
        GMC_LabelMOSTerminal(cv M3 "G" "MIRROR")
        GMC_LabelMOSTerminal(cv M3 "D" "MIRROR")
        GMC_LabelMOSTerminal(cv M3 "S" "VDD")
        GMC_LabelMOSTerminal(cv M3 "B" "VDD")
        GMC_LabelMOSTerminal(cv M4 "G" "MIRROR")
        GMC_LabelMOSTerminal(cv M4 "D" "VOUT")
        GMC_LabelMOSTerminal(cv M4 "S" "VDD")
        GMC_LabelMOSTerminal(cv M4 "B" "VDD")
        GMC_LabelMOSTerminal(cv M5 "G" "VBN_TAIL")
        GMC_LabelMOSTerminal(cv M5 "D" "TAIL")
        GMC_LabelMOSTerminal(cv M5 "S" "VSS")
        GMC_LabelMOSTerminal(cv M5 "B" "VSS")

        CINT=GMC_CreateCap(cv capMaster "CINT" 10:0 "1p" "VOUT" "VSS")

        V_VDD_SRC=GMC_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:12 "1.50" "VDD" "VSS")
        V_VBN_TAIL_SRC=GMC_CreateVDC(cv vdcMaster "V_VBN_TAIL_SRC" -12:0 "0.60" "VBN_TAIL" "VSS")
        V_VINP_SRC=GMC_CreateVDC(cv vdcMaster "V_VINP_SRC" -12:-4 "0.75" "VINP" "VSS")
        V_VINN_SRC=GMC_CreateVDC(cv vdcMaster "V_VINN_SRC" 12:-4 "0.75" "VINN" "VSS")
        V_VSS_SRC=GMC_CreateVDC(cv vdcMaster "V_VSS_SRC" 0:-10 "0.0" "VSS" "VSS")

        GMC_CreatePin(cv pinMaster "VINP" "input" -10:-10)
        GMC_CreatePin(cv pinMaster "VINN" "input" -7:-10)
        GMC_CreatePin(cv pinMaster "VOUT" "output" 9:8)
        GMC_CreatePin(cv pinMaster "VDD" "input" 0:14)
        GMC_CreatePin(cv pinMaster "VSS" "input" 0:-12)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" GMC GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
