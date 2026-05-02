from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.auth import router as auth_router
from backend.api.health import router as health_router
from backend.api.map_data import router as map_data_router
from backend.api.pins import router as pins_router
from backend.core.config import FRONTEND_ORIGINS
from backend.core.database import init_db
from backend.services.lighting import load_lamp_coords


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_lamp_coords()
    await init_db()

    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(routes_router)
app.include_router(pins_router)
app.include_router(map_data_router)
