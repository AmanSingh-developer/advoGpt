import strawberry
from app.graphql.types import (
    CaseAnalysisResult,
    CaseAnalysisInput,
)
from app.services import analyze_legal_case


@strawberry.type
class Query:
    @strawberry.field
    def hello(self) -> str:
        return "Hello GraphQL 🚀"

    @strawberry.field
    async def analyze_case(self, input: CaseAnalysisInput) -> CaseAnalysisResult:
        result = await analyze_legal_case(input.story, input.case_type)
        
        return CaseAnalysisResult(
            strength=result["strength"],
            reason=result["reason"],
            legal_areas=result["legal_areas"],
            next_steps=result["next_steps"],
        )
