import strawberry
from typing import List, Optional


@strawberry.type
class FIRAnalysisResult:
    ipc_sections: List[str]
    case_seriousness: str
    possible_defenses: List[str]
    legal_implications: str
    next_steps: List[str]


@strawberry.type
class DocumentAnalysisResult:
    document_type: str
    key_terms: List[str]
    obligations: List[str]
    risk_factors: List[str]
    missing_elements: List[str]
    recommendations: List[str]
    legal_sections: List[str]


@strawberry.type
class FileUploadResult:
    success: bool
    file_id: str
    filename: str
    file_type: str
    text_preview: Optional[str]
