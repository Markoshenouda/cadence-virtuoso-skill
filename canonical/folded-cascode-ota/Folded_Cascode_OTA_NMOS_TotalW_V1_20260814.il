;=============================================================================
; Folded-Cascode OTA Generator - TotalW V1 - 2026-08-14
; Cadence Virtuoso IC6.1.7 / SKILL
; PDK target: tsmcN65
;
; Purpose:
;   Generate a complete folded-cascode OTA schematic in an EMPTY editable
;   schematic. The generator is TotalW-first and uses repeated net labels
;   rather than long device-to-device wires.
;
; Important:
;   This file generates a schematic candidate. Electrical performance must
;   still be verified with Spectre.
;
; Topology:
;   M1/M2   NMOS differential input pair
;   M3/M4   PMOS top devices
;   M5/M6   PMOS folded devices
;   M7/M8   NMOS folded devices
;   M9/M10  NMOS lower sinks
;   M11     NMOS tail current source
;
; The previous V1 failed because pch_25/MX produced S below D in the actual
; target PDK. This revision does NOT assume a fixed PMOS orientation. It
; creates each PMOS, measures the transformed S/D pin coordinates, and keeps
; the orientation that puts S above D. This makes the generator follow the
; actual PDK symbol geometry instead of a guessed orientation convention.
;
; All source text is ASCII-only for the IC6.1.7 SKILL reader.
;=============================================================================

(setq FCW_LIB "tsmcN65")
(setq FCW_NMOS "nch_25")
(setq FCW_PMOS "pch_25")
(setq FCW_STUB 0.75)
(setq FCW_WIRE 0.0625)

;-----------------------------------------------------------------------------
; Numeric conversion helper.
;-----------------------------------------------------------------------------
procedure(FCW_ToFloat(val)
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

procedure(FCW_ValueMatches(got expect)
    let((gn en)
        gn=FCW_ToFloat(got)
        en=FCW_ToFloat(expect)
        if(gn && en
            then abs(gn-en) < 1e-12 * max(1.0 abs(en))
            else equal(got expect)
        )
    )
)

;-----------------------------------------------------------------------------
; Open a symbol master.
;-----------------------------------------------------------------------------
procedure(FCW_OpenMaster(lib cell)
    let((master)
        master=dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master
            error("FCW: cannot open %s/%s/symbol.\n" lib cell)
        )
        master
    )
)

;-----------------------------------------------------------------------------
; Set the complete TotalW CDF state used by the repository.
;-----------------------------------------------------------------------------
procedure(FCW_SetMOS(inst TotalW L NF M)
    let((cdf nfInt mInt WperFinger totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("FCW: CDF missing on %s.\n" inst~>name))
        unless(cdf->w && cdf->l && cdf->wf && cdf->fingers && cdf->simM && cdf->totalM && cdf->nf && cdf->m
            error("FCW: incomplete MOS CDF on %s.\n" inst~>name))
        nfInt=atoi(NF)
        mInt=atoi(M)
        unless(nfInt>0 error("FCW: NF must be >= 1 on %s.\n" inst~>name))
        unless(mInt>0 error("FCW: M must be >= 1 on %s.\n" inst~>name))
        WperFinger=FCW_ToFloat(TotalW)/float(nfInt)
        totalM=sprintf(nil "%d" (nfInt*mInt))
        cdf->w->value=sprintf(nil "%g" WperFinger)
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M
        unless(FCW_ValueMatches(cdf->w->value WperFinger)
            error("FCW: W/finger read-back mismatch on %s.\n" inst~>name))
        unless(FCW_ValueMatches(cdf->l->value L)
            error("FCW: L read-back mismatch on %s.\n" inst~>name))
        unless(FCW_ValueMatches(cdf->wf->value TotalW)
            error("FCW: TotalW read-back mismatch on %s.\n" inst~>name))
        unless(FCW_ValueMatches(cdf->fingers->value NF)
            error("FCW: fingers read-back mismatch on %s.\n" inst~>name))
        unless(FCW_ValueMatches(cdf->simM->value M)
            error("FCW: simM read-back mismatch on %s.\n" inst~>name))
        unless(FCW_ValueMatches(cdf->totalM->value totalM)
            error("FCW: totalM read-back mismatch on %s.\n" inst~>name))
        unless(FCW_ValueMatches(cdf->nf->value NF)
            error("FCW: nf read-back mismatch on %s.\n" inst~>name))
        unless(FCW_ValueMatches(cdf->m->value M)
            error("FCW: m read-back mismatch on %s.\n" inst~>name))
        printf("FCW: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s totalM=%s\n"
            inst~>name TotalW cdf->w->value L NF M totalM)
        t
    )
)

