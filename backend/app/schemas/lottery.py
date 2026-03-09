from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel


class LotteryRunRequest(BaseModel):
    project_id: str
    drawn_by: str
    seed: Optional[str] = None


class LotteryOut(BaseModel):
    id: str
    project_id: str
    drawn_at: datetime
    drawn_by: str
    results: Any
    seed: Optional[str]

    class Config:
        from_attributes = True
