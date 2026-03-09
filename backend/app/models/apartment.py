from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.core.database import Base


class Apartment(Base):
    __tablename__ = "apartments"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    number = Column(String, nullable=False)
    floor = Column(Integer, nullable=False)
    rooms = Column(Float, nullable=False)
    sqm = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    taken = Column(Boolean, default=False)

    project = relationship("Project", back_populates="apartments")
    taken_by = relationship("Candidate", foreign_keys="Candidate.apartment_chosen_id", back_populates="apartment_chosen")

    __table_args__ = (
        Index("ix_apartments_project_taken", "project_id", "taken"),
    )