;-----------------------------------------------------------------------------
; Get transformed MOS terminal center.
;-----------------------------------------------------------------------------
procedure(FCW_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("FCW: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("FCW: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        unless(fig error("FCW: figure missing on %s.%s.\n" inst~>name pinName))
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

;-----------------------------------------------------------------------------
; Create a MOS instance and apply TotalW sizing.
;-----------------------------------------------------------------------------
procedure(FCW_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("FCW: cannot create %s.\n" name))
        FCW_SetMOS(inst TotalW L NF M)
        inst
    )
)

;-----------------------------------------------------------------------------
; PMOS orientation is selected from actual transformed pin geometry.
; In the user's tsmcN65 environment MX was observed to give S below D, so
; R0 is tried first. If a future PDK revision differs, MX is tried as a
; fallback instead of silently creating a reversed PMOS.
;-----------------------------------------------------------------------------
procedure(FCW_PlacePMOSAuto(cv master name xy TotalW L NF M)
    let((inst s d)
        inst=FCW_PlaceMOS(cv master name xy TotalW L NF M "R0")
        s=FCW_PinCenter(inst "S")
        d=FCW_PinCenter(inst "D")
        printf("FCW: PMOS %s candidate orient=%L S=%L D=%L\n" name inst~>orient s d)
        if(cadr(s)>cadr(d)
            then inst
            else
                dbDeleteObject(inst)
                inst=FCW_PlaceMOS(cv master name xy TotalW L NF M "MX")
                s=FCW_PinCenter(inst "S")
                d=FCW_PinCenter(inst "D")
                printf("FCW: PMOS %s fallback orient=%L S=%L D=%L\n" name inst~>orient s d)
                unless(cadr(s)>cadr(d)
                    error("FCW: PMOS %s cannot place source above drain in R0 or MX.\n" name))
                inst
        )
    )
)

