import asyncio
import logging
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.core.config import settings

# -----------------------------------
# Logging
# -----------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("database")

# -----------------------------------
# Async Engine (Neon Compatible)
# -----------------------------------
engine = create_async_engine(
    settings.DATABASE_URL,  # must use postgresql+asyncpg://
    echo=True,  # Turn off in production
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_timeout=30,
    # connect_args={"ssl": "require"},  # Required for Neon
)

# -----------------------------------
# Async Session
# -----------------------------------
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

# -----------------------------------
# Base Model
# -----------------------------------
Base = declarative_base()

# -----------------------------------
# Dependency for FastAPI
# -----------------------------------
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


# -----------------------------------
# Test DB Connection
# -----------------------------------
async def test_db_connection():
    try:
        async with engine.connect() as connection:
            result = await connection.execute(text("SELECT 1"))
            value = result.scalar_one()
            logger.info("✅ Database connected successfully")
            return value == 1
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}", exc_info=True)
        return False


# -----------------------------------
# Health Check
# -----------------------------------
async def health_check():
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
            return True
    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return False


# -----------------------------------
# Optional Background Health Monitor
# -----------------------------------
async def periodic_health_check():
    while True:
        await asyncio.sleep(300)  # every 5 min
        healthy = await health_check()
        if not healthy:
            logger.warning("⚠️ Periodic health check failed")