from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_current_admin
from app.models.admin import AdminUser
from app.schemas.admin import AdminLogin, TokenOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(payload: AdminLogin, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.email == payload.email).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": admin.email})
    return TokenOut(
        access_token=token,
        admin_id=admin.id,
        admin_email=admin.email,
        admin_name=admin.name,
        admin_role=admin.role.value,
    )


@router.get("/me")
def get_me(current_admin=Depends(get_current_admin)):
    return {
        "id": current_admin.id,
        "email": current_admin.email,
        "name": current_admin.name,
        "role": current_admin.role,
    }
