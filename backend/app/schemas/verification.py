from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


class VerificationResultOut(BaseModel):
    id: str
    candidate_id: str
    two_distinct_ids: Optional[bool]
    id_number_matches_card: Optional[bool]
    name_matches_card: Optional[bool]
    id_numbers_consistent: Optional[bool]
    names_consistent: Optional[bool]
    form_date_valid: Optional[bool]
    has_proper_stamp: Optional[bool]
    eligibility_number: Optional[str]
    is_apartmentless: Optional[bool]
    overall_pass: bool
    raw_ai_response: Optional[Any]
    verified_at: datetime

    class Config:
        from_attributes = True
