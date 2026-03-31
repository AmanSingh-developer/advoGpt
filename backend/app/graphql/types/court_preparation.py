import strawberry
from typing import Optional, List
import uuid
from datetime import datetime


@strawberry.type
class CourtPreparationType:
    id: uuid.UUID
    case_name: str
    court_type: Optional[str]
    case_stage: Optional[str]
    hearing_date: Optional[str]
    opposing_party: Optional[str]
    judge_name: Optional[str]
    timeline_events: Optional[str]
    examination_questions: Optional[str]
    checklist_items: Optional[str]
    legal_arguments: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


@strawberry.input
class CreateCourtPreparationInput:
    case_name: str
    court_type: Optional[str] = None
    case_stage: Optional[str] = None
    hearing_date: Optional[str] = None
    opposing_party: Optional[str] = None
    judge_name: Optional[str] = None
    timeline_events: Optional[str] = None
    examination_questions: Optional[str] = None
    checklist_items: Optional[str] = None
    legal_arguments: Optional[str] = None


@strawberry.input
class UpdateCourtPreparationInput:
    id: str
    case_name: Optional[str] = None
    court_type: Optional[str] = None
    case_stage: Optional[str] = None
    hearing_date: Optional[str] = None
    opposing_party: Optional[str] = None
    judge_name: Optional[str] = None
    timeline_events: Optional[str] = None
    examination_questions: Optional[str] = None
    checklist_items: Optional[str] = None
    legal_arguments: Optional[str] = None
