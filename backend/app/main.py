# app/main.py
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
# app/main.py
import strawberry
from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

from app.graphql.query import Query
from app.graphql.mutation import Mutation
# from app.routes import ai_routes
from strawberry.fastapi import GraphQLRouter
from app.database import get_db
import strawberry

app = FastAPI(title="Legal AI Backend")
schema = strawberry.Schema(query=Query, mutation=Mutation)
gql_app = GraphQLRouter(schema)

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


# schema = strawberry.Schema(query=Query, mutation=Mutation)
app.include_router(gql_app, prefix="/graphql")
# app.include_router(GraphQLRouter(schema), prefix="/graphql")