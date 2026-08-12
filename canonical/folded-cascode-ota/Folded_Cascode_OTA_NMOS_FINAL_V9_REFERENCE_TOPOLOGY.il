;=============================================================================
; Folded Cascode OTA Generator - FINAL V5
; Cadence Virtuoso IC6.1.7 / SKILL
; PDK: TSMC65 / tsmcN65
;
; DESIGN TARGET
;   Input pair       = NMOS
;   VDD              = 1.5 V
;   VSS              = 0 V
;   DC Gain          > 60 dB
;   GBW              >= 100 MHz
;   CL               = 5 pF
;   Temperature      = 27 C
;   Corner           = TT
;   Output           = Single-ended
;   gm/ID            = Auto
;   L selection      = gm/ID optimized
;   Layout-oriented  = YES
;
; IMPORTANT
;   This generator creates the schematic and named nets. It does NOT create
;   that the starting dimensions already satisfy the gain/GBW targets.
;   Device sizing is a layout-oriented starting point and must be verified
;   with Spectre operating-point/AC/transient simulation.
;
; VERIFIED ENVIRONMENT / APIs
;   geGetEditCellView
;   dbOpenCellViewByType
;   dbCreateInst
;   cdfGetInstCDF
;   dbFindTermByName
;   dbTransformPoint
;   schCreateWire
;   schCreateWireLabel
;   schCreatePin
;
; DO NOT USE
;   unsupported generic label API
;   vector point addition
;
; VERIFIED analogLib/vdc
;   Library       = analogLib
;   Cell          = vdc
;   Terminals     = PLUS / MINUS
;   PLUS center   = (0.0 0.0)
;   MINUS center  = (0.0 -0.375)
;   CDF parameter = vdc
;
; EXTERNAL PINS
;   VINP
;   VINN
;   VOUT
;   VDD
;   VSS
;   VBP_FOLD
;   VBN_CAS
;   VBN_SINK
;   VBN_TAIL
;
; INTERNAL NET LABELS
;   NLEFT
;   NRIGHT
;   FOLD_L
;   FOLD_R
;   TAIL
;   LEFT_SINK
;   RIGHT_SINK
;=============================================================================


;-----------------------------------------------------------------------------
; Utility: scalar point offset
;-----------------------------------------------------------------------------
procedure(FC5_OffsetPoint(p dx dy)
    list(
        car(p) + dx
        cadr(p) + dy
    )
)


;-----------------------------------------------------------------------------
; Set MOS CDF
;-----------------------------------------------------------------------------
procedure(FC5_SetMOS(inst W L NF M)
    let((cdf)
        cdf = cdfGetInstCDF(inst)

        unless(cdf
            error("FC5_SetMOS: Cannot access MOS CDF for %L.\n" inst)
        )

        cdf->w->value  = W
        cdf->l->value  = L
        cdf->nf->value = NF
        cdf->m->value  = M
    )
)


;-----------------------------------------------------------------------------
; Set analogLib/vdc CDF
;-----------------------------------------------------------------------------
procedure(FC5_SetVDC(inst value)
    let((cdf)
        cdf = cdfGetInstCDF(inst)

        unless(cdf
            error("FC5_SetVDC: Cannot access VDC CDF for %L.\n" inst)
        )

        cdf->vdc->value = value
    )
)


;-----------------------------------------------------------------------------
; Open master
;-----------------------------------------------------------------------------
procedure(FC5_OpenMaster(lib cell)
    let((master)
        master = dbOpenCellViewByType(
                    lib
                    cell
                    "symbol"
                    ""
                    "r"
                 )

        unless(master
            error("FC5: Cannot open master %s/%s.\n" lib cell)
        )

        master
    )
)


;-----------------------------------------------------------------------------
; Place MOS
;
; orientation:
;   NMOS = R0
;   PMOS = MX  -> source visually on top, drain below
;-----------------------------------------------------------------------------
procedure(FC5_PlaceMOS(cv lib cell instName xy orientation W L)
    let((master inst)
        master = FC5_OpenMaster(lib cell)

        inst = dbCreateInst(
                    cv
                    master
                    instName
                    xy
                    orientation
               )

        unless(inst
            error("FC5: Cannot create MOS instance %s.\n" instName)
        )

        FC5_SetMOS(inst W L "1" "1")

        inst
    )
)


