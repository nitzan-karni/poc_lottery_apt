from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr
from app.models.candidate import PriorityType, CandidateStatus


class CandidateCreate(BaseModel):
    first_name: str
    last_name: str
    id_number: str
    phone: Optional[str] = None
    email: str
    project_id: str
    priority: PriorityType = PriorityType.STANDARD


class CandidateStatusUpdate(BaseModel):
    status: Optional[CandidateStatus] = None
    notes: Optional[str] = None
    apartment_chosen_id: Optional[str] = None


class DocumentBrief(BaseModel):
    id: str
    type: str
    filename: str
    verified: bool
    uploaded_at: datetime

    class Config:
        from_attributes = True


class VerificationBrief(BaseModel):
    overall_pass: bool
    id_number_matches_card: Optional[bool]
    name_matches_card: Optional[bool]
    form_date_valid: Optional[bool]
    has_proper_stamp: Optional[bool]
    verified_at: datetime

    class Config:
        from_attributes = True


class CandidateListOut(BaseModel):
    id: str
    first_name: str
    last_name: str
    id_number: str
    email: str
    phone: Optional[str]
    project_id: str
    priority: PriorityType
    status: CandidateStatus
    lottery_number: Optional[int]
    registration_date: datetime
    appeal_deadline: Optional[datetime]
    documents: List[DocumentBrief] = []
    verification_result: Optional[VerificationBrief] = None

    class Config:
        from_attributes = True


class CandidateOut(CandidateListOut):
    eligibility_number: Optional[str]
    is_apartmentless: Optional[bool]
    notes: Optional[str]
    apartment_chosen_id: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
