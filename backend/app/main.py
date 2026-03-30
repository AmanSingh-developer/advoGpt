# app/main.py
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
# from app.routes import ai_routes
from app.database import get_db

app = FastAPI(title="Legal AI Backend")

# app.include_router(ai_routes.router)


@app.get("/")
def root():
    return {"message": "Legal AI Backend Running 🚀"}


# ✅ DB TEST ENDPOINT
@app.get("/test-db")
async def test_db(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        value = result.scalar()

        return {
            "status": "success",
            "db": "connected",
            "result": value
        }
    except Exception as e:
        return {
            "status": "error",
            "db": "failed",
            "error": str(e)
        }