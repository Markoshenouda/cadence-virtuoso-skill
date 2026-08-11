;==============================================================================
; 5T OTA PMOS + VDC RULE TEST — VALIDATED 2026-08-12
;
; This regression test captures the rules validated in the user's Cadence
; IC6.1.7 / tsmcN65 environment:
;   - PMOS source-top/drain-bottom verified from actual transformed S/D coords
;   - G and B are opposite horizontal directions
;   - S and D are opposite vertical directions
;   - every MOS terminal uses an isolated straight stub + net label
;   - logical shared nets use repeated labels, never terminal-to-terminal wires
;   - VDC-driven nets do not receive redundant external pins
;   - explicit 0-V VSS source uses VSS label on both PLUS and MINUS
;
; Main procedure:
;   Create5TOTA_PMOS_VDC_RULE_TEST_20260812()
;==============================================================================

