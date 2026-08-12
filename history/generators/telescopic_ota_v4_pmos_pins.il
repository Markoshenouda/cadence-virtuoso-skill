;===============================================================
; Telescopic OTA V3.2 Generator - case-based, stale-function-safe
; Cadence Virtuoso IC6.1.7 / TSMC N65
;
; PDK masters:
;   tsmcN65 / nch / symbol
;   tsmcN65 / pch / symbol
;
; This generator deliberately uses only the proven construction
; pattern: instance CDF sizing, transformed master-pin coordinates,
; schCreateWire(), and schCreateWireLabel().  Each terminal gets a
; short local wire stub and a net label; no long pin-to-pin wire uses
; guessed terminal coordinates.
;===============================================================
; IMPORTANT: Helper names include a unique date suffix so a stale
; function definition from an older loaded file cannot be called.
; After copying this file, LOAD THIS FILE again before running the
; generator. The main procedure name remains CreateTelescopicOTA_V3().
;===============================================================

(setq TOTA_V3_PDK_LIB "tsmcN65")
(setq TOTA_V3_NMOS_CELL "nch")
(setq TOTA_V3_PMOS_CELL "pch")
(setq TOTA_V3_STUB_LENGTH 0.75)
(setq TOTA_V3_WIRE_WIDTH 0.0625)
(setq TOTA_V3_PIN_LIB "basic")
(setq TOTA_V3_PIN_CELL "iopin")

procedure(TOTA_V3_SetMOS(inst width length fingers multiplier)
    let((cdf)
        cdf = cdfGetInstCDF(inst)
        unless(cdf
            error("TOTA_V3: Cannot access CDF for %s.\n" inst~>name)
        )
        cdf->w->value = width
        cdf->l->value = length
        cdf->nf->value = fingers
        cdf->m->value = multiplier
    )
)

procedure(TOTA_V3_PlaceMOS(cv master instName origin width length orientation)
    let((inst)
        inst = dbCreateInst(cv master instName origin orientation)
        unless(inst
            error("TOTA_V3: Cannot create instance %s.\n" instName)
        )
        TOTA_V3_SetMOS(inst width length "1" "1")
        inst
    )
)

procedure(TOTA_V3_PinCenter(inst pinName)
    let((term pin fig masterPoint)
        term = dbFindTermByName(inst~>master pinName)
        unless(term
            error("TOTA_V3: Terminal %s is missing on %s.\n" pinName inst~>name)
        )
        pin = car(term~>pins)
        unless(pin
            error("TOTA_V3: Terminal %s on %s has no pin figure.\n" pinName inst~>name)
        )
        fig = pin~>fig
        masterPoint = centerBox(fig~>bBox)
        dbTransformPoint(masterPoint inst~>transform)
    )
)

procedure(TOTA_V3_StubEnd_20260810(point pinName)
    case(pinName
        ("G" list(car(point) - TOTA_V3_STUB_LENGTH cadr(point)))
        ("D" list(car(point) cadr(point) + TOTA_V3_STUB_LENGTH))
        ("S" list(car(point) cadr(point) - TOTA_V3_STUB_LENGTH))
        ("B" list(car(point) + TOTA_V3_STUB_LENGTH cadr(point)))
        (t error("TOTA_V3: Unknown terminal %s\n" pinName))
    )
)

procedure(TOTA_V3_LabelPinNet_20260810(cv inst pinName netName)
    let((pinPoint stubEnd wire label)
        pinPoint = TOTA_V3_PinCenter(inst pinName)
        stubEnd = TOTA_V3_StubEnd_20260810(pinPoint pinName)
        wire = schCreateWire(cv "route" "full" list(pinPoint stubEnd)
                              TOTA_V3_WIRE_WIDTH TOTA_V3_WIRE_WIDTH 0)
        unless(wire
            error("TOTA_V3: Cannot create wire for %s.%s.\n" inst~>name pinName)
        )
        label = schCreateWireLabel(cv car(wire) stubEnd netName
                                   "lowerLeft" "R0" "stick" TOTA_V3_WIRE_WIDTH nil)
        unless(label
            error("TOTA_V3: Cannot label %s.%s as %s.\n" inst~>name pinName netName)
        )
        label
    )
)

procedure(TOTA_V3_HasExistingM1toM9(cv)
    let((inst found)
        found = nil
        foreach(inst cv~>instances
            case(inst~>name
                ("M1" found = t) ("M2" found = t) ("M3" found = t)
                ("M4" found = t) ("M5" found = t) ("M6" found = t)
                ("M7" found = t) ("M8" found = t) ("M9" found = t)
            )
        )
        found
    )
)

