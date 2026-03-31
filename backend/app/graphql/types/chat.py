import strawberry
from typing import Optional, List
import uuid
from datetime import datetime


@strawberry.type
class ChatMessageType:
    id: uuid.UUID
    role: str
    content: str
    msg_metadata: Optional[str]
    created_at: datetime


@strawberry.type
class ChatSessionType:
    id: uuid.UUID
    title: str
    case_type: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    messages: List[ChatMessageType]


@strawberry.type
class ChatSessionListType:
    id: uuid.UUID
    title: str
    case_type: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    message_count: int


@strawberry.input
class ChatMessageInput:
    role: str
    content: str
    metadata: Optional[str] = None


@strawberry.input
class CreateChatSessionInput:
    title: str = "New Chat"
    case_type: Optional[str] = None


@strawberry.input
class SendMessageInput:
    session_id: str
    message: str
    case_type: Optional[str] = None
