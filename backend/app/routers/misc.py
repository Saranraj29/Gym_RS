from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import services as svc
from .. import whatsapp
from ..database import get_db
from ..schemas import SettingsIn

router = APIRouter(prefix="/api", tags=["misc"])


def _with_status(settings: dict) -> dict:
    out = {k: v for k, v in settings.items() if k != "last_auto_run"}
    out["whatsapp_api_available"] = whatsapp.available()
    out["whatsapp_dry_run"] = whatsapp.dry_run()
    return out


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/settings")
def read_settings(db: Session = Depends(get_db)):
    return _with_status(svc.get_settings(db))


@router.put("/settings")
def update_settings(body: SettingsIn, db: Session = Depends(get_db)):
    if body.reminder_method == "api" and not whatsapp.available():
        raise HTTPException(
            422, "Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to your .env file and restart to enable automatic sending"
        )
    return _with_status(svc.save_settings(db, body.model_dump(exclude_none=True)))