procedure(TOTA_V3_CleanupM1toM9(cv)
    if(TOTA_V3_HasExistingM1toM9(cv) then
        printf("TOTA_V3: M1-M9 already exist; no instances were removed.\n")
        printf("TOTA_V3: No M1-M9 instances found.\n")
    )
    nil
)

procedure(TOTA_V3_StaleSafeTest_V32()
    printf("TOTA_V3.2: helper test G -> %L\n" TOTA_V3_StubEnd_20260810(list(1.0 2.0) "G"))
    printf("TOTA_V3.2: helper test D -> %L\n" TOTA_V3_StubEnd_20260810(list(1.0 2.0) "D"))
    t
)

procedure(TOTA_V3_CreateExternalPin_20260810(cv pinMaster netName direction point orientation)
    let((pin)
        pin = schCreatePin(cv pinMaster netName direction nil point orientation)
        unless(pin
            error("TOTA_V3: Cannot create external pin %s at %L.\n" netName point)
        )
        printf("TOTA_V3: Pin %-12s %-12s at %L\n" netName direction point)
        pin
    )
)

procedure(TOTA_V3_PinFromTerminal_20260810(cv inst pinName netName direction pinMaster)
    let((pinPoint stubEnd wire label pin)
        pinPoint = TOTA_V3_PinCenter(inst pinName)
        stubEnd = TOTA_V3_StubEnd_20260810(pinPoint pinName)
        wire = schCreateWire(cv "route" "full" list(pinPoint stubEnd)
                              TOTA_V3_WIRE_WIDTH TOTA_V3_WIRE_WIDTH 0)
        unless(wire error("TOTA_V3: Cannot create wire for external pin %s.\n" netName))
        label = schCreateWireLabel(cv car(wire) stubEnd netName
                                   "lowerLeft" "R0" "stick" TOTA_V3_WIRE_WIDTH nil)
        unless(label error("TOTA_V3: Cannot create label for external pin %s.\n" netName))
        pin = TOTA_V3_CreateExternalPin_20260810(cv pinMaster netName direction stubEnd "R0")
        pin
    )
)

procedure(TOTA_V3_CreateInternalLabel_20260810(cv inst pinName netName)
    TOTA_V3_LabelPinNet_20260810(cv inst pinName netName)
)

procedure(TOTA_V3_PinTest_20260810()
    let((cv pinMaster pin)
        cv = geGetEditCellView()
        unless(cv error("TOTA_V3: Open an editable schematic first.\n"))
        pinMaster = dbOpenCellViewByType(TOTA_V3_PIN_LIB TOTA_V3_PIN_CELL "symbol" "" "r")
        unless(pinMaster error("TOTA_V3: Cannot open basic/iopin/symbol.\n"))
        pin = schCreatePin(cv pinMaster "PIN_TEST" "input" nil 0:0 "R0")
        unless(pin error("TOTA_V3: PIN TEST FAILED.\n"))
        printf("TOTA_V3: PIN TEST PASSED -> %L\n" pin)
        pin
    )
)

