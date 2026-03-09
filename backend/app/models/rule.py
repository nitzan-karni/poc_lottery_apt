from sqlalchemy import Column, String, Integer, Text
from app.core.database import Base


class Rule(Base):
    __tablename__ = "rules"

    id = Column(String, primary_key=True)
    category = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    order = Column(Integer, default=0)
