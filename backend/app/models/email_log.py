import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class EmailType(str, enum.Enum):
    CORRECTION_REQUEST = "CORRECTION_REQUEST"
    APPROVAL_NOTICE = "APPROVAL_NOTICE"
    REJECTION_NOTICE = "REJECTION_NOTICE"
    LOTTERY_RESULT = "LOTTERY_RESULT"
    APARTMENT_TOUR_INVITATION = "APARTMENT_TOUR_INVITATION"
    WAITLIST_PROMOTION = "WAITLIST_PROMOTION"
    GENERAL = "GENERAL"


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=True)
    to = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    type = Column(Enum(EmailType), nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="sent")

    candidate = relationship("Candidate", back_populates="email_logs")
