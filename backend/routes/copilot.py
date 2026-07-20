from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from database import get_db
from dependencies import get_current_user, verify_workspace
from services.graph_rag_service import GraphRAGService

router = APIRouter(
    prefix="/workspaces/{workspace_id}/copilot",
    tags=["discovery-copilot"],
    dependencies=[Depends(verify_workspace)]
)

class CopilotQueryRequest(BaseModel):
    query: str

@router.post("/chat")
async def copilot_chat(
    workspace_id: str,
    req: CopilotQueryRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Conversational AI Copilot powered by GraphRAG (Graph-Augmented Generation)."""
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query prompt cannot be empty.")

    service = GraphRAGService(db)
    result = await service.answer_question(workspace_id, req.query)
    return result
