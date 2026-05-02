import os
from fastapi import FastAPI
from fastapi_nextauth_jwt import NextAuthJWT
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from backend.core.database import engine, Base
from backend.api.auth import router as auth_router

load_dotenv()

app = FastAPI()

@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

_origins = os.getenv(
    "FRONTEND_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)

if isinstance(_origins, str):
    _origins_list = [o.strip() for o in _origins.split(",") if o.strip()]
else:
    _origins_list = list(_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT = NextAuthJWT(secret=os.getenv("JWT_SECRET_KEY", "fallback_secret_for_dev"))

app.include_router(auth_router)

@app.get("/")
async def root():
    return {"message": "The darkness that surrounds is but a canvas, Lumen breathes, and all shadows flee"}