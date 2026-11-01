import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (registers tables)
from .database import PHOTO_DIR, Base, SessionLocal, engine
from .routers import dashboard, fees, locations, members, misc, plans, reminders


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(engine)
    from .migrate import add_missing_columns, ensure_locations
    from .seed import seed_if_empty

    add_missing_columns(engine)
    with SessionLocal() as db:
        ensure_locations(db)
        seed_if_empty(db)
    yield


app = FastAPI(title="FitTrack API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:8080").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

for r in (misc, dashboard, locations, members, plans, fees, reminders):
    app.include_router(r.router)

app.mount("/media/photos", StaticFiles(directory=PHOTO_DIR), name="photos")
