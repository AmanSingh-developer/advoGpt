from sqlalchemy import Column, String, DateTime, ForeignKey, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid


class CourtPreparation(Base):
    __tablename__ = "court_preparations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    case_name = Column(String, nullable=False)
    court_type = Column(String, nullable=True)
    case_stage = Column(String, nullable=True)
    hearing_date = Column(String, nullable=True)
    opposing_party = Column(String, nullable=True)
    judge_name = Column(String, nullable=True)
    timeline_events = Column(JSON, nullable=True)
    examination_questions = Column(JSON, nullable=True)
    checklist_items = Column(JSON, nullable=True)
    legal_arguments = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")
