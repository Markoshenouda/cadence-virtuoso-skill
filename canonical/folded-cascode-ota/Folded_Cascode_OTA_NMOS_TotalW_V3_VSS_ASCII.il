;=============================================================================
; Folded-Cascode OTA - TotalW V3 VSS Patch
; Date: 2026-08-14
; Purpose: preserve the tested V2/V3 generator behavior and add an explicit
;          analogLib/vdc VSS source at 0 V.
;
; IMPORTANT
;   This file is a PATCH/DELTA for the repository V1 generator. Load the
;   repository V1 generator first, then load this file, then run:
;
;       CreateFoldedCascodeOTA_NMOS_TotalW_V3_VSS()
;
;   The user's tested local V3 file remains the exact test artifact. This
;   repository patch records the validated VSS addition without changing the
;   sizing values, topology, or PMOS orientation that were tested locally.
;=============================================================================

procedure(FCW_V3_SetVDC(inst value)
    let((cdf)
        cdf = cdfGetInstCDF(inst)
        unless(cdf
            error("FCW V3: VDC CDF missing on %s.\n" inst~>name)
        )
        unless(cdf->vdc
            error("FCW V3: VDC parameter missing on %s.\n" inst~>name)
        )
        cdf->vdc->value = value
        t
    )
)

procedure(FCW_V3_VDCPinCenter(inst pinName)
    let((term pin fig)
        term = dbFindTermByName(inst~>master pinName)
        unless(term
            error("FCW V3: VDC terminal %s missing on %s.\n" pinName inst~>name)
        )
        pin = car(term~>pins)
        unless(pin
            error("FCW V3: VDC pin missing on %s.%s.\n" inst~>name pinName)
        )
        fig = pin~>fig
        dbTransformPoint(centerBox(fig~>bBox) inst~>transform)
    )
)

procedure(FCW_V3_CreateVSSSource(cv)
    let((master inst plus minus ep em wp wm)
        master = dbOpenCellViewByType(
            "analogLib"
            "vdc"
            "symbol"
            ""
            "r"
        )
        unless(master
            error("FCW V3: cannot open analogLib/vdc.\n")
        )

        inst = dbCreateInst(
            cv
            master
            "VSS_SRC"
            14.0:8.0
            "R0"
        )
        unless(inst
            error("FCW V3: cannot create VSS_SRC.\n")
        )

        FCW_V3_SetVDC(inst "0.0")

        plus = FCW_V3_VDCPinCenter(inst "PLUS")
        minus = FCW_V3_VDCPinCenter(inst "MINUS")

        ep = list(car(plus) cadr(plus)+0.75)
        em = list(car(minus) cadr(minus)-0.75)

        wp = schCreateWire(
            cv "route" "full" list(plus ep) 0.0625 0.0625 0
        )
        wm = schCreateWire(
            cv "route" "full" list(minus em) 0.0625 0.0625 0
        )

        unless(wp && wm
            error("FCW V3: VSS_SRC stub creation failed.\n")
        )

        schCreateWireLabel(
            cv car(wp) ep "VSS" "lowerLeft" "R0" "stick" 0.0625 nil
        )
        schCreateWireLabel(
            cv car(wm) em "VSS" "lowerLeft" "R0" "stick" 0.0625 nil
        )

        printf("FCW V3: VSS_SRC = 0.0 V, PLUS->VSS, MINUS->VSS\n")
        inst
    )
)

procedure(CreateFoldedCascodeOTA_NMOS_TotalW_V3_VSS()
    let((cv existing)
        cv = geGetEditCellView()
        unless(cv
            error("FCW V3: Open the generated Folded-Cascode schematic first.\n")
        )

        ; Generate the tested base topology first.
        CreateFoldedCascodeOTA_NMOS_TotalW_V1()

        ; Add explicit VSS source required by the tested V3 artifact.
        existing = dbFindAnyInstByName(cv "VSS_SRC")
        unless(existing
            FCW_V3_CreateVSSSource(cv)
        )

        dbSave(cv)

        printf("\n")
        printf("============================================================\n")
        printf(" FCW TOTALW V3 VSS PATCH COMPLETE\n")
        printf("============================================================\n")
        printf("Base generator       : TotalW V1\n")
        printf("VSS source           : analogLib/vdc = 0.0 V\n")
        printf("VSS net              : explicit PLUS/MINUS VSS labels\n")
        printf("Sizing               : unchanged from tested base generator\n")
        printf("Topology             : unchanged\n")
        printf("Performance          : NOT VERIFIED\n")
        printf("============================================================\n")
        t
    )
)
