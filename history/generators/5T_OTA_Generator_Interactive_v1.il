;=========================================================
; 5T OTA Generator — Interactive Input-Pair Selection
; Cadence Virtuoso IC6.1.7
; TSMC65 / tsmcN65
;
; FIRST STEP:
; The generator asks whether the differential input pair is NMOS
; or PMOS. This revision intentionally stops after the choice.
;
; The next revision will build the selected topology only after
; the selection interaction is confirmed in Cadence.
;=========================================================

(setq TOTA5_LIB "tsmcN65")
(setq TOTA5_NMOS "nch")
(setq TOTA5_PMOS "pch")
(setq TOTA5_PIN_LIB "basic")
(setq TOTA5_PIN_CELL "iopin")
(setq TOTA5_WIRE_WIDTH 0.0625)

procedure(TOTA5_SetMOS(inst W L NF M)
    let((cdf)
        cdf = cdfGetInstCDF(inst)
        unless(cdf
            error("TOTA5: Cannot access instance CDF.\n")
        )
        cdf->w->value  = W
        cdf->l->value  = L
        cdf->nf->value = NF
        cdf->m->value  = M
    )
)

procedure(TOTA5_PlaceMOS(cv master instName xy orient W L)
    let((inst)
        inst = dbCreateInst(cv master instName xy orient)
        unless(inst
            error("TOTA5: Cannot create instance %s.\n" instName)
        )
        TOTA5_SetMOS(inst W L "1" "1")
        inst
    )
)

procedure(TOTA5_PinCenter(inst pinName)
    let((term pin fig)
        term = dbFindTermByName(inst~>master pinName)
        unless(term
            error("TOTA5: Terminal %s not found on %s.\n" pinName inst~>name)
        )
        pin = car(term~>pins)
        unless(pin
            error("TOTA5: No pin figure for %s on %s.\n" pinName inst~>name)
        )
        fig = pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(TOTA5_PointShift(p dx dy)
    list(car(p) + dx cadr(p) + dy)
)

; FIRST INTERACTIVE STEP.
; This helper is intentionally isolated so it can be tested alone.
procedure(TOTA5_AskInputPair_20260810()
    let((answer normalized)
        printf("\n")
        printf("=====================================================\n")
        printf("              5T OTA DESIGN SETUP\n")
        printf("=====================================================\n")
        printf("Choose the differential input pair:\n")
        printf("  NMOS  -> NMOS input pair\n")
        printf("  PMOS  -> PMOS input pair\n")
        printf("=====================================================\n")

        answer = hiGetString(nil "Input pair type [NMOS/PMOS]:")

        unless(answer
            error("TOTA5: Input-pair selection was cancelled.\n")
        )

        normalized = upperCase(answer)

        cond(
            ((equal(normalized "NMOS"))
                printf("TOTA5: Selected NMOS input pair.\n")
                "NMOS"
            )
            ((equal(normalized "PMOS"))
                printf("TOTA5: Selected PMOS input pair.\n")
                "PMOS"
            )
            (t
                error("TOTA5: Invalid input pair '%s'. Enter NMOS or PMOS.\n" answer)
            )
        )
    )
)

procedure(TOTA5_InputPairSelectionTest_20260810()
    let((pair)
        pair = TOTA5_AskInputPair_20260810()
        printf("TOTA5: Selection test result = %s\n" pair)
        pair
    )
)

procedure(TOTA5_PinTest_20260810()
    let((cv pinMaster pin)
        cv = geGetEditCellView()
        unless(cv
            error("TOTA5: Open a NEW editable schematic first.\n")
        )
        pinMaster = dbOpenCellViewByType(
                        TOTA5_PIN_LIB
                        TOTA5_PIN_CELL
                        "symbol"
                        ""
                        "r"
                    )
        unless(pinMaster
            error("TOTA5: Cannot open basic/iopin/symbol.\n")
        )
        pin = schCreatePin(
                  cv
                  pinMaster
                  "TOTA5_PIN_TEST"
                  "input"
                  nil
                  0:0
                  "R0"
              )
        unless(pin
            error("TOTA5: Pin test FAILED.\n")
        )
        printf("TOTA5: Pin test PASSED. Created TOTA5_PIN_TEST.\n")
        pin
    )
)

; Main entry point.
; FIRST ACTION = ask NMOS or PMOS input pair.
; This version intentionally stops after the choice.
procedure(Create5TOTA()
    let((cv pair)
        cv = geGetEditCellView()
        unless(cv
            error("TOTA5: Open a NEW editable schematic first.\n")
        )
        pair = TOTA5_AskInputPair_20260810()
        printf("\nTOTA5: Input pair selected = %s\n" pair)
        printf("TOTA5: Selection accepted.\n")
        printf("TOTA5: Generator is intentionally stopping here.\n")
        printf("TOTA5: Next revision will build the selected topology.\n\n")
        pair
    )
)
