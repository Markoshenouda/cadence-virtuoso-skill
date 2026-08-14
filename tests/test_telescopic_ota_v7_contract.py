"""Static regression checks for the Cadence-verified Telescopic OTA V7 artifact.

These checks do not run Cadence; they protect the repository contract that was
verified in Cadence on 2026-08-12.
"""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "canonical" / "telescopic-ota" / "Telescopic_OTA_NMOS_Diff_TotalW_V7_VDC_InputBias_OutputPins_20260812.il"


class TelescopicOTAV7ContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.text = ARTIFACT.read_text(encoding="utf-8")

    def test_totalw_cdf_contract_is_explicit(self):
        for field in ("w", "l", "wf", "fingers", "simM", "totalM", "nf", "m"):
            self.assertIn(f"cdf->{field}->value", self.text)
        self.assertIn("totalM=sprintf(nil \"%d\" (atoi(NF) * atoi(M)))", self.text)

    def test_all_mos_have_totalw_first_sizing(self):
        for mos in range(1, 10):
            self.assertIn(f'"M{mos}"', self.text)
        self.assertIn('"10u" "1u" "1" "1"', self.text)
        self.assertIn('"12u" "1u" "1" "1"', self.text)

    def test_connectivity_uses_labels_on_local_stubs_only(self):
        self.assertIn("schCreateWire(cv \"route\" \"full\" list(p e)", self.text)
        self.assertIn("schCreateWireLabel", self.text)
        self.assertNotIn("schCreateWire(cv \"route\" \"full\" list(TOTA7_PinCenter", self.text)

    def test_vdc_sources_cover_supply_bias_and_inputs(self):
        self.assertIn('dbOpenCellViewByType("analogLib" "vdc" "symbol"', self.text)
        for source in ("VDD_SRC", "VSS_SRC", "VBN_TAIL_SRC", "VBN_CAS_SRC", "VBP_CAS_SRC", "VBP_LOAD_SRC", "VINP_SRC", "VINN_SRC"):
            self.assertIn(f'"{source}"', self.text)

    def test_outputs_are_pins_at_drain_stub_endpoints(self):
        self.assertIn('voutpEnd=TOTA7_LabelTerminal(cv M3 "D" "VOUTP")', self.text)
        self.assertIn('voutnEnd=TOTA7_LabelTerminal(cv M4 "D" "VOUTN")', self.text)
        self.assertIn('TOTA7_CreatePin(cv pinMaster "VOUTP" "output" voutpEnd)', self.text)
        self.assertIn('TOTA7_CreatePin(cv pinMaster "VOUTN" "output" voutnEnd)', self.text)

    def test_generator_saves_and_logs_verification_boundary(self):
        self.assertIn("dbSave(cv)", self.text)
        self.assertIn("STATUS   : SCHEMATIC GENERATED; PERFORMANCE NOT VERIFIED", self.text)


if __name__ == "__main__":
    unittest.main()
