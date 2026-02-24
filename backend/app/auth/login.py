from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_async_db
from app.schema.authSchema import LoginRequest, LoginResponse
from app.resolvers.authResolver import login_resolver

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_async_db),
):
    return await login_resolver(
        db=db,
        email=request.email,
        password=request.password
    )