;-----------------------------------------------------------------------------
; Place VDC
;
; VDC symbol in this environment:
;
;             PLUS
;               |
;              VDC
;               |
;             MINUS
;
; PLUS  = upper terminal
; MINUS = lower terminal
;-----------------------------------------------------------------------------
procedure(FC5_PlaceVDC(cv instName xy value)
    let((master inst)
        master = FC5_OpenMaster("analogLib" "vdc")

        inst = dbCreateInst(
                    cv
                    master
                    instName
                    xy
                    "R0"
               )

        unless(inst
            error("FC5: Cannot create VDC instance %s.\n" instName)
        )

        FC5_SetVDC(inst value)

        inst
    )
)


;-----------------------------------------------------------------------------
; Get actual MOS pin center in schematic coordinates
;-----------------------------------------------------------------------------
procedure(FC5_PinCenter(inst pinName)
    let((term pin fig masterXY)
        term = dbFindTermByName(inst~>master pinName)

        unless(term
            error(
                "FC5_PinCenter: Terminal %s not found on %s.\n"
                pinName
                inst~>name
            )
        )

        pin = car(term~>pins)

        unless(pin
            error(
                "FC5_PinCenter: No pin figure for %s on %s.\n"
                pinName
                inst~>name
            )
        )

        fig = pin~>fig

        unless(fig
            error(
                "FC5_PinCenter: No figure for %s on %s.\n"
                pinName
                inst~>name
            )
        )

        masterXY = centerBox(fig~>bBox)

        dbTransformPoint(
            masterXY
            inst~>transform
        )
    )
)


;-----------------------------------------------------------------------------
; Get actual VDC terminal center
;
; VDC verified terminal names are PLUS and MINUS.
;-----------------------------------------------------------------------------
procedure(FC5_VDCPinCenter(inst pinName)
    let((term pin fig)
        term = dbFindTermByName(inst~>master pinName)

        unless(term
            error(
                "FC5_VDCPinCenter: Terminal %s not found on %s.\n"
                pinName
                inst~>name
            )
        )

        pin = car(term~>pins)

        unless(pin
            error(
                "FC5_VDCPinCenter: No pin for %s on %s.\n"
                pinName
                inst~>name
            )
        )

        fig = pin~>fig

        unless(fig
            error(
                "FC5_VDCPinCenter: No figure for %s on %s.\n"
                pinName
                inst~>name
            )
        )

        dbTransformPoint(
            centerBox(fig~>bBox)
            inst~>transform
        )
    )
)


;-----------------------------------------------------------------------------
; Create schematic wire
;-----------------------------------------------------------------------------
procedure(FC5_CreateWire(cv points)
    schCreateWire(
        cv
        "route"
        "full"
        points
        0.0625
        0.0625
        0
    )
)


;-----------------------------------------------------------------------------
; Label the END of a wire with a net name
;-----------------------------------------------------------------------------
procedure(FC5_LabelWire(cv wire point netName)
    schCreateWireLabel(
        cv
        car(wire)
        point
        netName
        "lowerLeft"
        "R0"
        "stick"
        0.0625
        nil
    )
)


;-----------------------------------------------------------------------------
; Connect ONE MOS terminal to ONE net label with ONE straight isolated stub.
;
; PHYSICAL PIN DIRECTIONS VERIFIED FOR THIS SYMBOL STYLE:
;   G = left
;   B = right
;   NMOS: D = up, S = down
;   PMOS: D = down, S = up
;
; IMPORTANT:
;   The branch (left/right) of the transistor does NOT change pin direction.
;   This fixes the previous bug where right-side MOS gates were routed through
;   the symbol because the branch side was incorrectly used as G/B direction.
;
;   Every G/D/S/B gets exactly one isolated straight wire.
;   No terminal-to-terminal wire is ever created.
;-----------------------------------------------------------------------------
procedure(FC8_LabelMOSNet(cv inst pinName netName)
    let((p1 p2 wire dx dy stub)

        p1 = FC5_PinCenter(inst pinName)
        stub = 1.0
        dx = 0.0
        dy = 0.0

        if(equal(pinName "G")
            then
                dx = -stub
            else
                if(equal(pinName "B")
                    then
                        dx = stub
                    else
                        if(equal(inst~>master~>cellName "pch")
                            then
                                if(equal(pinName "D")
                                    then
                                        dy = -stub
                                    else
                                        dy = stub
                                )
                            else
                                if(equal(pinName "D")
                                    then
                                        dy = stub
                                    else
                                        dy = -stub
                                )
                        )
                )
        )

        p2 = FC5_OffsetPoint(p1 dx dy)

        wire = FC5_CreateWire(
                    cv
                    list(p1 p2)
                )

        FC5_LabelWire(
            cv
            wire
            p2
            netName
        )

        wire
    )
)


