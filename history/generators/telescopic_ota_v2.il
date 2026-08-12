;=========================================================
; Telescopic OTA Generator V2
; Cadence Virtuoso IC6.1.7
; TSMC65
;
; Verified PDK information from user's working 5T generator:
;   Library : tsmcN65
;   NMOS    : nch
;   PMOS    : pch
;   Pins    : S G B D
;   CDF     : w l nf m
;
; Strategy:
;   1) Place devices.
;   2) Size through instance CDF (same method as working 5T).
;   3) Create SHORT wire stubs from each terminal.
;   4) Put the same net label on all stubs belonging to one net.
;
; This avoids long coordinate-to-coordinate wires and the
; crossings/ratsnest produced by the previous version.
;=========================================================

(setq TOTA_LIB "tsmcN65")
(setq TOTA_NMOS "nch")
(setq TOTA_PMOS "pch")
(setq TOTA_STUB 1.0)
(setq TOTA_LABEL_H 0.12)

procedure(TOTA_SetMOS(inst W L NF M)
    let((cdf)
        cdf = cdfGetInstCDF(inst)
        unless(cdf error("Cannot access CDF for instance %s\n" inst~>name))
        cdf->w->value = W
        cdf->l->value = L
        cdf->nf->value = NF
        cdf->m->value = M
    )
)

procedure(TOTA_PlaceMOS(cv lib cell instName xy orient)
    let((master inst)
        master = dbOpenCellViewByType(lib cell "symbol" "" "r")
        unless(master error("Cannot open master %s/%s/symbol\n" lib cell))
        inst = dbCreateInst(cv master instName xy orient)
        unless(inst error("Cannot create instance %s\n" instName))
        inst
    )
)

procedure(TOTA_PinCenter(inst pinName)
    let((term pin pinCenter)
        term = dbFindTermByName(inst~>master pinName)
        unless(term error("Pin %s not found in %s\n" pinName inst~>name))
        unless(term~>pins error("No pin figures for %s on %s\n" pinName inst~>name))
        pin = car(term~>pins)
        pinCenter = centerBox(pin~>fig~>bBox)
        dbTransformPoint(pinCenter inst~>transform)
    )
)

procedure(TOTA_StubEnd(inst pinName)
    let((p)
        p = TOTA_PinCenter(inst pinName)
        cond(
            ((equal(pinName "G")) list(car(p) - TOTA_STUB cadr(p)))
            ((equal(pinName "B")) list(car(p) + TOTA_STUB cadr(p)))
            ((equal(pinName "D")) list(car(p) cadr(p) + TOTA_STUB))
            ((equal(pinName "S")) list(car(p) cadr(p) - TOTA_STUB))
            (t error("Unknown pin %s\n" pinName))
        )
    )
)

procedure(TOTA_AddNetStub(cv inst pinName netName)
    let((p1 p2 wireList labelPos)
        p1 = TOTA_PinCenter(inst pinName)
        p2 = TOTA_StubEnd(inst pinName)
        wireList = schCreateWire(cv "draw" "full" list(p1 p2) 0.0625 0.0625 0.0)
        unless(wireList error("Cannot create wire stub: %s.%s\n" inst~>name pinName))
        labelPos = p2
        schCreateWireLabel(cv car(wireList) labelPos netName "lowerLeft" "R0" "fixed" TOTA_LABEL_H nil)
    )
)

procedure(TOTA_ExistingInstance(cv instName)
    car(setof(inst cv~>instances equal(inst~>name instName)))
)

