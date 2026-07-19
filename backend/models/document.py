from sqlalchemy import Column, String, Integer, ForeignKey
from .base import BaseModel

class Document(BaseModel):
    __tablename__ = "documents"
    
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    file_key = Column(String(510), nullable=False)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(255), nullable=True)
    processing_status = Column(String(50), default="processing")
    processing_progress = Column(Integer, default=0)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=True)
