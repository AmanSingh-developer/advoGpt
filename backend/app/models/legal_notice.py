from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class LegalNotice(Base):
    __tablename__ = "legal_notices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    notice_type = Column(String, nullable=False)
    recipient_name = Column(String, nullable=False)
    recipient_address = Column(Text, nullable=True)
    sender_name = Column(String, nullable=False)
    sender_address = Column(Text, nullable=True)
    sender_email = Column(String, nullable=True)
    form_data = Column(JSON, nullable=True)
    generated_content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
