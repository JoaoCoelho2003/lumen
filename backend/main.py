import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi_nextauth_jwt import NextAuthJWT
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.db.models import User
from backend.core.database import engine, get_db, Base
from backend.utils.security import hash_password, verify_password

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

class UserAuth(BaseModel):
    username: str
    password: str

class UserRegister(UserAuth):
    confirmPassword: str

@app.post("/auth/register")
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    if data.password != data.confirmPassword:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    result = await db.execute(select(User).where(User.username == data.username))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    try:
        pw_bytes = data.password.encode("utf-8")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid password encoding")

    if len(pw_bytes) > 72:
        raise HTTPException(
            status_code=400,
            detail="Password too long: bcrypt limits passwords to 72 bytes; please use a shorter password",
        )

    try:
        hashed_pwd = hash_password(data.password)
        user = User(
            username=data.username,
            email=f"{data.username}@example.com",
            hashed_password=hashed_pwd,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    except HTTPException:
        raise
    except Exception as e:
        print("Error creating user:", e)
        raise HTTPException(status_code=500, detail="Internal server error")

    return {"message": "User created successfully", "user_id": user.id}

@app.post("/auth/login")
async def login(data: UserAuth, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return {
        "id": user.id,
        "name": user.username,
        "email": user.email,
    }

@app.post("/auth/logout")
async def logout(db: AsyncSession = Depends(get_db)):
    return {"message": "Logged out"}

@app.get("/")
async def root():
    return {"message": "The darkness that surrounds is but a canvas, Lumen breathes, and all shadows flee"}