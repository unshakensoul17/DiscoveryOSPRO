from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime, Enum, JSON, Index
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from .base import BaseModel

class ClaimType(str, PyEnum):
    STRATEGIC_BELIEF = "strategic_belief"
    METRIC = "metric"
    ASSUMPTION = "assumption"
    OPERATIONAL_FACT = "operational_fact"

class ClaimStatus(str, PyEnum):
    ACTIVE = "active"
    ARCHIVED = "archived"

class Claim(BaseModel):
    __tablename__ = "claims"
    
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    content = Column(String(2000), nullable=False)
    type = Column(Enum(ClaimType), nullable=False, index=True)
    status = Column(Enum(ClaimStatus), default=ClaimStatus.ACTIVE, index=True)
    
    extracted_by = Column(String(255), nullable=True)
    extracted_at = Column(DateTime, nullable=True)
    extracted_from_document = Column(String(36), ForeignKey("documents.id"), nullable=True, index=True)
    
    user_reviewed = Column(Boolean, default=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="claims")
    evidence = relationship("Evidence", back_populates="claim", cascade="all, delete-orphan")
    knowledge_state = relationship("KnowledgeState", back_populates="claim", uselist=False, cascade="all, delete-orphan")
    
    @property
    def confidence(self) -> float:
        if self.knowledge_state:
            return self.knowledge_state.belief_confidence
        return 0.5

    @property
    def staleness_score(self) -> float:
        if self.knowledge_state:
            return self.knowledge_state.staleness_score
        return 0.0

    @property
    def drift_indicator(self) -> float:
        if self.knowledge_state:
            return self.knowledge_state.drift_indicator
        return 0.0

    @property
    def evidence_count(self) -> dict:
        supporting = 0
        contradicting = 0
        for ev in self.evidence:
            pol = ev.polarity.value if hasattr(ev.polarity, "value") else str(ev.polarity)
            if pol == "supporting":
                supporting += 1
            elif pol == "contradicting":
                contradicting += 1
        return {
            "supporting": supporting,
            "contradicting": contradicting
        }

    __table_args__ = (
        Index("idx_claims_workspace_deleted", "workspace_id", "deleted_at"),
        Index("idx_claims_ws_status_type", "workspace_id", "status", "type"),
    )