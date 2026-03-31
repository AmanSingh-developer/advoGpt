from openai import AsyncOpenAI
from app.config import settings
import json
import re
import logging

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SYSTEM_PROMPT = """You are an expert Indian legal analyst AI. Analyze FIR (First Information Report) documents and extract key information.

Respond ONLY with valid JSON in this exact format:
{
    "ipc_sections": ["IPC Section 1", "IPC Section 2"],
    "case_seriousness": "HIGH" or "MEDIUM" or "LOW",
    "possible_defenses": ["Defense 1", "Defense 2"],
    "legal_implications": "Brief explanation of legal implications",
    "next_steps": ["Step 1", "Step 2", "Step 3"]
}

Guidelines:
- Extract all mentioned IPC sections from the FIR
- Assess case seriousness based on IPC sections mentioned
- Suggest possible defenses based on the nature of allegations
- Provide next steps for legal preparation"""


async def analyze_fir(fir_text: str, user_id: str = None) -> dict:
    try:
        logger.info(f"Analyzing FIR, text_length={len(fir_text)}")
        
        messages: list[dict] = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]

        try:
            from app.services.rag import rag_service
            context = await rag_service.get_context(fir_text, user_id)
            if context:
                messages.append({
                    "role": "system",
                    "content": f"Relevant legal knowledge:\n\n{context}"
                })
        except Exception as e:
            logger.warning(f"RAG context retrieval failed: {e}")

        messages.append({
            "role": "user", 
            "content": f"Analyze this FIR document:\n\n{fir_text}"
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
            "ipc_sections": result.get("ipc_sections", []),
            "case_seriousness": result.get("case_seriousness", "MEDIUM"),
            "possible_defenses": result.get("possible_defenses", []),
            "legal_implications": result.get("legal_implications", ""),
            "next_steps": result.get("next_steps", []),
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise Exception("Failed to parse FIR analysis response.")
    except Exception as e:
        logger.error(f"FIR analysis error: {str(e)}")
        raise Exception(f"FIR analysis failed: {str(e)}")
