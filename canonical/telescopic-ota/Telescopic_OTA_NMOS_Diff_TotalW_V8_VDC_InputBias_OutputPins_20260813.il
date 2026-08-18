; TELESCOPIC OTA V8 - NMOS input / differential output / VDC bias - repository canonical
; Cadence Virtuoso IC6.1.7 / tsmcN65
;
; Design specifications:
;   VDD = 2.0 V, VSS = 0 V
;   PDK = tsmcN65 (2.5V I/O device family: nch_mac/pch_mac)
;   DC Gain target = 55 dB
;   GBW target = 50 MHz
;   CL = 1 pF
;   Temperature = 27 C
;   Process corner = TT
;   Output = Fully differential
;   Bias strategy = VDC sources (no bias mirrors)
;   Power / SR / ICMR / Swing = Auto-derived
;   gm/ID methodology = Auto
;   L selection = gm/ID-optimized
;   NF/M constraints = Auto
;   Layout-oriented sizing = No
;
; Repository status: Schematic generated; performance NOT verified.
; Evidence: SCH-1426 (no schematic-check errors), SCH-1181 (saved) to be obtained after Check & Save.
;
; Design inputs are TotalW, L, NF, M.  W/finger is derived internally.
; Explicit CDF state: w, l, wf, fingers, simM, totalM, nf, m.
; Routing contract: terminal -> local stub -> net label only.
; No device-to-device wires are created.

setq(TOTA8_LIB "tsmcN65")
setq(TOTA8_NMOS "nch_mac")
setq(TOTA8_PMOS "pch_mac")
setq(TOTA8_STUB 0.75)
setq(TOTA8_WIRE 0.0625)

; Derive per-finger width from TotalW and NF
procedure(TOTA8_DeriveW(TotalW NF)
    let((tw nf)
        tw=cdfParseFloatString(TotalW)
        nf=atoi(NF)
        unless(nf>0 error("TOTA8: NF must be >= 1.\n"))
        sprintf(nil "%g" tw/nf)
    )
)

; Numeric coercion for CDF readback. Cadence PCell CDF values may be
; returned as strings even when the requested value was numeric/text.
procedure(TOTA8_ToFloat(val)
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

; Compare CDF values numerically when possible, otherwise compare exactly.
procedure(TOTA8_ValueMatches(gotVal expectVal)
    let((gotNum expectNum)
        gotNum=TOTA8_ToFloat(gotVal)
        expectNum=TOTA8_ToFloat(expectVal)
        if(gotNum && expectNum
            then abs(gotNum-expectNum) < 1e-12*max(1.0 abs(expectNum))
            else equal(gotVal expectVal)
        )
    )
)

; Set all eight CDF fields explicitly and validate readback.
; This follows the repository-verified CDF contract used by the working
; pch_mac/nch_mac generator and avoids false failures from numeric/string
; representation differences in Cadence CDF readback.
procedure(TOTA8_SetMOS(inst TotalW L NF M)
    let((cdf WperFinger nfInt mInt totalMInt totalM)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("TOTA8: CDF missing on %s.\n" inst~>name))
        unless(cdf->w error("TOTA8: w field missing on %s.\n" inst~>name))
        unless(cdf->l error("TOTA8: l field missing on %s.\n" inst~>name))
        unless(cdf->wf error("TOTA8: wf field missing on %s.\n" inst~>name))
        unless(cdf->fingers error("TOTA8: fingers field missing on %s.\n" inst~>name))
        unless(cdf->simM error("TOTA8: simM field missing on %s.\n" inst~>name))
        unless(cdf->totalM error("TOTA8: totalM field missing on %s.\n" inst~>name))
        unless(cdf->nf error("TOTA8: nf field missing on %s.\n" inst~>name))
        unless(cdf->m error("TOTA8: m field missing on %s.\n" inst~>name))
        WperFinger=TOTA8_DeriveW(TotalW NF)
        nfInt=atoi(NF)
        mInt=atoi(M)
        totalMInt=nfInt*mInt
        totalM=sprintf(nil "%d" totalMInt)

        cdf->w->value=WperFinger
        cdf->l->value=L
        cdf->wf->value=TotalW
        cdf->fingers->value=NF
        cdf->simM->value=M
        cdf->totalM->value=totalM
        cdf->nf->value=NF
        cdf->m->value=M

        printf("TOTA8: %s TotalW=%s W/finger=%s L=%s NF=%s M=%s WF=%L totalM=%L\n"
            inst~>name TotalW WperFinger L NF M cdf->wf->value cdf->totalM->value)
        unless(TOTA8_ValueMatches(cdf->w->value WperFinger)
            error("TOTA8: W mismatch on %s: got %L expected %L.\n" inst~>name cdf->w->value WperFinger))
        unless(TOTA8_ValueMatches(cdf->l->value L)
            error("TOTA8: L mismatch on %s: got %L expected %L.\n" inst~>name cdf->l->value L))
        unless(TOTA8_ValueMatches(cdf->wf->value TotalW)
            error("TOTA8: WF mismatch on %s: got %L expected %L.\n" inst~>name cdf->wf->value TotalW))
        unless(TOTA8_ValueMatches(cdf->fingers->value NF)
            error("TOTA8: fingers mismatch on %s: got %L expected %L.\n" inst~>name cdf->fingers->value NF))
        unless(TOTA8_ValueMatches(cdf->simM->value M)
            error("TOTA8: simM mismatch on %s: got %L expected %L.\n" inst~>name cdf->simM->value M))
        unless(TOTA8_ValueMatches(cdf->totalM->value totalM)
            error("TOTA8: totalM mismatch on %s: got %L expected %L.\n" inst~>name cdf->totalM->value totalM))
        unless(TOTA8_ValueMatches(cdf->nf->value NF)
            error("TOTA8: nf mismatch on %s: got %L expected %L.\n" inst~>name cdf->nf->value NF))
        unless(TOTA8_ValueMatches(cdf->m->value M)
            error("TOTA8: m mismatch on %s: got %L expected %L.\n" inst~>name cdf->m->value M))
        t
    )
)

