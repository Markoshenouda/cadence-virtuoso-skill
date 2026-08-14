;=============================================================================
; Folded-Cascode OTA Generator — TotalW V1 — 2026-08-14
; Cadence Virtuoso IC6.1.7 / SKILL
; PDK target: tsmcN65
;
; STATUS
;   New TotalW-first candidate derived from the repository Folded-Cascode
;   V8/V9 topology and routing references.
;   NOT Cadence-verified. NOT performance-verified.
;
; DESIGN CONTRACT
;   VDD              = 2.0 V
;   VSS              = 0 V
;   Input pair       = NMOS
;   Output           = single-ended, VOUT on right branch
;   DC Gain target   >= 60 dB
;   GBW target       >= 100 MHz
;   CL               = 5 pF
;   Slew Rate target >= 50 V/us
;   Power limit      <= 1 mW
;   Temperature      = 27 C
;   Corner            = TT
;   CMFB             = not required
;   Bias             = generated analogLib/vdc
;   ICMR             = Auto, initial center = 1.0 V
;   Output swing     = Auto, initial target = approximately 0.2..1.8 V
;
; DEVICE SELECTION
;   Initial candidate: tsmcN65/nch_25 and tsmcN65/pch_25.
;   The repository catalog requires the actual PDK/CDF/model definition to
;   confirm voltage rating and electrical behavior. This generator therefore
;   fails explicitly if the selected masters or required CDF fields are absent.
;
; SIZING CONTRACT
;   Design-level inputs are TotalW, L, NF, M.
;   W/finger = TotalW / NF.
;   Explicit CDF state:
;       w, l, wf, fingers, simM, totalM, nf, m
;   totalM = NF * M.
;
; INITIAL ENGINEERING SIZING — NOT PERFORMANCE VERIFIED
;   M1/M2  nch_25  TotalW=8u  L=480n  NF=2 M=1
;   M3/M4  pch_25  TotalW=8u  L=1u    NF=2 M=1
;   M5/M6  pch_25  TotalW=8u  L=1u    NF=2 M=1
;   M7/M8  nch_25  TotalW=8u  L=1u    NF=2 M=1
;   M9/M10 nch_25  TotalW=6u  L=1u    NF=2 M=1
;   M11    nch_25  TotalW=8u  L=1u    NF=2 M=1
;
;   Initial gm/ID design assumption for M1/M2 = 15 1/V.
;   From GBW = 100 MHz and CL = 5 pF:
;       gm_in ~= 2*pi*GBW*CL ~= 3.14 mS.
;   Initial input-pair current ~= 209 uA/device.
;   Initial tail current ~= 418 uA.
;   This is a starting design point only; Spectre OP/AC/transient must verify it.
;
; TOPOLOGY
;   M1/M2   = NMOS differential input pair
;   M3/M4   = PMOS top pair
;   M5/M6   = PMOS folded pair
;   M7/M8   = NMOS folded pair
;   M9/M10  = NMOS lower current sinks
;   M11     = NMOS tail current source
;
; NET MAP
;   M1.G VINP       M2.G VINN
;   M1.D NLEFT      M2.D NRIGHT
;   M1.S TAIL       M2.S TAIL
;   M1.B VSS        M2.B VSS
;
;   M3.G VBP2       M4.G VBP2
;   M3.D NLEFT      M4.D NRIGHT
;   M3.S VDD        M4.S VDD
;   M3.B VDD        M4.B VDD
;
;   M5.G VBP1       M6.G VBP1
;   M5.D FOLD_L     M6.D VOUT
;   M5.S NLEFT      M6.S NRIGHT
;   M5.B VDD        M6.B VDD
;
;   M7.G VBN1       M8.G VBN1
;   M7.D FOLD_L     M8.D VOUT
;   M7.S LEFT_SINK  M8.S RIGHT_SINK
;   M7.B VSS        M8.B VSS
;
;   M9.G VBN2       M10.G VBN2
;   M9.D LEFT_SINK  M10.D RIGHT_SINK
;   M9.S VSS        M10.S VSS
;   M9.B VSS        M10.B VSS
;
;   M11.G VBN_TAIL  M11.D TAIL
;   M11.S VSS       M11.B VSS
;
; ROUTING CONTRACT
;   Every MOS terminal gets one short straight isolated stub + one net label.
;   No device-to-device wires are created.
;   Terminal direction is derived from actual transformed pin coordinates.
;   No left/right placement assumption is used for G/B/S/D direction.
;
; VDC SOURCES
;   VDD_SRC      = 2.00 V, VDD-to-VSS
;   VBP2_SRC     = 1.55 V initial
;   VBP1_SRC     = 1.30 V initial
;   VBN1_SRC     = 0.65 V initial
;   VBN2_SRC     = 0.45 V initial
;   VBN_TAIL_SRC = 0.65 V initial
;   VINP_SRC     = 1.00 V initial
;   VINN_SRC     = 1.00 V initial
;
;=============================================================================

