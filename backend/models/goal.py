from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Goal(BaseModel):
    __tablename__ = "goals"
    
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    status = Column(String(50), default="active", nullable=False)  # active, achieved, failed
    target_date = Column(DateTime, nullable=True)
    
    workspace = relationship("Workspace", backref="goals")
