"""
AI-powered document verification using OpenAI Vision API.
"""
import json
import base64
import logging
from datetime import date
from typing import Optional
from openai import OpenAI
from app.core.config import settings

logger = logging.getLogger(__name__)

client = OpenAI(api_key=settings.OPENAI_API_KEY)


class VerificationInput:
    def __init__(
        self,
        candidate_first_name: str,
        candidate_last_name: str,
        candidate_id_number: str,
        documents: list[dict],  # [{type, base64, mime_type}]
    ):
        self.candidate_first_name = candidate_first_name
        self.candidate_last_name = candidate_last_name
        self.candidate_id_number = candidate_id_number
        self.documents = documents


async def verify_documents(input: VerificationInput) -> dict:
    """
    Send all uploaded document images to OpenAI Vision for structured verification.
    Returns a dict with verification fields and overall_pass.
    """
    today = date.today().isoformat()

    image_content = []
    for doc in input.documents:
        mime = doc["mime_type"]
        # OpenAI supports: image/jpeg, image/png, image/gif, image/webp
        if mime == "application/pdf":
            # Skip PDFs for vision — log and continue
            logger.warning(f"PDF document skipped for vision analysis: {doc.get('type')}")
            continue
        image_content.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:{mime};base64,{doc['base64']}",
                "detail": "high",
            },
        })

    if not image_content:
        logger.warning("No image documents available for AI verification; returning manual review needed.")
        return _manual_review_result()

    prompt_text = f"""You are a document verification agent for an Israeli affordable housing lottery.

The candidate registered with:
- Name: {input.candidate_first_name} {input.candidate_last_name}
- ID Number (Teudat Zehut): {input.candidate_id_number}

Analyze ALL uploaded documents and return ONLY a JSON object (no markdown, no backticks) with these fields:

{{
  "two_distinct_ids": boolean | null,
  "id_number_matches_card": boolean,
  "name_matches_card": boolean,
  "id_numbers_consistent": boolean,
  "names_consistent": boolean,
  "form_date_valid": boolean,
  "has_proper_stamp": boolean,
  "eligibility_number": string | null,
  "is_apartmentless": boolean | null,
  "confidence_notes": string
}}

Rules:
- two_distinct_ids: If 2+ ID images uploaded, are they DIFFERENT documents? null if only 1.
- id_number_matches_card: Does ID number on card match "{input.candidate_id_number}"?
- name_matches_card: Does name on ID card match "{input.candidate_first_name} {input.candidate_last_name}"? Account for Hebrew/English transliteration.
- id_numbers_consistent: Same ID number across ALL docs?
- names_consistent: Same person name across ALL docs?
- form_date_valid: Is eligibility certificate still valid as of today ({today})? If no explicit expiry, check issued within last 12 months.
- has_proper_stamp: Is there an official stamp/seal on the eligibility certificate?
- eligibility_number: Extract eligibility/certificate number from form. null if not found.
- is_apartmentless: Does form explicitly state candidate is apartment-free (חסר דירה)? null if cannot determine.
- confidence_notes: Brief notes on anything uncertain.

Be strict. If you cannot clearly read a field, mark it false. Return ONLY the JSON."""

    messages = [
        {
            "role": "user",
            "content": image_content + [{"type": "text", "text": prompt_text}],
        }
    ]

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=1500,
            temperature=0,
        )
        text = response.choices[0].message.content or ""
        # Strip any markdown fences
        text = text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()

        parsed = json.loads(text)

        overall_pass = bool(
            parsed.get("id_number_matches_card")
            and parsed.get("name_matches_card")
            and parsed.get("id_numbers_consistent")
            and parsed.get("names_consistent")
            and parsed.get("form_date_valid")
            and parsed.get("has_proper_stamp")
            and (parsed.get("is_apartmentless") is True or parsed.get("is_apartmentless") is None)
            and (parsed.get("two_distinct_ids") is not False)
        )

        return {
            **parsed,
            "overall_pass": overall_pass,
        }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response JSON: {e}")
        return _error_result()
    except Exception as e:
        logger.error(f"OpenAI verification failed: {e}")
        raise


def _manual_review_result() -> dict:
    return {
        "two_distinct_ids": None,
        "id_number_matches_card": None,
        "name_matches_card": None,
        "id_numbers_consistent": None,
        "names_consistent": None,
        "form_date_valid": None,
        "has_proper_stamp": None,
        "eligibility_number": None,
        "is_apartmentless": None,
        "confidence_notes": "No image documents available for AI analysis. Manual review required.",
        "overall_pass": False,
    }


def _error_result() -> dict:
    return {
        "two_distinct_ids": None,
        "id_number_matches_card": False,
        "name_matches_card": False,
        "id_numbers_consistent": False,
        "names_consistent": False,
        "form_date_valid": False,
        "has_proper_stamp": False,
        "eligibility_number": None,
        "is_apartmentless": None,
        "confidence_notes": "AI parsing error. Manual review required.",
        "overall_pass": False,
    }
