import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum
from app.core.database import Base


class AdminRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    REVIEWER = "REVIEWER"
    VIEWER = "VIEWER"


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(AdminRole), default=AdminRole.REVIEWER, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
