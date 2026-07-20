from sqlalchemy import Column, String, Float, ForeignKey, Enum, JSON, Boolean, DateTime, Index
from sqlalchemy.orm import relationship
from enum import Enum as PyEnum
from .base import BaseModel

class DiscoveryType(str, PyEnum):
    BELIEF_DRIFT = "belief_drift"
    CONTRADICTION = "contradiction"
    STALE_EVIDENCE = "stale_evidence"
    ASSUMPTION_EXPOSURE = "assumption_exposure"
    UNKNOWN_UNKNOWN = "unknown_unknown"
    RESEARCH_BIAS = "research_bias"

class DiscoveryStatus(str, PyEnum):
    ACTIVE = "active"
    DISMISSED = "dismissed"
    RESOLVED = "resolved"

class Discovery(BaseModel):
    __tablename__ = "discovery_flags"
    
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    type = Column(Enum(DiscoveryType), nullable=False, index=True)
    severity = Column(Float, default=0.5)  # 0-1
    
    description = Column(String(1000), nullable=False)
    reasoning = Column(String(2000), nullable=True)
    
    affected_claim_id = Column(String(36), ForeignKey("claims.id"), nullable=True, index=True)
    status = Column(Enum(DiscoveryStatus), default=DiscoveryStatus.ACTIVE, index=True)
    
    detected_at = Column(DateTime, nullable=False)
    dismissed_at = Column(DateTime, nullable=True)
    dismissal_reason = Column(String(500), nullable=True)
    
    metadata_ = Column("metadata", JSON, nullable=True)
    
    __table_args__ = (
        Index("idx_discoveries_ws_status_severity", "workspace_id", "status", "severity"),
    )