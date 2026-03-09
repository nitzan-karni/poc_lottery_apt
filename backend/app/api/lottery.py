"""
Lottery engine API — run draws, view results, manage winners & waitlist.
"""
import uuid
import logging
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.candidate import Candidate, CandidateStatus, PriorityType
from app.models.lottery import Lottery
from app.models.project import Project
from app.schemas.lottery import LotteryRunRequest, LotteryOut
from app.services.lottery_engine import run_lottery
from app.services import email_service
from app.models.email_log import EmailType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/lottery", tags=["lottery"])


@router.post("/run", response_model=LotteryOut)
async def run_lottery_draw(
    payload: LotteryRunRequest,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get all APPROVED candidates
    approved = db.query(Candidate).filter(
        Candidate.project_id == payload.project_id,
        Candidate.status == CandidateStatus.APPROVED,
    ).all()

    if not approved:
        raise HTTPException(status_code=400, detail="No approved candidates found for this project.")

    candidates_input = [{"id": c.id, "priority": c.priority.value} for c in approved]
    results, seed = run_lottery(candidates_input, project.total_units, payload.seed)

    # Create lottery record
    lottery_id = str(uuid.uuid4())
    lottery = Lottery(
        id=lottery_id,
        project_id=payload.project_id,
        drawn_by=payload.drawn_by,
        results=results,
        seed=seed,
    )
    db.add(lottery)

    # Update candidates
    candidate_map = {c.id: c for c in approved}
    for result in results:
        c = candidate_map.get(result["candidateId"])
        if c:
            c.lottery_number = result["lotteryNumber"]
            c.status = CandidateStatus.WINNER if result["status"] == "WINNER" else CandidateStatus.WAITLIST
            c.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(lottery)

    # Send emails asynchronously (non-blocking best-effort)
    for result in results:
        c = candidate_map.get(result["candidateId"])
        if not c:
            continue
        try:
            if result["status"] == "WINNER":
                html = email_service.build_winner_email(
                    f"{c.first_name} {c.last_name}", project.name, result["lotteryNumber"]
                )
                await email_service.send_email(
                    db, c.email, f"Lottery Result — You are a Winner! #{result['lotteryNumber']}",
                    html, EmailType.LOTTERY_RESULT, c.id
                )
                tour_html = email_service.build_tour_invitation_email(
                    f"{c.first_name} {c.last_name}", project.name, result["lotteryNumber"]
                )
                await email_service.send_email(
                    db, c.email, f"Apartment Tour Invitation — {project.name}",
                    tour_html, EmailType.APARTMENT_TOUR_INVITATION, c.id
                )
            else:
                html = email_service.build_waitlist_email(
                    f"{c.first_name} {c.last_name}", project.name, result["lotteryNumber"]
                )
                await email_service.send_email(
                    db, c.email, f"Lottery Result — Waiting List #{result['lotteryNumber']}",
                    html, EmailType.LOTTERY_RESULT, c.id
                )
        except Exception as e:
            logger.error(f"Failed to send lottery email to {c.email}: {e}")

    return lottery


@router.get("/project/{project_id}", response_model=list[LotteryOut])
def get_project_lotteries(
    project_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    return db.query(Lottery).filter(Lottery.project_id == project_id).order_by(Lottery.drawn_at.desc()).all()


@router.get("/{lottery_id}", response_model=LotteryOut)
def get_lottery(
    lottery_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    lottery = db.query(Lottery).filter(Lottery.id == lottery_id).first()
    if not lottery:
        raise HTTPException(status_code=404, detail="Lottery not found")
    return lottery
