import math
import re
from dataclasses import dataclass

from .schemas import (
    ConditionRisk,
    LabResult,
    Medicine,
    ReportRequest,
    RiskRequest,
)


DISCLAIMER = (
    "This is educational decision support, not a diagnosis or prescription. "
    "A qualified clinician must verify important medical decisions."
)


def _level(score: int) -> str:
    if score >= 70:
        return "High"
    if score >= 40:
        return "Moderate"
    return "Low"


def parse_prescription(text: str) -> tuple[list[Medicine], list[str]]:
    frequency_rules = [
        (r"\b(qid|four times|4 times)\b", "Four times daily", "09:00"),
        (r"\b(tds|tid|three times|3 times)\b", "Three times daily", "09:00"),
        (r"\b(bd|bid|twice|two times|2 times)\b", "Twice daily", "09:00"),
        (r"\b(od|once daily|daily|morning)\b", "Once daily", "09:00"),
        (r"\b(hs|bedtime|night)\b", "At bedtime", "21:00"),
        (r"\b(sos|prn|as needed)\b", "As needed", "09:00"),
    ]
    lines = [part.strip(" -*\t") for part in re.split(r"[\n;]+", text) if part.strip()]
    medicines: list[Medicine] = []

    for line in lines:
        if re.fullmatch(r"(?i)(rx|prescription|medicines?|patient|doctor|date)\s*:?", line):
            continue
        dose_match = re.search(
            r"(?i)\b(\d+(?:\.\d+)?)\s*(mg|mcg|g|ml|iu|units?)\b", line
        )
        dosage = dose_match.group(0) if dose_match else ""
        frequency, time = "As directed", "09:00"
        matched_frequency = False
        for pattern, label, default_time in frequency_rules:
            if re.search(pattern, line, re.I):
                frequency, time, matched_frequency = label, default_time, True
                break

        route = "Topical" if re.search(r"\b(cream|ointment|topical|apply)\b", line, re.I) else "Oral"
        cleaned = re.sub(r"(?i)\b(tab(?:let)?|cap(?:sule)?|syrup|inj(?:ection)?)\.?\b", "", line)
        if dose_match:
            cleaned = cleaned.replace(dose_match.group(0), "")
        for pattern, _, _ in frequency_rules:
            cleaned = re.sub(pattern, "", cleaned, flags=re.I)
        cleaned = re.sub(r"(?i)\b(after|before|with)\s+(food|meals?)\b", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,.-:")
        name = cleaned.split(",")[0].strip()
        if len(name) < 2 or len(name) > 80 or not re.search(r"[A-Za-z]", name):
            continue

        confidence = 0.48 + (0.22 if dose_match else 0) + (0.18 if matched_frequency else 0)
        medicines.append(
            Medicine(
                name=name.title(),
                dosage=dosage,
                frequency=frequency,
                time=time,
                route=route,
                notes="Verify the OCR text and instructions against the original prescription.",
                confidence=min(round(confidence, 2), 0.92),
            )
        )

    warnings = []
    if not medicines:
        warnings.append("No reliable medicine lines were detected.")
    if any(item.confidence < 0.7 for item in medicines):
        warnings.append("Some entries have low confidence and need manual correction.")
    warnings.append("Medicine names and doses must be checked against the original prescription.")
    return medicines[:20], warnings


CONDITIONS = [
    ("Cardiovascular disease", 8, 8, 13, 13, "heart"),
    ("Type 2 diabetes", 7, 16, 6, 8, "diabetes"),
    ("Hypertension", 6, 8, 22, 8, "hypertension"),
    ("Stroke", 9, 7, 15, 14, "stroke"),
    ("Chronic kidney disease", 8, 9, 12, 7, "kidney"),
    ("Fatty liver disease", 5, 17, 5, 8, "liver"),
    ("Sleep apnea", 5, 18, 7, 5, "sleep"),
    ("COPD", 7, 4, 6, 24, "lung"),
    ("Osteoarthritis", 14, 11, 3, 3, "arthritis"),
    ("Osteoporosis", 15, 5, 3, 5, "osteoporosis"),
    ("Thyroid disorder", 6, 7, 3, 3, "thyroid"),
    ("Depression", 4, 5, 3, 6, "mental"),
    ("Anxiety disorder", 3, 3, 2, 5, "mental"),
    ("Metabolic syndrome", 7, 18, 13, 9, "diabetes"),
    ("Peripheral artery disease", 10, 8, 14, 18, "heart"),
    ("Gout", 7, 13, 5, 7, "gout"),
    ("Gallstone disease", 7, 13, 3, 4, "gallstone"),
    ("Colorectal cancer", 10, 5, 3, 7, "cancer"),
    ("Breast or prostate cancer", 10, 5, 2, 5, "cancer"),
    ("Dementia", 18, 4, 7, 8, "dementia"),
]


def score_risk(data: RiskRequest) -> tuple[int, str, list[ConditionRisk]]:
    family = {item.lower() for item in data.family_history}
    results: list[ConditionRisk] = []
    for name, age_w, bmi_w, bp_w, smoke_w, family_key in CONDITIONS:
        score = 8
        reasons: list[str] = []
        if data.age >= 60:
            score += age_w * 2
            reasons.append("age 60 or above")
        elif data.age >= 45:
            score += age_w
            reasons.append("age 45 or above")
        if data.bmi >= 30:
            score += bmi_w
            reasons.append("BMI in obesity range")
        elif data.bmi >= 25:
            score += round(bmi_w * 0.55)
            reasons.append("BMI in overweight range")
        if data.systolic_bp >= 140:
            score += bp_w
            reasons.append("high entered systolic blood pressure")
        elif data.systolic_bp >= 130:
            score += round(bp_w * 0.55)
            reasons.append("elevated entered systolic blood pressure")
        if data.smoking == "current":
            score += smoke_w
            reasons.append("current smoking")
        elif data.smoking == "former":
            score += round(smoke_w * 0.35)
            reasons.append("past smoking")
        if data.activity == "low":
            score += 8
            reasons.append("low activity")
        if data.diet == "poor":
            score += 8
            reasons.append("poor diet")
        if data.alcohol == "high":
            score += 7
            reasons.append("high alcohol intake")
        if data.sleep < 6 or data.sleep > 9:
            score += 5
            reasons.append("sleep outside the usual 6-9 hour range")
        if family_key in family or name.lower() in family:
            score += 16
            reasons.append("reported family history")
        score = min(score, 95)
        results.append(
            ConditionRisk(name=name, score=score, level=_level(score), reasons=reasons or ["no major entered risk factor"])
        )
    overall = round(sum(item.score for item in results) / len(results))
    return overall, _level(overall), sorted(results, key=lambda item: item.score, reverse=True)


@dataclass(frozen=True)
class LabDefinition:
    name: str
    pattern: str
    low: float
    high: float
    unit: str


LABS = [
    LabDefinition("Hemoglobin", r"(?:haemoglobin|hemoglobin|hb)", 12.0, 17.5, "g/dL"),
    LabDefinition("WBC", r"(?:wbc|white blood cells?)", 4.0, 11.0, "10^3/uL"),
    LabDefinition("Platelets", r"(?:platelets?|plt)", 150, 450, "10^3/uL"),
    LabDefinition("Fasting glucose", r"(?:fasting glucose|fbs)", 70, 99, "mg/dL"),
    LabDefinition("Random glucose", r"(?:random glucose|rbs)", 70, 140, "mg/dL"),
    LabDefinition("HbA1c", r"(?:hba1c|a1c)", 4.0, 5.6, "%"),
    LabDefinition("Creatinine", r"(?:creatinine)", 0.6, 1.3, "mg/dL"),
    LabDefinition("TSH", r"(?:tsh)", 0.4, 4.5, "mIU/L"),
    LabDefinition("ALT/SGPT", r"(?:alt|sgpt)", 7, 56, "U/L"),
    LabDefinition("AST/SGOT", r"(?:ast|sgot)", 10, 40, "U/L"),
    LabDefinition("Total cholesterol", r"(?:total cholesterol|cholesterol)", 0, 199, "mg/dL"),
    LabDefinition("SpO2", r"(?:spo2|oxygen saturation)", 95, 100, "%"),
]


def parse_labs(text: str) -> list[LabResult]:
    results: list[LabResult] = []
    for lab in LABS:
        match = re.search(
            rf"(?i)\b{lab.pattern}\b\s*(?:[:=\-]|\s)\s*(\d+(?:\.\d+)?)",
            text,
        )
        if not match:
            continue
        value = float(match.group(1))
        flag = "Low" if value < lab.low else "High" if value > lab.high else "Normal"
        results.append(
            LabResult(
                test=lab.name,
                value=value,
                unit=lab.unit,
                reference=f"{lab.low:g}-{lab.high:g} {lab.unit}",
                flag=flag,
            )
        )
    return results


EMERGENCY_PATTERNS = {
    "chest pain": "Chest pain can require urgent assessment.",
    "difficulty breathing": "Difficulty breathing can be an emergency.",
    "cannot breathe": "Severe breathing difficulty can be an emergency.",
    "unconscious": "Loss of consciousness requires urgent medical help.",
    "severe bleeding": "Severe or uncontrolled bleeding requires urgent medical help.",
    "face drooping": "Face drooping may be a stroke warning sign.",
    "weakness on one side": "One-sided weakness may be a stroke warning sign.",
    "suicidal": "Immediate mental-health crisis support is important.",
}


def analyze_report(data: ReportRequest) -> dict:
    combined = " ".join(
        [data.symptoms, data.vitals, data.image_finding, data.notes, data.lab_text]
    ).lower()
    red_flags = [message for phrase, message in EMERGENCY_PATTERNS.items() if phrase in combined]
    labs = parse_labs(f"{data.vitals}\n{data.lab_text}")
    abnormal = [result for result in labs if result.flag != "Normal"]
    if red_flags:
        risk = "Emergency"
    elif abnormal or re.search(r"\b(severe|persistent|worsening|high fever)\b", combined):
        risk = "High"
    elif data.symptoms.strip():
        risk = "Moderate"
    else:
        risk = "Low"

    summary_parts = []
    if data.symptoms.strip():
        summary_parts.append(f"Reported symptoms: {data.symptoms.strip()}.")
    if data.image_finding.strip():
        summary_parts.append(f"Recorded image observation: {data.image_finding.strip()}.")
    if labs:
        summary_parts.append(
            f"{len(labs)} lab value(s) extracted; {len(abnormal)} outside the general reference range."
        )
    summary = " ".join(summary_parts) or "No detailed clinical observations were supplied."

    recommendations = ["Review this generated summary with a qualified clinician."]
    if red_flags:
        recommendations.insert(0, "Seek emergency medical care now or call the local emergency number.")
    if abnormal:
        recommendations.append("Confirm flagged laboratory values using the laboratory's own reference ranges.")
    if data.medicines.strip():
        recommendations.append("Do not change medicines without advice from the prescribing clinician.")
    return {
        "risk_level": risk,
        "summary": summary,
        "recommendations": recommendations,
        "red_flags": red_flags,
        "lab_results": labs,
    }


FAQS = [
    {
        "q": "I have a cut wound bleeding first aid",
        "a": "Wash your hands, apply steady pressure with clean gauze, rinse a minor wound with clean running water, and cover it. Seek urgent care if bleeding does not stop, the wound is deep or dirty, or there is loss of sensation.",
        "source": ("NHS: Cuts and grazes", "https://www.nhs.uk/conditions/cuts-and-grazes/"),
    },
    {
        "q": "bone broken fracture injury swelling",
        "a": "Keep the injured area still, support it in the position found, apply a wrapped cold pack, and seek prompt medical assessment. Do not try to straighten a suspected fracture.",
        "source": ("NHS: Broken bone", "https://www.nhs.uk/conditions/broken-bone/"),
    },
    {
        "q": "fever temperature adult",
        "a": "Rest, drink fluids, and monitor symptoms. Seek medical care for a persistent high fever, confusion, breathing difficulty, severe dehydration, a stiff neck, or rapidly worsening illness.",
        "source": ("NHS: High temperature", "https://www.nhs.uk/conditions/fever-in-adults/"),
    },
    {
        "q": "chest pain pressure breathing emergency",
        "a": "New or severe chest pain, especially with sweating, nausea, breathlessness, or pain spreading to the arm, back, neck, or jaw, needs emergency medical assessment.",
        "source": ("NHS: Chest pain", "https://www.nhs.uk/conditions/chest-pain/"),
    },
    {
        "q": "diarrhea vomiting dehydration",
        "a": "Take frequent small sips of water or oral rehydration solution. Seek care for blood, severe pain, confusion, very low urine output, persistent vomiting, or signs of dehydration.",
        "source": ("WHO: Diarrhoeal disease", "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease"),
    },
    {
        "q": "burn first aid hot water",
        "a": "Cool the burn under cool running water for 20 minutes, remove nearby jewellery or clothing that is not stuck, and loosely cover it. Do not use ice, toothpaste, or butter.",
        "source": ("NHS: Burns and scalds", "https://www.nhs.uk/conditions/burns-and-scalds/treatment/"),
    },
]


def _tokens(text: str) -> set[str]:
    return {
        word
        for word in re.findall(r"[a-z0-9]+", text.lower())
        if len(word) > 2 and word not in {"the", "and", "have", "with", "what", "should"}
    }


def search_faq(query: str) -> tuple[str, float, bool, list[dict]]:
    query_tokens = _tokens(query)
    ranked = []
    for item in FAQS:
        item_tokens = _tokens(item["q"])
        overlap = len(query_tokens & item_tokens)
        score = overlap / math.sqrt(max(len(query_tokens) * len(item_tokens), 1))
        ranked.append((score, item))
    score, best = max(ranked, key=lambda row: row[0])
    emergency = any(phrase in query.lower() for phrase in EMERGENCY_PATTERNS)
    if score < 0.12:
        answer = (
            "I could not match that question confidently. Please describe the symptom, "
            "duration, severity, age group, and any red-flag symptoms."
        )
        sources: list[dict] = []
    else:
        answer = best["a"]
        sources = [{"title": best["source"][0], "url": best["source"][1]}]
    return answer, round(score, 3), emergency, sources
