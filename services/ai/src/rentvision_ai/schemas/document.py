"""Schema definitions for document and PDF extraction."""

from typing import Any
from pydantic import BaseModel, Field


class PDFPage(BaseModel):
    """Extracted text and structural metadata for an individual PDF page."""
    page_number: int = Field(
        ...,
        ge=1,
        description="1-indexed page number within the document."
    )
    text: str = Field(
        ...,
        description="Plain text extracted from this page."
    )
    char_count: int = Field(
        default=0,
        ge=0,
        description="Total character count on this page."
    )
    word_count: int = Field(
        default=0,
        ge=0,
        description="Total word count on this page."
    )


class ExtractedDocument(BaseModel):
    """Complete extracted content and metadata from a PDF lease or document."""
    filename: str = Field(
        ...,
        description="Original or inferred filename of the document."
    )
    page_count: int = Field(
        ...,
        ge=0,
        description="Total number of pages in the PDF."
    )
    pages: list[PDFPage] = Field(
        default_factory=list,
        description="List of extracted individual pages preserving ordering and page numbers."
    )
    full_text: str = Field(
        ...,
        description="Concatenated text of all pages."
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata embedded in the PDF (e.g. title, author, creation date)."
    )
    has_extractable_text: bool = Field(
        ...,
        description="True if the PDF contained embedded text; False if empty or pure image/scanned."
    )
