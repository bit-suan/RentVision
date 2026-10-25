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
            if "condo" in val_clean:
                return cls.CONDOMINIUM
            if "flat" in val_clean:
                return cls.APARTMENT
        return cls.UNKNOWN


class FurnishingStatus(str, Enum):
    """Furnishing condition of the rental property."""
    FURNISHED = "furnished"
    SEMI_FURNISHED = "semi_furnished"
    UNFURNISHED = "unfurnished"

    @classmethod
    def _missing_(cls, value: object) -> Any:
        if isinstance(value, str):
            val_clean = value.strip().lower().replace("-", "_").replace(" ", "_")
            for member in cls:
                if member.value == val_clean:
                    return member
            if "semi" in val_clean:
                return cls.SEMI_FURNISHED
            if "unfurnished" in val_clean or "non_furnished" in val_clean or "not_furnished" in val_clean:
                return cls.UNFURNISHED
            if "furnished" in val_clean:
                return cls.FURNISHED
        return None


class ExtractionStatus(str, Enum):
    """Status indicating listing extraction completeness and relevance."""
    SUCCESS = "success"
    PARTIAL = "partial"
    UNSUPPORTED = "unsupported"


class ExtractedPropertyListing(BaseModel):
    """Structured property listing extracted from unstructured landlord description."""
    property_type: PropertyType = Field(
        default=PropertyType.UNKNOWN,
        description="Type of the property, or UNKNOWN if not specified."
    )
    bedrooms: int | None = Field(
        default=None,
        ge=0,
        description="Number of bedrooms, or None if unspecified or ambiguous."
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
    security_deposit: float | None = Field(
        default=None,
        ge=0.0,
        description="Total security deposit amount, or None if unspecified."
    )
    deposit_months: float | None = Field(
        default=None,
        ge=0.0,
        description="Security deposit expressed in number of months of rent, or None if unspecified."
    )
    utilities_included: bool | None = Field(
        default=None,
        description="True if utilities are included, False if explicitly excluded, None if unspecified."
    )
    furnishing_status: FurnishingStatus | None = Field(
        default=None,
        description="Furnishing condition: 'furnished', 'semi_furnished', 'unfurnished', or None if unspecified."
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
    extraction_status: ExtractionStatus = Field(
        default=ExtractionStatus.PARTIAL,
        description="Extraction completeness and relevance status (success, partial, unsupported)."
    )
    unextracted_or_missing_fields: list[str] = Field(
        default_factory=list,
        description="List of standard fields that could not be determined from the input description."
    )
    confidence_notes: str | None = Field(
        default=None,
        description="Explanatory notes regarding uncertainties, ambiguities, contradictions, or missing info."
    )
    detected_language: str | None = Field(
        default=None,
        description="Detected language of input description ('en' or 'am')."
    )

    @field_validator("furnishing_status", mode="before")
    @classmethod
    def normalize_furnishing_status(cls, v: Any) -> Any:
        if v is None or v == "":
            return None
        if isinstance(v, FurnishingStatus):
            return v
        if isinstance(v, str):
            clean = v.strip().lower()
            if clean in ("none", "null", "unknown", "n/a", "not specified", "unspecified"):
                return None
            try:
                return FurnishingStatus(clean)
            except ValueError:
                return None
        return None

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
        if not isinstance(v, list):
            return []

        # Filter out deposit or utility inclusion phrases from amenities
        excluded_phrases = {
            "utilities excluded", "utilities separate", "utilities included",
            "utility excluded", "utility included", "utilities not included",
            "deposit", "security deposit", "two months deposit", "2 months deposit",
            "1 month deposit", "one month deposit",
            "furnished", "fully furnished", "semi furnished", "semi-furnished",
            "unfurnished", "non-furnished"
        }

        seen = set()
        normalized = []
        for item in v:
            if isinstance(item, str):
                s = item.strip().lower()
                if s and s not in seen and s not in excluded_phrases:
                    seen.add(s)
                    normalized.append(item.strip())
        return normalized
