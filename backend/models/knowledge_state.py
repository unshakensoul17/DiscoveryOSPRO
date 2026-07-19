from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from .base import BaseModel

class KnowledgeState(BaseModel):
    __tablename__ = "knowledge_state"
    
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    claim_id = Column(String(36), ForeignKey("claims.id"), nullable=False, index=True, unique=True)
    
    belief_confidence = Column(Float, default=0.0)  # 0-1
    staleness_score = Column(Float, default=0.0)  # 0-1
    drift_indicator = Column(Float, default=0.0)  # 0-1
    
    last_updated_by = Column(String(255), nullable=True)
    confidence_change_last_week = Column(Float, default=0.0)
    confidence_change_last_month = Column(Float, default=0.0)
    
    days_since_last_update = Column(Integer, default=0)
    times_updated = Column(Integer, default=0)
    
    oldest_evidence_date = Column(DateTime, nullable=True)
    newest_evidence_date = Column(DateTime, nullable=True)
    
    # Relationships
    claim = relationship("Claim", back_populates="knowledge_state")
    history = relationship("KnowledgeStateHistory", back_populates="knowledge_state", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_knowledge_state_metrics", "belief_confidence", "staleness_score", "drift_indicator"),
    )

class KnowledgeStateHistory(BaseModel):
    __tablename__ = "knowledge_state_history"
    
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    knowledge_state_id = Column(String(36), ForeignKey("knowledge_state.id"), nullable=False, index=True)
    
    event_type = Column(String(255), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    
    confidence_before = Column(Float, nullable=False)
    confidence_after = Column(Float, nullable=False)
    
    trigger = Column(JSON, nullable=True)
    reason = Column(String(500), nullable=True)
    updated_by = Column(String(255), nullable=True)
    
    # Relationships
    knowledge_state = relationship("KnowledgeState", back_populates="history")