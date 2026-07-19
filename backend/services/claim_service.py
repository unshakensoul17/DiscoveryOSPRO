from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
import uuid

from models.claim import Claim, ClaimStatus, ClaimType
from schemas.claim import ClaimCreate, ClaimUpdate, ClaimResponse

class ClaimService:
    def __init__(self, db: Session):
        self.db = db
    
    async def create_claim(self, workspace_id: str, data: ClaimCreate) -> Claim:
        """Create a new claim."""
        claim = Claim(
            id=str(uuid.uuid4()),
            workspace_id=workspace_id,
            content=data.content,
            type=ClaimType(data.type),
            status=ClaimStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(claim)
        self.db.commit()
        self.db.refresh(claim)
        return claim
    
    async def get_claim(self, workspace_id: str, claim_id: str) -> Optional[Claim]:
        """Get a specific claim."""
        return self.db.query(Claim).filter(
            and_(
                Claim.workspace_id == workspace_id,
                Claim.id == claim_id,
                Claim.deleted_at.is_(None)
            )
        ).first()
    
    async def list_claims(
        self,
        workspace_id: str,
        status: Optional[str] = None,
        claim_type: Optional[str] = None,
        confidence_min: float = 0.0,
        confidence_max: float = 1.0,
        limit: int = 50,
        offset: int = 0
    ) -> tuple[List[Claim], int]:
        """List claims with filtering and pagination."""
        from sqlalchemy.orm import joinedload
        query = self.db.query(Claim).options(
            joinedload(Claim.knowledge_state),
            joinedload(Claim.evidence)
        ).filter(
            and_(
                Claim.workspace_id == workspace_id,
                Claim.deleted_at.is_(None)
            )
        )
        
        if status:
            query = query.filter(Claim.status == status)
        if claim_type:
            query = query.filter(Claim.type == claim_type)
        
        total = query.count()
        
        claims = query.limit(limit).offset(offset).all()
        return claims, total
    
    async def update_claim(
        self,
        workspace_id: str,
        claim_id: str,
        data: ClaimUpdate
    ) -> Optional[Claim]:
        """Update a claim."""
        claim = await self.get_claim(workspace_id, claim_id)
        if not claim:
            return None
        
        if data.status:
            claim.status = ClaimStatus(data.status)
        if data.user_reviewed is not None:
            claim.user_reviewed = data.user_reviewed
        
        claim.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(claim)
        return claim
    
    async def delete_claim(self, workspace_id: str, claim_id: str) -> bool:
        """Soft delete a claim."""
        claim = await self.get_claim(workspace_id, claim_id)
        if not claim:
            return False
        
        claim.deleted_at = datetime.utcnow()
        self.db.commit()
        return True