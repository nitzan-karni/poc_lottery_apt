from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.rule import Rule
from app.schemas.rule import RuleOut

router = APIRouter(prefix="/api/rules", tags=["rules"])


@router.get("", response_model=List[RuleOut])
def list_rules(
    q: Optional[str] = Query(None, description="Search term"),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Rule)
    if q:
        query = query.filter(
            or_(
                Rule.title.ilike(f"%{q}%"),
                Rule.content.ilike(f"%{q}%"),
            )
        )
    if category:
        query = query.filter(Rule.category == category)
    return query.order_by(Rule.category, Rule.order).all()


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(Rule.category).distinct().all()
    return [r[0] for r in rows]
