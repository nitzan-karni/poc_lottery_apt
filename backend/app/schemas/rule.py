from pydantic import BaseModel


class RuleOut(BaseModel):
    id: str
    category: str
    title: str
    content: str
    order: int

    class Config:
        from_attributes = True
