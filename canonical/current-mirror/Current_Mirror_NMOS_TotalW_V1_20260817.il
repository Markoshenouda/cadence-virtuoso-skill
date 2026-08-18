;=============================================================================
; Simple Current Mirror Generator - TotalW V1 - 2026-08-17
; Cadence Virtuoso IC6.1.7 / SKILL
; PDK target: tsmcN65
;
; Purpose:
;   Generate a complete simple NMOS current mirror schematic in an EMPTY
;   editable schematic. The generator is TotalW-first and uses repeated net
;   labels rather than long device-to-device wires.
;
; Important:
;   This file generates a schematic candidate. Electrical performance must
;   still be verified with Spectre.
;
; Topology:
;   M1   NMOS diode-connected reference device (gate tied to drain on IREF)
;   M2   NMOS output device (gate on IREF, drain on IOUT)
;
;   The mirror ratio is set by the M1/M2 sizing (TotalW, NF, M). The default
;   sizing is 1:1.
;
; Device master:
;   tsmcN65/nch - the repository-verified core NMOS device. The TotalW CDF
;   contract (w, l, wf, fingers, simM, totalM, nf, m) is verified for
;   tsmcN65 in tests/mos-sizing/TotalW_CDF_Assignment_Complete_Test_V5.
;
; Structure follows the Folded-Cascode TotalW V1 generator: explicit 8-field
; CDF assignment with numeric-tolerant read-back, one isolated labeled stub
; per terminal, explicit 0-V VSS source, schCheck before save.
;
; All source text is ASCII-only for the IC6.1.7 SKILL reader.
;=============================================================================

(setq CMW_LIB "tsmcN65")
(setq CMW_NMOS "nch")
(setq CMW_STUB 0.75)
(setq CMW_WIRE 0.0625)

