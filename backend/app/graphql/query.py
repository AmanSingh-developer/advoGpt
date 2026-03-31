import strawberry
from typing import List, Optional
from strawberry.types import Info
from app.graphql.types import (
    CaseAnalysisResult,
    CaseAnalysisInput,
    FIRAnalysisResult,
    DocumentAnalysisResult,
)
from app.graphql.types.chat import ChatSessionType, ChatSessionListType, ChatMessageType
from app.services import analyze_legal_case
from app.services.fir_analyzer import analyze_fir
from app.services.document_analyzer import analyze_document
from app.database import get_db
from sqlalchemy import select
from app.models import ChatSession, ChatMessage
from app.utils import decode_token
import uuid


@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello GraphQL 🚀"

    @strawberry.field
    async def analyze_case(self, input: CaseAnalysisInput) -> CaseAnalysisResult:
        result = await analyze_legal_case(input.story, input.case_type)
        
        return CaseAnalysisResult(
            category=result["category"],
            strength=result["strength"],
            reason=result["reason"],
            legal_areas=result["legal_areas"],
            next_steps=result["next_steps"],
        )

    @strawberry.field
    async def analyze_fir(self, info: Info, fir_text: str) -> FIRAnalysisResult:
        user_id = info.context.get("user_id")
        result = await analyze_fir(fir_text, user_id)
        
        return FIRAnalysisResult(
            ipc_sections=result["ipc_sections"],
            case_seriousness=result["case_seriousness"],
            possible_defenses=result["possible_defenses"],
            legal_implications=result["legal_implications"],
            next_steps=result["next_steps"],
        )

    @strawberry.field
    async def analyze_document_text(self, info: Info, document_text: str, doc_type: str = "General") -> DocumentAnalysisResult:
        user_id = info.context.get("user_id")
        result = await analyze_document(document_text, doc_type, user_id)
        
        return DocumentAnalysisResult(
            document_type=result["document_type"],
            key_terms=result["key_terms"],
            obligations=result["obligations"],
            risk_factors=result["risk_factors"],
            missing_elements=result["missing_elements"],
            recommendations=result["recommendations"],
            legal_sections=result["legal_sections"],
        )

    @strawberry.field
    async def get_chat_sessions(self, info: Info) -> List[ChatSessionListType]:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                result = await db.execute(
                    select(ChatSession)
                    .where(ChatSession.user_id == uuid.UUID(user_id))
                    .order_by(ChatSession.updated_at.desc())
                )
                sessions = result.scalars().all()

                return [
                    ChatSessionListType(
                        id=session.id,
                        title=session.title,
                        case_type=session.case_type,
                        created_at=session.created_at,
                        updated_at=session.updated_at,
                        message_count=len(session.messages) if session.messages else 0,
                    )
                    for session in sessions
                ]
        except Exception as e:
            raise Exception(str(e))

    @strawberry.field
    async def get_chat_session(self, info: Info, session_id: str) -> Optional[ChatSessionType]:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                result = await db.execute(
                    select(ChatSession)
                    .where(
                        ChatSession.id == uuid.UUID(session_id),
                        ChatSession.user_id == uuid.UUID(user_id)
                    )
                )
                session = result.scalar_one_or_none()

                if not session:
                    return None

                messages = [
                    ChatMessageType(
                        id=msg.id,
                        role=msg.role,
                        content=msg.content,
                        msg_metadata=msg.msg_metadata,
                        created_at=msg.created_at,
                    )
                    for msg in session.messages
                ]

                return ChatSessionType(
                    id=session.id,
                    title=session.title,
                    case_type=session.case_type,
                    created_at=session.created_at,
                    updated_at=session.updated_at,
                    messages=messages,
                )
        except Exception as e:
            raise Exception(str(e))
