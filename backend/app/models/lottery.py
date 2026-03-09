from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Lottery(Base):
    __tablename__ = "lotteries"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    drawn_at = Column(DateTime, default=datetime.utcnow)
    drawn_by = Column(String, nullable=False)
    results = Column(JSON, nullable=False)
    seed = Column(String, nullable=True)

    project = relationship("Project", back_populates="lotteries")