procedure(CreateTelescopicOTA_V3()
    let((cv nmosMaster pmosMaster pinMaster M1 M2 M3 M4 M5 M6 M7 M8 M9)
        printf("\n===============================================\n")
        printf("  Telescopic OTA V3: placement and net labels\n")
        printf("===============================================\n")
        cv = geGetEditCellView()
        unless(cv error("TOTA_V3: Open an editable schematic first.\n"))
        if(TOTA_V3_HasExistingM1toM9(cv) then
            error("TOTA_V3: M1-M9 already exist. Use a new empty schematic; no cleanup API was assumed.\n")
        )
        nmosMaster = dbOpenCellViewByType(TOTA_V3_PDK_LIB TOTA_V3_NMOS_CELL "symbol" "" "r")
        pmosMaster = dbOpenCellViewByType(TOTA_V3_PDK_LIB TOTA_V3_PMOS_CELL "symbol" "" "r")
        unless(nmosMaster error("TOTA_V3: Cannot open tsmcN65/nch/symbol.\n"))
        unless(pmosMaster error("TOTA_V3: Cannot open tsmcN65/pch/symbol.\n"))
        pinMaster = dbOpenCellViewByType(TOTA_V3_PIN_LIB TOTA_V3_PIN_CELL "symbol" "" "r")
        unless(pinMaster error("TOTA_V3: Cannot open basic/iopin/symbol.\n"))

        M9 = TOTA_V3_PlaceMOS(cv nmosMaster "M9" 3:2 "6u" "480n" "R0")
        M1 = TOTA_V3_PlaceMOS(cv nmosMaster "M1" 0:6 "2u" "240n" "R0")
        M2 = TOTA_V3_PlaceMOS(cv nmosMaster "M2" 6:6 "2u" "240n" "R0")
        M3 = TOTA_V3_PlaceMOS(cv nmosMaster "M3" 0:10 "4u" "480n" "R0")
        M4 = TOTA_V3_PlaceMOS(cv nmosMaster "M4" 6:10 "4u" "480n" "R0")
        M5 = TOTA_V3_PlaceMOS(cv pmosMaster "M5" 0:14 "4u" "480n" "MX")
        M6 = TOTA_V3_PlaceMOS(cv pmosMaster "M6" 6:14 "4u" "480n" "MX")
        M7 = TOTA_V3_PlaceMOS(cv pmosMaster "M7" 0:18 "6u" "480n" "MX")
        M8 = TOTA_V3_PlaceMOS(cv pmosMaster "M8" 6:18 "6u" "480n" "MX")

        TOTA_V3_PinFromTerminal_20260810(cv M1 "G" "VINP" "input" pinMaster)
        TOTA_V3_LabelPinNet_20260810(cv M1 "D" "NLEFT")
        TOTA_V3_LabelPinNet_20260810(cv M1 "S" "TAIL")
        TOTA_V3_LabelPinNet_20260810(cv M1 "B" "VSS")
        TOTA_V3_PinFromTerminal_20260810(cv M2 "G" "VINN" "input" pinMaster)
        TOTA_V3_LabelPinNet_20260810(cv M2 "D" "NRIGHT")
        TOTA_V3_LabelPinNet_20260810(cv M2 "S" "TAIL")
        TOTA_V3_LabelPinNet_20260810(cv M2 "B" "VSS")
        TOTA_V3_PinFromTerminal_20260810(cv M3 "G" "VBN_CAS" "input" pinMaster)
        TOTA_V3_LabelPinNet_20260810(cv M3 "D" "NLEFT_CAS")
        TOTA_V3_LabelPinNet_20260810(cv M3 "S" "NLEFT")
        TOTA_V3_LabelPinNet_20260810(cv M3 "B" "VSS")
        TOTA_V3_LabelPinNet_20260810(cv M4 "G" "VBN_CAS")
        TOTA_V3_PinFromTerminal_20260810(cv M4 "D" "VOUT" "output" pinMaster)
        TOTA_V3_LabelPinNet_20260810(cv M4 "S" "NRIGHT")
        TOTA_V3_LabelPinNet_20260810(cv M4 "B" "VSS")
        TOTA_V3_PinFromTerminal_20260810(cv M5 "G" "VBP_CAS" "input" pinMaster)
        TOTA_V3_LabelPinNet_20260810(cv M5 "D" "NLEFT_CAS")
        TOTA_V3_LabelPinNet_20260810(cv M5 "S" "NLEFT_LOAD")
        TOTA_V3_LabelPinNet_20260810(cv M5 "B" "VDD")
        TOTA_V3_LabelPinNet_20260810(cv M6 "G" "VBP_CAS")
        TOTA_V3_LabelPinNet_20260810(cv M6 "D" "VOUT")
        TOTA_V3_LabelPinNet_20260810(cv M6 "S" "NRIGHT_LOAD")
        TOTA_V3_LabelPinNet_20260810(cv M6 "B" "VDD")
        TOTA_V3_PinFromTerminal_20260810(cv M7 "G" "VBP" "input" pinMaster)
        TOTA_V3_LabelPinNet_20260810(cv M7 "D" "NLEFT_LOAD")
        TOTA_V3_PinFromTerminal_20260810(cv M7 "S" "VDD" "inputOutput" pinMaster)
        TOTA_V3_LabelPinNet_20260810(cv M7 "B" "VDD")
        TOTA_V3_LabelPinNet_20260810(cv M8 "G" "VBP")
        TOTA_V3_LabelPinNet_20260810(cv M8 "D" "NRIGHT_LOAD")
        TOTA_V3_LabelPinNet_20260810(cv M8 "S" "VDD")
        TOTA_V3_LabelPinNet_20260810(cv M8 "B" "VDD")
        TOTA_V3_PinFromTerminal_20260810(cv M9 "G" "VBN_TAIL" "input" pinMaster)
        TOTA_V3_LabelPinNet_20260810(cv M9 "D" "TAIL")
        TOTA_V3_PinFromTerminal_20260810(cv M9 "S" "VSS" "inputOutput" pinMaster)
        TOTA_V3_LabelPinNet_20260810(cv M9 "B" "VSS")

        printf("TOTA_V3: Created M1-M9, PMOS MX orientation, labeled nets, and external schematic pins.\n")
        dbSave(cv)
        printf("TOTA_V3: Saved schematic after generation.\n")
        printf("TOTA_V3: PMOS uses MX so Source is top / Drain is bottom.\n")
        list(M1 M2 M3 M4 M5 M6 M7 M8 M9)
    )
)
