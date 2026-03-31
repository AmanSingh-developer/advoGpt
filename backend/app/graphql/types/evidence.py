import strawberry
from typing import Optional, List
import uuid
from datetime import datetime


@strawberry.type
class EvidenceType:
    id: uuid.UUID
    name: str
    evidence_type: str
    category: str
    description: Optional[str]
    tags: Optional[str]
    notes: Optional[str]
    chain_of_custody: Optional[str]
    analysis: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]


@strawberry.input
class CreateEvidenceInput:
    name: str
    evidence_type: str
    category: str
    description: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    chain_of_custody: Optional[str] = None
    analysis: Optional[str] = None


@strawberry.input
class UpdateEvidenceInput:
    id: str
    name: Optional[str] = None
    evidence_type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    notes: Optional[str] = None
    chain_of_custody: Optional[str] = None
    analysis: Optional[str] = None