procedure(CreateTelescopicOTA_V2()
    let((cv M1 M2 M3 M4 M5 M6 M7 M8 M9)
        printf("\n===============================================\n")
        printf("       TSMC65 TELESCOPIC OTA - V2\n")
        printf("===============================================\n")
        cv = geGetEditCellView()
        unless(cv error("Open a NEW empty schematic first.\n"))
        when(TOTA_ExistingInstance(cv "M1") error("M1 already exists. Use a NEW empty schematic.\n"))

        M1 = TOTA_PlaceMOS(cv TOTA_LIB TOTA_NMOS "M1" 2:4 "R0")
        M2 = TOTA_PlaceMOS(cv TOTA_LIB TOTA_NMOS "M2" 8:4 "R0")
        M3 = TOTA_PlaceMOS(cv TOTA_LIB TOTA_NMOS "M3" 2:7 "R0")
        M4 = TOTA_PlaceMOS(cv TOTA_LIB TOTA_NMOS "M4" 8:7 "R0")
        M5 = TOTA_PlaceMOS(cv TOTA_LIB TOTA_PMOS "M5" 2:10 "R0")
        M6 = TOTA_PlaceMOS(cv TOTA_LIB TOTA_PMOS "M6" 8:10 "R0")
        M7 = TOTA_PlaceMOS(cv TOTA_LIB TOTA_PMOS "M7" 2:13 "R0")
        M8 = TOTA_PlaceMOS(cv TOTA_LIB TOTA_PMOS "M8" 8:13 "R0")
        M9 = TOTA_PlaceMOS(cv TOTA_LIB TOTA_NMOS "M9" 5:0 "R0")

        TOTA_SetMOS(M1 "2u" "240n" "1" "1") TOTA_SetMOS(M2 "2u" "240n" "1" "1")
        TOTA_SetMOS(M3 "4u" "480n" "1" "1") TOTA_SetMOS(M4 "4u" "480n" "1" "1")
        TOTA_SetMOS(M5 "4u" "480n" "1" "1") TOTA_SetMOS(M6 "4u" "480n" "1" "1")
        TOTA_SetMOS(M7 "6u" "480n" "1" "1") TOTA_SetMOS(M8 "6u" "480n" "1" "1")
        TOTA_SetMOS(M9 "6u" "480n" "1" "1")

        TOTA_AddNetStub(cv M1 "G" "VINP") TOTA_AddNetStub(cv M2 "G" "VINN")
        TOTA_AddNetStub(cv M1 "D" "N1") TOTA_AddNetStub(cv M3 "S" "N1")
        TOTA_AddNetStub(cv M2 "D" "N2") TOTA_AddNetStub(cv M4 "S" "N2")
        TOTA_AddNetStub(cv M3 "G" "VBN") TOTA_AddNetStub(cv M4 "G" "VBN")
        TOTA_AddNetStub(cv M3 "D" "N3") TOTA_AddNetStub(cv M5 "D" "N3")
        TOTA_AddNetStub(cv M4 "D" "VOUT") TOTA_AddNetStub(cv M6 "D" "VOUT")
        TOTA_AddNetStub(cv M5 "G" "VBP_CAS") TOTA_AddNetStub(cv M6 "G" "VBP_CAS")
        TOTA_AddNetStub(cv M5 "S" "N5") TOTA_AddNetStub(cv M7 "D" "N5")
        TOTA_AddNetStub(cv M6 "S" "N6") TOTA_AddNetStub(cv M8 "D" "N6")
        TOTA_AddNetStub(cv M7 "G" "VBP") TOTA_AddNetStub(cv M8 "G" "VBP")
        TOTA_AddNetStub(cv M7 "S" "VDD") TOTA_AddNetStub(cv M8 "S" "VDD")
        TOTA_AddNetStub(cv M5 "B" "VDD") TOTA_AddNetStub(cv M6 "B" "VDD")
        TOTA_AddNetStub(cv M7 "B" "VDD") TOTA_AddNetStub(cv M8 "B" "VDD")
        TOTA_AddNetStub(cv M1 "S" "TAIL") TOTA_AddNetStub(cv M2 "S" "TAIL") TOTA_AddNetStub(cv M9 "D" "TAIL")
        TOTA_AddNetStub(cv M9 "G" "VBN_TAIL") TOTA_AddNetStub(cv M9 "S" "VSS")
        TOTA_AddNetStub(cv M1 "B" "VSS") TOTA_AddNetStub(cv M2 "B" "VSS")
        TOTA_AddNetStub(cv M3 "B" "VSS") TOTA_AddNetStub(cv M4 "B" "VSS") TOTA_AddNetStub(cv M9 "B" "VSS")

        schCheck(cv)
        dbSave(cv)
        printf("\nTelescopic OTA V2 generated.\n")
        list(M1 M2 M3 M4 M5 M6 M7 M8 M9)
    )
)

procedure(RemoveTelescopicOTADevices()
    let((cv inst names)
        cv = geGetEditCellView()
        unless(cv error("Open the schematic first.\n"))
        names = list("M1" "M2" "M3" "M4" "M5" "M6" "M7" "M8" "M9")
        foreach(inst cv~>instances when(member(inst~>name names) dbDeleteObject(inst)))
        dbSave(cv)
        printf("Telescopic OTA devices M1-M9 removed.\n")
    )
)
