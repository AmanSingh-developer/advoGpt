import strawberry
from typing import List
from enum import Enum


@strawberry.enum
class CaseStrength(Enum):
    STRONG = "STRONG"
    MEDIUM = "MEDIUM"
    WEAK = "WEAK"


@strawberry.type
class CaseAnalysisResult:
    strength: CaseStrength
    reason: str
    legal_areas: List[str]
    next_steps: List[str]


@strawberry.input
class CaseAnalysisInput:
    story: str
    case_type: str
