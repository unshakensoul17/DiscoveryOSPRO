from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from schemas.claim import ClaimCreate, ClaimUpdate, ClaimResponse, ClaimListResponse
from services.claim_service import ClaimService
from dependencies import get_db, get_current_user, verify_workspace

router = APIRouter(
    prefix="/workspaces/{workspace_id}/claims",
    tags=["claims"],
    dependencies=[Depends(verify_workspace)]
)

@router.get("", response_model=ClaimListResponse)
async def list_claims(
    workspace_id: str,
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    confidence_min: float = Query(0.0),
    confidence_max: float = Query(1.0),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List claims with filtering and pagination."""
    service = ClaimService(db)
    claims, total = await service.list_claims(
        workspace_id=workspace_id,
        status=status,
        claim_type=type,
        confidence_min=confidence_min,
        confidence_max=confidence_max,
        limit=limit,
        offset=offset
    )
    
    return ClaimListResponse(
        data=[ClaimResponse.from_orm(c) for c in claims],
        pagination={
            "limit": limit,
            "offset": offset,
            "total": total,
            "has_more": offset + limit < total
        },
        summary={
            "total_claims": total,
            "avg_confidence": sum(c.knowledge_state.belief_confidence if c.knowledge_state else 0.5 for c in claims) / len(claims) if claims else 0
        }
    )

@router.get("/{claim_id}", response_model=ClaimResponse)
async def get_claim(
    workspace_id: str,
    claim_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific claim."""
    service = ClaimService(db)
    claim = await service.get_claim(workspace_id, claim_id)
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    return ClaimResponse.from_orm(claim)

@router.post("", response_model=ClaimResponse, status_code=201)
async def create_claim(
    workspace_id: str,
    data: ClaimCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new claim."""
    service = ClaimService(db)
    claim = await service.create_claim(workspace_id, data)
    
    # Initialize knowledge state and trigger discovery engine
    from services.knowledge_state_service import KnowledgeStateService
    from services.discovery_engine import DiscoveryEngine
    
    ks_service = KnowledgeStateService(db)
    await ks_service.update_knowledge_state(
        claim_id=claim.id,
        workspace_id=workspace_id,
        trigger_reason="Manual injection",
        initial_confidence=data.confidence if data.confidence is not None else 0.5
    )
    
    discovery_engine = DiscoveryEngine(db)
    await discovery_engine.run(workspace_id)
    
    db.refresh(claim)
    return ClaimResponse.from_orm(claim)

@router.patch("/{claim_id}", response_model=ClaimResponse)
async def update_claim(
    workspace_id: str,
    claim_id: str,
    data: ClaimUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update a claim."""
    service = ClaimService(db)
    claim = await service.update_claim(workspace_id, claim_id, data)
    
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Recalculate discoveries
    from services.discovery_engine import DiscoveryEngine
    discovery_engine = DiscoveryEngine(db)
    await discovery_engine.run(workspace_id)
    
    db.refresh(claim)
    return ClaimResponse.from_orm(claim)

@router.delete("/{claim_id}", status_code=204)
async def delete_claim(
    workspace_id: str,
    claim_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a claim."""
    service = ClaimService(db)
    success = await service.delete_claim(workspace_id, claim_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    # Recalculate discoveries
    from services.discovery_engine import DiscoveryEngine
    discovery_engine = DiscoveryEngine(db)
    await discovery_engine.run(workspace_id)

@router.get("/{claim_id}/history")
async def get_claim_history(
    workspace_id: str,
    claim_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve investigation / confidence change history for a claim."""
    from models.knowledge_state import KnowledgeState, KnowledgeStateHistory
    
    ks = db.query(KnowledgeState).filter(
        KnowledgeState.workspace_id == workspace_id,
        KnowledgeState.claim_id == claim_id
    ).first()
    
    if not ks:
        return {"data": []}
        
    history = db.query(KnowledgeStateHistory).filter(
        KnowledgeStateHistory.knowledge_state_id == ks.id
    ).order_by(KnowledgeStateHistory.timestamp.desc()).all()
    
    data = []
    for h in history:
        data.append({
            "id": h.id,
            "event_type": h.event_type,
            "timestamp": h.timestamp.isoformat() if h.timestamp else None,
            "confidence_before": h.confidence_before,
            "confidence_after": h.confidence_after,
            "trigger": h.trigger,
            "reason": h.reason,
            "updated_by": h.updated_by
        })
        
    return {"data": data}