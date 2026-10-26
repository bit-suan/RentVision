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
            if "condo" in val_clean or any(k in val_clean for k in ("ኮንዶሚኒየም", "ኮንዶ")):
                return cls.CONDOMINIUM
            if "flat" in val_clean or any(k in val_clean for k in ("አፓርታማ", "አፓርትመንት", "ፎቅ")):
                return cls.APARTMENT
            if "commercial" in val_clean or any(k in val_clean for k in ("ንግድ ቤት", "የንግድ", "ቢሮ", "ሱቅ", "ሾውሩም")):
                return cls.COMMERCIAL
            if "villa" in val_clean or any(k in val_clean for k in ("ቪላ", "ቪላ ቤት")):
                return cls.VILLA
            if "studio" in val_clean or any(k in val_clean for k in ("ስቱዲዮ", "ባለ አንድ ክፍል")):
                return cls.STUDIO
            if "townhouse" in val_clean or any(k in val_clean for k in ("ታውን ሃውስ", "ታውንሀውስ", "ታውን")):
                return cls.TOWNHOUSE
            if any(k in val_clean for k in ("የመኖሪያ ቤት", "ቤት", "ግቢ ቤት")):
                return cls.HOUSE
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
            if "semi" in val_clean or any(k in val_clean for k in ("በከፊል", "ግማሽ", "ሴሚ")):
                return cls.SEMI_FURNISHED
            if (
                "unfurnished" in val_clean
                or "non_furnished" in val_clean
                or "not_furnished" in val_clean
                or any(k in val_clean for k in ("እቃ የሌለው", "ባዶ ቤት", "ባዶ", "የሌለበት", "ያልተሟላ"))
            ):
                return cls.UNFURNISHED
            if "furnished" in val_clean or any(k in val_clean for k in ("እቃ ያለው", "የተሟላ", "ፈርनिश्ड", "ሙሉ እቃ")):
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
        description="Detected language of input description ('en', 'am', or 'mixed')."
    )
    requested_locale: str | None = Field(
        default="en",
        description="Target locale requested by client ('en' or 'am')."
    )
    ambiguities: list[str] = Field(
        default_factory=list,
        description="Specific ambiguities, contradictions, or unconfirmed assumptions in the input."
    )

    @field_validator("detected_language")
    @classmethod
    def normalize_detected_language(cls, v: str | None) -> str | None:
        if not v:
            return None
        clean = v.strip().lower()
        if clean in ("am", "amh", "amharic", "ethiopic"):
            return "am"
        if clean in ("en", "eng", "english"):
            return "en"
        if clean in ("mixed", "en-am", "am-en", "multilingual", "mixed-language"):
            return "mixed"
        return clean

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
        if cleaned in ("BIRR", "ETB", "ብር"):
            return "ETB"
        if cleaned in ("$", "USD", "DOLLARS", "DOLLAR", "ዶላር"):
            return "USD"
        return cleaned

    @field_validator("amenities", mode="before")
    @classmethod
    def normalize_amenities(cls, v: Any) -> list[str]:
        if not isinstance(v, list):
            return []

        # Filter out deposit, furnishing, or utility inclusion phrases from amenities
        excluded_phrases = {
            "utilities excluded", "utilities separate", "utilities included",
            "utility excluded", "utility included", "utilities not included",
            "deposit", "security deposit", "two months deposit", "2 months deposit",
            "1 month deposit", "one month deposit",
            "furnished", "fully furnished", "semi furnished", "semi-furnished",
            "unfurnished", "non-furnished",
            "መብራት እና ውሃ ጨምሮ", "መብራትና ውሃ ያካተተ", "መብራት እና ውሃ አይጨምርም",
            "መብራትና ውሃ አይጨምርም", "ተቀማጭ", "ዲፖዚት", "የዋስትና ገንዘብ",
            "እቃ ያለው", "እቃ የሌለው", "ባዶ ቤት", "ሙሉ እቃ ያለው"
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
