import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from dependencies import get_current_user, verify_workspace
from models.discovery import Discovery as DbDiscovery, DiscoveryStatus, DiscoveryType

router = APIRouter(
    prefix="/workspaces/{workspace_id}/discoveries",
    tags=["discoveries"],
    dependencies=[Depends(verify_workspace)]
)

SEED_DISCOVERIES = {
    "ws-1": [
        {
            "type": DiscoveryType.CONTRADICTION,
            "severity": 0.85,
            "description": "Direct contradiction between customer survey and sales metrics on product pricing sensitivity.",
            "reasoning": "Customer survey (n=420) shows 67% believe price is too high, while sales projections assume flat price elasticity.",
            "metadata": {"claim_1": "Product price is set correctly at $49/mo.", "claim_2": "Customer surveys indicate pricing is too high."}
        },
        {
            "type": DiscoveryType.BELIEF_DRIFT,
            "severity": 0.65,
            "description": "Confidence erosion in CAC decline assumption due to rising ad spend trends.",
            "reasoning": "Ad spend increased 35% QoQ but click-through rate fell 18%. Assumption of declining CAC is not supported by evidence.",
            "metadata": {"claim_1": "Customer acquisition cost will decline by 20%", "claim_2": "Ad spend is up 35% with lower click-through rate"}
        },
        {
            "type": DiscoveryType.ASSUMPTION_EXPOSURE,
            "severity": 0.70,
            "description": "Strategic belief \"Market growth\" depends heavily on unverified partner launch date.",
            "reasoning": "15% CAGR projection assumes Partner X launches Q3. No signed agreement or public commitment exists.",
            "metadata": {"claim_1": "Market growth will exceed 15% CAGR in next 3 years", "claim_2": "Partner launch date is not officially scheduled"}
        },
    ],
    "ws-2": [
        {
            "type": DiscoveryType.CONTRADICTION,
            "severity": 0.90,
            "description": "Phase 2 trial efficacy data contradicts preliminary Phase 1 safety projections.",
            "reasoning": "Phase 1 projected 92% tolerability; Phase 2 interim shows 78% — a statistically significant divergence (p<0.01).",
            "metadata": {"claim_1": "Compound X achieves >90% patient tolerability", "claim_2": "Phase 2 interim reports 78% tolerability"}
        },
        {
            "type": DiscoveryType.STALE_EVIDENCE,
            "severity": 0.55,
            "description": "Immunology literature citations are >24 months old. Methodology advances may invalidate current assumptions.",
            "reasoning": "3 of 5 cited foundational papers pre-date 2023 CRISPR updates that reclassified binding mechanisms.",
            "metadata": {"oldest_citation": "2021-09-14", "current_date": datetime.utcnow().isoformat()}
        },
    ]
}

def seed_discoveries(workspace_id: str, db: Session):
    """Persist seed discoveries into the database for the given workspace."""
    if workspace_id != "ws-1":
        return []
    seeds = SEED_DISCOVERIES.get(workspace_id, [])
    created = []
    for s in seeds:
        d = DbDiscovery(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            type=s["type"],
            severity=s["severity"],
            description=s["description"],
            reasoning=s.get("reasoning"),
            status=DiscoveryStatus.ACTIVE,
            detected_at=datetime.utcnow(),
            metadata_=s.get("metadata", {})
        )
        db.add(d)
        created.append(d)
    db.commit()
    return created


@router.get("")
async def list_discoveries(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if we need to auto-seed (only on very first access when no discoveries exist at all)
    if workspace_id == "ws-1":
        has_any = db.query(DbDiscovery).filter(DbDiscovery.workspace_id == workspace_id).first()
        if not has_any:
            seed_discoveries(workspace_id, db)

    discoveries = db.query(DbDiscovery).filter(
        DbDiscovery.workspace_id == workspace_id,
        DbDiscovery.deleted_at.is_(None)
    ).order_by(DbDiscovery.severity.desc()).all()

    data = []
    for d in discoveries:
        data.append({
            "id": d.id,
            "workspace_id": d.workspace_id,
            "type": d.type.value if hasattr(d.type, "value") else str(d.type),
            "severity": d.severity,
            "description": d.description,
            "reasoning": d.reasoning,
            "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            "detected_at": d.detected_at.isoformat() if d.detected_at else datetime.utcnow().isoformat(),
            "affected_claim_id": d.affected_claim_id,
            "metadata": d.metadata_ or {},
        })

    return {"data": data, "total": len(data)}


@router.patch("/{discovery_id}/dismiss")
async def dismiss_discovery(
    workspace_id: str,
    discovery_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Dismiss a discovery so it no longer appears in active feeds."""
    d = db.query(DbDiscovery).filter(
        DbDiscovery.id == discovery_id,
        DbDiscovery.workspace_id == workspace_id
    ).first()
    if not d:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Discovery not found")
    d.status = DiscoveryStatus.DISMISSED
    d.dismissed_at = datetime.utcnow()
    db.commit()
    return {"status": "dismissed"}


@router.patch("/{discovery_id}/resolve")
async def resolve_discovery(
    workspace_id: str,
    discovery_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Mark a discovery as resolved."""
    d = db.query(DbDiscovery).filter(
        DbDiscovery.id == discovery_id,
        DbDiscovery.workspace_id == workspace_id
    ).first()
    if not d:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Discovery not found")
    d.status = DiscoveryStatus.RESOLVED
    db.commit()
    return {"status": "resolved"}
