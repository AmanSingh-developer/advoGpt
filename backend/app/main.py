from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter
import strawberry

from app.graphql.query import Query
from app.graphql.mutation import Mutation

app = FastAPI(title="Legal AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

schema = strawberry.Schema(query=Query, mutation=Mutation)
gql_app = GraphQLRouter(schema)

app.include_router(gql_app, prefix="/graphql")


@app.get("/")
def root():
    return {"message": "Legal AI Backend Running 🚀"}
