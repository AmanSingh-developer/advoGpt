from openai import AsyncOpenAI
from app.config import settings
import json
from app.graphql.types.case import CaseStrength
import logging

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


SYSTEM_PROMPT = """You are an expert Indian legal advisor AI. Analyze the user's legal situation and provide a comprehensive case strength assessment.

Respond ONLY with valid JSON in this exact format:
{
    "strength": "STRONG" or "MEDIUM" or "WEAK",
    "reason": "A detailed explanation of why this case strength rating is given",
    "legal_areas": ["Area 1", "Area 2", "Area 3"],
    "next_steps": ["Step 1", "Step 2", "Step 3", "Step 4", "Step 5"]
}

Guidelines for assessment:
- STRONG: Clear evidence, strong legal precedents, documented proof available
- MEDIUM: Some evidence but gaps exist, mixed legal standing
- WEAK: Weak evidence, unclear facts, or complex circumstances

Legal areas should be specific Indian laws like:
- Indian Contract Act, 1872
- Consumer Protection Act, 2019
- Labour Law (Industrial Disputes Act, 1947)
- Property Law (Transfer of Property Act, 1882)
- Criminal Law (IPC sections)
- Family Law (Hindu Marriage Act, 1955)
- Labour Law (Payment of Wages Act, 1936)
- Consumer Protection Act, 2019
- Companies Act, 2013

Next steps should be practical and actionable for an Indian legal context."""


async def analyze_legal_case(story: str, case_type: str) -> dict:
    user_message = f"""
Case Type: {case_type}

User's Legal Situation:
{story}

Please analyze this case and provide your assessment in JSON format.
"""

    content = ""
    try:
        logger.info(f"Analyzing case: type={case_type}, story_length={len(story)}")
        
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL or "gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7,
            max_tokens=1000,
        )

        message_content = response.choices[0].message.content
        content = str(message_content).strip() if message_content else ""
        logger.info(f"OpenAI response received, length: {len(content)}")
        
        content = content.strip('`').strip()
        if content.startswith("json"):
            content = content[4:].strip()
        
        result = json.loads(content)
        
        return {
            "strength": CaseStrength[result["strength"]],
            "reason": result["reason"],
            "legal_areas": result["legal_areas"],
            "next_steps": result["next_steps"],
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        raise Exception(f"Failed to parse AI response. Please try again.")
    except KeyError as e:
        logger.error(f"Missing key in response: {e}")
        raise Exception(f"Invalid response from AI. Please try again.")
    except Exception as e:
        logger.error(f"Case analysis error: {str(e)}")
        raise Exception(f"Case analysis failed: {str(e)}")
