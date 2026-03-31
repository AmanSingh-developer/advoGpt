import strawberry
from app.graphql.types.auth import AuthPayload, LoginInput, SignupInput, UserType, MessageResponse
from app.graphql.types.chat import ChatSessionType, ChatMessageType, CreateChatSessionInput, SendMessageInput
from app.graphql.types.legal_notice import LegalNoticeType, CreateLegalNoticeInput, UpdateLegalNoticeInput
from app.graphql.types.evidence import EvidenceType, CreateEvidenceInput, UpdateEvidenceInput
from app.graphql.types.court_preparation import CourtPreparationType, CreateCourtPreparationInput, UpdateCourtPreparationInput
from app.database import get_db
from sqlalchemy import select
from app.models import User, ChatSession, ChatMessage, LegalNotice, Evidence, CourtPreparation
from app.utils import hash_password, verify_password, create_access_token, validate_password, decode_token
from app.services import analyze_legal_case, rag_service
from sqlalchemy.exc import IntegrityError
from strawberry.types import Info
import uuid
import json


@strawberry.type
class Mutation:
    @strawberry.mutation
    async def signup(self, input: SignupInput) -> AuthPayload:
        try:
            async for db in get_db():
                existing_user = await db.execute(
                    select(User).where(User.email == input.email)
                )
                if existing_user.scalar_one_or_none():
                    raise Exception("Email already registered")

                valid, error_msg = validate_password(input.password)
                if not valid:
                    raise Exception(error_msg)

                password_hash = hash_password(input.password)

                new_user = User(
                    email=input.email,
                    password=password_hash,
                    first_name=input.first_name,
                    last_name=input.last_name,
                    role_type="user",
                )

                db.add(new_user)
                await db.commit()
                await db.refresh(new_user)

                token = create_access_token(str(new_user.id), new_user.email)

                return AuthPayload(
                    token=token,
                    user=UserType(
                        id=new_user.id,
                        email=new_user.email,
                        first_name=new_user.first_name,
                        last_name=new_user.last_name,
                        role_type=new_user.role_type,
                    ),
                )
        except IntegrityError:
            raise Exception("Email already registered")
        except Exception as e:
            raise Exception(str(e))

    @strawberry.mutation
    async def login(self, input: LoginInput) -> AuthPayload:
        try:
            async for db in get_db():
                result = await db.execute(
                    select(User).where(User.email == input.email)
                )
                user = result.scalar_one_or_none()

                if not user:
                    raise Exception("Invalid email or password")

                if not verify_password(input.password, user.password):
                    raise Exception("Invalid email or password")

                token = create_access_token(str(user.id), user.email)

                return AuthPayload(
                    token=token,
                    user=UserType(
                        id=user.id,
                        email=user.email,
                        first_name=user.first_name,
                        last_name=user.last_name,
                        role_type=user.role_type,
                    ),
                )
        except Exception as e:
            raise Exception(str(e))

    @strawberry.mutation
    async def logout(self) -> MessageResponse:
        return MessageResponse(success=True, message="Logged out successfully")

    @strawberry.mutation
    async def create_chat_session(self, info: Info, input: CreateChatSessionInput) -> ChatSessionType:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                session = ChatSession(
                    user_id=uuid.UUID(user_id),
                    title=input.title,
                    case_type=input.case_type,
                )
                db.add(session)
                await db.commit()
                await db.refresh(session)

                return ChatSessionType(
                    id=session.id,
                    title=session.title,
                    case_type=session.case_type,
                    created_at=session.created_at,
                    updated_at=session.updated_at,
                    messages=[],
                )
        except Exception as e:
            raise Exception(str(e))

    @strawberry.mutation
    async def send_message(self, info: Info, input: SendMessageInput) -> ChatMessageType:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                session_result = await db.execute(
                    select(ChatSession).where(
                        ChatSession.id == uuid.UUID(input.session_id),
                        ChatSession.user_id == uuid.UUID(user_id)
                    )
                )
                session = session_result.scalar_one_or_none()
                if not session:
                    raise Exception("Chat session not found")

                user_message = ChatMessage(
                    session_id=session.id,
                    role="user",
                    content=input.message,
                )
                db.add(user_message)

                analysis = await analyze_legal_case(input.message, user_id=user_id)

                detected_category = analysis.get('category', 'General')

                ai_response = f"""**Case Category:** {detected_category}

**Case Strength:** {analysis['strength'].value}

**Analysis:**
{analysis['reason']}

**Relevant Legal Areas:**
{', '.join(analysis['legal_areas'])}

**Suggested Next Steps:**
""" + "\n".join([f"{i+1}. {step}" for i, step in enumerate(analysis['next_steps'])])

                ai_message = ChatMessage(
                    session_id=session.id,
                    role="assistant",
                    content=ai_response,
                    msg_metadata=f"category:{detected_category}|strength:{analysis['strength'].value}",
                )
                db.add(ai_message)

                session.case_type = detected_category
                await db.commit()
                await db.refresh(ai_message)

                return ChatMessageType(
                    id=ai_message.id,
                    role=ai_message.role,
                    content=ai_message.content,
                    msg_metadata=ai_message.msg_metadata,
                    created_at=ai_message.created_at,
                )
        except Exception as e:
            raise Exception(str(e))

    @strawberry.mutation
    async def delete_chat_session(self, info: Info, session_id: str) -> MessageResponse:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                session_result = await db.execute(
                    select(ChatSession).where(
                        ChatSession.id == uuid.UUID(session_id),
                        ChatSession.user_id == uuid.UUID(user_id)
                    )
                )
                session = session_result.scalar_one_or_none()
                if not session:
                    raise Exception("Chat session not found")

                await db.delete(session)
                await db.commit()

                return MessageResponse(success=True, message="Chat deleted successfully")
        except Exception as e:
            raise Exception(str(e))

    @strawberry.mutation
    async def create_legal_notice(self, info: Info, input: CreateLegalNoticeInput) -> LegalNoticeType:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                notice = LegalNotice(
                    user_id=uuid.UUID(user_id),
                    notice_type=input.notice_type,
                    recipient_name=input.recipient_name,
                    recipient_address=input.recipient_address,
                    sender_name=input.sender_name,
                    sender_address=input.sender_address,
                    sender_email=input.sender_email,
                    form_data=input.form_data,
                    generated_content=input.generated_content,
                )
                db.add(notice)
                await db.commit()
                await db.refresh(notice)

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

    @strawberry.mutation
    async def update_legal_notice(self, info: Info, input: UpdateLegalNoticeInput) -> LegalNoticeType:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                notice_result = await db.execute(
                    select(LegalNotice).where(
                        LegalNotice.id == uuid.UUID(input.id),
                        LegalNotice.user_id == uuid.UUID(user_id)
                    )
                )
                notice = notice_result.scalar_one_or_none()
                if not notice:
                    raise Exception("Legal notice not found")

                if input.recipient_name is not None:
                    notice.recipient_name = input.recipient_name
                if input.recipient_address is not None:
                    notice.recipient_address = input.recipient_address
                if input.sender_name is not None:
                    notice.sender_name = input.sender_name
                if input.sender_address is not None:
                    notice.sender_address = input.sender_address
                if input.sender_email is not None:
                    notice.sender_email = input.sender_email
                if input.form_data is not None:
                    notice.form_data = input.form_data
                if input.generated_content is not None:
                    notice.generated_content = input.generated_content

                await db.commit()
                await db.refresh(notice)

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

    @strawberry.mutation
    async def delete_legal_notice(self, info: Info, notice_id: str) -> MessageResponse:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                notice_result = await db.execute(
                    select(LegalNotice).where(
                        LegalNotice.id == uuid.UUID(notice_id),
                        LegalNotice.user_id == uuid.UUID(user_id)
                    )
                )
                notice = notice_result.scalar_one_or_none()
                if not notice:
                    raise Exception("Legal notice not found")

                await db.delete(notice)
                await db.commit()

                return MessageResponse(success=True, message="Legal notice deleted successfully")
        except Exception as e:
            raise Exception(str(e))

    @strawberry.mutation
    async def create_evidence(self, info: Info, input: CreateEvidenceInput) -> EvidenceType:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                evidence = Evidence(
                    user_id=uuid.UUID(user_id),
                    name=input.name,
                    evidence_type=input.evidence_type,
                    category=input.category,
                    description=input.description,
                    tags=input.tags,
                    notes=input.notes,
                    chain_of_custody=input.chain_of_custody,
                    analysis=input.analysis,
                )
                db.add(evidence)
                await db.commit()
                await db.refresh(evidence)

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

    @strawberry.mutation
    async def update_evidence(self, info: Info, input: UpdateEvidenceInput) -> EvidenceType:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                evidence_result = await db.execute(
                    select(Evidence).where(
                        Evidence.id == uuid.UUID(input.id),
                        Evidence.user_id == uuid.UUID(user_id)
                    )
                )
                evidence = evidence_result.scalar_one_or_none()
                if not evidence:
                    raise Exception("Evidence not found")

                if input.name is not None:
                    evidence.name = input.name
                if input.evidence_type is not None:
                    evidence.evidence_type = input.evidence_type
                if input.category is not None:
                    evidence.category = input.category
                if input.description is not None:
                    evidence.description = input.description
                if input.tags is not None:
                    evidence.tags = input.tags
                if input.notes is not None:
                    evidence.notes = input.notes
                if input.chain_of_custody is not None:
                    evidence.chain_of_custody = input.chain_of_custody
                if input.analysis is not None:
                    evidence.analysis = input.analysis

                await db.commit()
                await db.refresh(evidence)

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

    @strawberry.mutation
    async def delete_evidence(self, info: Info, evidence_id: str) -> MessageResponse:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                evidence_result = await db.execute(
                    select(Evidence).where(
                        Evidence.id == uuid.UUID(evidence_id),
                        Evidence.user_id == uuid.UUID(user_id)
                    )
                )
                evidence = evidence_result.scalar_one_or_none()
                if not evidence:
                    raise Exception("Evidence not found")

                await db.delete(evidence)
                await db.commit()

                return MessageResponse(success=True, message="Evidence deleted successfully")
        except Exception as e:
            raise Exception(str(e))

    @strawberry.mutation
    async def create_court_preparation(self, info: Info, input: CreateCourtPreparationInput) -> CourtPreparationType:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                prep = CourtPreparation(
                    user_id=uuid.UUID(user_id),
                    case_name=input.case_name,
                    court_type=input.court_type,
                    case_stage=input.case_stage,
                    hearing_date=input.hearing_date,
                    opposing_party=input.opposing_party,
                    judge_name=input.judge_name,
                    timeline_events=input.timeline_events,
                    examination_questions=input.examination_questions,
                    checklist_items=input.checklist_items,
                    legal_arguments=input.legal_arguments,
                )
                db.add(prep)
                await db.commit()
                await db.refresh(prep)

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

    @strawberry.mutation
    async def update_court_preparation(self, info: Info, input: UpdateCourtPreparationInput) -> CourtPreparationType:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                prep_result = await db.execute(
                    select(CourtPreparation).where(
                        CourtPreparation.id == uuid.UUID(input.id),
                        CourtPreparation.user_id == uuid.UUID(user_id)
                    )
                )
                prep = prep_result.scalar_one_or_none()
                if not prep:
                    raise Exception("Court preparation not found")

                if input.case_name is not None:
                    prep.case_name = input.case_name
                if input.court_type is not None:
                    prep.court_type = input.court_type
                if input.case_stage is not None:
                    prep.case_stage = input.case_stage
                if input.hearing_date is not None:
                    prep.hearing_date = input.hearing_date
                if input.opposing_party is not None:
                    prep.opposing_party = input.opposing_party
                if input.judge_name is not None:
                    prep.judge_name = input.judge_name
                if input.timeline_events is not None:
                    prep.timeline_events = input.timeline_events
                if input.examination_questions is not None:
                    prep.examination_questions = input.examination_questions
                if input.checklist_items is not None:
                    prep.checklist_items = input.checklist_items
                if input.legal_arguments is not None:
                    prep.legal_arguments = input.legal_arguments

                await db.commit()
                await db.refresh(prep)

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

    @strawberry.mutation
    async def delete_court_preparation(self, info: Info, preparation_id: str) -> MessageResponse:
        try:
            user_id = info.context.get("user_id")
            if not user_id:
                raise Exception("Authentication required")

            async for db in get_db():
                prep_result = await db.execute(
                    select(CourtPreparation).where(
                        CourtPreparation.id == uuid.UUID(preparation_id),
                        CourtPreparation.user_id == uuid.UUID(user_id)
                    )
                )
                prep = prep_result.scalar_one_or_none()
                if not prep:
                    raise Exception("Court preparation not found")

                await db.delete(prep)
                await db.commit()

                return MessageResponse(success=True, message="Court preparation deleted successfully")
        except Exception as e:
            raise Exception(str(e))
