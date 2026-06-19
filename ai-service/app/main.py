import hmac
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .schemas import (
    FAQRequest,
    FAQResponse,
    LabRequest,
    LabResponse,
    PrescriptionRequest,
    PrescriptionResponse,
    ReportRequest,
    ReportResponse,
    RiskRequest,
    RiskResponse,
)
from .services import (
    DISCLAIMER,
    analyze_report,
    parse_labs,
    parse_prescription,
    score_risk,
    search_faq,
)


app = FastAPI(
    title="Medicare.AI Analysis Service",
    version="1.0.0",
    description="Explainable parsing and screening support for the Medicare.AI platform.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.middleware("http")
async def protect_analysis_routes(request, call_next):
    expected = os.getenv("AI_SERVICE_KEY", "").strip()
    if request.url.path.startswith("/v1/") and expected:
        supplied = request.headers.get("x-service-key", "")
        if not hmac.compare_digest(supplied, expected):
            return JSONResponse(status_code=401, content={"error": "Invalid service credentials"})
    return await call_next(request)


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Medicare.AI Python Analysis",
        "version": "1.0.0",
        "capabilities": ["prescription-parser", "risk-screening", "lab-parser", "report-analysis", "faq-retrieval"],
    }


@app.post("/v1/prescriptions/parse", response_model=PrescriptionResponse)
def prescriptions(request: PrescriptionRequest):
    medicines, warnings = parse_prescription(request.text)
    return PrescriptionResponse(
        medicines=medicines,
        warnings=warnings,
        source="python-explainable-parser-v1",
        disclaimer=DISCLAIMER,
    )


@app.post("/v1/risk/score", response_model=RiskResponse)
def risks(request: RiskRequest):
    overall, level, conditions = score_risk(request)
    return RiskResponse(
        overall_score=overall,
        level=level,
        high_risk_count=sum(item.level == "High" for item in conditions),
        conditions=conditions,
        model="transparent-relative-risk-v1",
        disclaimer=DISCLAIMER,
    )


@app.post("/v1/labs/parse", response_model=LabResponse)
def labs(request: LabRequest):
    results = parse_labs(request.text)
    return LabResponse(
        results=results,
        warnings=[] if results else ["No supported laboratory values were detected."],
        disclaimer=f"{DISCLAIMER} Reference ranges vary by laboratory, age, sex, pregnancy, and clinical context.",
    )


@app.post("/v1/reports/analyze", response_model=ReportResponse)
def reports(request: ReportRequest):
    result = analyze_report(request)
    return ReportResponse(**result, disclaimer=DISCLAIMER)


@app.post("/v1/faq/search", response_model=FAQResponse)
def faq(request: FAQRequest):
    answer, score, emergency, sources = search_faq(request.query)
    return FAQResponse(
        answer=answer,
        score=score,
        emergency=emergency,
        sources=sources,
        disclaimer=DISCLAIMER,
    )