;-----------------------------------------------------------------------------
; Determine an outward stub endpoint from actual terminal geometry.
;-----------------------------------------------------------------------------
procedure(FCW_StubEnd(inst pinName)
    let((g b s d p ref dx dy)
        g=FCW_PinCenter(inst "G")
        b=FCW_PinCenter(inst "B")
        s=FCW_PinCenter(inst "S")
        d=FCW_PinCenter(inst "D")
        p=FCW_PinCenter(inst pinName)
        cond(
            (equal(pinName "G") ref=b)
            (equal(pinName "B") ref=g)
            (equal(pinName "S") ref=d)
            (equal(pinName "D") ref=s)
            (t error("FCW: unsupported terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        if(abs(dx)>=abs(dy)
            then if(dx<0.0
                then list(car(p)-FCW_STUB cadr(p))
                else list(car(p)+FCW_STUB cadr(p)))
            else if(dy<0.0
                then list(car(p) cadr(p)-FCW_STUB)
                else list(car(p) cadr(p)+FCW_STUB))
        )
    )
)

;-----------------------------------------------------------------------------
; Create one isolated wire stub and one net label.
;-----------------------------------------------------------------------------
procedure(FCW_LabelMOSTerminal(cv inst pinName netName)
    let((p e wire label)
        p=FCW_PinCenter(inst pinName)
        e=FCW_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) FCW_WIRE FCW_WIRE 0)
        unless(wire error("FCW: stub creation failed on %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" FCW_WIRE nil)
        unless(label error("FCW: label creation failed on %s.%s.\n" inst~>name pinName))
        printf("FCW: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

;-----------------------------------------------------------------------------
; VDC helpers.
;-----------------------------------------------------------------------------
procedure(FCW_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("FCW: VDC CDF missing on %s.\n" inst~>name))
        unless(cdf->vdc error("FCW: VDC parameter missing on %s.\n" inst~>name))
        cdf->vdc->value=value
        t
    )
)

procedure(FCW_VDCPinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("FCW: VDC terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("FCW: VDC pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(FCW_CreateVDC(cv master name xy value plusNet)
    let((inst plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("FCW: cannot create VDC %s.\n" name))
        FCW_SetVDC(inst value)
        plus=FCW_VDCPinCenter(inst "PLUS")
        minus=FCW_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+FCW_STUB)
        em=list(car(minus) cadr(minus)-FCW_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) FCW_WIRE FCW_WIRE 0)
        wm=schCreateWire(cv "route" "full" list(minus em) FCW_WIRE FCW_WIRE 0)
        unless(wp && wm error("FCW: VDC wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" FCW_WIRE nil)
        schCreateWireLabel(cv car(wm) em "VSS" "lowerLeft" "R0" "stick" FCW_WIRE nil)
        printf("FCW: VDC %s = %sV PLUS=%s MINUS=VSS\n" name value plusNet)
        inst
    )
)

;-----------------------------------------------------------------------------
; External pin helper.
;-----------------------------------------------------------------------------
procedure(FCW_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("FCW: failed creating external pin %s.\n" name))
        printf("FCW: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

;-----------------------------------------------------------------------------
; Main generator.
;-----------------------------------------------------------------------------
procedure(CreateFoldedCascodeOTA_NMOS_TotalW_V1_20260814()
    let((cv nmos pmos vdcMaster pinMaster
         M1 M2 M3 M4 M5 M6 M7 M8 M9 M10 M11
         VDD_SRC VBP2_SRC VBP1_SRC VBN1_SRC VBN2_SRC VBN_TAIL_SRC VINP_SRC VINN_SRC)

        printf("\n============================================================\n")
        printf(" FOLDED CASCODE OTA - TOTALW V1 - 2026-08-14\n")
        printf("============================================================\n")
        printf("VDD=2.0V  VSS=0V  CL=5pF  GBW_TARGET>=100MHz\n")
        printf("GAIN_TARGET>=60dB  SR_TARGET>=50V/us  POWER<=1mW\n")
        printf("TEMP=27C  CORNER=TT  OUTPUT=VOUT (single-ended)\n")
        printf("DEVICE=%s/%s\n" FCW_LIB FCW_NMOS)
        printf("DEVICE=%s/%s\n" FCW_LIB FCW_PMOS)
        printf("STATUS=SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")

        cv=geGetEditCellView()
        unless(cv error("FCW: open a NEW EMPTY editable schematic first.\n"))
        unless(null(cv~>instances)
            error("FCW: target schematic is not empty. Use a new empty schematic.\n"))

        nmos=FCW_OpenMaster(FCW_LIB FCW_NMOS)
        pmos=FCW_OpenMaster(FCW_LIB FCW_PMOS)
        vdcMaster=FCW_OpenMaster("analogLib" "vdc")
        pinMaster=FCW_OpenMaster("basic" "iopin")

        ; Top devices. PMOS orientation is selected from actual S/D geometry.
        M3=FCW_PlacePMOSAuto(cv pmos "M3" -5:12 "8u" "1u" "2" "1")
        M4=FCW_PlacePMOSAuto(cv pmos "M4" 5:12 "8u" "1u" "2" "1")
        M5=FCW_PlacePMOSAuto(cv pmos "M5" -5:8 "8u" "1u" "2" "1")
        M6=FCW_PlacePMOSAuto(cv pmos "M6" 5:8 "8u" "1u" "2" "1")

        ; NMOS devices.
        M7=FCW_PlaceMOS(cv nmos "M7" -5:4 "8u" "1u" "2" "1" "R0")
        M8=FCW_PlaceMOS(cv nmos "M8" 5:4 "8u" "1u" "2" "1" "R0")
        M9=FCW_PlaceMOS(cv nmos "M9" -5:0 "6u" "1u" "2" "1" "R0")
        M10=FCW_PlaceMOS(cv nmos "M10" 5:0 "6u" "1u" "2" "1" "R0")
        M1=FCW_PlaceMOS(cv nmos "M1" -5:-4 "8u" "480n" "2" "1" "R0")
        M2=FCW_PlaceMOS(cv nmos "M2" 5:-4 "8u" "480n" "2" "1" "R0")
        M11=FCW_PlaceMOS(cv nmos "M11" 0:-8 "8u" "1u" "2" "1" "R0")

        ; Differential input pair.
        FCW_LabelMOSTerminal(cv M1 "G" "VINP")
        FCW_LabelMOSTerminal(cv M1 "D" "NLEFT")
        FCW_LabelMOSTerminal(cv M1 "S" "TAIL")
        FCW_LabelMOSTerminal(cv M1 "B" "VSS")
        FCW_LabelMOSTerminal(cv M2 "G" "VINN")
        FCW_LabelMOSTerminal(cv M2 "D" "NRIGHT")
        FCW_LabelMOSTerminal(cv M2 "S" "TAIL")
        FCW_LabelMOSTerminal(cv M2 "B" "VSS")

        ; PMOS top pair.
        FCW_LabelMOSTerminal(cv M3 "G" "VBP2")
        FCW_LabelMOSTerminal(cv M3 "D" "NLEFT")
        FCW_LabelMOSTerminal(cv M3 "S" "VDD")
        FCW_LabelMOSTerminal(cv M3 "B" "VDD")
        FCW_LabelMOSTerminal(cv M4 "G" "VBP2")
        FCW_LabelMOSTerminal(cv M4 "D" "NRIGHT")
        FCW_LabelMOSTerminal(cv M4 "S" "VDD")
        FCW_LabelMOSTerminal(cv M4 "B" "VDD")

        ; PMOS folded pair.
        FCW_LabelMOSTerminal(cv M5 "G" "VBP1")
        FCW_LabelMOSTerminal(cv M5 "D" "FOLD_L")
        FCW_LabelMOSTerminal(cv M5 "S" "NLEFT")
        FCW_LabelMOSTerminal(cv M5 "B" "VDD")
        FCW_LabelMOSTerminal(cv M6 "G" "VBP1")
        FCW_LabelMOSTerminal(cv M6 "D" "VOUT")
        FCW_LabelMOSTerminal(cv M6 "S" "NRIGHT")
        FCW_LabelMOSTerminal(cv M6 "B" "VDD")

        ; NMOS folded pair.
        FCW_LabelMOSTerminal(cv M7 "G" "VBN1")
        FCW_LabelMOSTerminal(cv M7 "D" "FOLD_L")
        FCW_LabelMOSTerminal(cv M7 "S" "LEFT_SINK")
        FCW_LabelMOSTerminal(cv M7 "B" "VSS")
        FCW_LabelMOSTerminal(cv M8 "G" "VBN1")
        FCW_LabelMOSTerminal(cv M8 "D" "VOUT")
        FCW_LabelMOSTerminal(cv M8 "S" "RIGHT_SINK")
        FCW_LabelMOSTerminal(cv M8 "B" "VSS")

        ; NMOS lower sinks.
        FCW_LabelMOSTerminal(cv M9 "G" "VBN2")
        FCW_LabelMOSTerminal(cv M9 "D" "LEFT_SINK")
        FCW_LabelMOSTerminal(cv M9 "S" "VSS")
        FCW_LabelMOSTerminal(cv M9 "B" "VSS")
        FCW_LabelMOSTerminal(cv M10 "G" "VBN2")
        FCW_LabelMOSTerminal(cv M10 "D" "RIGHT_SINK")
        FCW_LabelMOSTerminal(cv M10 "S" "VSS")
        FCW_LabelMOSTerminal(cv M10 "B" "VSS")

        ; Tail source.
        FCW_LabelMOSTerminal(cv M11 "G" "VBN_TAIL")
        FCW_LabelMOSTerminal(cv M11 "D" "TAIL")
        FCW_LabelMOSTerminal(cv M11 "S" "VSS")
        FCW_LabelMOSTerminal(cv M11 "B" "VSS")

        ; Bias and supply sources.
        VDD_SRC=FCW_CreateVDC(cv vdcMaster "VDD_SRC" -16:12 "2.0" "VDD")
        VBP2_SRC=FCW_CreateVDC(cv vdcMaster "VBP2_SRC" -16:8 "1.55" "VBP2")
        VBP1_SRC=FCW_CreateVDC(cv vdcMaster "VBP1_SRC" -16:4 "1.30" "VBP1")
        VBN1_SRC=FCW_CreateVDC(cv vdcMaster "VBN1_SRC" -16:0 "0.65" "VBN1")
        VBN2_SRC=FCW_CreateVDC(cv vdcMaster "VBN2_SRC" 16:4 "0.45" "VBN2")
        VBN_TAIL_SRC=FCW_CreateVDC(cv vdcMaster "VBN_TAIL_SRC" 16:0 "0.65" "VBN_TAIL")
        VINP_SRC=FCW_CreateVDC(cv vdcMaster "VINP_SRC" 16:-4 "1.00" "VINP")
        VINN_SRC=FCW_CreateVDC(cv vdcMaster "VINN_SRC" 16:-8 "1.00" "VINN")

        ; User-facing ports.
        FCW_CreatePin(cv pinMaster "VINP" "input" -13:-12)
        FCW_CreatePin(cv pinMaster "VINN" "input" -10:-12)
        FCW_CreatePin(cv pinMaster "VOUT" "output" 10:8)
        FCW_CreatePin(cv pinMaster "VDD" "input" 10:12)
        FCW_CreatePin(cv pinMaster "VSS" "input" 10:-12)

        schCheck(cv)
        dbSave(cv)

        printf("\n============================================================\n")
        printf(" FCW TOTALW V1 GENERATOR COMPLETED\n")
        printf(" MOS COUNT : M1..M11\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" PMOS      : orientation selected from actual S/D geometry\n")
        printf(" ROUTING   : local isolated stub + net label\n")
        printf(" BIAS      : analogLib/vdc generated\n")
        printf(" OUTPUT    : VOUT = M6.D/M8.D logical net\n")
        printf(" STATUS    : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
