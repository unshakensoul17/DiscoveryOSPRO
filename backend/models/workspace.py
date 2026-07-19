from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import BaseModel

class Workspace(BaseModel):
    __tablename__ = "workspaces"
    
    name = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=True)
    owner_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    
    claims = relationship("Claim", back_populates="workspace")
