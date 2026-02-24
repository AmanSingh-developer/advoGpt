async def analyze_case_with_ai(case_text: str):

    prompt = f"""
You are a senior legal strategist specializing in Indian law.

You must analyze the following case under Indian legal context.

STRICT RULES:
1. Do NOT guarantee case outcomes.
2. Do NOT provide final legal advice.
3. Maintain neutral, professional tone.
4. Evaluate both strengths and weaknesses.
5. Identify procedural steps relevant in India.
6. Output ONLY valid JSON.
7. No extra commentary outside JSON.

--------------------------------------------------

INDIAN LEGAL ANALYSIS FRAMEWORK:

Step 1: Extract key legal facts.
Step 2: Identify relevant Indian legal domains
    (e.g., IPC, CrPC, CPC, Labour Law, Contract Act, Consumer Protection Act, Family Law, etc.)
Step 3: Evaluate strengths of the case.
Step 4: Evaluate weaknesses and legal risks.
Step 5: Identify missing documentation or proof.
Step 6: Assign a strength score (0–100).
Step 7: Classify strength:
    - Strong (70–100)
    - Medium (40–69)
    - Weak (0–39)
Step 8: Suggest procedural next steps in India.

--------------------------------------------------

Return ONLY this JSON structure:

{{
  "summary": "Neutral summary of legal issue",
  "legal_areas": ["Indian law domain 1", "Indian law domain 2"],
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "missing_evidence": ["Missing 1", "Missing 2"],
  "risk_factors": ["Risk 1", "Risk 2"],
  "case_strength_score": number,
  "case_strength_label": "Strong | Medium | Weak",
  "suggested_next_steps": [
      "Send legal notice",
      "File complaint with authority",
      "Approach Labour Court / Civil Court / Police / Consumer Forum"
  ],
  "confidence_score": number
}}

--------------------------------------------------

LEGAL CASE DESCRIPTION:
{case_text}
"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an Indian legal intelligence engine."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content