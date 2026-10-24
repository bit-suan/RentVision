"""Listing extraction service using LLM inference with strict schema validation."""

import json
import re
from typing import Any
from rentvision_ai.clients.base import LLMClient
from rentvision_ai.clients.factory import get_default_llm_client
from rentvision_ai.exceptions import (
    InvalidInputError,
    LLMResponseParsingError,
)
from rentvision_ai.schemas.property import ExtractedPropertyListing, PropertyType

EXTRACTION_SYSTEM_PROMPT = """You are an expert AI data extraction assistant for RentVision, a rental property platform in Ethiopia.
Your task is to extract structured property listing data from a landlord's unstructured description.

CRITICAL INSTRUCTIONS:
1. ONLY extract information that is explicitly stated in the text.
2. NEVER guess, assume, or fabricate any detail.
3. If a field is not mentioned or cannot be confirmed from the text, return null for that field.
4. For currency, recognize Ethiopian Birr as "ETB" and US Dollars as "USD". If no currency is mentioned, return null.
5. For property_type, choose the best match: apartment, house, villa, studio, condominium, townhouse, commercial, other, or unknown.
6. For amenities, list only amenities explicitly stated (e.g., generator, backup water tank, wifi, parking, elevator, balcony).
7. Return ONLY a valid JSON object matching the requested schema. Do not include markdown preamble or conversational text.
"""

EXTRACTION_USER_PROMPT_TEMPLATE = """Extract property listing details from the following landlord description:

---
{description}
---

Provide your response as a single valid JSON object with the following fields:
{{
  "property_type": "apartment|house|villa|studio|condominium|townhouse|commercial|other|unknown",
  "bedrooms": integer or null,
  "bathrooms": float or null,
  "monthly_rent": number or null,
  "currency": "ETB|USD" or null,
  "neighborhood": string or null,
  "city": string or null,
  "amenities": ["list", "of", "amenities"],
  "availability": string or null,
  "title_suggestion": "concise factual headline" or null,
  "confidence_notes": "brief note on uncertainties if any" or null
}}
"""


class ListingExtractionService:
    """Service to parse unstructured property descriptions into validated listing schemas."""

    STANDARD_FIELDS = [
        "property_type",
        "bedrooms",
        "bathrooms",
        "monthly_rent",
        "currency",
        "neighborhood",
        "city",
        "amenities",
        "availability",
    ]

    def __init__(self, client: LLMClient | None = None):
        self._client = client or get_default_llm_client()

    @property
    def client(self) -> LLMClient:
        return self._client

    def extract_listing(self, raw_description: str) -> ExtractedPropertyListing:
        """Extract structured property listing from raw text.
        
        Args:
            raw_description: The text description provided by landlord/agent.
            
        Returns:
            ExtractedPropertyListing: Validated Pydantic model with extracted facts.
            
        Raises:
            InvalidInputError: If description is empty or whitespace.
            LLMAuthenticationError: If model provider credentials are missing.
            LLMTimeoutError: If the model provider times out.
            LLMProviderError: If the model provider returns an error.
            LLMResponseParsingError: If model output cannot be parsed or validated.
        """
        if not raw_description or not raw_description.strip():
            raise InvalidInputError("Listing description must not be empty or whitespace only.")

        cleaned_input = raw_description.strip()
        user_prompt = EXTRACTION_USER_PROMPT_TEMPLATE.format(description=cleaned_input)

        raw_response = self._client.complete(
            prompt=user_prompt,
            system_prompt=EXTRACTION_SYSTEM_PROMPT,
        )

        parsed_data = self._clean_and_parse_json(raw_response)
        return self._build_validated_listing(parsed_data, cleaned_input)

    def _clean_and_parse_json(self, raw_response: str) -> dict[str, Any]:
        """Strip markdown fences and parse json payload safely."""
        if not raw_response or not raw_response.strip():
            raise LLMResponseParsingError("Model returned an empty response.")

        content = raw_response.strip()
        # Remove markdown code blocks if wrapped by model
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", content, re.IGNORECASE)
        if fence_match:
            content = fence_match.group(1).strip()

        try:
            parsed = json.loads(content)
            if not isinstance(parsed, dict):
                raise LLMResponseParsingError(f"Model response was JSON, but not an object: {type(parsed)}")
            return parsed
        except json.JSONDecodeError as e:
            raise LLMResponseParsingError(
                f"Failed to parse model response as JSON: {e}. Raw content: {raw_response[:200]}"
            ) from e

    def _build_validated_listing(
        self,
        data: dict[str, Any],
        raw_description: str,
    ) -> ExtractedPropertyListing:
        """Validate and construct ExtractedPropertyListing, recording missing fields."""
        # Detect missing standard fields to explicitly preserve unknown status
        missing_fields: list[str] = []
        for field in self.STANDARD_FIELDS:
            val = data.get(field)
            if val is None or val == "" or val == PropertyType.UNKNOWN:
                missing_fields.append(field)

        data["raw_description"] = raw_description
        data["unextracted_or_missing_fields"] = missing_fields

        try:
            return ExtractedPropertyListing.model_validate(data)
        except Exception as e:
            raise LLMResponseParsingError(f"Schema validation failed for extracted data: {e}") from e
