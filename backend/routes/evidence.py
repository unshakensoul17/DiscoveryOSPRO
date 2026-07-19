from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from dependencies import get_current_user, verify_workspace
from models.evidence import Evidence as DbEvidence, EvidencePolarity, EvidenceType

router = APIRouter(
    prefix="/workspaces/{workspace_id}/claims/{claim_id}/evidence",
    tags=["evidence"],
    dependencies=[Depends(verify_workspace)]
)

@router.get("")
async def list_evidence(
    workspace_id: str,
    claim_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List evidence for a specific claim from the database, falling back to mock seeds if empty."""
    evidence_list = db.query(DbEvidence).filter(
        DbEvidence.claim_id == claim_id,
        DbEvidence.deleted_at.is_(None)
    ).all()
    
    if evidence_list:
        data = []
        for e in evidence_list:
            data.append({
                "id": e.id,
                "claim_id": e.claim_id,
                "content": e.content,
                "type": e.type.value if hasattr(e.type, "value") else str(e.type),
                "polarity": e.polarity.value if hasattr(e.polarity, "value") else str(e.polarity),
                "reliability_score": e.reliability_score,
                "weight": e.weight,
                "days_old": (datetime.utcnow() - e.created_at).days if e.created_at else 0,
                "source_document": e.source_document,
                "source_chunk": e.source_chunk,
                "extracted_at": e.created_at.isoformat() if e.created_at else datetime.utcnow().isoformat(),
                "user_verified": e.user_verified
            })
        return {
            "data": data,
            "total": len(data)
        }
        
    # Seed fallbacks
    mock_evidence = [
        {
            "id": "seed-e1",
            "claim_id": claim_id,
            "content": "Q1 sales report shows resource utilization reached 92%, indicating high load factor.",
            "type": "report",
            "polarity": "supporting",
            "reliability_score": 0.85,
            "weight": 0.8,
            "days_old": 15,
            "source_document": "q1_utilization_report.pdf",
            "source_chunk": "Page 4, paragraph 2",
            "extracted_at": datetime.utcnow().isoformat(),
            "user_verified": True
        },
        {
            "id": "seed-e2",
            "claim_id": claim_id,
            "content": "Partner onboarding pipeline delayed by average of 45 days, causing capacity bottleneck.",
            "type": "metric",
            "polarity": "contradicting",
            "reliability_score": 0.9,
            "weight": 0.9,
            "days_old": 8,
            "source_document": "onboarding_pipeline_dashboard",
            "source_chunk": "Table 2 - Average Latency",
            "extracted_at": datetime.utcnow().isoformat(),
            "user_verified": True
        }
    ]
    return {
        "data": mock_evidence,
        "total": len(mock_evidence)
    }
