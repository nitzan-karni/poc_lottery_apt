"""
Admin-only candidate management API.
"""
import uuid
import base64
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.candidate import Candidate, CandidateStatus
from app.models.document import Document, DocumentType
from app.models.verification import VerificationResult
from app.schemas.candidate import CandidateListOut, CandidateOut, CandidateStatusUpdate
from app.schemas.verification import VerificationResultOut
from app.schemas.document import DocumentOut
from app.schemas.email_log import SendEmailRequest
from app.services import file_storage, email_service
from app.models.email_log import EmailType
from app.workers.verification_worker import enqueue_verification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/candidates", tags=["candidates"])


@router.get("", response_model=List[CandidateListOut])
def list_candidates(
    status: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, le=200),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    query = db.query(Candidate).options(
        joinedload(Candidate.documents),
        joinedload(Candidate.verification_result),
    )
    if status:
        try:
            query = query.filter(Candidate.status == CandidateStatus(status))
        except ValueError:
            pass
    if project_id:
        query = query.filter(Candidate.project_id == project_id)
    if priority:
        query = query.filter(Candidate.priority == priority)
    if search:
        query = query.filter(
            or_(
                Candidate.first_name.ilike(f"%{search}%"),
                Candidate.last_name.ilike(f"%{search}%"),
                Candidate.id_number.ilike(f"%{search}%"),
                Candidate.email.ilike(f"%{search}%"),
            )
        )
    offset = (page - 1) * page_size
    return query.order_by(Candidate.created_at.desc()).offset(offset).limit(page_size).all()


@router.get("/{candidate_id}", response_model=CandidateOut)
def get_candidate(
    candidate_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    candidate = db.query(Candidate).options(
        joinedload(Candidate.documents),
        joinedload(Candidate.verification_result),
    ).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.patch("/{candidate_id}", response_model=CandidateOut)
def update_candidate(
    candidate_id: str,
    payload: CandidateStatusUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if payload.status:
        candidate.status = payload.status
        # Calculate appeal deadline if rejecting
        if payload.status == CandidateStatus.REJECTED:
            candidate.appeal_deadline = datetime.utcnow() + timedelta(days=3)

    if payload.notes is not None:
        candidate.notes = payload.notes

    if payload.apartment_chosen_id is not None:
        candidate.apartment_chosen_id = payload.apartment_chosen_id
        candidate.status = CandidateStatus.APARTMENT_CHOSEN

    candidate.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(candidate)
    return candidate


@router.get("/{candidate_id}/documents", response_model=List[DocumentOut])
def get_candidate_documents(
    candidate_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return db.query(Document).filter(Document.candidate_id == candidate_id).all()


@router.get("/{candidate_id}/document/{doc_id}/url")
async def get_document_url(
    candidate_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.candidate_id == candidate_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    url = await file_storage.get_presigned_url(doc.storage_key)
    return {"url": url, "mime_type": doc.mime_type, "filename": doc.filename}


@router.post("/{candidate_id}/verify")
async def re_run_verification(
    candidate_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    candidate = db.query(Candidate).options(joinedload(Candidate.documents)).filter(
        Candidate.id == candidate_id
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    docs = []
    for doc in candidate.documents:
        if doc.mime_type != "application/pdf":
            try:
                file_bytes = await file_storage.get_file_bytes(doc.storage_key)
                docs.append({
                    "type": doc.type.value,
                    "base64": base64.b64encode(file_bytes).decode(),
                    "mime_type": doc.mime_type,
                })
            except Exception as e:
                logger.warning(f"Could not fetch doc {doc.id}: {e}")

    enqueue_verification(
        candidate_id=candidate_id,
        first_name=candidate.first_name,
        last_name=candidate.last_name,
        id_number=candidate.id_number,
        documents=docs,
    )
    return {"message": "Verification job enqueued"}


@router.post("/{candidate_id}/email")
async def send_candidate_email(
    candidate_id: str,
    payload: SendEmailRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    result = await email_service.send_email(
        db=db,
        to=payload.to or candidate.email,
        subject=payload.subject,
        html=payload.body,
        email_type=payload.type,
        candidate_id=candidate_id,
    )

    # If sending correction request, update status
    if payload.type == EmailType.CORRECTION_REQUEST:
        candidate.status = CandidateStatus.NEEDS_CORRECTION
        candidate.updated_at = datetime.utcnow()
        db.commit()

    return {"message": "Email sent", "result": result}


@router.get("/{candidate_id}/verification", response_model=Optional[VerificationResultOut])
def get_verification_result(
    candidate_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    result = db.query(VerificationResult).filter(
        VerificationResult.candidate_id == candidate_id
    ).first()
    return result
