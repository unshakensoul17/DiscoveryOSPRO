from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from enum import Enum

class ClaimType(str, Enum):
    STRATEGIC_BELIEF = "strategic_belief"
    METRIC = "metric"
    ASSUMPTION = "assumption"
    OPERATIONAL_FACT = "operational_fact"

class ClaimStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"

class ClaimCreate(BaseModel):
    content: str = Field(..., min_length=10, max_length=2000)
    type: ClaimType
    source_documents: Optional[List[str]] = None

class ClaimUpdate(BaseModel):
    status: Optional[str] = None
    user_reviewed: Optional[bool] = None

class EvidenceCount(BaseModel):
    supporting: int
    contradicting: int

    model_config = {
        "from_attributes": True
    }

class ClaimResponse(BaseModel):
    id: str
    workspace_id: str
    content: str
    type: str
    status: str
    confidence: float
    staleness_score: float
    drift_indicator: float
    created_at: datetime
    updated_at: datetime
    user_reviewed: bool
    evidence_count: EvidenceCount

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
