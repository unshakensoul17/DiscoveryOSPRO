import os
import sys
import uuid
from datetime import datetime

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine, Base
from models.user import User
from models.workspace import Workspace
from models.document import Document
from models.claim import Claim, ClaimType, ClaimStatus
from models.evidence import Evidence, EvidenceType, EvidencePolarity
from models.knowledge_state import KnowledgeState
from models.relationship import ClaimRelationship
from services.graph_service import GraphService
from services.graph_rag_service import GraphRAGService

def seed_mock_data():
    print("=== Seeding Mock Knowledge Graph Data ===")
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Get or Create Demo User
        user = db.query(User).filter(User.email == "researcher@discoveryos.io").first()
        if not user:
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
        ws = db.query(Workspace).filter(Workspace.name == "Acme Corp R&D").first()
        if not ws:
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

        # 3. Create Documents
        doc1 = Document(
            id="doc-interview-01",
            workspace_id=ws_id,
            title="Q2 Customer Interview Transcripts.pdf",
            file_key="./uploads/Q2_Interviews.pdf",
            file_size=102400,
            file_type="application/pdf",
            processing_status="completed",
            processing_progress=100,
            uploaded_by=user.id
        )

        doc2 = Document(
            id="doc-churn-report-02",
            workspace_id=ws_id,
            title="Q2 Churn Metric Analytics.txt",
            file_key="./uploads/Q2_Churn.txt",
            file_size=51200,
            file_type="text/plain",
            processing_status="completed",
            processing_progress=100,
            uploaded_by=user.id
        )

        db.merge(doc1)
        db.merge(doc2)
        db.commit()

        # 4. Create Claims
        c1 = Claim(
            id="claim-pricing-01",
            workspace_id=ws_id,
            content="Increasing subscription price to $49/month will cause high customer churn among SMB users.",
            type=ClaimType.STRATEGIC_BELIEF,
            status=ClaimStatus.ACTIVE,
            extracted_from_document=doc1.id,
            extracted_by="EvidenceSynthesisAgent",
            user_reviewed=True
        )

        c2 = Claim(
            id="claim-sso-02",
            workspace_id=ws_id,
            content="Enterprise clients require SAML SSO and RBAC before migrating from legacy tools.",
            type=ClaimType.ASSUMPTION,
            status=ClaimStatus.ACTIVE,
            extracted_from_document=doc1.id,
            extracted_by="EvidenceSynthesisAgent",
            user_reviewed=False
        )

        c3 = Claim(
            id="claim-retention-03",
            workspace_id=ws_id,
            content="Redesigning interactive onboarding flow increases 7-day user retention rate by 24%.",
            type=ClaimType.METRIC,
            status=ClaimStatus.ACTIVE,
            extracted_from_document=doc2.id,
            extracted_by="EvidenceSynthesisAgent",
            user_reviewed=True
        )

        db.merge(c1)
        db.merge(c2)
        db.merge(c3)
        db.commit()

        # 5. Create Knowledge States
        for claim_obj, conf, staleness, drift in [
            (c1, 0.45, 0.20, 0.65),
            (c2, 0.30, 0.80, 0.10),
            (c3, 0.92, 0.05, 0.02)
        ]:
            ks = db.query(KnowledgeState).filter(KnowledgeState.claim_id == claim_obj.id).first()
            if not ks:
                ks = KnowledgeState(
                    id=str(uuid.uuid4()),
                    workspace_id=ws_id,
                    claim_id=claim_obj.id,
                    belief_confidence=conf,
                    staleness_score=staleness,
                    drift_indicator=drift
                )
                db.add(ks)
            else:
                ks.belief_confidence = conf
                ks.staleness_score = staleness
                ks.drift_indicator = drift
        db.commit()

        # 6. Create Evidence
        e1 = Evidence(
            id="ev-interview-price",
            workspace_id=ws_id,
            claim_id=c1.id,
            content="7 out of 10 SMB founders stated in interview that $49/mo exceeds their software allocation budget.",
            type=EvidenceType.INTERVIEW,
            polarity=EvidencePolarity.SUPPORTING,
            reliability_score=0.85,
            source_document=doc1.id,
            is_active=True
        )

        e2 = Evidence(
            id="ev-metric-price-churn",
            workspace_id=ws_id,
            claim_id=c1.id,
            content="Q2 billing telemetry shows SMB churn rate decreased by 4% following tier upgrade rollout.",
            type=EvidenceType.METRIC,
            polarity=EvidencePolarity.CONTRADICTING,
            reliability_score=0.95,
            source_document=doc2.id,
            is_active=True
        )

        e3 = Evidence(
            id="ev-telemetry-retention",
            workspace_id=ws_id,
            claim_id=c3.id,
            content="A/B experiment on 5,000 users confirmed 24.3% higher day-7 retention for new onboarding cohort.",
            type=EvidenceType.METRIC,
            polarity=EvidencePolarity.SUPPORTING,
            reliability_score=0.98,
            source_document=doc2.id,
            is_active=True
        )

        db.merge(e1)
        db.merge(e2)
        db.merge(e3)
        db.commit()

        # 7. Create Knowledge Graph Relationships (Edges)
        rel1 = ClaimRelationship(
            id=str(uuid.uuid4()),
            workspace_id=ws_id,
            source_id=e1.id,
            source_type="evidence",
            target_id=c1.id,
            target_type="claim",
            relation_type="SUPPORTS",
            weight=0.85
        )

        rel2 = ClaimRelationship(
            id=str(uuid.uuid4()),
            workspace_id=ws_id,
            source_id=e2.id,
            source_type="evidence",
            target_id=c1.id,
            target_type="claim",
            relation_type="CONTRADICTS",
            weight=0.95
        )

        rel3 = ClaimRelationship(
            id=str(uuid.uuid4()),
            workspace_id=ws_id,
            source_id=e3.id,
            source_type="evidence",
            target_id=c3.id,
            target_type="claim",
            relation_type="SUPPORTS",
            weight=0.98
        )

        rel4 = ClaimRelationship(
            id=str(uuid.uuid4()),
            workspace_id=ws_id,
            source_id=c2.id,
            source_type="claim",
            target_id=c1.id,
            target_type="claim",
            relation_type="EXPOSES_ASSUMPTION",
            weight=0.70
        )

        db.merge(rel1)
        db.merge(rel2)
        db.merge(rel3)
        db.merge(rel4)
        db.commit()

        print("Successfully seeded Knowledge Graph with Claims, Evidence, and Relationships!")
        return ws_id

    finally:
        db.close()

if __name__ == "__main__":
    seed_mock_data()
