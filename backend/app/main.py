from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import strawberry
from strawberry.fastapi import GraphQLRouter
from app.auth.login import router as login_router

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# GraphQL Schema
# ---------------------------

# @strawberry.type
# class Query:
#     @strawberry.field
#     def hello(self) -> str:
#         return "AI Legal Platform GraphQL Running 🚀"

schema = strawberry.Schema(query=Query)

graphql_app = GraphQLRouter(schema)

app.include_router(graphql_app, prefix="/graphql")


@app.get("/")
def root():
    return {"message": "REST API Running 🚀"}


app.include_router(login_router)
