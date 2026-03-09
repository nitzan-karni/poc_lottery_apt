from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.candidate import Candidate

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def search_by_id(id: str, db: Session = Depends(get_db)):
    """Public lottery position search by ID number."""
    candidate = db.query(Candidate).filter(Candidate.id_number == id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="No results found. Please verify your ID number.")

    # Mask name for privacy: "Yael Cohen" → "Y*** C***"
    def mask_name(name: str) -> str:
        return name[0] + "***" if name else "***"

    return {
        "found": True,
        "name": f"{mask_name(candidate.first_name)} {mask_name(candidate.last_name)}",
        "lottery_position": candidate.lottery_number,
        "status": candidate.status.value,
        "project_id": candidate.project_id,
        "apartment_assigned": bool(candidate.apartment_chosen_id),
    }
