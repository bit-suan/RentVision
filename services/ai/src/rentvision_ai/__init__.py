"""RentVision AI Service package root.

This package provides data models, document extraction utilities,
and AI processing interfaces for the RentVision platform.
"""

from rentvision_ai.exceptions import (
    RentVisionAIError,
    InvalidInputError,
    LLMProviderError,
    LLMAuthenticationError,
    LLMTimeoutError,
    LLMResponseParsingError,
    PDFExtractionError,
    InvalidPDFError,
)
from rentvision_ai.schemas import (
    ExtractedPropertyListing,
    PropertyType,
    ExtractedDocument,
    PDFPage,
)
from rentvision_ai.clients import (
    LLMClient,
    MockLLMClient,
    OpenAIClient,
    get_default_llm_client,
)
from rentvision_ai.services import (
    ListingExtractionService,
    PDFExtractionService,
)

__version__ = "0.1.0"

__all__ = [
    "RentVisionAIError",
    "InvalidInputError",
    "LLMProviderError",
    "LLMAuthenticationError",
    "LLMTimeoutError",
    "LLMResponseParsingError",
    "PDFExtractionError",
    "InvalidPDFError",
    "ExtractedPropertyListing",
    "PropertyType",
    "ExtractedDocument",
    "PDFPage",
    "LLMClient",
    "MockLLMClient",
    "OpenAIClient",
    "get_default_llm_client",
    "ListingExtractionService",
    "PDFExtractionService",
]
