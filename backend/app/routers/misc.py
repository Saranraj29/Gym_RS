from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import services as svc
from ..database import get_db
from ..models import DemoRequest
from ..schemas import DemoRequestIn, SettingsIn

router = APIRouter(prefix="/api", tags=["misc"])


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/settings")
def read_settings(db: Session = Depends(get_db)):
    return svc.get_settings(db)


@router.put("/settings")
def update_settings(body: SettingsIn, db: Session = Depends(get_db)):
    return svc.save_settings(db, body.model_dump(exclude_none=True))


@router.post("/demo-requests", status_code=201)
def create_demo_request(body: DemoRequestIn, db: Session = Depends(get_db)):
    db.add(DemoRequest(**body.model_dump()))
    db.commit()
    return {"ok": True}
