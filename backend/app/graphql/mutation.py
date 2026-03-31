import strawberry
from app.graphql.types.auth import AuthPayload, LoginInput, SignupInput, UserType, MessageResponse
from app.graphql.types.chat import ChatSessionType, ChatMessageType, CreateChatSessionInput, SendMessageInput
from app.database import get_db
from sqlalchemy import select
from app.models import User, ChatSession, ChatMessage
from app.utils import hash_password, verify_password, create_access_token, validate_password, decode_token
from app.services import analyze_legal_case, rag_service
from sqlalchemy.exc import IntegrityError
from strawberry.types import Info
import uuid


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
