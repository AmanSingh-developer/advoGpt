from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.userModel import User
from app.services.password_service import verify_password
from app.services.jwt_service import create_access_token, create_refresh_token
import logging

logger = logging.getLogger(__name__)


async def login_resolver(db: AsyncSession, email: str, password: str):
    try:
        result = await db.execute(
            select(User).where(
                User.email == email,
                User.deleted_at.is_(None)
            )
        )
        user = result.scalars().first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        if not verify_password(password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        payload = {
            "sub": str(user.id),
            "role": user.role_id,
            "token_version": user.token_version,
        }

        access_token = create_access_token(payload)
        refresh_token = create_refresh_token(payload)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "email": user.email,
            "role": user.role_id,
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error("Login failed", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Login failed. Please try again."
        )