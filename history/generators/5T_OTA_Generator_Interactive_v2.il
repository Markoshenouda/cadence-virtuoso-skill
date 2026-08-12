;=========================================================
; 5T OTA Generator — Interactive Input-Pair Selection V2
; Cadence Virtuoso IC6.1.7 / TSMC65
;
; V2 FIX:
; Do NOT use hiGetString(). It is unavailable in the user's CIW.
; CIW keyboard input uses gets() + sscanf().
;
; FIRST STEP:
; The generator asks whether the differential input pair is
; NMOS or PMOS, then returns that choice.
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

;---------------------------------------------------------
; CIW input helper
;
; gets() reads a line from the CIW input stream.
; sscanf() parses the first whitespace-delimited token.
;---------------------------------------------------------

procedure(TOTA5_AskInputPair_20260810()
    let((line answer normalized)

        printf("\n")
        printf("=====================================================\n")
        printf("              5T OTA DESIGN SETUP\n")
        printf("=====================================================\n")
        printf("Choose the differential input pair:\n")
        printf("  NMOS  -> NMOS input pair\n")
        printf("  PMOS  -> PMOS input pair\n")
        printf("Type NMOS or PMOS, then press ENTER:\n")
        printf("=====================================================\n")

        line = gets()

        unless(line
            error("TOTA5: Input-pair selection was cancelled.\n")
        )

        answer = nil
        sscanf(line "%s" answer)

        unless(answer
            error("TOTA5: Empty input. Enter NMOS or PMOS.\n")
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
                error("TOTA5: Invalid input '%s'. Enter NMOS or PMOS.\n" answer)
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

;---------------------------------------------------------
; Main
;---------------------------------------------------------

procedure(Create5TOTA()
    let((cv pair)
        cv = geGetEditCellView()
        unless(cv
            error("TOTA5: Open a NEW editable schematic first.\n")
        )

        ; FIRST ACTION = ask NMOS or PMOS input pair.
        pair = TOTA5_AskInputPair_20260810()

        printf("\nTOTA5: Input pair selected = %s\n" pair)
        printf("TOTA5: Selection accepted.\n")
        printf("TOTA5: Generator is intentionally stopping here.\n")
        printf("TOTA5: Next revision will build the selected topology.\n\n")

        pair
    )
)
