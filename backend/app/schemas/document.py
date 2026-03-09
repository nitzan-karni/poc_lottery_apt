from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel
from app.models.document import DocumentType


class DocumentOut(BaseModel):
    id: str
    candidate_id: str
    type: DocumentType
    filename: str
    storage_key: str
    mime_type: str
    file_size: int
    verified: bool
    verified_by: Optional[str]
    verified_at: Optional[datetime]
    extracted_data: Optional[Any]
    uploaded_at: datetime

    class Config:
        from_attributes = True
