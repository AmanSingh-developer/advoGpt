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
from app.graphql.types.legal_notice import LegalNoticeType
from app.graphql.types.evidence import EvidenceType
from app.graphql.types.court_preparation import CourtPreparationType
from app.services import analyze_legal_case
from app.services.fir_analyzer import analyze_fir
from app.services.document_analyzer import analyze_document
from app.database import get_db
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models import ChatSession, ChatMessage, LegalNotice, Evidence, CourtPreparation
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
                    .options(selectinload(ChatSession.messages))
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
                    .options(selectinload(ChatSession.messages))
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

    @strawberry.field
    async def get_legal_notices(self, info: Info) -> List[LegalNoticeType]:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                result = await db.execute(
                    select(LegalNotice)
                    .where(LegalNotice.user_id == uuid.UUID(user_id))
                    .order_by(LegalNotice.created_at.desc())
                )
                notices = result.scalars().all()

                return [
                    LegalNoticeType(
                        id=notice.id,
                        notice_type=notice.notice_type,
                        recipient_name=notice.recipient_name,
                        recipient_address=notice.recipient_address,
                        sender_name=notice.sender_name,
                        sender_address=notice.sender_address,
                        sender_email=notice.sender_email,
                        form_data=notice.form_data,
                        generated_content=notice.generated_content,
                        created_at=notice.created_at,
                        updated_at=notice.updated_at,
                    )
                    for notice in notices
                ]
        except Exception as e:
            raise Exception(str(e))

    @strawberry.field
    async def get_legal_notice(self, info: Info, notice_id: str) -> Optional[LegalNoticeType]:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                result = await db.execute(
                    select(LegalNotice).where(
                        LegalNotice.id == uuid.UUID(notice_id),
                        LegalNotice.user_id == uuid.UUID(user_id)
                    )
                )
                notice = result.scalar_one_or_none()

                if not notice:
                    return None

                return LegalNoticeType(
                    id=notice.id,
                    notice_type=notice.notice_type,
                    recipient_name=notice.recipient_name,
                    recipient_address=notice.recipient_address,
                    sender_name=notice.sender_name,
                    sender_address=notice.sender_address,
                    sender_email=notice.sender_email,
                    form_data=notice.form_data,
                    generated_content=notice.generated_content,
                    created_at=notice.created_at,
                    updated_at=notice.updated_at,
                )
        except Exception as e:
            raise Exception(str(e))

    @strawberry.field
    async def get_evidences(self, info: Info) -> List[EvidenceType]:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                result = await db.execute(
                    select(Evidence)
                    .where(Evidence.user_id == uuid.UUID(user_id))
                    .order_by(Evidence.created_at.desc())
                )
                evidences = result.scalars().all()

                return [
                    EvidenceType(
                        id=evidence.id,
                        name=evidence.name,
                        evidence_type=evidence.evidence_type,
                        category=evidence.category,
                        description=evidence.description,
                        tags=evidence.tags,
                        notes=evidence.notes,
                        chain_of_custody=evidence.chain_of_custody,
                        analysis=evidence.analysis,
                        created_at=evidence.created_at,
                        updated_at=evidence.updated_at,
                    )
                    for evidence in evidences
                ]
        except Exception as e:
            raise Exception(str(e))

    @strawberry.field
    async def get_evidence(self, info: Info, evidence_id: str) -> Optional[EvidenceType]:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                result = await db.execute(
                    select(Evidence).where(
                        Evidence.id == uuid.UUID(evidence_id),
                        Evidence.user_id == uuid.UUID(user_id)
                    )
                )
                evidence = result.scalar_one_or_none()

                if not evidence:
                    return None

                return EvidenceType(
                    id=evidence.id,
                    name=evidence.name,
                    evidence_type=evidence.evidence_type,
                    category=evidence.category,
                    description=evidence.description,
                    tags=evidence.tags,
                    notes=evidence.notes,
                    chain_of_custody=evidence.chain_of_custody,
                    analysis=evidence.analysis,
                    created_at=evidence.created_at,
                    updated_at=evidence.updated_at,
                )
        except Exception as e:
            raise Exception(str(e))

    @strawberry.field
    async def get_court_preparations(self, info: Info) -> List[CourtPreparationType]:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                result = await db.execute(
                    select(CourtPreparation)
                    .where(CourtPreparation.user_id == uuid.UUID(user_id))
                    .order_by(CourtPreparation.created_at.desc())
                )
                preps = result.scalars().all()

                return [
                    CourtPreparationType(
                        id=prep.id,
                        case_name=prep.case_name,
                        court_type=prep.court_type,
                        case_stage=prep.case_stage,
                        hearing_date=prep.hearing_date,
                        opposing_party=prep.opposing_party,
                        judge_name=prep.judge_name,
                        timeline_events=prep.timeline_events,
                        examination_questions=prep.examination_questions,
                        checklist_items=prep.checklist_items,
                        legal_arguments=prep.legal_arguments,
                        created_at=prep.created_at,
                        updated_at=prep.updated_at,
                    )
                    for prep in preps
                ]
        except Exception as e:
            raise Exception(str(e))

    @strawberry.field
    async def get_court_preparation(self, info: Info, preparation_id: str) -> Optional[CourtPreparationType]:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                result = await db.execute(
                    select(CourtPreparation).where(
                        CourtPreparation.id == uuid.UUID(preparation_id),
                        CourtPreparation.user_id == uuid.UUID(user_id)
                    )
                )
                prep = result.scalar_one_or_none()

                if not prep:
                    return None

                return CourtPreparationType(
                    id=prep.id,
                    case_name=prep.case_name,
                    court_type=prep.court_type,
                    case_stage=prep.case_stage,
                    hearing_date=prep.hearing_date,
                    opposing_party=prep.opposing_party,
                    judge_name=prep.judge_name,
                    timeline_events=prep.timeline_events,
                    examination_questions=prep.examination_questions,
                    checklist_items=prep.checklist_items,
                    legal_arguments=prep.legal_arguments,
                    created_at=prep.created_at,
                    updated_at=prep.updated_at,
                )
        except Exception as e:
            raise Exception(str(e))
