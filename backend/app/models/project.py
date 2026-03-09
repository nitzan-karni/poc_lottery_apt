import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base


class ProjectStatus(str, enum.Enum):
    UPCOMING = "UPCOMING"
    REGISTRATION_OPEN = "REGISTRATION_OPEN"
    REGISTRATION_CLOSED = "REGISTRATION_CLOSED"
    LOTTERY_DRAWN = "LOTTERY_DRAWN"
    ASSIGNMENT_IN_PROGRESS = "ASSIGNMENT_IN_PROGRESS"
    COMPLETED = "COMPLETED"


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    total_units = Column(Integer, nullable=False)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.UPCOMING, nullable=False)
    deadline = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    candidates = relationship("Candidate", back_populates="project")
    apartments = relationship("Apartment", back_populates="project")
    lotteries = relationship("Lottery", back_populates="project")
