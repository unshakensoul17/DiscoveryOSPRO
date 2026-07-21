import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from dependencies import get_current_user, verify_workspace
from models.document import Document
from tasks.agent_tasks import run_evidence_synthesis
from celery_app import celery_app

router = APIRouter(
    prefix="/workspaces/{workspace_id}/documents",
    tags=["documents"],
    dependencies=[Depends(verify_workspace)]
)

UPLOAD_DIR = "./uploads"
ALLOWED_EXTENSIONS = {".pdf", ".txt", ".docx", ".json", ".csv", ".md"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

@router.post("/ingest")
async def ingest_document(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Ingest a new research document and trigger claims/evidence extraction."""
    # Ensure directory exists
    ws_upload_dir = os.path.join(UPLOAD_DIR, workspace_id)
    os.makedirs(ws_upload_dir, exist_ok=True)
    
    # Save file to disk
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1].lower()

    # Validate file type
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    safe_filename = f"{file_id}{file_ext}"
    file_path = os.path.join(ws_upload_dir, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            content = await file.read()
            if len(content) > MAX_FILE_SIZE_BYTES:
                raise HTTPException(status_code=413, detail="File too large. Maximum size is 20MB.")
            buffer.write(content)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
    # Get file size
    file_size = os.path.getsize(file_path)
    
    # Create Document record
    doc = Document(
        id=file_id,
        workspace_id=workspace_id,
        title=file.filename,
        file_key=file_path,
        file_size=file_size,
        file_type=file.content_type,
        uploaded_by=current_user.id if hasattr(current_user, "id") else None
    )
    
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # Resilient background execution for Hackathon Demo:
    # Always use FastAPI BackgroundTasks to avoid requiring Redis/Celery on stage.
    background_tasks.add_task(run_evidence_synthesis, doc.id, workspace_id)
    logger_msg = "FastAPI BackgroundTasks (Demo Mode)"
        
    return {
        "id": doc.id,
        "title": doc.title,
        "file_size": doc.file_size,
        "file_type": doc.file_type,
        "status": "processing",
        "message": f"Document uploaded successfully. Processing started via {logger_msg}."
    }

@router.get("")
async def list_documents(
    workspace_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all ingested documents for a workspace."""
    documents = db.query(Document).filter(
        Document.workspace_id == workspace_id,
        Document.deleted_at.is_(None)
    ).all()
    
    return {
        "data": [
            {
                "id": doc.id,
                "title": doc.title,
                "file_size": doc.file_size,
                "file_type": doc.file_type,
                "created_at": doc.created_at.isoformat() if doc.created_at else None
            }
            for doc in documents
        ],
        "total": len(documents)
    }

from fastapi.responses import StreamingResponse
import asyncio
import json

@router.get("/{document_id}/status")
async def get_document_status(
    workspace_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Check if claims/evidence extraction for a document is completed."""
    from models.claim import Claim
    from models.evidence import Evidence
    
    claims_count = db.query(Claim).filter(Claim.extracted_from_document == document_id).count()
    evidence_count = db.query(Evidence).filter(Evidence.source_document == document_id).count()
    
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    is_done = doc.processing_status in ("completed", "failed")
    
    return {
        "id": document_id,
        "is_done": is_done,
        "status": doc.processing_status,
        "progress": doc.processing_progress,
        "claims_count": claims_count,
        "evidence_count": evidence_count
    }

@router.get("/{document_id}/stream")
async def stream_document_status(
    workspace_id: str,
    document_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Stream real-time document processing status and progress via Server-Sent Events (SSE)."""
    async def event_generator():
        from database import SessionLocal
        from models.claim import Claim
        from models.evidence import Evidence

        last_progress = -1
        last_status = None
        ticks = 0

        while True:
            session = SessionLocal()
            try:
                doc = session.query(Document).filter(
                    Document.id == document_id,
                    Document.workspace_id == workspace_id
                ).first()

                if not doc:
                    err_payload = json.dumps({"error": "Document not found"})
                    yield f"event: error\ndata: {err_payload}\n\n"
                    break

                status = doc.processing_status or "processing"
                progress = doc.processing_progress or 0

                claims_count = session.query(Claim).filter(Claim.extracted_from_document == document_id).count()
                evidence_count = session.query(Evidence).filter(Evidence.source_document == document_id).count()

                payload = json.dumps({
                    "id": document_id,
                    "status": status,
                    "progress": progress,
                    "claims_count": claims_count,
                    "evidence_count": evidence_count,
                    "is_done": status in ("completed", "failed")
                })

                if progress != last_progress or status != last_status:
                    last_progress = progress
                    last_status = status
                    yield f"data: {payload}\n\n"
                else:
                    yield ": heartbeat\n\n"

                if status in ("completed", "failed"):
                    break
            finally:
                session.close()

            ticks += 1
            if ticks > 300:  # Timeout safety (5 mins)
                break
            await asyncio.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
