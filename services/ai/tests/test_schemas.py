"""Unit tests for RentVision AI schema models."""

import pytest
from pydantic import ValidationError
from rentvision_ai.schemas.property import ExtractedPropertyListing, PropertyType
from rentvision_ai.schemas.document import ExtractedDocument, PDFPage


class TestPropertyListingSchema:
    """Tests for ExtractedPropertyListing and PropertyType schemas."""

    def test_property_type_parsing_and_synonyms(self) -> None:
        assert PropertyType("apartment") == PropertyType.APARTMENT
        assert PropertyType("villa") == PropertyType.VILLA
        assert PropertyType("condominium") == PropertyType.CONDOMINIUM
        # Synonyms
        assert PropertyType("Modern Condo") == PropertyType.CONDOMINIUM
        assert PropertyType("2-bed flat") == PropertyType.APARTMENT
        # Unknown fallback
        assert PropertyType("spaceship") == PropertyType.UNKNOWN

    def test_extracted_property_listing_valid_full(self) -> None:
        data = {
            "property_type": "apartment",
            "bedrooms": 3,
            "bathrooms": 2.5,
            "monthly_rent": 50000.0,
            "currency": "ETB",
            "neighborhood": "Bole",
            "city": "Addis Ababa",
            "amenities": ["Generator", "Water Tank", "WiFi", "generator"],  # tests deduplication
            "availability": "Immediate",
            "title_suggestion": "Spacious 3BR Apartment in Bole",
            "raw_description": "Spacious 3BR apartment in Bole...",
        }
        listing = ExtractedPropertyListing(**data)
        assert listing.property_type == PropertyType.APARTMENT
        assert listing.bedrooms == 3
        assert listing.bathrooms == 2.5
        assert listing.monthly_rent == 50000.0
        assert listing.currency == "ETB"
        assert listing.neighborhood == "Bole"
        # Verify amenities normalized and deduplicated
        assert len(listing.amenities) == 3
        assert "generator" in [a.lower() for a in listing.amenities]
        assert "water tank" in [a.lower() for a in listing.amenities]

    def test_missing_fields_preserved_as_none_not_fabricated(self) -> None:
        """Rule: Missing fields must remain None / unknown rather than being fabricated."""
        listing = ExtractedPropertyListing(
            raw_description="A nice place for rent in CMC."
        )
        assert listing.property_type == PropertyType.UNKNOWN
        assert listing.bedrooms is None
        assert listing.bathrooms is None
        assert listing.monthly_rent is None
        assert listing.currency is None
        assert listing.neighborhood is None
        assert listing.city is None
        assert listing.amenities == []
        assert listing.availability is None

    def test_currency_normalization(self) -> None:
        l1 = ExtractedPropertyListing(raw_description="test", currency="Birr")
        assert l1.currency == "ETB"

        l2 = ExtractedPropertyListing(raw_description="test", currency="etb")
        assert l2.currency == "ETB"

        l3 = ExtractedPropertyListing(raw_description="test", currency="$")
        assert l3.currency == "USD"

        l4 = ExtractedPropertyListing(raw_description="test", currency="usd")
        assert l4.currency == "USD"

        l5 = ExtractedPropertyListing(raw_description="test", currency=None)
        assert l5.currency is None

    def test_negative_values_rejected(self) -> None:
        with pytest.raises(ValidationError):
            ExtractedPropertyListing(raw_description="test", bedrooms=-1)

        with pytest.raises(ValidationError):
            ExtractedPropertyListing(raw_description="test", monthly_rent=-500)


class TestDocumentSchemas:
    """Tests for document and page schemas."""

    def test_pdf_page_valid(self) -> None:
        page = PDFPage(
            page_number=1,
            text="RentVision Lease Agreement Page 1",
            char_count=33,
            word_count=5,
        )
        assert page.page_number == 1
        assert page.char_count == 33
        assert page.word_count == 5

    def test_pdf_page_invalid_page_number(self) -> None:
        with pytest.raises(ValidationError):
            PDFPage(page_number=0, text="Invalid page number")

    def test_extracted_document_valid(self) -> None:
        page1 = PDFPage(page_number=1, text="Page 1", char_count=6, word_count=2)
        doc = ExtractedDocument(
            filename="lease.pdf",
            page_count=1,
            pages=[page1],
            full_text="Page 1",
            metadata={"title": "Residential Lease Agreement"},
            has_extractable_text=True,
        )
        assert doc.filename == "lease.pdf"
        assert doc.page_count == 1
        assert doc.has_extractable_text is True
        assert doc.pages[0].page_number == 1
