from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from strawberry.fastapi import GraphQLRouter
from strawberry.types import Info
import strawberry
import uuid

from app.graphql.query import Query
from app.graphql.mutation import Mutation
from app.services.rag import rag_service
from app.services.document_processor import document_processor
from app.utils import decode_token

app = FastAPI(title="Legal AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_context(request: Request) -> dict:
    context = {}
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        payload = decode_token(token)
        if payload:
            context["user_id"] = payload.get("sub")
            context["user_email"] = payload.get("email")
    return context


schema = strawberry.Schema(query=Query, mutation=Mutation)
gql_app = GraphQLRouter(schema, context_getter=get_context)

app.include_router(gql_app, prefix="/graphql")


@app.on_event("startup")
async def startup_event():
    from app.database import engine, Base
    from app.models import User, ChatSession, ChatMessage

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("Database tables created/verified")
    except Exception as e:
        print(f"Database initialization warning: {e}")

    try:
        await rag_service.initialize()
        print("RAG service initialized successfully")
    except Exception as e:
        print(f"RAG initialization warning: {e}")


@app.post("/api/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = None,
    doc_type: str = "general"
):
    allowed_types = ["application/pdf", "text/plain"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Supported: {', '.join(['PDF', 'TXT'])}"
        )

    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"

    content = await file.read()

    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB"
        )

    try:
        file_path = document_processor.save_uploaded_file(content, filename)

        text = document_processor.extract_text_from_pdf(file_path) if file.content_type == "application/pdf" else document_processor.extract_text_from_txt(file_path)

        await rag_service.add_user_document(
            file_path=file_path,
            filename=file.filename or "document",
            user_id=user_id or "anonymous"
        )

        preview = text[:500] + "..." if len(text) > 500 else text

        return {
            "success": True,
            "file_id": file_id,
            "filename": file.filename,
            "file_type": doc_type,
            "text_preview": preview,
            "text_length": len(text)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "rag_initialized": rag_service.knowledge_base_initialized}


@app.get("/")
def root():
    return {"message": "Legal AI Backend Running 🚀"}
