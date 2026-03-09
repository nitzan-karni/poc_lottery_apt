from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.email_log import EmailType


class SendEmailRequest(BaseModel):
    to: str
    subject: str
    body: str
    type: EmailType = EmailType.GENERAL


class EmailLogOut(BaseModel):
    id: str
    candidate_id: Optional[str]
    to: str
    subject: str
    type: EmailType
    sent_at: datetime
    status: str

    class Config:
        from_attributes = True
