import os
import logging
import uuid
from datetime import datetime
from celery_app import celery_app
from database import SessionLocal
from models.document import Document
from models.claim import Claim, ClaimType, ClaimStatus
from models.evidence import Evidence, EvidenceType, EvidencePolarity
from services.document_processor import DocumentProcessor
from services.knowledge_state_service import KnowledgeStateService
from services.discovery_engine import DiscoveryEngine
from agents.evidence_synthesis_agent import EvidenceSynthesisAgent

logger = logging.getLogger(__name__)

@celery_app.task(name="tasks.agent_tasks.run_evidence_synthesis")
def run_evidence_synthesis(document_id: str, workspace_id: str):
    """Background task to process a document, extract claims/evidence, update confidence, and run discovery engine."""
    logger.info(f"Starting background evidence synthesis for document {document_id} in workspace {workspace_id}")
    
    db = SessionLocal()
    try:
        # 1. Fetch document
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found in database")
            return {"status": "failed", "error": "Document not found"}
        
        # 2. Extract and chunk text
        # The document file key points to the file path relative to the root/uploads directory.
        file_path = doc.file_key
        if not os.path.exists(file_path):
            logger.error(f"Document file not found at {file_path}")
            return {"status": "failed", "error": "File not found on disk"}
        
        processor = DocumentProcessor()
        chunks = processor.extract_and_chunk(file_path)
        if not chunks:
            logger.warning(f"No content extracted from document {document_id}")
            return {"status": "completed", "claims_count": 0, "evidence_count": 0}
        
        # 3. Synthesize claims and evidence
        agent = EvidenceSynthesisAgent()
        # We run this synchronously inside the background thread
        import asyncio
        synthesis = asyncio.run(agent.run(document_id, doc.title, chunks))
        
        logger.info(f"Synthesized {len(synthesis.claims)} claims and {len(synthesis.evidence)} evidence records")
        
        # 4. Save claims to DB
        claim_map = {}  # Map agent evidence-ids or claims
        for index, raw_claim in enumerate(synthesis.claims):
            # Validate or map claim type
            try:
                c_type = ClaimType(raw_claim.type.lower())
            except ValueError:
                c_type = ClaimType.OPERATIONAL_FACT
                
            claim_db = Claim(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                content=raw_claim.content,
                type=c_type,
                status=ClaimStatus.ACTIVE,
                extracted_by="EvidenceSynthesisAgent",
                extracted_at=datetime.utcnow(),
                extracted_from_document=document_id,
                user_reviewed=False
            )
            db.add(claim_db)
            db.flush()  # Populates claim_db.id
            
            # Map original evidence list link to this claim_db.id
            for ev_id in raw_claim.evidence_ids:
                claim_map[ev_id] = claim_db.id

        # 5. Save evidence to DB
        for raw_evidence in synthesis.evidence:
            # Map polarity
            try:
                polarity = EvidencePolarity(raw_evidence.polarity.lower())
            except ValueError:
                polarity = EvidencePolarity.NEUTRAL
                
            # Map evidence type
            try:
                e_type = EvidenceType(raw_evidence.type.lower())
            except ValueError:
                e_type = EvidenceType.REPORT
            
            # Find the linked claim_id from map
            claim_id = claim_map.get(raw_evidence.id)
            if not claim_id:
                # If evidence wasn't linked to a claim, associate it with the first claim we generated
                # to prevent dangling evidence.
                if claim_map:
                    claim_id = list(claim_map.values())[0]
                else:
                    continue  # skip if no claims at all

            evidence_db = Evidence(
                id=str(uuid.uuid4()),
                workspace_id=workspace_id,
                claim_id=claim_id,
                content=raw_evidence.content,
                type=e_type,
                polarity=polarity,
                reliability_score=raw_evidence.reliability_score,
                weight=0.5,
                source_document=document_id,
                source_chunk=raw_evidence.chunk_id,
                is_active=True,
                user_verified=False,
                metadata_={
                    "caveats": raw_evidence.caveats,
                    "reasoning": raw_evidence.reasoning
                }
            )
            db.add(evidence_db)
            
        db.commit()
        
        # 6. Recalculate confidence & update knowledge state for each claim, then run Discovery Engine inside a single event loop
        async def process_knowledge_and_discoveries():
            ks_service = KnowledgeStateService(db)
            claims_in_ws = db.query(Claim).filter(Claim.workspace_id == workspace_id, Claim.deleted_at.is_(None)).all()
            for claim in claims_in_ws:
                await ks_service.update_knowledge_state(
                    claim_id=claim.id,
                    workspace_id=workspace_id,
                    trigger_reason=f"Ingestion of document {doc.title}"
                )
            
            discovery_engine = DiscoveryEngine(db)
            return await discovery_engine.run(workspace_id)

        import asyncio
        discoveries_count = asyncio.run(process_knowledge_and_discoveries())
        
        logger.info(f"Ingestion completed. Knowledge states refreshed, {discoveries_count} active discoveries generated.")
        
        return {
            "status": "completed",
            "claims_count": len(synthesis.claims),
            "evidence_count": len(synthesis.evidence),
            "discoveries_count": discoveries_count
        }
        
    except Exception as e:
        logger.error(f"Error executing run_evidence_synthesis task: {e}", exc_info=True)
        db.rollback()
        return {"status": "failed", "error": str(e)}
    finally:
        db.close()
