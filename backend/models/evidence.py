from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime, Enum, JSON, Index
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from .base import BaseModel

class EvidenceType(str, PyEnum):
    SURVEY_RESULT = "survey_result"
    METRIC = "metric"
    INTERVIEW = "interview"
    REPORT = "report"
    ANALYSIS = "analysis"
    DATA_GAP = "data_gap"

class EvidencePolarity(str, PyEnum):
    SUPPORTING = "supporting"
    CONTRADICTING = "contradicting"
    NEUTRAL = "neutral"

class Evidence(BaseModel):
    __tablename__ = "evidence"
    
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=False, index=True)
    
    content = Column(String(2000), nullable=False)
    type = Column(Enum(EvidenceType), nullable=False, index=True)
    polarity = Column(Enum(EvidencePolarity), nullable=False, index=True)
    
    reliability_score = Column(Float, default=0.5)  # 0-1
    weight = Column(Float, default=0.5)  # 0-1, configurable per workspace
    
    source_document = Column(String(36), ForeignKey("documents.id"), nullable=True, index=True)
    source_chunk = Column(String(36), nullable=True)
    
    is_active = Column(Boolean, default=True, index=True)
    user_verified = Column(Boolean, default=False)
    
    metadata_ = Column("metadata", JSON, nullable=True)  # Store caveats, sample size, etc.
    
    # Relationships
    claim = relationship("Claim", back_populates="evidence")
    
    __table_args__ = (
        Index("idx_evidence_claim_polarity", "claim_id", "polarity"),
        Index("idx_evidence_ws_claim", "workspace_id", "claim_id"),
    )