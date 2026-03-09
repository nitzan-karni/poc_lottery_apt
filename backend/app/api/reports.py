"""
Reports & Analytics API.
"""
import io
import csv
from fastapi import APIRouter, Depends, Response, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.core.security import get_current_admin
from app.models.candidate import Candidate, CandidateStatus
from app.models.apartment import Apartment

router = APIRouter(prefix="/api/admin/reports", tags=["reports"])


@router.get("/summary")
def get_summary(
    project_id: str = Query(None),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    query = db.query(Candidate)
    if project_id:
        query = query.filter(Candidate.project_id == project_id)

    total = query.count()
    by_status = {
        status.value: query.filter(Candidate.status == status).count()
        for status in CandidateStatus
    }

    apt_query = db.query(Apartment)
    if project_id:
        apt_query = apt_query.filter(Apartment.project_id == project_id)
    total_apartments = apt_query.count()
    taken_apartments = apt_query.filter(Apartment.taken == True).count()

    return {
        "total_registrants": total,
        "by_status": by_status,
        "total_apartments": total_apartments,
        "taken_apartments": taken_apartments,
        "available_apartments": total_apartments - taken_apartments,
    }


@router.get("/winners")
def get_winners_report(
    project_id: str = Query(None),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    query = db.query(Candidate).filter(
        Candidate.status.in_([CandidateStatus.WINNER, CandidateStatus.APARTMENT_CHOSEN])
    )
    if project_id:
        query = query.filter(Candidate.project_id == project_id)
    winners = query.order_by(Candidate.lottery_number).all()

    return [
        {
            "lottery_number": c.lottery_number,
            "id": c.id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "id_number": c.id_number[:3] + "******",
            "priority": c.priority.value,
            "status": c.status.value,
            "apartment_chosen_id": c.apartment_chosen_id,
            "email": c.email,
        }
        for c in winners
    ]


@router.get("/export/csv")
def export_winners_csv(
    project_id: str = Query(None),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    query = db.query(Candidate).filter(
        Candidate.status.in_([CandidateStatus.WINNER, CandidateStatus.APARTMENT_CHOSEN])
    )
    if project_id:
        query = query.filter(Candidate.project_id == project_id)
    winners = query.order_by(Candidate.lottery_number).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Lottery#", "First Name", "Last Name", "ID (masked)", "Email", "Priority", "Status", "Apartment"])
    for c in winners:
        writer.writerow([
            c.lottery_number,
            c.first_name,
            c.last_name,
            c.id_number[:3] + "******",
            c.email,
            c.priority.value,
            c.status.value,
            c.apartment_chosen_id or "Not assigned",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=winners_report.csv"},
    )
