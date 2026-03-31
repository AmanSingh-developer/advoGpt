from openai import AsyncOpenAI
from app.config import settings
import json
import logging

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are an expert Indian legal document analyzer. Analyze legal documents like contracts, agreements, notices, and extract key information.

Respond ONLY with valid JSON in this exact format:
{
    "document_type": "Contract/Agreement/Notice/Other",
    "key_terms": ["Key Term 1", "Key Term 2"],
    "obligations": ["Obligation 1", "Obligation 2"],
    "risk_factors": ["Risk 1", "Risk 2"],
    "missing_elements": ["Missing Element 1"],
    "recommendations": ["Recommendation 1", "Recommendation 2"],
    "legal_sections": ["Relevant Section 1"]
}

Guidelines:
- Identify the type of document
- Extract key terms and obligations
- Identify potential risk factors
- Note any missing essential elements
- Provide actionable recommendations"""


async def analyze_document(document_text: str, doc_type: str = "General", user_id: str = None) -> dict:
    try:
        logger.info(f"Analyzing document, text_length={len(document_text)}, type={doc_type}")
        
        messages: list[dict] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

        try:
            from app.services.rag import rag_service
            context = await rag_service.get_context(document_text, user_id)
            if context:
                messages.append({
                    "role": "system",
                    "content": f"Relevant legal knowledge:\n\n{context}"
                })
        except Exception as e:
            logger.warning(f"RAG context retrieval failed: {e}")

        messages.append({
            "role": "user", 
            "content": f"Analyze this {doc_type} document:\n\n{document_text}"
        })
        
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL or "gpt-4o-mini",
            messages=messages,  # type: ignore
            temperature=0.7,
            max_tokens=1500,
        )

        content = response.choices[0].message.content
        content = str(content).strip() if content else ""
        
        content = content.strip('`').strip()
        if content.startswith("json"):
            content = content[4:].strip()
        
        result = json.loads(content)
        
        return {
            "document_type": result.get("document_type", "Unknown"),
            "key_terms": result.get("key_terms", []),
            "obligations": result.get("obligations", []),
            "risk_factors": result.get("risk_factors", []),
            "missing_elements": result.get("missing_elements", []),
            "recommendations": result.get("recommendations", []),
            "legal_sections": result.get("legal_sections", []),
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise Exception("Failed to parse document analysis response.")
    except Exception as e:
        logger.error(f"Document analysis error: {str(e)}")
        raise Exception(f"Document analysis failed: {str(e)}")
