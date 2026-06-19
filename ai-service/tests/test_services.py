import unittest

from app.schemas import ReportRequest, RiskRequest
from app.services import analyze_report, parse_labs, parse_prescription, score_risk, search_faq


class ServiceTests(unittest.TestCase):
    def test_prescription_parser(self):
        medicines, warnings = parse_prescription("Tab Paracetamol 500 mg BD after food\nCetirizine 10mg HS")
        self.assertEqual(len(medicines), 2)
        self.assertEqual(medicines[0].dosage.lower(), "500 mg")
        self.assertEqual(medicines[0].frequency, "Twice daily")
        self.assertTrue(warnings)

    def test_risk_scoring_is_explainable(self):
        result = RiskRequest(
            age=67,
            bmi=33,
            systolic_bp=152,
            smoking="current",
            activity="low",
            diet="poor",
            alcohol="high",
            sleep=5,
            family_history=["heart"],
        )
        overall, level, conditions = score_risk(result)
        self.assertGreater(overall, 40)
        self.assertIn(level, {"Moderate", "High"})
        self.assertTrue(conditions[0].reasons)

    def test_lab_parser(self):
        results = parse_labs("Hb: 9.8 g/dL, HbA1c = 7.2 %, Creatinine 1.0")
        self.assertEqual(len(results), 3)
        self.assertEqual(results[0].flag, "Low")

    def test_report_red_flag(self):
        result = analyze_report(ReportRequest(symptoms="Severe chest pain and difficulty breathing"))
        self.assertEqual(result["risk_level"], "Emergency")
        self.assertTrue(result["red_flags"])

    def test_faq(self):
        answer, score, emergency, sources = search_faq("what should I do for a broken bone")
        self.assertGreater(score, 0.1)
        self.assertIn("straighten", answer)
        self.assertFalse(emergency)
        self.assertTrue(sources)


if __name__ == "__main__":
    unittest.main()
