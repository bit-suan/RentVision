"""FastAPI router and endpoints for RentVision AI."""

import base64
import os
from pathlib import Path
from typing import Any
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator


def _auto_load_env() -> None:
    """Load environment variables from .env file if not already set."""
    search_dirs = [
        Path.cwd(),
        Path(__file__).resolve().parent,
        Path(__file__).resolve().parent.parent.parent.parent,
    ]
    for d in search_dirs:
        env_file = d / ".env"
        if env_file.is_file():
            try:
                for line in env_file.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip().strip('"').strip("'")
                        if k and k not in os.environ:
                            os.environ[k] = v
                break
            except Exception:
                pass


_auto_load_env()

from rentvision_ai.clients.factory import get_default_llm_client
from rentvision_ai.exceptions import (
    InvalidInputError,
    InvalidPDFError,
    LLMAuthenticationError,
    LLMProviderError,
    LLMResponseParsingError,
    LLMTimeoutError,
    PDFExtractionError,
)
from rentvision_ai.schemas.document import ExtractedDocument, PDFPage
from rentvision_ai.schemas.lease_qa import (
    EvidenceSupportStatus,
    LeaseQAResponse,
    SourceCitation,
)
from rentvision_ai.schemas.property import ExtractedPropertyListing
from rentvision_ai.services.lease_qa import LeaseQAService
from rentvision_ai.services.listing_extraction import ListingExtractionService


# Request payloads
class ExtractListingRequest(BaseModel):
    """Request payload for property listing extraction."""
    description: str = Field(
        ...,
        description="Unstructured property description text provided by landlord or agent.",
        examples=[
            "Spacious 3-bedroom, 2-bathroom apartment located in Bole, Addis Ababa. "
            "Comes with backup generator, water reserve tank, and WiFi. Rent is 55,000 ETB/month."
        ],
    )

    @field_validator("description")
    @classmethod
    def validate_non_empty(cls, v: str) -> str:
        cleaned = v.strip() if v else ""
        if not cleaned:
            raise ValueError("Description must not be empty or whitespace only.")
        return cleaned


class LeaseQAPayload(BaseModel):
    """Request payload for lease question answering."""
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="User question regarding terms, rules, or obligations in the lease.",
        examples=["What is the security deposit amount and when is it refunded?"],
    )
    pdf_base64: str | None = Field(
        default=None,
        max_length=50_000_000,
        description="Base64-encoded raw PDF document bytes.",
    )
    document_text: str | None = Field(
        default=None,
        max_length=1_000_000,
        description="Pre-extracted plain text of the lease document (optional alternative to pdf_base64).",
    )
    top_k: int = Field(
        default=4,
        ge=1,
        le=10,
        description="Number of candidate evidence passages to retrieve.",
    )

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        cleaned = v.replace("\x00", "").strip() if v else ""
        if not cleaned:
            raise ValueError("Question must not be empty or whitespace only.")
        if len(cleaned) > 1000:
            raise ValueError("Question exceeds maximum length of 1000 characters.")
        return cleaned


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    provider: str
    mock_mode: bool


# Service dependencies
def get_listing_service() -> ListingExtractionService:
    client = get_default_llm_client()
    return ListingExtractionService(client=client)


def get_lease_qa_service() -> LeaseQAService:
    client = get_default_llm_client()
    return LeaseQAService(client=client)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="RentVision AI Service",
        description="HTTP API for property listing extraction and lease contract Q&A.",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS
    allowed_origins = [
        origin.strip()
        for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins or ["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", response_model=HealthResponse, tags=["Diagnostics"])
    @app.get("/api/v1/health", response_model=HealthResponse, tags=["Diagnostics"])
    def health_check() -> HealthResponse:
        client = get_default_llm_client(allow_mock_fallback=True)
        is_mock = os.environ.get("AI_USE_MOCK_CLIENT", "").lower() in ("true", "1") or client.provider_name == "mock"
        return HealthResponse(
            status="healthy",
            version="0.1.0",
            provider=client.provider_name,
            mock_mode=is_mock,
        )

    @app.post(
        "/api/v1/extract-listing",
        response_model=ExtractedPropertyListing,
        status_code=status.HTTP_200_OK,
        summary="Extract property listing details",
        tags=["Properties"],
    )
    def extract_listing(
        request: ExtractListingRequest,
        service: ListingExtractionService = Depends(get_listing_service),
    ) -> ExtractedPropertyListing:
        try:
            return service.extract_listing(raw_description=request.description)
        except HTTPException:
            raise
        except InvalidInputError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
        except LLMAuthenticationError as e:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e
        except LLMTimeoutError as e:
            raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(e)) from e
        except LLMResponseParsingError as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
        except LLMProviderError as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Extraction failure: {e}") from e

    @app.post(
        "/api/v1/lease-qa",
        response_model=LeaseQAResponse,
        status_code=status.HTTP_200_OK,
        summary="Answer questions based on a lease agreement",
        tags=["Leases"],
    )
    def answer_lease_question(
        payload: LeaseQAPayload,
        service: LeaseQAService = Depends(get_lease_qa_service),
    ) -> LeaseQAResponse:
        if not payload.pdf_base64 and not payload.document_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'pdf_base64' or 'document_text' must be provided.",
            )

        try:
            if payload.pdf_base64:
                # Decode and validate base64 PDF bytes
                try:
                    pdf_bytes = base64.b64decode(payload.pdf_base64, validate=True)
                except Exception as e:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Invalid base64 encoding for 'pdf_base64': {e}",
                    ) from e

                # Check PDF magic bytes
                if not pdf_bytes.startswith(b"%PDF-"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Supplied 'pdf_base64' data is not a valid PDF document (missing %PDF- header).",
                    )

                return service.answer_from_pdf_bytes(
                    question=payload.question,
                    pdf_bytes=pdf_bytes,
                    filename="uploaded_lease.pdf",
                    top_k=payload.top_k,
                )

            # Fall back to plain text if provided
            assert payload.document_text is not None
            doc = ExtractedDocument(
                filename="provided_text.pdf",
                page_count=1,
                pages=[
                    PDFPage(
                        page_number=1,
                        text=payload.document_text.strip(),
                        char_count=len(payload.document_text.strip()),
                        word_count=len(payload.document_text.strip().split()),
                    )
                ],
                full_text=payload.document_text.strip(),
                has_extractable_text=bool(payload.document_text.strip()),
            )
            return service.answer_question(
                question=payload.question,
                document=doc,
                top_k=payload.top_k,
            )

        except HTTPException:
            raise
        except (InvalidInputError, InvalidPDFError) as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
        except LLMAuthenticationError as e:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)) from e
        except LLMTimeoutError as e:
            raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail=str(e)) from e
        except LLMResponseParsingError as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
        except (LLMProviderError, PDFExtractionError) as e:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Lease QA failure: {e}") from e

    return app


app = create_app()
