from pydantic import BaseModel
from app.models.admin import AdminRole


class AdminCreate(BaseModel):
    email: str
    name: str
    password: str
    role: AdminRole = AdminRole.REVIEWER


class AdminLogin(BaseModel):
    email: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_id: str
    admin_email: str
    admin_name: str
    admin_role: str
