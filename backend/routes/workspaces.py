import uuid
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from dependencies import get_current_user
from models.workspace import Workspace

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

class WorkspaceCreateRequest(BaseModel):
    name: str
    description: str = None

@router.get("")
async def list_workspaces(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """List workspaces owned by the logged-in user, auto-seeding default ones if empty."""
    user_id = current_user.get("id")
    workspaces = db.query(Workspace).filter(
        Workspace.owner_id == user_id,
        Workspace.deleted_at.is_(None)
    ).all()
    
    ws1_id = hashlib.md5(f"ws-1-{user_id}".encode("utf-8")).hexdigest()
    ws2_id = hashlib.md5(f"ws-2-{user_id}".encode("utf-8")).hexdigest()
    
    if not workspaces:
        # Seed default workspaces for this specific user
        seed_ws1 = Workspace(
            id=ws1_id,
            name="Acme Corp R&D",
            description="Strategic market research for new product lines and target segments.",
            owner_id=user_id
        )
        seed_ws2 = Workspace(
            id=ws2_id,
            name="BioTech Innovations",
            description="Clinical trial evidence tracking and belief state verification.",
            owner_id=user_id
        )
        db.add(seed_ws1)
        db.add(seed_ws2)
        db.commit()
        
        workspaces = [seed_ws1, seed_ws2]
        
    data = []
    for ws in workspaces:
        # Calculate member count (always 5 for demo ws1, 12 for demo ws2, or 1 default)
        is_ws1 = ws.id == ws1_id
        is_ws2 = ws.id == ws2_id
        member_count = 5 if is_ws1 else (12 if is_ws2 else 1)
        
        data.append({
            "id": ws.id,
            "name": ws.name,
            "description": ws.description,
            "created_by": user_id,
            "created_at": ws.created_at.isoformat() if ws.created_at else None,
            "updated_at": ws.updated_at.isoformat() if ws.updated_at else None,
            "member_count": member_count,
            "role": "admin",
            "config": {
                "evidence_weights": { "report": 0.8, "survey": 0.6 } if is_ws1 else { "report": 0.9, "survey": 0.5 },
                "stale_threshold_days": 30 if is_ws1 else 14,
                "confidence_decay_rate": 0.05 if is_ws1 else 0.1
            }
        })
        
    return {
        "data": data,
        "total": len(data)
    }

@router.post("")
async def create_workspace(
    request: WorkspaceCreateRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new workspace owned by the current user."""
    user_id = current_user.get("id")
    ws_id = str(uuid.uuid4())
    ws = Workspace(
        id=ws_id,
        name=request.name,
        description=request.description,
        owner_id=user_id
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)
    
    return {
        "id": ws.id,
        "name": ws.name,
        "description": ws.description,
        "created_by": user_id,
        "created_at": ws.created_at.isoformat() if ws.created_at else None,
        "updated_at": ws.updated_at.isoformat() if ws.updated_at else None,
        "member_count": 1,
        "role": "admin",
        "config": {
            "evidence_weights": { "report": 0.8, "survey": 0.6 },
            "stale_threshold_days": 30,
            "confidence_decay_rate": 0.05
        }
    }
