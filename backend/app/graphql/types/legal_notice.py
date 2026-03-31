import strawberry
from typing import Optional, List
import uuid
from datetime import datetime


@strawberry.type
class LegalNoticeType:
    id: uuid.UUID
    notice_type: str
    recipient_name: str
    recipient_address: Optional[str]
    sender_name: str
    sender_address: Optional[str]
    sender_email: Optional[str]
    form_data: Optional[str]
    generated_content: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


@strawberry.input
class CreateLegalNoticeInput:
    notice_type: str
    recipient_name: str
    recipient_address: Optional[str] = None
    sender_name: str
    sender_address: Optional[str] = None
    sender_email: Optional[str] = None
    form_data: Optional[str] = None
    generated_content: Optional[str] = None


@strawberry.input
class UpdateLegalNoticeInput:
    id: str
    recipient_name: Optional[str] = None
    recipient_address: Optional[str] = None
    sender_name: Optional[str] = None
    sender_address: Optional[str] = None
    sender_email: Optional[str] = None
    form_data: Optional[str] = None
    generated_content: Optional[str] = None
