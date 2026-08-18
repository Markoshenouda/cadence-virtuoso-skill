;=============================================================================
; PMOS Current Mirror - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL - PDK target: tsmcN65 - 2026-08-17
;
; TotalW-first generator: W/finger = TotalW/NF, totalM = NF*M.
; Routing contract: one isolated labeled stub per terminal; no
; device-to-device wires. Schematic candidate; electrical performance
; is NOT verified. All source text is ASCII-only.
;
;   M1  PMOS diode-connected reference (G=IREF D=IREF S=VDD B=VDD)
;   M2  PMOS output device            (G=IREF D=IOUT S=VDD B=VDD)
;=============================================================================

(setq CPM_LIB "tsmcN65")
(setq CPM_NMOS "nch")
(setq CPM_PMOS "pch")
(setq CPM_STUB 0.75)
(setq CPM_WIRE 0.0625)
procedure(CPM_ToFloat(val)
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

procedure(CPM_ValueMatches(got expect)
    let((gn en)
        gn=CPM_ToFloat(got)
        en=CPM_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

procedure(CPM_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CPM: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

procedure(CPM_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CPM: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CPM: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CPM: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CPM: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CPM_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CPM_ValueMatches(cdf->w->value WperFinger)
            error("CPM: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CPM_ValueMatches(cdf->l->value L)
            error("CPM: L read-back mismatch on %s.\n" inst~>name))
        unless(CPM_ValueMatches(cdf->wf->value TotalW)
            error("CPM: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CPM_ValueMatches(cdf->fingers->value NF)
            error("CPM: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CPM_ValueMatches(cdf->simM->value M)
            error("CPM: simM read-back mismatch on %s.\n" inst~>name))
        unless(CPM_ValueMatches(cdf->totalM->value totalM)
            error("CPM: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CPM_ValueMatches(cdf->nf->value NF)
            error("CPM: nf read-back mismatch on %s.\n" inst~>name))
        unless(CPM_ValueMatches(cdf->m->value M)
            error("CPM: m read-back mismatch on %s.\n" inst~>name))
        printf("CPM: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

procedure(CPM_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CPM: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CPM: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CPM: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CPM_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CPM: cannot create %s.\n" name))
        CPM_SetMOS(inst TotalW L NF M)
        inst
    )
)

procedure(CPM_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CPM_PinCenter(inst "G")
        b=CPM_PinCenter(inst "B")
        s=CPM_PinCenter(inst "S")
        d=CPM_PinCenter(inst "D")
        p=CPM_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CPM: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CPM_STUB cadr(p))
                else list(car(p)+CPM_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CPM_STUB)
                else list(car(p) cadr(p)+CPM_STUB))
        )
    )
)

procedure(CPM_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CPM_PinCenter(inst pinName)
        e=CPM_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CPM_WIRE CPM_WIRE 0)
        unless(wire error("CPM: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CPM_WIRE nil)
        unless(label error("CPM: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CPM: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

procedure(CPM_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CPM: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CPM: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CPM_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CPM: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CPM: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CPM: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CPM_CreateVDC(cv master name xy value plusNet minusNet)
    let((inst plus minus ep em wp wm gndMaster gndInst)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CPM: cannot create VDC %s.\n" name))
        CPM_SetVDC(inst value)
        plus=CPM_VDCPinCenter(inst "PLUS")
        minus=CPM_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CPM_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CPM_WIRE CPM_WIRE 0)
        unless(wp error("CPM: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CPM_WIRE nil)
        if(equal(plusNet "VSS") then
            gndMaster=CPM_OpenMaster("analogLib" "gnd")
            gndInst=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gndInst error("CPM: cannot create GND instance for %s.\n" name))
        else
            em=list(car(minus) cadr(minus)-CPM_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CPM_WIRE CPM_WIRE 0)
            unless(wm error("CPM: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CPM_WIRE nil)
        )
        printf("CPM: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CPM_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CPM: failed creating external pin %s.\n" name))
        printf("CPM: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)
procedure(CPM_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=CPM_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=CPM_PinCenter(inst "S")
        d=CPM_PinCenter(inst "D")
        printf("CPM: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=CPM_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=CPM_PinCenter(inst "S")
                d=CPM_PinCenter(inst "D")
                printf("CPM: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("CPM: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

procedure(CreateCurrentMirror_PMOS_TotalW_V1_20260817()()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 V_VDD_SRC V_IREF_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" PMOS Current Mirror - TotalW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VDD=1.50V  VSS=0V  REFERENCE DRIVE: V_IREF = 0.80V\n")
        printf("PMOS orientation selected from actual S/D geometry\n")
        printf("RATIO: 1:1 default  OUTPUT: IOUT = M2.D logical net  TEMP=27C\n")
        printf("DEVICE=CPM/CPM\n" CPM_LIB CPM_NMOS)
        printf("DEVICE=CPM/CPM\n" CPM_LIB CPM_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CPM: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CPM: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CPM_OpenMaster(CPM_LIB CPM_NMOS)
        pmos=CPM_OpenMaster(CPM_LIB CPM_PMOS)
        vdcMaster=CPM_OpenMaster("analogLib" "vdc")
        pinMaster=CPM_OpenMaster("basic" "iopin")

        M1=CPM_PlacePMOSAuto(cv pmos "M1" -3:0 "8u" "480n" "1" "1")
        M2=CPM_PlacePMOSAuto(cv pmos "M2" 3:0 "8u" "480n" "1" "1")

        CPM_LabelMOSTerminal(cv M1 "G" "IREF")
        CPM_LabelMOSTerminal(cv M1 "D" "IREF")
        CPM_LabelMOSTerminal(cv M1 "S" "VDD")
        CPM_LabelMOSTerminal(cv M1 "B" "VDD")
        CPM_LabelMOSTerminal(cv M2 "G" "IREF")
        CPM_LabelMOSTerminal(cv M2 "D" "IOUT")
        CPM_LabelMOSTerminal(cv M2 "S" "VDD")
        CPM_LabelMOSTerminal(cv M2 "B" "VDD")

        V_VDD_SRC=CPM_CreateVDC(cv vdcMaster "V_VDD_SRC" 0:8 "1.50" "VDD" "VSS")
        V_IREF_SRC=CPM_CreateVDC(cv vdcMaster "V_IREF_SRC" -10:0 "0.80" "IREF" "VSS")
        V_VSS_SRC=CPM_CreateVDC(cv vdcMaster "V_VSS_SRC" 10:-4 "0.0" "VSS" "VSS")

        CPM_CreatePin(cv pinMaster "IREF" "input" -9:-4)
        CPM_CreatePin(cv pinMaster "IOUT" "output" 9:-4)
        CPM_CreatePin(cv pinMaster "VDD" "input" 0:10)
        CPM_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CPM GENERATOR COMPLETED\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
