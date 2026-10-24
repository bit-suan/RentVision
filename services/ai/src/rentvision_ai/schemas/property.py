"""Schema definitions for property listings."""

from enum import Enum
from typing import Any
from pydantic import BaseModel, Field, field_validator


class PropertyType(str, Enum):
    """Recognized property types in RentVision."""
    APARTMENT = "apartment"
    HOUSE = "house"
    VILLA = "villa"
    STUDIO = "studio"
    CONDOMINIUM = "condominium"
    TOWNHOUSE = "townhouse"
    COMMERCIAL = "commercial"
    OTHER = "other"
    UNKNOWN = "unknown"

    @classmethod
    def _missing_(cls, value: object) -> Any:
        if isinstance(value, str):
            val_clean = value.strip().lower()
            for member in cls:
                if member.value == val_clean:
                    return member
            # Common synonyms
            if "condo" in val_clean:
                return cls.CONDOMINIUM
            if "flat" in val_clean:
                return cls.APARTMENT
        return cls.UNKNOWN


class ExtractedPropertyListing(BaseModel):
    """Structured property listing extracted from unstructured landlord description.
    
    CRITICAL RULE: Missing fields MUST remain None / empty rather than being fabricated.
    """
    property_type: PropertyType = Field(
        default=PropertyType.UNKNOWN,
        description="Type of the property, or UNKNOWN if not specified."
    )
    bedrooms: int | None = Field(
        default=None,
        ge=0,
        description="Number of bedrooms, or None if unspecified."
    )
    bathrooms: float | None = Field(
        default=None,
        ge=0.0,
        description="Number of bathrooms (e.g. 1.5, 2), or None if unspecified."
    )
    monthly_rent: float | None = Field(
        default=None,
        gt=0.0,
        description="Monthly rental price, or None if unspecified."
    )
    currency: str | None = Field(
        default=None,
        description="Currency code (e.g. ETB, USD), or None if unspecified."
    )
    neighborhood: str | None = Field(
        default=None,
        description="Neighborhood / subcity / area name (e.g. Bole, Sarbet), or None if unspecified."
    )
    city: str | None = Field(
        default=None,
        description="City name (e.g. Addis Ababa), or None if unspecified."
    )
    amenities: list[str] = Field(
        default_factory=list,
        description="List of amenities explicitly mentioned (e.g. generator, water tank, wifi, balcony)."
    )
    availability: str | None = Field(
        default=None,
        description="Availability status or date (e.g. 'immediate', 'available now', '2026-11-01'), or None if unspecified."
    )
    title_suggestion: str | None = Field(
        default=None,
        description="Suggested short headline title for the listing based strictly on extracted facts."
    )
    raw_description: str = Field(
        ...,
        description="The original source description provided by the landlord."
    )
    unextracted_or_missing_fields: list[str] = Field(
        default_factory=list,
        description="List of standard fields that could not be determined from the input description."
    )
    confidence_notes: str | None = Field(
        default=None,
        description="Explanatory notes regarding uncertainties or missing information."
    )

    @field_validator("currency")
    @classmethod
    def normalize_currency(cls, v: str | None) -> str | None:
        if not v:
            return None
        cleaned = v.strip().upper()
        if cleaned in ("BIRR", "ETB"):
            return "ETB"
        if cleaned in ("$", "USD", "DOLLARS", "DOLLAR"):
            return "USD"
        return cleaned

    @field_validator("amenities", mode="before")
    @classmethod
    def normalize_amenities(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            # deduplicate and strip
            seen = set()
            normalized = []
            for item in v:
                if isinstance(item, str):
                    s = item.strip().lower()
                    if s and s not in seen:
                        seen.add(s)
                        normalized.append(item.strip())
            return normalized
        return []
