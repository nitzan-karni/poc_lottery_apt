from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.project import ProjectStatus


class ProjectCreate(BaseModel):
    name: str
    address: str
    total_units: int
    status: ProjectStatus = ProjectStatus.UPCOMING
    deadline: datetime


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    total_units: Optional[int] = None
    status: Optional[ProjectStatus] = None
    deadline: Optional[datetime] = None


class ProjectOut(BaseModel):
    id: str
    name: str
    address: str
    total_units: int
    status: ProjectStatus
    deadline: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
