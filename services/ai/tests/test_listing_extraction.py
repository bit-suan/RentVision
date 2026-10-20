"""Unit tests for listing extraction service."""

import json
import pytest
from rentvision_ai.clients.mock_client import MockLLMClient
from rentvision_ai.exceptions import (
    InvalidInputError,
    LLMAuthenticationError,
    LLMProviderError,
    LLMResponseParsingError,
    LLMTimeoutError,
)
from rentvision_ai.schemas.property import PropertyType
from rentvision_ai.services.listing_extraction import ListingExtractionService


class TestListingExtractionService:
    """Test suite covering listing extraction logic, error handling, and provider interactions."""

    def test_successful_extraction_with_valid_output(self) -> None:
        mock_output = json.dumps({
            "property_type": "apartment",
            "bedrooms": 2,
            "bathrooms": 2.0,
            "monthly_rent": 45000.0,
            "currency": "ETB",
            "neighborhood": "Bole Atlas",
            "city": "Addis Ababa",
            "amenities": ["Backup Generator", "Water Tank", "Security"],
            "availability": "immediate",
            "title_suggestion": "Modern 2-Bedroom Apartment in Bole Atlas",
            "confidence_notes": "All key fields clearly stated.",
        })
        client = MockLLMClient(default_response=mock_output)
        service = ListingExtractionService(client=client)

        input_text = (
            "Spacious 2-bedroom, 2-bathroom apartment in Bole Atlas, Addis Ababa. "
            "Equipped with backup generator, water tank, and 24/7 security. "
            "Rent is 45,000 ETB per month. Available immediately."
        )
        result = service.extract_listing(input_text)

        assert result.property_type == PropertyType.APARTMENT
        assert result.bedrooms == 2
        assert result.bathrooms == 2.0
        assert result.monthly_rent == 45000.0
        assert result.currency == "ETB"
        assert result.neighborhood == "Bole Atlas"
        assert result.city == "Addis Ababa"
        assert len(result.amenities) == 3
        assert result.availability == "immediate"
        assert result.raw_description == input_text.strip()
        assert len(result.unextracted_or_missing_fields) == 0

    def test_missing_fields_not_fabricated(self) -> None:
        """Rule: Unknown or omitted attributes remain None and are tracked in missing fields."""
        partial_output = json.dumps({
            "property_type": "villa",
            "bedrooms": 4,
            "bathrooms": None,
            "monthly_rent": None,
            "currency": None,
            "neighborhood": "Old Airport",
            "city": None,
            "amenities": ["Garden"],
            "availability": None,
            "title_suggestion": "4BR Villa in Old Airport",
        })
        client = MockLLMClient(default_response=partial_output)
        service = ListingExtractionService(client=client)

        input_text = "Villa in Old Airport with 4 bedrooms and a large garden. Contact for price."
        result = service.extract_listing(input_text)

        assert result.property_type == PropertyType.VILLA
        assert result.bedrooms == 4
        assert result.bathrooms is None
        assert result.monthly_rent is None
        assert result.currency is None
        assert result.city is None
        assert result.availability is None

        # Standard missing fields should be properly recorded
        assert "bathrooms" in result.unextracted_or_missing_fields
        assert "monthly_rent" in result.unextracted_or_missing_fields
        assert "currency" in result.unextracted_or_missing_fields

    def test_markdown_codeblock_wrapped_json_parsed_cleanly(self) -> None:
        raw_llm_markdown = """```json
{
  "property_type": "studio",
  "bedrooms": 0,
  "bathrooms": 1.0,
  "monthly_rent": 20000.0,
  "currency": "ETB",
  "neighborhood": "Kazanchis",
  "city": "Addis Ababa",
  "amenities": ["Elevator"],
  "availability": "November 1"
}
```"""
        client = MockLLMClient(default_response=raw_llm_markdown)
        service = ListingExtractionService(client=client)

        result = service.extract_listing("Furnished studio in Kazanchis for 20,000 ETB from Nov 1.")
        assert result.property_type == PropertyType.STUDIO
        assert result.bedrooms == 0
        assert result.monthly_rent == 20000.0
        assert result.neighborhood == "Kazanchis"

    def test_empty_or_whitespace_input_raises_invalid_input_error(self) -> None:
        service = ListingExtractionService(client=MockLLMClient())

        with pytest.raises(InvalidInputError, match="must not be empty"):
            service.extract_listing("")

        with pytest.raises(InvalidInputError, match="must not be empty"):
            service.extract_listing("   \n\t  ")

    def test_malformed_json_response_raises_parsing_error(self) -> None:
        client = MockLLMClient(default_response="Not a JSON response from model.")
        service = ListingExtractionService(client=client)

        with pytest.raises(LLMResponseParsingError, match="Failed to parse model response as JSON"):
            service.extract_listing("Nice 2-bedroom house for rent.")

    def test_empty_response_from_model_raises_parsing_error(self) -> None:
        client = MockLLMClient(default_response="")
        service = ListingExtractionService(client=client)

        with pytest.raises(LLMResponseParsingError, match="empty response"):
            service.extract_listing("Nice 2-bedroom house for rent.")

    def test_non_dict_json_from_model_raises_parsing_error(self) -> None:
        client = MockLLMClient(default_response="[1, 2, 3]")
        service = ListingExtractionService(client=client)

        with pytest.raises(LLMResponseParsingError, match="not an object"):
            service.extract_listing("Nice 2-bedroom house for rent.")

    def test_simulated_auth_failure_propagates_cleanly(self) -> None:
        client = MockLLMClient(simulate_auth_failure=True)
        service = ListingExtractionService(client=client)

        with pytest.raises(LLMAuthenticationError, match="authentication failure"):
            service.extract_listing("3 bedroom apartment in Sarbet.")

    def test_simulated_timeout_propagates_cleanly(self) -> None:
        client = MockLLMClient(simulate_timeout=True)
        service = ListingExtractionService(client=client)

        with pytest.raises(LLMTimeoutError, match="(?i)timeout"):
            service.extract_listing("3 bedroom apartment in Sarbet.")

    def test_simulated_provider_500_propagates_cleanly(self) -> None:
        client = MockLLMClient(simulate_provider_error=True)
        service = ListingExtractionService(client=client)

        with pytest.raises(LLMProviderError, match="500"):
            service.extract_listing("3 bedroom apartment in Sarbet.")
