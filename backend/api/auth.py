from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from db.models import User
from utils.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


class UserAuth(BaseModel):
    username: str
    password: str


class UserRegister(UserAuth):
    confirmPassword: str


@router.post("/register")
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


@router.post("/login")
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


@router.post("/logout")
async def logout():
    return {"message": "Logged out"}