;-----------------------------------------------------------------------------
; Connect VDC terminal to a named net.
;
; PLUS is physically above MINUS in analogLib/vdc.
;-----------------------------------------------------------------------------
procedure(FC5_LabelVDCTerminal(cv inst pinName netName)
    let((p1 p2 wire)
        p1 = FC5_VDCPinCenter(inst pinName)

        if(equal(pinName "PLUS")
            then
                p2 = FC5_OffsetPoint(p1 0.0 1.0)
            else
                p2 = FC5_OffsetPoint(p1 0.0 -1.0)
        )

        wire = FC5_CreateWire(
                    cv
                    list(p1 p2)
                )

        FC5_LabelWire(
            cv
            wire
            p2
            netName
        )

        wire
    )
)


;-----------------------------------------------------------------------------
; Create real external schematic pin
;
; basic/iopin/symbol was verified in the user's environment.
;-----------------------------------------------------------------------------
procedure(FC5_CreateExternalPin(cv pinMaster netName direction xy)
    schCreatePin(
        cv
        pinMaster
        netName
        direction
        nil
        xy
        "R0"
    )
)


;-----------------------------------------------------------------------------
; Place a real external pin and a short local named-wire stub.
;
; The pin is created at xy. A short wire extends to the right so the pin
; remains visually readable and separated from the OTA core.
;-----------------------------------------------------------------------------
procedure(FC5_CreatePinWithStub(cv pinMaster netName direction xy)
    let((p2 wire)
        FC5_CreateExternalPin(
            cv
            pinMaster
            netName
            direction
            xy
        )

        p2 = FC5_OffsetPoint(xy 1.0 0.0)

        wire = FC5_CreateWire(
                    cv
                    list(xy p2)
                )

        FC5_LabelWire(
            cv
            wire
            p2
            netName
        )

        wire
    )
)


;-----------------------------------------------------------------------------
; Create one VDC source with:
;
;       NET
;        |
;      PLUS
;        |
;       VDC
;        |
;      MINUS
;        |
;       VSS
;
; The actual VDC terminal coordinates are obtained from the symbol master,
; not guessed.
;-----------------------------------------------------------------------------
procedure(FC5_CreateBiasVDC(cv instName xy value plusNet)
    let((vdc)
        vdc = FC5_PlaceVDC(
                    cv
                    instName
                    xy
                    value
               )

        FC5_LabelVDCTerminal(
            cv
            vdc
            "PLUS"
            plusNet
        )

        FC5_LabelVDCTerminal(
            cv
            vdc
            "MINUS"
            "VSS"
        )

        vdc
    )
)


;-----------------------------------------------------------------------------
; Main generator - FINAL V9
;
; TARGET TOPOLOGY (matches the supplied reference drawing)
;
;                           VDD
;                    ┌──────┴──────┐
;                   M3             M4
;                VBP2│           │VBP2
;                    │             │
;                 NLEFT          NRIGHT
;                    │             │
;                   M5             M6
;                VBP1│           │VBP1
;                    │             │
;                 FOLD_L         VOUT
;                    │             │
;                   M7             M8
;                VBN1│           │VBN1
;                    │             │
;               LEFT_SINK     RIGHT_SINK
;                    │             │
;                   M9             M10
;                VBN2│           │VBN2
;                    └──────┬──────┘
;                           VSS
;
; Input pair:
;
;             VINP ──G M1              M2 G── VINN
;                    D │              │ D
;                      NLEFT        NRIGHT
;                    S └──── TAIL ────┘ S
;                              │
;                             M11
;                          VBN2 gate
;                              │
;                             VSS
;
; Single-ended output:
;   VOUT = right branch between M6 drain and M8 drain.
;
; CRITICAL ROUTING RULE:
;   Every MOS terminal receives one short straight stub and one net label.
;   No MOS terminal is physically wired to another MOS terminal.
;   Shared connectivity is created by identical net names only.
;-----------------------------------------------------------------------------

