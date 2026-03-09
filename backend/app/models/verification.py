from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class VerificationResult(Base):
    __tablename__ = "verification_results"

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id", ondelete="CASCADE"), unique=True, nullable=False)
    two_distinct_ids = Column(Boolean, nullable=True)
    id_number_matches_card = Column(Boolean, nullable=True)
    name_matches_card = Column(Boolean, nullable=True)
    id_numbers_consistent = Column(Boolean, nullable=True)
    names_consistent = Column(Boolean, nullable=True)
    form_date_valid = Column(Boolean, nullable=True)
    has_proper_stamp = Column(Boolean, nullable=True)
    eligibility_number = Column(String, nullable=True)
    is_apartmentless = Column(Boolean, nullable=True)
    overall_pass = Column(Boolean, default=False)
    raw_ai_response = Column(JSON, nullable=True)
    verified_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="verification_result")
