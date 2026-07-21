import os
import sys
import uuid

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models.user import User
from models.workspace import Workspace
from models.claim import Claim, ClaimType, ClaimStatus
from models.knowledge_state import KnowledgeState

def seed_mock_data():
    print("=== Seeding Mock Knowledge Graph Data for Hackathon Demo ===")
    # Ensure tables exist
    try:
        # FULLY WIPE THE DATABASE FOR DEMO
        print("Wiping all existing database tables...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        
        # 1. Get or Create Demo User
        user = User(
            id="u-demo",
            email="researcher@discoveryos.io",
            name="Dr. Evelyn Vance",
            hashed_password="demo-hashed-password",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 2. Get or Create Workspace
        ws = Workspace(
            id="w-acme-mock",
            name="Acme Corp R&D",
            description="Product Discovery Sandbox for Acme Corp R&D",
            owner_id=user.id
        )
        db.add(ws)
        db.commit()
        db.refresh(ws)

        ws_id = ws.id
        print(f"Using Workspace: {ws.name} (ID: {ws_id})")

        # 3. Create Pricing Hypothesis (The core of the demo)
        c1 = Claim(
            id="claim-pricing-01",
            workspace_id=ws_id,
            content="Users are willing to pay $49/month for the Pro plan.",
            type=ClaimType.STRATEGIC_BELIEF,
            status=ClaimStatus.ACTIVE,
            extracted_by="System",
            user_reviewed=True
        )
        db.add(c1)
        db.commit()

        # 4. Set initial confidence to 78%
        ks = KnowledgeState(
            id=str(uuid.uuid4()),
            workspace_id=ws_id,
            claim_id=c1.id,
            belief_confidence=0.78,
            staleness_score=0.10,
            drift_indicator=0.00
        )
        db.add(ks)
        db.commit()

        print("Successfully seeded Knowledge Graph with initial 78% Confidence Hypothesis.")
        print("Ready for Demo Ingestion!")
        return ws_id

    finally:
        db.close()

if __name__ == "__main__":
    seed_mock_data()
