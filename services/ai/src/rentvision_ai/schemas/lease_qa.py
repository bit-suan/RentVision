"""Data models for lease question answering."""

from enum import Enum
from pydantic import BaseModel, Field, field_validator


class EvidenceSupportStatus(str, Enum):
    """Status indicating evidence support level."""
    SUPPORTED = "supported"
    PARTIALLY_SUPPORTED = "partially_supported"
    UNSUPPORTED = "unsupported"
    CONFLICTING = "conflicting"


class SourceCitation(BaseModel):
    """Citation reference to a page excerpt in the lease."""
    page_number: int = Field(
        ...,
        ge=1,
        description="1-indexed page number where the supporting excerpt is located."
    )
    excerpt: str = Field(
        ...,
        min_length=1,
        description="Verbatim excerpt from the lease document supporting the statement."
    )
    chunk_id: str | None = Field(
        default=None,
        description="Internal chunk identifier for traceability."
    )


class LeaseChunk(BaseModel):
    """Text segment extracted from a lease page."""
    chunk_id: str = Field(..., description="Unique chunk identifier, e.g. 'p1_c0'.")
    page_number: int = Field(..., ge=1, description="1-indexed page number.")
    text: str = Field(..., min_length=1, description="Textual content of the chunk.")
    char_start: int = Field(default=0, ge=0, description="Character offset start within the page.")
    char_end: int = Field(default=0, ge=0, description="Character offset end within the page.")


class LeaseQARequest(BaseModel):
    """Request payload for querying a lease agreement."""
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="User question regarding terms, rules, or obligations in the lease."
    )
    top_k: int = Field(
        default=4,
        ge=1,
        le=10,
        description="Number of most relevant evidence chunks to retrieve."
    )

    @field_validator("question")
    @classmethod
    def validate_question_non_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Question must not be empty or whitespace only.")
        if len(cleaned) > 1000:
            raise ValueError("Question exceeds maximum length of 1000 characters.")
        return cleaned


class LeaseQAResponse(BaseModel):
    """Response containing answer, citations, and evidence status."""
    question: str = Field(
        ...,
        description="The original user query."
    )
    answer: str = Field(
        ...,
        description="The factual answer synthesized strictly from retrieved lease evidence."
    )
    status: EvidenceSupportStatus = Field(
        ...,
        description="Evidence support classification: supported, partially_supported, or unsupported."
    )
    citations: list[SourceCitation] = Field(
        default_factory=list,
        description="Page-indexed source excerpts substantiating the answer."
    )
    retrieved_passages_count: int = Field(
        default=0,
        ge=0,
        description="Number of candidate passages retrieved and evaluated."
    )
    has_sufficient_evidence: bool = Field(
        ...,
        description="True if the retrieved text sufficiently and directly answers the question."
    )
    confidence_notes: str | None = Field(
        default=None,
        description="Explanatory notes regarding missing clauses, ambiguities, or limitations."
    )
