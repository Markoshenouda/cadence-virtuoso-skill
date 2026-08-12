# Telescopic OTA V7 Regression Ledger

## Automated repository checks

Run:

```powershell
& "C:\Users\marko\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" -m unittest tests/test_telescopic_ota_v7_contract.py -v
```

The test protects explicit CDF fields, `NF*M`, M1–M9 sizing declarations, local-stub label routing, VDC source coverage, true output-pin endpoints, save behavior, and the performance-verification boundary.

## Cadence regression checklist

- [x] V7 recorded as load/run plus `SCH-1426` no-errors and `SCH-1181` saved on 2026-08-12.
- [ ] Re-run exact V7 in the target library and retain fresh CIW output.
- [ ] Confirm all M1–M9 CDF values and `totalM = NF*M`.
- [ ] Confirm every MOS/VDC terminal has one local stub and label, with no device-to-device wire.
- [ ] Confirm VDD, VSS, four bias nets, VINP, and VINN have VDC sources; no input/bias floating-net warning occurs.
- [ ] Confirm VOUTP and VOUTN pins sit at M3.D and M4.D stub endpoints.
- [ ] Complete Check and Save with no schematic errors.

These manual checks deliberately remain unchecked until a new live Cadence run is supplied; the repository does not simulate Cadence.
