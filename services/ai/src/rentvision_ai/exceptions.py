"""Domain-specific exceptions for RentVision AI service."""


class RentVisionAIError(Exception):
    """Base exception for all RentVision AI service errors."""
    pass


class InvalidInputError(RentVisionAIError):
    """Raised when input parameters fail basic validation."""
    pass


class LLMProviderError(RentVisionAIError):
    """Raised when an external LLM provider encounters an error."""
    pass


class LLMAuthenticationError(LLMProviderError):
    """Raised when authentication credentials for the LLM provider are missing or invalid."""
    pass


class LLMTimeoutError(LLMProviderError):
    """Raised when the LLM provider call times out."""
    pass


class LLMResponseParsingError(RentVisionAIError):
    """Raised when the LLM response cannot be parsed or validated against the schema."""
    pass


class PDFExtractionError(RentVisionAIError):
    """Raised when an error occurs during PDF text extraction."""
    pass


class InvalidPDFError(PDFExtractionError):
    """Raised when the supplied PDF file is corrupt, empty, or not a valid PDF."""
    pass
