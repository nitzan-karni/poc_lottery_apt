"""
Apartment management — listing, assignment, and waitlist promotion.
"""
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.apartment import Apartment
from app.models.candidate import Candidate, CandidateStatus
from app.models.lottery import Lottery
from app.schemas.apartment import ApartmentOut, ApartmentAssign
from app.services import email_service
from app.models.email_log import EmailType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/apartments", tags=["apartments"])

WAITLIST_REEVALUATION_DAYS = 180


@router.get("", response_model=List[ApartmentOut])
def list_apartments(
    project_id: Optional[str] = Query(None),
    available_only: bool = Query(False),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    query = db.query(Apartment)
    if project_id:
        query = query.filter(Apartment.project_id == project_id)
    if available_only:
        query = query.filter(Apartment.taken == False)
    return query.order_by(Apartment.floor, Apartment.number).all()


@router.patch("/{apartment_id}/assign", response_model=ApartmentOut)
def assign_apartment(
    apartment_id: str,
    payload: ApartmentAssign,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    apartment = db.query(Apartment).filter(Apartment.id == apartment_id).first()
    if not apartment:
        raise HTTPException(status_code=404, detail="Apartment not found")
    if apartment.taken:
        raise HTTPException(status_code=409, detail="Apartment already taken")

    candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    apartment.taken = True
    candidate.apartment_chosen_id = apartment_id
    candidate.status = CandidateStatus.APARTMENT_CHOSEN
    candidate.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(apartment)
    return apartment


@router.post("/waitlist/promote")
async def promote_next_waitlist(
    project_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    """Promote the next waitlisted candidate to WINNER status."""
    next_candidate = db.query(Candidate).filter(
        Candidate.project_id == project_id,
        Candidate.status == CandidateStatus.WAITLIST,
    ).order_by(Candidate.lottery_number).first()

    if not next_candidate:
        raise HTTPException(status_code=404, detail="No waitlisted candidates found")

    # Check if 6+ months since lottery draw
    last_lottery = db.query(Lottery).filter(
        Lottery.project_id == project_id
    ).order_by(Lottery.drawn_at.desc()).first()

    reevaluation_required = False
    if last_lottery:
        days_since_lottery = (datetime.utcnow() - last_lottery.drawn_at).days
        reevaluation_required = days_since_lottery >= WAITLIST_REEVALUATION_DAYS

    next_candidate.status = CandidateStatus.WINNER
    next_candidate.updated_at = datetime.utcnow()
    db.commit()

    # Send promotion email
    try:
        from app.models.project import Project
        project = db.query(Project).filter(Project.id == project_id).first()
        html = email_service.build_waitlist_promotion_email(
            f"{next_candidate.first_name} {next_candidate.last_name}",
            project.name if project else "the lottery",
            next_candidate.lottery_number or 0,
        )
        await email_service.send_email(
            db=db,
            to=next_candidate.email,
            subject="A Spot Has Opened — You Are Now a Winner!",
            html=html,
            email_type=EmailType.WAITLIST_PROMOTION,
            candidate_id=next_candidate.id,
        )
        tour_html = email_service.build_tour_invitation_email(
            f"{next_candidate.first_name} {next_candidate.last_name}",
            project.name if project else "the lottery",
            next_candidate.lottery_number or 0,
        )
        await email_service.send_email(
            db=db,
            to=next_candidate.email,
            subject="Apartment Tour Invitation",
            html=tour_html,
            email_type=EmailType.APARTMENT_TOUR_INVITATION,
            candidate_id=next_candidate.id,
        )
    except Exception as e:
        logger.error(f"Failed to send promotion email: {e}")

    return {
        "promoted_candidate_id": next_candidate.id,
        "lottery_number": next_candidate.lottery_number,
        "reevaluation_required": reevaluation_required,
        "message": (
            "⚠ 6+ months since lottery — eligibility re-evaluation required per regulations."
            if reevaluation_required
            else "Candidate promoted to winner status."
        ),
    }
