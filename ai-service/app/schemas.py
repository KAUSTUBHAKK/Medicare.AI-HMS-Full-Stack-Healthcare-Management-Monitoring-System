from typing import Literal

from pydantic import BaseModel, Field


class PrescriptionRequest(BaseModel):
    text: str = Field(min_length=2, max_length=20000)


class Medicine(BaseModel):
    name: str
    dosage: str = ""
    frequency: str = "As directed"
    time: str = "09:00"
    route: str = "Oral"
    notes: str = ""
    confidence: float = Field(ge=0, le=1)


class PrescriptionResponse(BaseModel):
    medicines: list[Medicine]
    warnings: list[str]
    source: str
    disclaimer: str


class RiskRequest(BaseModel):
    age: int = Field(ge=1, le=120)
    gender: str = "Other"
    bmi: float = Field(ge=8, le=80)
    systolic_bp: int = Field(ge=60, le=260)
    smoking: Literal["never", "former", "current"] = "never"
    activity: Literal["high", "moderate", "low"] = "moderate"
    diet: Literal["good", "average", "poor"] = "average"
    alcohol: Literal["none", "moderate", "high"] = "none"
    sleep: float = Field(default=7, ge=0, le=24)
    family_history: list[str] = Field(default_factory=list)


class ConditionRisk(BaseModel):
    name: str
    score: int = Field(ge=0, le=100)
    level: str
    reasons: list[str]


class RiskResponse(BaseModel):
    overall_score: int
    level: str
    high_risk_count: int
    conditions: list[ConditionRisk]
    model: str
    disclaimer: str


class LabRequest(BaseModel):
    text: str = Field(min_length=2, max_length=20000)
    sex: str | None = None


class LabResult(BaseModel):
    test: str
    value: float
    unit: str
    reference: str
    flag: str


class LabResponse(BaseModel):
    results: list[LabResult]
    warnings: list[str]
    disclaimer: str


class ReportRequest(BaseModel):
    symptoms: str = ""
    vitals: str = ""
    medicines: str = ""
    image_finding: str = ""
    notes: str = ""
    lab_text: str = ""


class ReportResponse(BaseModel):
    risk_level: str
    summary: str
    recommendations: list[str]
    red_flags: list[str]
    lab_results: list[LabResult]
    disclaimer: str


class FAQRequest(BaseModel):
    query: str = Field(min_length=2, max_length=2000)
    limit: int = Field(default=3, ge=1, le=5)


class Source(BaseModel):
    title: str
    url: str


class FAQResponse(BaseModel):
    answer: str
    score: float
    emergency: bool
    sources: list[Source]
    disclaimer: str