; Place and size a MOS instance
procedure(TOTA8_PlaceMOS(cv master name xy TotalW L NF M orient)
    let((inst)
        inst=dbCreateInst(cv master name xy orient)
        unless(inst error("TOTA8: cannot create %s.\n" name))
        TOTA8_SetMOS(inst TotalW L NF M)
        inst
    )
)

; Get center point of a pin
procedure(TOTA8_PinCenter(inst pinName)
    let((term pin fig)
        term=dbFindTermByName(inst~>master pinName)
        unless(term error("TOTA8: terminal %s missing on %s.\n" pinName inst~>name))
        pin=car(term~>pins)
        unless(pin error("TOTA8: pin figure missing on %s.%s.\n" inst~>name pinName))
        fig=pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

; Calculate end point of isolation stub (one terminal width away from pin center)
procedure(TOTA8_StubEnd(inst pinName)
    let((g b s d p dx dy)
        g=TOTA8_PinCenter(inst "G")
        b=TOTA8_PinCenter(inst "B")
        s=TOTA8_PinCenter(inst "S")
        d=TOTA8_PinCenter(inst "D")
        p=TOTA8_PinCenter(inst pinName)
        if(equal(pinName "G") then dx=car(g)-car(b) dy=cadr(g)-cadr(b)
        else if(equal(pinName "B") then dx=car(b)-car(g) dy=cadr(b)-cadr(g)
        else if(equal(pinName "S") then dx=car(s)-car(d) dy=cadr(s)-cadr(d)
        else if(equal(pinName "D") then dx=car(d)-car(s) dy=cadr(d)-cadr(s)
        else error("TOTA8: unsupported terminal %s.\n" pinName))))
        if(abs(dx)>=abs(dy) then
            if(dx<0.0 then list(car(p)-TOTA8_STUB cadr(p)) else list(car(p)+TOTA8_STUB cadr(p)))
        else
            if(dy<0.0 then list(car(p) cadr(p)-TOTA8_STUB) else list(car(p) cadr(p)+TOTA8_STUB))
        )
)

; Create isolation stub and net label
procedure(TOTA8_LabelTerminal(cv inst pinName netName)
    let((p e wire label)
        p=TOTA8_PinCenter(inst pinName)
        e=TOTA8_StubEnd(inst pinName)
        wire=schCreateWire(cv "route" "full" list(p e) TOTA8_WIRE TOTA8_WIRE 0)
        unless(wire error("TOTA8: stub failed %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" TOTA8_WIRE nil)
        unless(label error("TOTA8: label failed %s.%s.\n" inst~>name pinName))
        printf("TOTA8: STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

; Create a VDC terminal stub and net label. analogLib/vdc uses PLUS/MINUS.
procedure(TOTA8_LabelVDCTerminal(cv inst pinName netName)
    let((p e wire label dy)
        unless(equal(pinName "PLUS") || equal(pinName "MINUS")
            error("TOTA8: unsupported VDC terminal %s on %s.\n" pinName inst~>name))
        p=TOTA8_PinCenter(inst pinName)
        dy=if(equal(pinName "PLUS") then TOTA8_STUB else -TOTA8_STUB)
        e=list(car(p) cadr(p)+dy)
        wire=schCreateWire(cv "route" "full" list(p e) TOTA8_WIRE TOTA8_WIRE 0)
        unless(wire error("TOTA8: VDC stub failed %s.%s.\n" inst~>name pinName))
        label=schCreateWireLabel(cv car(wire) e netName "lowerLeft" "R0" "stick" TOTA8_WIRE nil)
        unless(label error("TOTA8: VDC label failed %s.%s.\n" inst~>name pinName))
        printf("TOTA8: VDC STUB %s.%s -> %s\n" inst~>name pinName netName)
        e
    )
)

; Configure VDC source value
procedure(TOTA8_SetVDC(inst value)
    let((cdf)
        cdf=cdfGetInstCDF(inst)
        unless(cdf error("TOTA8: VDC CDF missing on %s.\n" inst~>name))
        if(cdf->vdc then cdf->vdc->value=value
        else if(cdf->dc then cdf->dc->value=value
        else error("TOTA8: vdc/dc parameter missing on %s.\n" inst~>name)))
        t
    )
)

; Create and label a VDC source instance
procedure(TOTA8_CreateVDC(cv master gndMaster name xy value plusNet minusNet)
    let((inst gnd plus minus ep em wp wm)
        inst=dbCreateInst(cv master name xy "R0")
        unless(inst error("TOTA8: cannot create VDC %s.\n" name))
        TOTA8_SetVDC(inst value)
        plus=TOTA8_VDCPinCenter(inst "PLUS")
        minus=TOTA8_VDCPinCenter(inst "MINUS")
        ep=list(car(plus) cadr(plus)+TOTA8_STUB)
        wp=schCreateWire(cv "route" "full" list(plus ep) 0.0625 0.0625 0)
        unless(wp error("TOTA8: VDC PLUS wiring failed for %s.\n" name))
        schCreateWireLabel(cv car(wp) ep plusNet "lowerLeft" "R0" "stick" 0.0625 nil)
        if(equal(minusNet "GND") then
            gnd=dbCreateInst(cv gndMaster strcat(name "_GND") minus "R0")
            unless(gnd error("TOTA8: cannot create GND for VDC %s.\n" name))
            else
            em=list(car(minus) cadr(minus)-TOTA8_STUB)
            wm=schCreateWire(cv "route" "full" list(minus em) 0.0625 0.0625 0)
            unless(wm error("TOTA8: VDC MINUS wiring failed for %s.\n" name))
            schCreateWireLabel(cv car(wm) em minusNet "lowerLeft" "R0" "stick" 0.0625 nil)
        )
        printf("TOTA8: VDC %s = %sV PLUS=%s MINUS=%s\n" name value plusNet minusNet)
        inst
    )
)

procedure(TOTA8_CreatePin(cv pinMaster name direction xy)
    let((pin)
        pin=schCreatePin(cv pinMaster name direction nil xy "R0")
        unless(pin error("TOTA8: cannot create output pin %s.\n" name))
        printf("TOTA8: PIN %s direction=%s at %L\n" name direction xy)
        pin
    )
)

; Check if cellview is empty (no instances)
procedure(TOTA8_CellEmpty(cv)
    null(cv~>instances)
)

; Main generator procedure
procedure(CreateTelescopicOTA_NMOS_Diff_TotalW_V8_VDC_InputBias_OutputPins_20260813()
    let((cv nmos pmos vdcMaster pinMaster M1 M2 M3 M4 M5 M6 M7 M8 M9 voutpEnd voutnEnd)
        printf("\n============================================================\n")
        printf(" TELESCOPIC OTA V8 - NMOS INPUT / DIFFERENTIAL / VDC BIAS\n")
        printf("============================================================\n")
        printf("PDK       : tsmcN65 2.5V I/O (nch_mac/pch_mac)\n")
        printf("VDD/VSS   : 2.0V / 0.0V\n")
        printf("Gain      : 55dB target\n")
        printf("GBW       : 50MHz target\n")
        printf("CL        : 1pF\n")
        printf("Corner/T  : TT / 27C\n")
        printf("Output    : VOUTP / VOUTN (differential)\n")
        printf("CMFB      : NONE\n")
        printf("Power     : ~84uW (auto-derived)\n")
        printf("SR        : ~42 V/us (auto-derived)\n")
        printf("ICMR      : ~0.45V to ~1.10V (estimated)\n")
        printf("Swing     : ~0.67Vpp (estimated single-ended)\n")
        printf("Bias      : analogLib/vdc instances\n")
        printf("Wiring    : STUB + NET LABEL ONLY; NO DEVICE-TO-DEVICE WIRES\n")
        printf("Sizing    : TotalW / L / NF / M (gm/ID-optimized)\n")
        printf("============================================================\n")
        cv=geGetEditCellView()
        unless(cv error("TOTA8: open an editable schematic first.\n"))
        unless(TOTA8_CellEmpty(cv) error("TOTA8: use a new EMPTY schematic.\n"))
        nmos=dbOpenCellViewByType(TOTA8_LIB TOTA8_NMOS "symbol" "" "r")
        pmos=dbOpenCellViewByType(TOTA8_LIB TOTA8_PMOS "symbol" "" "r")
        vdcMaster=dbOpenCellViewByType("analogLib" "vdc" "symbol" "" "r")
        pinMaster=dbOpenCellViewByType("basic" "iopin" "symbol" "" "r")
        unless(nmos && pmos && vdcMaster && pinMaster error("TOTA8: required symbol master is unavailable.\n"))

        ; Place transistors with approved TotalW/L/NF/M sizing
        ; M7, M8: PMOS cascode (load side) - TotalW=11um, L=0.4um, NF=2, M=1
        M7=TOTA8_PlaceMOS(cv pmos "M7" -5:10 "11u" "0.4" "2" "1" "R0")
        M8=TOTA8_PlaceMOS(cv pmos "M8" 5:10 "11u" "0.4" "2" "1" "R0")
        ; M5, M6: PMOS current source (load) - TotalW=16um, L=0.6um, NF=4, M=1
        M5=TOTA8_PlaceMOS(cv pmos "M5" -5:6 "16u" "0.6" "4" "1" "R0")
        M6=TOTA8_PlaceMOS(cv pmos "M6" 5:6 "16u" "0.6" "4" "1" "R0")
        ; M3, M4: NMOS cascode - TotalW=5um, L=0.4um, NF=1, M=1
        M3=TOTA8_PlaceMOS(cv nmos "M3" -5:2 "5u" "0.4" "1" "1" "R0")
        M4=TOTA8_PlaceMOS(cv nmos "M4" 5:2 "5u" "0.4" "1" "1" "R0")
        ; M1, M2: NMOS differential input pair - TotalW=12um, L=0.5um, NF=4, M=1
        M1=TOTA8_PlaceMOS(cv nmos "M1" -5:-2 "12u" "0.5" "4" "1" "R0")
        M2=TOTA8_PlaceMOS(cv nmos "M2" 5:-2 "12u" "0.5" "4" "1" "R0")
        ; M9: NMOS tail current source - TotalW=13um, L=0.6um, NF=2, M=1
        M9=TOTA8_PlaceMOS(cv nmos "M9" 0:-6 "13u" "0.6" "2" "1" "R0")

        ; Create isolation stubs and net labels (terminal -> stub -> label)
        TOTA8_LabelTerminal(cv M1 "G" "VINP")
        TOTA8_LabelTerminal(cv M1 "D" "NLEFT")
        TOTA8_LabelTerminal(cv M1 "S" "TAIL")
        TOTA8_LabelTerminal(cv M1 "B" "VSS")
        TOTA8_LabelTerminal(cv M2 "G" "VINN")
        TOTA8_LabelTerminal(cv M2 "D" "NRIGHT")
        TOTA8_LabelTerminal(cv M2 "S" "TAIL")
        TOTA8_LabelTerminal(cv M2 "B" "VSS")
        TOTA8_LabelTerminal(cv M3 "G" "VBN_CAS")
        voutpEnd=TOTA8_LabelTerminal(cv M3 "D" "VOUTP")
        TOTA8_LabelTerminal(cv M3 "S" "NLEFT")
        TOTA8_LabelTerminal(cv M3 "B" "VSS")
        TOTA8_LabelTerminal(cv M4 "G" "VBN_CAS")
        voutnEnd=TOTA8_LabelTerminal(cv M4 "D" "VOUTN")
        TOTA8_LabelTerminal(cv M4 "S" "NRIGHT")
        TOTA8_LabelTerminal(cv M4 "B" "VSS")
        TOTA8_LabelTerminal(cv M5 "G" "VBP_CAS")
        TOTA8_LabelTerminal(cv M5 "D" "VOUTP")
        TOTA8_LabelTerminal(cv M5 "S" "PLEFT")
        TOTA8_LabelTerminal(cv M5 "B" "VDD")
        TOTA8_LabelTerminal(cv M6 "G" "VBP_CAS")
        TOTA8_LabelTerminal(cv M6 "D" "VOUTN")
        TOTA8_LabelTerminal(cv M6 "S" "PRIGHT")
        TOTA8_LabelTerminal(cv M6 "B" "VDD")
        TOTA8_LabelTerminal(cv M7 "G" "VBP_LOAD")
        TOTA8_LabelTerminal(cv M7 "D" "PLEFT")
        TOTA8_LabelTerminal(cv M7 "S" "VDD")
        TOTA8_LabelTerminal(cv M7 "B" "VDD")
        TOTA8_LabelTerminal(cv M8 "G" "VBP_LOAD")
        TOTA8_LabelTerminal(cv M8 "D" "PRIGHT")
        TOTA8_LabelTerminal(cv M8 "S" "VDD")
        TOTA8_LabelTerminal(cv M8 "B" "VDD")
        TOTA8_LabelTerminal(cv M9 "G" "VBN_TAIL")
        TOTA8_LabelTerminal(cv M9 "D" "TAIL")
        TOTA8_LabelTerminal(cv M9 "S" "VSS")
        TOTA8_LabelTerminal(cv M9 "B" "VSS")

        ; VDC bias and supply sources
        TOTA8_CreateVDC(cv vdcMaster gndMaster "VDD_SRC" "2" "VDD" "VSS")
        TOTA8_CreateVDC(cv vdcMaster gndMaster "VSS_SRC" "0" "VSS" "GND")
        TOTA8_CreateVDC(cv vdcMaster gndMaster "VBN_TAIL_SRC" "0.60" "VBN_TAIL" "VSS")
        TOTA8_CreateVDC(cv vdcMaster gndMaster "VBN_CAS_SRC" "1.05" "VBN_CAS" "VSS")
        TOTA8_CreateVDC(cv vdcMaster gndMaster "VBP_CAS_SRC" "1.25" "VBP_CAS" "VSS")
        TOTA8_CreateVDC(cv vdcMaster gndMaster "VBP_LOAD_SRC" "1.00" "VBP_LOAD" "VSS")
        TOTA8_CreateVDC(cv vdcMaster gndMaster "VINP_SRC" "0.80" "VINP" "VSS")
        TOTA8_CreateVDC(cv vdcMaster gndMaster "VINN_SRC" "0.80" "VINN" "VSS")

        ; Output pins at actual drain-stub endpoints
        TOTA8_CreatePin(cv pinMaster "VOUTP" "output" voutpEnd)
        TOTA8_CreatePin(cv pinMaster "VOUTN" "output" voutnEnd)

        dbSave(cv)
        printf("\n============================================================\n")
        printf(" TOTA8 GENERATOR COMPLETED\n")
        printf("============================================================\n")
        printf("MOS      : M1..M9\n")
        printf("OUTPUTS  : VOUTP / VOUTN\n")
        printf("BIAS VDC : VBN_TAIL / VBN_CAS / VBP_CAS / VBP_LOAD / VINP / VINN\n")
        printf("POWER VDC: VDD / VSS\n")
        printf("OUTPUT PIN: VOUTP / VOUTN\n")
        printf("WIRING   : local stub + net label ONLY\n")
        printf("CDF      : w/l/wf/fingers/simM/totalM/nf/m explicit\n")
        printf("totalM   : NF * M\n")
        printf("STATUS   : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
