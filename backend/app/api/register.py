"""
Public registration endpoint with file upload, validation, and AI verification job enqueueing.
"""
import uuid
import base64
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.models.candidate import Candidate, PriorityType, CandidateStatus
from app.models.document import Document, DocumentType
from app.models.project import Project
from app.services import file_storage
from app.workers.verification_worker import enqueue_verification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/register", tags=["registration"])

ALLOWED_MIME_TYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def validate_israeli_id(id_number: str) -> bool:
    """Israeli Teudat Zehut validation (Luhn-variant)."""
    if not id_number.isdigit() or len(id_number) != 9:
        return False
    total = 0
    for i, digit in enumerate(id_number):
        n = int(digit) * ((i % 2) + 1)
        if n > 9:
            n -= 9
        total += n
    return total % 10 == 0


@router.post("")
async def register_candidate(
    first_name: str = Form(...),
    last_name: str = Form(...),
    id_number: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    project_id: str = Form(...),
    priority: PriorityType = Form(PriorityType.STANDARD),
    # Required documents
    id_card: UploadFile = File(...),
    eligibility_certificate: UploadFile = File(...),
    # Optional extra documents
    extra_files: Optional[List[UploadFile]] = File(None),
    extra_types: Optional[str] = Form(None),  # comma-separated DocumentType values
    db: Session = Depends(get_db),
):
    # 1. Validate Israeli ID
    if not validate_israeli_id(id_number):
        raise HTTPException(status_code=422, detail="Invalid Israeli ID number (Teudat Zehut). Must be 9 digits with valid checksum.")

    # 2. Check project exists and deadline not passed
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.deadline < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Registration deadline has passed. Late registrations are automatically disqualified."
        )

    # 3. Create candidate record
    candidate_id = str(uuid.uuid4())
    candidate = Candidate(
        id=candidate_id,
        first_name=first_name,
        last_name=last_name,
        id_number=id_number,
        phone=phone,
        email=email,
        project_id=project_id,
        priority=priority,
        status=CandidateStatus.PENDING_REVIEW,
    )

    try:
        db.add(candidate)
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="You have already registered for this project."
        )

    # 4. Upload required documents
    docs_for_verification = []

    async def _upload_doc(upload: UploadFile, doc_type: DocumentType):
        content = await upload.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail=f"File {upload.filename} exceeds 10MB limit.")
        if upload.content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(status_code=415, detail=f"File type {upload.content_type} not supported.")

        storage_key, file_size = await file_storage.upload_file(
            file_bytes=content,
            original_filename=upload.filename or "document",
            mime_type=upload.content_type,
            candidate_id=candidate_id,
            document_type=doc_type.value,
        )

        doc = Document(
            id=str(uuid.uuid4()),
            candidate_id=candidate_id,
            type=doc_type,
            filename=upload.filename or "document",
            storage_key=storage_key,
            mime_type=upload.content_type,
            file_size=file_size,
        )
        db.add(doc)

        if upload.content_type != "application/pdf":
            docs_for_verification.append({
                "type": doc_type.value,
                "base64": base64.b64encode(content).decode(),
                "mime_type": upload.content_type,
            })

    try:
        await _upload_doc(id_card, DocumentType.ID_CARD)
        await _upload_doc(eligibility_certificate, DocumentType.ELIGIBILITY_CERTIFICATE)

        # Optional extra documents
        if extra_files:
            extra_type_list = [t.strip() for t in (extra_types or "").split(",") if t.strip()]
            for i, extra_file in enumerate(extra_files):
                if extra_file.filename:
                    try:
                        doc_type = DocumentType(extra_type_list[i]) if i < len(extra_type_list) else DocumentType.OTHER
                    except (ValueError, IndexError):
                        doc_type = DocumentType.OTHER
                    await _upload_doc(extra_file, doc_type)

        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"File upload failed: {e}")
        raise HTTPException(status_code=500, detail="File upload failed. Please try again.")

    # 5. Enqueue AI verification job (non-blocking)
    try:
        enqueue_verification(
            candidate_id=candidate_id,
            first_name=first_name,
            last_name=last_name,
            id_number=id_number,
            documents=docs_for_verification,
        )
    except Exception as e:
        logger.warning(f"Could not enqueue verification job: {e}. Candidate will be reviewed manually.")

    return JSONResponse(
        status_code=201,
        content={
            "message": "Registration submitted successfully.",
            "candidate_id": candidate_id,
            "reference": candidate_id[:8].upper(),
        }
    )
