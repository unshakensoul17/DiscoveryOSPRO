from sqlalchemy import Column, String, Float, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from .base import BaseModel

class ClaimRelationship(BaseModel):
    __tablename__ = "claim_relationships"

    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    
    source_id = Column(String(36), nullable=False, index=True)
    source_type = Column(String(50), nullable=False, index=True)  # claim, evidence, document, feature, segment
    
    target_id = Column(String(36), nullable=False, index=True)
    target_type = Column(String(50), nullable=False, index=True)  # claim, evidence, document, feature, segment
    
    relation_type = Column(String(50), nullable=False, index=True)  # SUPPORTS, CONTRADICTS, EXPOSES_ASSUMPTION, MEASURED_BY, EXTRACTED_FROM, RELATED_TO
    weight = Column(Float, default=0.5)  # 0-1 confidence/weight
    
    metadata_ = Column("metadata", JSON, nullable=True)

    __table_args__ = (
        Index("idx_rel_ws_relation", "workspace_id", "relation_type"),
        Index("idx_rel_source_target", "source_id", "target_id"),
        Index("idx_rel_ws_source", "workspace_id", "source_id"),
    )