(setq FCW_LIB "tsmcN65")
(setq FCW_NMOS "nch_25")
(setq FCW_PMOS "pch_25")
(setq FCW_STUB 0.75)
(setq FCW_WIRE 0.0625)

;-----------------------------------------------------------------------------
; Scalar point offset. Kept explicit because the repository forbids generic
; vector point addition in the validated SKILL flow.
;-----------------------------------------------------------------------------
procedure(FCW_OffsetPoint(p dx dy)
    list(car(p) + dx cadr(p) + dy)
)

;-----------------------------------------------------------------------------
; Numeric-tolerant CDF comparison.
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
; Set and validate the complete repository TotalW CDF state.
;-----------------------------------------------------------------------------
procedure(FCW_SetMOS(inst TotalW L NF M)
    let((cdf WperFinger nfInt mInt totalM)
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
            error("FCW: WF/TotalW read-back mismatch on %s.\n" inst~>name))
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
; Place MOS with explicit TotalW/L/NF/M and repository reference orientation.
; NMOS R0. PMOS MX is then checked by actual transformed S/D coordinates.
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
; Return transformed terminal center.
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
; Verify PMOS source is physically above drain, independent of placement side.
;-----------------------------------------------------------------------------
procedure(FCW_VerifyPMOSSourceTop(inst)
    let((s d)
        s=FCW_PinCenter(inst "S")
        d=FCW_PinCenter(inst "D")
        printf("FCW: PMOS %s orient=%L S=%L D=%L\n" inst~>name inst~>orient s d)
        unless(cadr(s)>cadr(d)
            error("FCW: PMOS %s failed source-top/drain-bottom check.\n" inst~>name))
        t
    )
)

;-----------------------------------------------------------------------------
; Determine an outward stub endpoint from actual terminal geometry.
; For G/B the opposite reference is B/G. For S/D the opposite reference is D/S.
;-----------------------------------------------------------------------------
procedure(FCW_StubEnd(inst pinName)
    let((g b s d p ref dx dy ax ay)
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
            (t error("FCW: unsupported MOS terminal %s.\n" pinName))
        )
        dx=car(p)-car(ref)
        dy=cadr(p)-cadr(ref)
        ax=abs(dx)
        ay=abs(dy)
        if(ax>=ay
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
; Create one wire + one label for one MOS terminal. No device-to-device wires.
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
        unless(equal(cdf->vdc->value value)
            printf("FCW: VDC read-back differs for %s; stored=%L expected=%L\n" inst~>name cdf->vdc->value value))
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
; External pin helper. Only intentional user-facing ports are created.
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
        printf(" FOLDED CASCODE OTA — TOTALW V1 — 2026-08-14\n")
        printf("============================================================\n")
        printf("VDD=2.0V  VSS=0V  CL=5pF  GBW_TARGET>=100MHz\n")
        printf("GAIN_TARGET>=60dB  SR_TARGET>=50V/us  POWER<=1mW\n")
        printf("TEMP=27C  CORNER=TT  OUTPUT=VOUT (single-ended)\n")
        printf("DEVICE_CANDIDATE=%s/%s\n" FCW_LIB FCW_NMOS)
        printf("DEVICE_CANDIDATE=%s/%s\n" FCW_LIB FCW_PMOS)
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

        ;---------------------------------------------------------------------
        ; Device placement — reference V9 visual hierarchy.
        ;---------------------------------------------------------------------
        M3=FCW_PlaceMOS(cv pmos "M3" -5:12 "8u" "1u" "2" "1" "MX")
        M4=FCW_PlaceMOS(cv pmos "M4" 5:12 "8u" "1u" "2" "1" "MX")
        M5=FCW_PlaceMOS(cv pmos "M5" -5:8 "8u" "1u" "2" "1" "MX")
        M6=FCW_PlaceMOS(cv pmos "M6" 5:8 "8u" "1u" "2" "1" "MX")
        M7=FCW_PlaceMOS(cv nmos "M7" -5:4 "8u" "1u" "2" "1" "R0")
        M8=FCW_PlaceMOS(cv nmos "M8" 5:4 "8u" "1u" "2" "1" "R0")
        M9=FCW_PlaceMOS(cv nmos "M9" -5:0 "6u" "1u" "2" "1" "R0")
        M10=FCW_PlaceMOS(cv nmos "M10" 5:0 "6u" "1u" "2" "1" "R0")
        M1=FCW_PlaceMOS(cv nmos "M1" -5:-4 "8u" "480n" "2" "1" "R0")
        M2=FCW_PlaceMOS(cv nmos "M2" 5:-4 "8u" "480n" "2" "1" "R0")
        M11=FCW_PlaceMOS(cv nmos "M11" 0:-8 "8u" "1u" "2" "1" "R0")

        ;---------------------------------------------------------------------
        ; PMOS source-top verification.
        ;---------------------------------------------------------------------
        FCW_VerifyPMOSSourceTop(M3)
        FCW_VerifyPMOSSourceTop(M4)
        FCW_VerifyPMOSSourceTop(M5)
        FCW_VerifyPMOSSourceTop(M6)

        ;---------------------------------------------------------------------
        ; Every MOS terminal: one isolated stub + one repeated net label.
        ;---------------------------------------------------------------------
        FCW_LabelMOSTerminal(cv M1 "G" "VINP")
        FCW_LabelMOSTerminal(cv M1 "D" "NLEFT")
        FCW_LabelMOSTerminal(cv M1 "S" "TAIL")
        FCW_LabelMOSTerminal(cv M1 "B" "VSS")

        FCW_LabelMOSTerminal(cv M2 "G" "VINN")
        FCW_LabelMOSTerminal(cv M2 "D" "NRIGHT")
        FCW_LabelMOSTerminal(cv M2 "S" "TAIL")
        FCW_LabelMOSTerminal(cv M2 "B" "VSS")

        FCW_LabelMOSTerminal(cv M3 "G" "VBP2")
        FCW_LabelMOSTerminal(cv M3 "D" "NLEFT")
        FCW_LabelMOSTerminal(cv M3 "S" "VDD")
        FCW_LabelMOSTerminal(cv M3 "B" "VDD")

        FCW_LabelMOSTerminal(cv M4 "G" "VBP2")
        FCW_LabelMOSTerminal(cv M4 "D" "NRIGHT")
        FCW_LabelMOSTerminal(cv M4 "S" "VDD")
        FCW_LabelMOSTerminal(cv M4 "B" "VDD")

        FCW_LabelMOSTerminal(cv M5 "G" "VBP1")
        FCW_LabelMOSTerminal(cv M5 "D" "FOLD_L")
        FCW_LabelMOSTerminal(cv M5 "S" "NLEFT")
        FCW_LabelMOSTerminal(cv M5 "B" "VDD")

        FCW_LabelMOSTerminal(cv M6 "G" "VBP1")
        FCW_LabelMOSTerminal(cv M6 "D" "VOUT")
        FCW_LabelMOSTerminal(cv M6 "S" "NRIGHT")
        FCW_LabelMOSTerminal(cv M6 "B" "VDD")

        FCW_LabelMOSTerminal(cv M7 "G" "VBN1")
        FCW_LabelMOSTerminal(cv M7 "D" "FOLD_L")
        FCW_LabelMOSTerminal(cv M7 "S" "LEFT_SINK")
        FCW_LabelMOSTerminal(cv M7 "B" "VSS")

        FCW_LabelMOSTerminal(cv M8 "G" "VBN1")
        FCW_LabelMOSTerminal(cv M8 "D" "VOUT")
        FCW_LabelMOSTerminal(cv M8 "S" "RIGHT_SINK")
        FCW_LabelMOSTerminal(cv M8 "B" "VSS")

        FCW_LabelMOSTerminal(cv M9 "G" "VBN2")
        FCW_LabelMOSTerminal(cv M9 "D" "LEFT_SINK")
        FCW_LabelMOSTerminal(cv M9 "S" "VSS")
        FCW_LabelMOSTerminal(cv M9 "B" "VSS")

        FCW_LabelMOSTerminal(cv M10 "G" "VBN2")
        FCW_LabelMOSTerminal(cv M10 "D" "RIGHT_SINK")
        FCW_LabelMOSTerminal(cv M10 "S" "VSS")
        FCW_LabelMOSTerminal(cv M10 "B" "VSS")

        FCW_LabelMOSTerminal(cv M11 "G" "VBN_TAIL")
        FCW_LabelMOSTerminal(cv M11 "D" "TAIL")
        FCW_LabelMOSTerminal(cv M11 "S" "VSS")
        FCW_LabelMOSTerminal(cv M11 "B" "VSS")

        ;---------------------------------------------------------------------
        ; Generated bias/power/input sources.
        ;---------------------------------------------------------------------
        VDD_SRC=FCW_CreateVDC(cv vdcMaster "VDD_SRC" -16:12 "2.0" "VDD")
        VBP2_SRC=FCW_CreateVDC(cv vdcMaster "VBP2_SRC" -16:8 "1.55" "VBP2")
        VBP1_SRC=FCW_CreateVDC(cv vdcMaster "VBP1_SRC" -16:4 "1.30" "VBP1")
        VBN1_SRC=FCW_CreateVDC(cv vdcMaster "VBN1_SRC" -16:0 "0.65" "VBN1")
        VBN2_SRC=FCW_CreateVDC(cv vdcMaster "VBN2_SRC" 16:4 "0.45" "VBN2")
        VBN_TAIL_SRC=FCW_CreateVDC(cv vdcMaster "VBN_TAIL_SRC" 16:0 "0.65" "VBN_TAIL")
        VINP_SRC=FCW_CreateVDC(cv vdcMaster "VINP_SRC" 16:-4 "1.00" "VINP")
        VINN_SRC=FCW_CreateVDC(cv vdcMaster "VINN_SRC" 16:-8 "1.00" "VINN")

        ;---------------------------------------------------------------------
        ; Intentional user-facing ports.
        ;---------------------------------------------------------------------
        FCW_CreatePin(cv pinMaster "VINP" "input" -13:-12)
        FCW_CreatePin(cv pinMaster "VINN" "input" -10:-12)
        FCW_CreatePin(cv pinMaster "VOUT" "output" 10:8)
        FCW_CreatePin(cv pinMaster "VDD" "input" 10:12)
        FCW_CreatePin(cv pinMaster "VSS" "input" 10:-12)

        dbSave(cv)

        printf("\n============================================================\n")
        printf(" FCW TOTALW V1 GENERATOR COMPLETED\n")
        printf(" MOS COUNT : M1..M11\n")
        printf(" CDF       : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf(" totalM    : NF*M\n")
        printf(" ROUTING   : local isolated stub + net label only\n")
        printf(" BIAS      : analogLib/vdc generated\n")
        printf(" OUTPUT    : VOUT = M6.D/M8.D logical net\n")
        printf(" STATUS    : SCHEMATIC CANDIDATE; PERFORMANCE NOT VERIFIED\n")
        printf(" NEXT      : Check & Save, then DC OP, AC, transient\n")
        printf("============================================================\n")
        t
    )
)
