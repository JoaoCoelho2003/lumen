from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/")
async def root():
    return {
        "message": "The darkness that surrounds is but a canvas, Lumen breathes, and all shadows flee"
    }
