from typing import Optional
from pydantic import BaseModel


class ApartmentOut(BaseModel):
    id: str
    project_id: str
    number: str
    floor: int
    rooms: float
    sqm: float
    price: float
    taken: bool

    class Config:
        from_attributes = True


class ApartmentAssign(BaseModel):
    candidate_id: str