;-----------------------------------------------------------------------------
; Numeric conversion helper.
;-----------------------------------------------------------------------------
procedure(CMW_ToFloat(val)
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

procedure(CMW_ValueMatches(got expect)
    let((gn en)
        gn=CMW_ToFloat(got)
        en=CMW_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

;-----------------------------------------------------------------------------
; Open a symbol master.
;-----------------------------------------------------------------------------
procedure(CMW_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("CMW: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

;-----------------------------------------------------------------------------
; Set the complete TotalW CDF state used by the repository.
;-----------------------------------------------------------------------------
procedure(CMW_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CMW: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("CMW: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("CMW: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("CMW: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=CMW_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(CMW_ValueMatches(cdf->w->value WperFinger)
            error("CMW: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(CMW_ValueMatches(cdf->l->value L)
            error("CMW: L read-back mismatch on %s.\n" inst~>name))
        unless(CMW_ValueMatches(cdf->wf->value TotalW)
            error("CMW: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(CMW_ValueMatches(cdf->fingers->value NF)
            error("CMW: fingers read-back mismatch on %s.\n" inst~>name))
        unless(CMW_ValueMatches(cdf->simM->value M)
            error("CMW: simM read-back mismatch on %s.\n" inst~>name))
        unless(CMW_ValueMatches(cdf->totalM->value totalM)
            error("CMW: totalM read-back mismatch on %s.\n" inst~>name))
        unless(CMW_ValueMatches(cdf->nf->value NF)
            error("CMW: nf read-back mismatch on %s.\n" inst~>name))
        unless(CMW_ValueMatches(cdf->m->value M)
            error("CMW: m read-back mismatch on %s.\n" inst~>name))
        printf("CMW: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

;-----------------------------------------------------------------------------
; Get transformed MOS terminal center.
;-----------------------------------------------------------------------------
procedure(CMW_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CMW: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CMW: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CMW: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

;-----------------------------------------------------------------------------
; Create a MOS instance and apply TotalW sizing.
;-----------------------------------------------------------------------------
procedure(CMW_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("CMW: cannot create %s.\n" name))
        CMW_SetMOS(inst TotalW L NF M)
        inst
    )
)

;-----------------------------------------------------------------------------
; Determine an outward stub endpoint from actual terminal geometry.
;-----------------------------------------------------------------------------
procedure(CMW_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=CMW_PinCenter(inst "G")
        b=CMW_PinCenter(inst "B")
        s=CMW_PinCenter(inst "S")
        d=CMW_PinCenter(inst "D")
        p=CMW_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("CMW: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-CMW_STUB cadr(p))
                else list(car(p)+CMW_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-CMW_STUB)
                else list(car(p) cadr(p)+CMW_STUB))
        )
    )
)

;-----------------------------------------------------------------------------
; Create one isolated wire stub and one net label.
;-----------------------------------------------------------------------------
procedure(CMW_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=CMW_PinCenter(inst pinName)
        e=CMW_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) CMW_WIRE CMW_WIRE 0)
        unless(wire error("CMW: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" CMW_WIRE nil)
        unless(label error("CMW: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("CMW: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

;-----------------------------------------------------------------------------
; VDC helpers.
;-----------------------------------------------------------------------------
procedure(CMW_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("CMW: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("CMW: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(CMW_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("CMW: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("CMW: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("CMW: VDC figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(CMW_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("CMW: cannot create VDC %s.\n" name))
        CMW_SetVDC(inst value)
        plus=CMW_VDCPinCenter(inst "PLUS")
        minus=CMW_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+CMW_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) CMW_WIRE CMW_WIRE 0)
        unless(wp error("CMW: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" CMW_WIRE nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("CMW: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-CMW_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) CMW_WIRE CMW_WIRE 0)
            unless(wm error("CMW: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" CMW_WIRE nil)
        )
        printf("CMW: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(CMW_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("CMW: failed creating external pin %s.\n" name))
        printf("CMW: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

;-----------------------------------------------------------------------------
; Main generator.
;-----------------------------------------------------------------------------
procedure(CreateCurrentMirror_NMOS_TotalW_V1_20260817()
    let((cv nmos vdcMaster pinMaster M1 M2 V_IREF_SRC V_VSS_SRC)

        printf("\n============================================================\n")
        printf(" SIMPLE CURRENT MIRROR - TOTALW V1 - 2026-08-17\n")
        printf("============================================================\n")
        printf("VSS=0V  VDD=not used (NMOS mirror)\n")
        printf("REFERENCE DRIVE: V_IREF = 0.75V (PLUS=IREF MINUS=VSS)\n")
        printf("RATIO: 1:1 default; set by M1/M2 TotalW/NF/M\n")
        printf("TEMP=27C  CORNER=TT\n")
        printf("DEVICE=%s/%s\n" CMW_LIB CMW_NMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("CMW: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("CMW: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=CMW_OpenMaster(CMW_LIB CMW_NMOS)
        vdcMaster=CMW_OpenMaster("analogLib" "vdc")
        pinMaster=CMW_OpenMaster("basic" "iopin")

        ; Diode-connected reference device (gate and drain both on IREF).
        M1=CMW_PlaceMOS(cv nmos "M1" -3:0 "4u" "480n" "1" "1" "R0")

        ; Output device (gate on IREF, drain on IOUT).
        M2=CMW_PlaceMOS(cv nmos "M2" 3:0 "4u" "480n" "1" "1" "R0")

        ; Reference branch: diode connection by repeated IREF labels.
        CMW_LabelMOSTerminal(cv M1 "G" "IREF")
        CMW_LabelMOSTerminal(cv M1 "D" "IREF")
        CMW_LabelMOSTerminal(cv M1 "S" "VSS")
        CMW_LabelMOSTerminal(cv M1 "B" "VSS")

        ; Output branch.
        CMW_LabelMOSTerminal(cv M2 "G" "IREF")
        CMW_LabelMOSTerminal(cv M2 "D" "IOUT")
        CMW_LabelMOSTerminal(cv M2 "S" "VSS")
        CMW_LabelMOSTerminal(cv M2 "B" "VSS")

        ; Reference drive and explicit 0-V VSS source.
        V_IREF_SRC=CMW_CreateVDC(cv vdcMaster "V_IREF_SRC" -8:6 "0.75" "IREF" "VSS")
        V_VSS_SRC=CMW_CreateVDC(cv vdcMaster "V_VSS_SRC" 8:6 "0.0" "VSS" "VSS")

        ; User-facing ports.
        CMW_CreatePin(cv pinMaster "IREF" "input" -8:-4)
        CMW_CreatePin(cv pinMaster "IOUT" "output" 8:-4)
        CMW_CreatePin(cv pinMaster "VSS" "input" 0:-8)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" CMW TOTALW V1 GENERATOR COMPLETED\n")
        printf(" MOS COUNT : M1..M2\n")
        printf(" DIODE     : M1 gate and drain both labeled IREF\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" BIAS      : analogLib/vdc generated (V_IREF, explicit VSS)\n")
        printf(" OUTPUT    : IOUT = M2.D logical net\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