procedure(CreateFoldedCascodeOTA_NMOS_FINAL_V9()

    let((cv
         pinMaster
         M1 M2
         M3 M4
         M5 M6
         M7 M8
         M9 M10
         M11
         VDD_SRC
         VBP2_SRC
         VBP1_SRC
         VBN1_SRC
         VBN2_SRC)

        ;=====================================================================
        ; 0. Current schematic
        ;=====================================================================
        cv = geGetEditCellView()

        unless(cv
            error("Please open a NEW empty schematic first.\n")
        )

        printf("\n")
        printf("============================================================\n")
        printf(" FOLDED CASCODE OTA - NMOS INPUT - FINAL V9\n")
        printf("============================================================\n")
        printf(" PDK          : tsmcN65\n")
        printf(" VDD          : 1.5 V\n")
        printf(" VSS          : 0 V\n")
        printf(" Input pair   : NMOS\n")
        printf(" Output       : Single-ended\n")
        printf(" Target Gain  : > 60 dB\n")
        printf(" Target GBW   : >= 100 MHz\n")
        printf(" CL           : 5 pF\n")
        printf(" Corner       : TT\n")
        printf(" Temperature  : 27 C\n")
        printf("============================================================\n")

        ;=====================================================================
        ; 1. Pin master
        ;=====================================================================
        pinMaster = FC5_OpenMaster(
                        "basic"
                        "iopin"
                    )

        ;=====================================================================
        ; 2. DEVICE PLACEMENT
        ;
        ; The coordinates intentionally reproduce the reference arrangement:
        ;
        ;   TOP:       M3       M4        PMOS
        ;   LEVEL 2:  M5       M6        PMOS
        ;   LEVEL 3:  M7       M8        NMOS
        ;   LEVEL 4:  M9       M10       NMOS
        ;   INPUT:    M1       M2        NMOS
        ;   TAIL:             M11        NMOS
        ;
        ; NMOS = R0
        ; PMOS = MX (source visually on top / drain below)
        ;=====================================================================

        ;-------------------------
        ; PMOS top pair
        ;-------------------------
        M3 = FC5_PlaceMOS(
                cv "tsmcN65" "pch" "M3"
                2:18
                "MX"
                "6u" "480n"
             )

        M4 = FC5_PlaceMOS(
                cv "tsmcN65" "pch" "M4"
                8:18
                "MX"
                "6u" "480n"
             )

        ;-------------------------
        ; PMOS folded pair
        ;-------------------------
        M5 = FC5_PlaceMOS(
                cv "tsmcN65" "pch" "M5"
                2:14
                "MX"
                "6u" "480n"
             )

        M6 = FC5_PlaceMOS(
                cv "tsmcN65" "pch" "M6"
                8:14
                "MX"
                "6u" "480n"
             )

        ;-------------------------
        ; NMOS folded/cascode pair
        ;-------------------------
        M7 = FC5_PlaceMOS(
                cv "tsmcN65" "nch" "M7"
                2:10
                "R0"
                "6u" "480n"
             )

        M8 = FC5_PlaceMOS(
                cv "tsmcN65" "nch" "M8"
                8:10
                "R0"
                "6u" "480n"
             )

        ;-------------------------
        ; NMOS lower current sinks
        ;-------------------------
        M9 = FC5_PlaceMOS(
                cv "tsmcN65" "nch" "M9"
                2:6
                "R0"
                "6u" "480n"
             )

        M10 = FC5_PlaceMOS(
                 cv "tsmcN65" "nch" "M10"
                 8:6
                 "R0"
                 "6u" "480n"
              )

        ;-------------------------
        ; NMOS differential input pair
        ;-------------------------
        M1 = FC5_PlaceMOS(
                cv "tsmcN65" "nch" "M1"
                2:2
                "R0"
                "4u" "240n"
             )

        M2 = FC5_PlaceMOS(
                cv "tsmcN65" "nch" "M2"
                8:2
                "R0"
                "4u" "240n"
             )

        ;-------------------------
        ; NMOS tail current source
        ;-------------------------
        M11 = FC5_PlaceMOS(
                 cv "tsmcN65" "nch" "M11"
                 5:-2
                 "R0"
                 "6u" "480n"
              )

        ;=====================================================================
        ; 3. MOS NET ASSIGNMENT
        ;
        ; IMPORTANT:
        ;   These are labels on isolated terminal stubs.
        ;   No terminal-to-terminal wire is created.
        ;=====================================================================

        ;-------------------------
        ; Input pair
        ;-------------------------
        FC8_LabelMOSNet(cv M1 "G" "VINP")
        FC8_LabelMOSNet(cv M1 "D" "NLEFT")
        FC8_LabelMOSNet(cv M1 "S" "TAIL")
        FC8_LabelMOSNet(cv M1 "B" "VSS")

        FC8_LabelMOSNet(cv M2 "G" "VINN")
        FC8_LabelMOSNet(cv M2 "D" "NRIGHT")
        FC8_LabelMOSNet(cv M2 "S" "TAIL")
        FC8_LabelMOSNet(cv M2 "B" "VSS")

        ;-------------------------
        ; Top PMOS pair
        ;-------------------------
        FC8_LabelMOSNet(cv M3 "G" "VBP2")
        FC8_LabelMOSNet(cv M3 "D" "NLEFT")
        FC8_LabelMOSNet(cv M3 "S" "VDD")
        FC8_LabelMOSNet(cv M3 "B" "VDD")

        FC8_LabelMOSNet(cv M4 "G" "VBP2")
        FC8_LabelMOSNet(cv M4 "D" "NRIGHT")
        FC8_LabelMOSNet(cv M4 "S" "VDD")
        FC8_LabelMOSNet(cv M4 "B" "VDD")

        ;-------------------------
        ; PMOS folded pair
        ;-------------------------
        FC8_LabelMOSNet(cv M5 "G" "VBP1")
        FC8_LabelMOSNet(cv M5 "D" "FOLD_L")
        FC8_LabelMOSNet(cv M5 "S" "NLEFT")
        FC8_LabelMOSNet(cv M5 "B" "VDD")

        FC8_LabelMOSNet(cv M6 "G" "VBP1")
        FC8_LabelMOSNet(cv M6 "D" "VOUT")
        FC8_LabelMOSNet(cv M6 "S" "NRIGHT")
        FC8_LabelMOSNet(cv M6 "B" "VDD")

        ;-------------------------
        ; NMOS folded/cascode pair
        ;-------------------------
        FC8_LabelMOSNet(cv M7 "G" "VBN1")
        FC8_LabelMOSNet(cv M7 "D" "FOLD_L")
        FC8_LabelMOSNet(cv M7 "S" "LEFT_SINK")
        FC8_LabelMOSNet(cv M7 "B" "VSS")

        FC8_LabelMOSNet(cv M8 "G" "VBN1")
        FC8_LabelMOSNet(cv M8 "D" "VOUT")
        FC8_LabelMOSNet(cv M8 "S" "RIGHT_SINK")
        FC8_LabelMOSNet(cv M8 "B" "VSS")

        ;-------------------------
        ; NMOS lower sinks
        ;-------------------------
        FC8_LabelMOSNet(cv M9 "G" "VBN2")
        FC8_LabelMOSNet(cv M9 "D" "LEFT_SINK")
        FC8_LabelMOSNet(cv M9 "S" "VSS")
        FC8_LabelMOSNet(cv M9 "B" "VSS")

        FC8_LabelMOSNet(cv M10 "G" "VBN2")
        FC8_LabelMOSNet(cv M10 "D" "RIGHT_SINK")
        FC8_LabelMOSNet(cv M10 "S" "VSS")
        FC8_LabelMOSNet(cv M10 "B" "VSS")

        ;-------------------------
        ; Tail
        ;-------------------------
        FC8_LabelMOSNet(cv M11 "G" "VBN2")
        FC8_LabelMOSNet(cv M11 "D" "TAIL")
        FC8_LabelMOSNet(cv M11 "S" "VSS")
        FC8_LabelMOSNet(cv M11 "B" "VSS")

        ;=====================================================================
        ; 4. EXTERNAL PIN COLUMN
        ;
        ; One X coordinate, vertically ordered.
        ;=====================================================================

        FC5_CreatePinWithStub(cv pinMaster "VINP" "input"       -16:20)
        FC5_CreatePinWithStub(cv pinMaster "VINN" "input"       -16:17)
        FC5_CreatePinWithStub(cv pinMaster "VOUT" "output"      -16:14)
        FC5_CreatePinWithStub(cv pinMaster "VDD"  "inputOutput" -16:11)
        FC5_CreatePinWithStub(cv pinMaster "VSS"  "inputOutput" -16:8)
        FC5_CreatePinWithStub(cv pinMaster "VBP2" "input"       -16:5)
        FC5_CreatePinWithStub(cv pinMaster "VBP1" "input"       -16:2)
        FC5_CreatePinWithStub(cv pinMaster "VBN1" "input"       -16:-1)
        FC5_CreatePinWithStub(cv pinMaster "VBN2" "input"       -16:-4)

        ;=====================================================================
        ; 5. BIAS SOURCES
        ;
        ; Starting values only. These are not claimed to be final bias points.
        ;
        ;   VDD  = 1.50 V
        ;   VBP2 = 1.20 V
        ;   VBP1 = 0.90 V
        ;   VBN1 = 0.75 V
        ;   VBN2 = 0.60 V
        ;
        ; Every VDC:
        ;       PLUS  -> named bias net
        ;       MINUS -> VSS
        ;=====================================================================

        VDD_SRC = FC5_CreateBiasVDC(
                        cv "VDD_SRC" 20:24 "1.50" "VDD"
                  )

        VBP2_SRC = FC5_CreateBiasVDC(
                         cv "VBP2_SRC" 20:19 "1.20" "VBP2"
                   )

        VBP1_SRC = FC5_CreateBiasVDC(
                         cv "VBP1_SRC" 20:14 "0.90" "VBP1"
                   )

        VBN1_SRC = FC5_CreateBiasVDC(
                         cv "VBN1_SRC" 20:9 "0.75" "VBN1"
                   )

        VBN2_SRC = FC5_CreateBiasVDC(
                         cv "VBN2_SRC" 20:4 "0.60" "VBN2"
                   )

        ;=====================================================================
        ; 6. SAVE
        ;=====================================================================

        dbSave(cv)

        printf("\n")
        printf("============================================================\n")
        printf(" FOLDED CASCODE OTA V9 GENERATED\n")
        printf("============================================================\n")
        printf(" Reference topology:\n")
        printf("   M3/M4  -> PMOS top pair\n")
        printf("   M5/M6  -> PMOS folded pair\n")
        printf("   M7/M8  -> NMOS folded pair\n")
        printf("   M9/M10 -> NMOS lower sinks\n")
        printf("   M1/M2  -> NMOS input pair\n")
        printf("   M11    -> NMOS tail source\n")
        printf("\n")
        printf(" Biases:\n")
        printf("   VDD  = 1.50 V\n")
        printf("   VBP2 = 1.20 V\n")
        printf("   VBP1 = 0.90 V\n")
        printf("   VBN1 = 0.75 V\n")
        printf("   VBN2 = 0.60 V\n")
        printf("\n")
        printf(" VINP/VINN initial DC = 0.75 V\n")
        printf(" VOUT = right folded branch\n")
        printf(" No terminal-to-terminal MOS wiring is generated.\n")
        printf(" Shared nets use repeated labels only.\n")
        printf("============================================================\n")

        t
    )
)


;=============================================================================
; END OF FILE
;=============================================================================
