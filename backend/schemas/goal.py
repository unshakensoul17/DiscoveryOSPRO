from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class GoalCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    target_date: Optional[datetime] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[str] = None  # active, achieved, failed
    target_date: Optional[datetime] = None

class GoalResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    description: Optional[str] = None
    status: str
    target_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True
    }
