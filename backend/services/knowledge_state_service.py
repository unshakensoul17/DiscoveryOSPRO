from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid

from models.knowledge_state import KnowledgeState, KnowledgeStateHistory
from models.evidence import Evidence
from models.claim import Claim

class KnowledgeStateService:
    def __init__(self, db: Session):
        self.db = db
    
    async def calculate_confidence(self, claim_id: str, workspace_id: str) -> float:
        """Calculate confidence for a claim from its evidence."""
        evidence_list = self.db.query(Evidence).filter(
            Evidence.claim_id == claim_id,
            Evidence.deleted_at.is_(None)
        ).all()
        
        supporting = [e for e in evidence_list if e.polarity == "supporting"]
        contradicting = [e for e in evidence_list if e.polarity == "contradicting"]
        
        # Calculate weighted scores
        supporting_score = sum(
            e.weight * e.reliability_score
            for e in supporting
        )
        
        contradicting_score = sum(
            e.weight * e.reliability_score
            for e in contradicting
        )
        
        # Net confidence
        total = supporting_score + contradicting_score
        if total == 0:
            return 0.0
        
        net = (supporting_score - contradicting_score) / total
        net = max(0.0, min(1.0, net))
        
        # Apply staleness decay
        valid_evidence = [e for e in evidence_list if e.created_at is not None]
        if valid_evidence:
            oldest_date = min(e.created_at for e in valid_evidence)
            days_old = (datetime.utcnow() - oldest_date).days
            decay_factor = 1 - (0.01 * days_old)  # 1% per day decay
            decay_factor = max(0.0, min(1.0, decay_factor))
            confidence = net * decay_factor
        else:
            confidence = 0.0
        
        return confidence
    
    async def update_knowledge_state(
        self,
        claim_id: str,
        workspace_id: str,
        trigger_reason: str = "Confidence update",
        initial_confidence: Optional[float] = None
    ) -> KnowledgeState:
        """Update knowledge state for a claim."""
        # Get or create knowledge state
        ks = self.db.query(KnowledgeState).filter(
            KnowledgeState.claim_id == claim_id
        ).first()
        
        # Get evidence list
        evidence_list = self.db.query(Evidence).filter(
            Evidence.claim_id == claim_id,
            Evidence.deleted_at.is_(None)
        ).all()
        
        # Calculate new confidence
        if not evidence_list and initial_confidence is not None:
            new_confidence = initial_confidence
        else:
            new_confidence = await self.calculate_confidence(claim_id, workspace_id)
        
        current_confidence = ks.belief_confidence if ks else 0.0
        change = new_confidence - current_confidence
        
        # Get evidence for staleness/drift
        evidence_list = self.db.query(Evidence).filter(
            Evidence.claim_id == claim_id,
            Evidence.deleted_at.is_(None)
        ).all()
        
        valid_evidence = [e for e in evidence_list if e.created_at is not None]
        if valid_evidence:
            oldest_date = min(e.created_at for e in valid_evidence)
            newest_date = max(e.created_at for e in valid_evidence)
            days_since_newest = (datetime.utcnow() - newest_date).days
            staleness = min(1.0, days_since_newest / 180)
        else:
            oldest_date = newest_date = datetime.utcnow()
            staleness = 0.0
        
        # Calculate drift (change in last 7 days)
        one_week_ago = datetime.utcnow() - timedelta(days=7)
        week_history = self.db.query(KnowledgeStateHistory).filter(
            KnowledgeStateHistory.knowledge_state_id == (ks.id if ks else ""),
            KnowledgeStateHistory.timestamp >= one_week_ago
        ).order_by(KnowledgeStateHistory.timestamp.asc()).all()
        
        if week_history:
            change_week = new_confidence - week_history[0].confidence_after
            drift = abs(change_week) / 0.1 if change_week != 0 else 0.0
            drift = min(1.0, drift)
        else:
            change_week = 0.0
            drift = 0.0
        
        # Update or create KS
        if ks:
            ks.belief_confidence = new_confidence
            ks.staleness_score = staleness
            ks.drift_indicator = drift
            ks.updated_at = datetime.utcnow()
            ks.confidence_change_last_week = change_week
            ks.times_updated += 1
            ks.oldest_evidence_date = oldest_date if evidence_list else None
            ks.newest_evidence_date = newest_date if evidence_list else None
        else:
            ks = KnowledgeState(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                claim_id=claim_id,
                belief_confidence=new_confidence,
                staleness_score=staleness,
                drift_indicator=drift,
                confidence_change_last_week=change_week,
                times_updated=1,
                oldest_evidence_date=oldest_date if evidence_list else None,
                newest_evidence_date=newest_date if evidence_list else None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            self.db.add(ks)
        
        self.db.commit()
        
        # Log in history
        history = KnowledgeStateHistory(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            knowledge_state_id=ks.id,
            event_type="confidence_update",
            timestamp=datetime.utcnow(),
            confidence_before=current_confidence,
            confidence_after=new_confidence,
            reason=trigger_reason,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(history)
        self.db.commit()
        
        return ks