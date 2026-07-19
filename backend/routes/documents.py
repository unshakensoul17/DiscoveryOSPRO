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
    
    # Resilient background execution:
    # Trigger Celery background task. If it fails or is in eager/fallback mode, run in FastAPI BackgroundTasks
    task_triggered = False
    try:
        # Check if Celery can queue the task
        run_evidence_synthesis.delay(doc.id, workspace_id)
        task_triggered = True
        logger_msg = "Celery task dispatched"
    except Exception as e:
        # Fallback to FastAPI BackgroundTasks thread
        background_tasks.add_task(run_evidence_synthesis, doc.id, workspace_id)
        logger_msg = f"FastAPI BackgroundTask fallback (Celery dispatch failed: {e})"
        
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
    from datetime import datetime, timezone
    
    claims_count = db.query(Claim).filter(Claim.extracted_from_document == document_id).count()
    evidence_count = db.query(Evidence).filter(Evidence.source_document == document_id).count()
    
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Using real database columns for status Tracking
    is_done = doc.processing_status == "completed" or doc.processing_status == "failed"
    
    return {
        "id": document_id,
        "is_done": is_done,
        "status": doc.processing_status,
        "progress": doc.processing_progress,
        "claims_count": claims_count,
        "evidence_count": evidence_count
    }
