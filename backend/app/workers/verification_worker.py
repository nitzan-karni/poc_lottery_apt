"""
Background verification worker using Redis Queue (RQ).
"""
import logging
import uuid
from datetime import datetime
from typing import Optional
import redis
from rq import Queue
from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    redis_conn = redis.from_url(settings.REDIS_URL)
    verification_queue = Queue("verification", connection=redis_conn)
    _queue_available = True
except Exception as e:
    logger.warning(f"Redis not available: {e}. Verification jobs will be skipped.")
    _queue_available = False
    verification_queue = None


def enqueue_verification(
    candidate_id: str,
    first_name: str,
    last_name: str,
    id_number: str,
    documents: list[dict],
):
    """Enqueue an AI verification job."""
    if not _queue_available or verification_queue is None:
        logger.warning(f"Queue not available; skipping verification for {candidate_id}")
        return

    verification_queue.enqueue(
        run_verification_job,
        candidate_id=candidate_id,
        first_name=first_name,
        last_name=last_name,
        id_number=id_number,
        documents=documents,
        job_timeout=120,
    )
    logger.info(f"Verification job enqueued for candidate {candidate_id}")


def run_verification_job(
    candidate_id: str,
    first_name: str,
    last_name: str,
    id_number: str,
    documents: list[dict],
):
    """
    This function runs in the RQ worker process.
    It calls the AI verification service and updates the database.
    """
    import asyncio
    from app.core.database import SessionLocal
    from app.models.candidate import Candidate, CandidateStatus
    from app.models.verification import VerificationResult
    from app.services.document_verifier import VerificationInput, verify_documents

    db = SessionLocal()
    try:
        input_data = VerificationInput(
            candidate_first_name=first_name,
            candidate_last_name=last_name,
            candidate_id_number=id_number,
            documents=documents,
        )

        result = asyncio.run(verify_documents(input_data))

        # Save verification result
        existing = db.query(VerificationResult).filter(
            VerificationResult.candidate_id == candidate_id
        ).first()

        if existing:
            for k, v in result.items():
                attr = k  # already snake_case from AI response
                if hasattr(existing, attr):
                    setattr(existing, attr, v)
            existing.verified_at = datetime.utcnow()
            existing.raw_ai_response = result
        else:
            vr = VerificationResult(
                id=str(uuid.uuid4()),
                candidate_id=candidate_id,
                two_distinct_ids=result.get("two_distinct_ids"),
                id_number_matches_card=result.get("id_number_matches_card"),
                name_matches_card=result.get("name_matches_card"),
                id_numbers_consistent=result.get("id_numbers_consistent"),
                names_consistent=result.get("names_consistent"),
                form_date_valid=result.get("form_date_valid"),
                has_proper_stamp=result.get("has_proper_stamp"),
                eligibility_number=result.get("eligibility_number"),
                is_apartmentless=result.get("is_apartmentless"),
                overall_pass=result.get("overall_pass", False),
                raw_ai_response=result,
            )
            db.add(vr)

        # Update candidate
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if candidate:
            if result.get("overall_pass"):
                candidate.status = CandidateStatus.AI_VERIFIED
            else:
                candidate.status = CandidateStatus.NEEDS_CORRECTION
            if result.get("eligibility_number"):
                candidate.eligibility_number = result["eligibility_number"]
            if result.get("is_apartmentless") is not None:
                candidate.is_apartmentless = result["is_apartmentless"]
            candidate.updated_at = datetime.utcnow()

        db.commit()
        logger.info(f"Verification completed for {candidate_id}: overall_pass={result.get('overall_pass')}")

    except Exception as e:
        db.rollback()
        logger.error(f"Verification job failed for {candidate_id}: {e}")
        # On failure, leave status as PENDING_REVIEW
    finally:
        db.close()
