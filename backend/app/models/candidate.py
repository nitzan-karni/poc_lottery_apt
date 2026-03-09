import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Enum, Boolean, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class PriorityType(str, enum.Enum):
    DISABLED = "DISABLED"
    MILITARY_RESERVES = "MILITARY_RESERVES"
    LOCAL_RESIDENT = "LOCAL_RESIDENT"
    YOUNG_COUPLE = "YOUNG_COUPLE"
    STANDARD = "STANDARD"


class CandidateStatus(str, enum.Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    AI_VERIFIED = "AI_VERIFIED"
    APPROVED = "APPROVED"
    NEEDS_CORRECTION = "NEEDS_CORRECTION"
    REJECTED = "REJECTED"
    WINNER = "WINNER"
    WAITLIST = "WAITLIST"
    APARTMENT_CHOSEN = "APARTMENT_CHOSEN"
    DISQUALIFIED = "DISQUALIFIED"


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    id_number = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=False)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    priority = Column(Enum(PriorityType), default=PriorityType.STANDARD, nullable=False)
    status = Column(Enum(CandidateStatus), default=CandidateStatus.PENDING_REVIEW, nullable=False)
    lottery_number = Column(Integer, nullable=True)
    apartment_chosen_id = Column(String, ForeignKey("apartments.id"), nullable=True)
    eligibility_number = Column(String, nullable=True)
    is_apartmentless = Column(Boolean, nullable=True)
    registration_date = Column(DateTime, default=datetime.utcnow)
    appeal_deadline = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="candidates")
    documents = relationship("Document", back_populates="candidate", cascade="all, delete-orphan")
    verification_result = relationship("VerificationResult", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="candidate")
    apartment_chosen = relationship("Apartment", foreign_keys=[apartment_chosen_id])

    __table_args__ = (
        UniqueConstraint("id_number", "project_id", name="uq_candidate_id_project"),
        Index("ix_candidates_project_status", "project_id", "status"),
        Index("ix_candidates_id_number", "id_number"),
    )
