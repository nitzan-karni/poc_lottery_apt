import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Enum, Boolean, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class DocumentType(str, enum.Enum):
    ID_CARD = "ID_CARD"
    ELIGIBILITY_CERTIFICATE = "ELIGIBILITY_CERTIFICATE"
    DISABILITY_CERTIFICATE = "DISABILITY_CERTIFICATE"
    MILITARY_SERVICE_PROOF = "MILITARY_SERVICE_PROOF"
    RESIDENCY_PROOF = "RESIDENCY_PROOF"
    FINANCIAL_DOCUMENT = "FINANCIAL_DOCUMENT"
    OTHER = "OTHER"


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    type = Column(Enum(DocumentType), nullable=False)
    filename = Column(String, nullable=False)
    storage_key = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    verified = Column(Boolean, default=False)
    verified_by = Column(String, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    extracted_data = Column(JSON, nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="documents")

    __table_args__ = (
        Index("ix_documents_candidate_id", "candidate_id"),
    )
