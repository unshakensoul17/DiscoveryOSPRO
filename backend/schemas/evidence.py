from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum

class EvidenceType(str, Enum):
    SURVEY_RESULT = "survey_result"
    METRIC = "metric"
    INTERVIEW = "interview"
    REPORT = "report"
    ANALYSIS = "analysis"

class EvidencePolarity(str, Enum):
    SUPPORTING = "supporting"
    CONTRADICTING = "contradicting"
    NEUTRAL = "neutral"

class EvidenceCreate(BaseModel):
    content: str = Field(..., min_length=10, max_length=2000)
    type: EvidenceType
    polarity: EvidencePolarity
    source_document: str
    source_chunk: str
    reliability_score: Optional[float] = 0.5

class EvidenceResponse(BaseModel):
    id: str
    content: str
    type: str
    polarity: str
    reliability_score: float
    weight: float
    days_old: int
    source_document: str
    extracted_at: datetime