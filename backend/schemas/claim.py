from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum

class ClaimType(str, Enum):
    STRATEGIC_BELIEF = "strategic_belief"
    METRIC = "metric"
    ASSUMPTION = "assumption"
    OPERATIONAL_FACT = "operational_fact"

class ClaimCreate(BaseModel):
    content: str = Field(..., min_length=10, max_length=2000)
    type: ClaimType
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    source_documents: Optional[List[str]] = None

class ClaimUpdate(BaseModel):
    status: Optional[str] = None
    user_reviewed: Optional[bool] = None

class ClaimResponse(BaseModel):
    id: str
    content: str
    type: str
    status: str
    confidence: float
    staleness_score: float
    drift_indicator: float
    created_at: datetime
    updated_at: datetime
    evidence_count: dict

    model_config = {
        "from_attributes": True
    }

class ClaimDetailResponse(ClaimResponse):
    evidence: List[dict]
    knowledge_state: dict
    related_claims: List['ClaimResponse']
    contradictions: List[dict]

    model_config = {
        "from_attributes": True
    }

class ClaimListResponse(BaseModel):
    data: List[ClaimResponse]
    pagination: dict
    summary: dict

    model_config = {
        "from_attributes": True
    }