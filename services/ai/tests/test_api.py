"""Tests for the RentVision FastAPI endpoints."""

import base64
import json
import pytest
import fitz
from fastapi.testclient import TestClient

from rentvision_ai.api import app, get_lease_qa_service, get_listing_service
from rentvision_ai.clients.mock_client import MockLLMClient
from rentvision_ai.exceptions import LLMAuthenticationError, LLMTimeoutError
from rentvision_ai.schemas.lease_qa import EvidenceSupportStatus
from rentvision_ai.schemas.property import PropertyType
from rentvision_ai.services.lease_qa import LeaseQAService
from rentvision_ai.services.listing_extraction import ListingExtractionService


@pytest.fixture
def test_client() -> TestClient:
    """FastAPI test client fixture."""
    return TestClient(app)


@pytest.fixture
def sample_pdf_base64() -> str:
    """Create a sample base64 PDF."""
    doc = fitz.open()
    p1 = doc.new_page()
    p1.insert_text((50, 72), "LEASE CONTRACT\nLandlord: Abebe\nRent: 50,000 ETB\nSecurity Deposit: 100,000 ETB.")
    pdf_bytes = doc.tobytes()
    doc.close()
    return base64.b64encode(pdf_bytes).decode("utf-8")


class TestDiagnosticsEndpoints:
    """Health endpoint tests."""

    def test_health_check_endpoints(self, test_client: TestClient) -> None:
        for endpoint in ("/health", "/api/v1/health"):
            res = test_client.get(endpoint)
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "healthy"
            assert data["version"] == "0.1.0"
            assert "provider" in data
            assert "mock_mode" in data


class TestListingExtractionEndpoint:
    """Listing extraction tests."""

    def test_extract_listing_success_with_mock_service(self, test_client: TestClient) -> None:
        mock_output = json.dumps({
            "property_type": "apartment",
            "bedrooms": 3,
            "bathrooms": 2.0,
            "monthly_rent": 55000.0,
            "currency": "ETB",
            "neighborhood": "Bole",
            "city": "Addis Ababa",
            "amenities": ["Generator", "Water Tank"],
            "availability": "immediate",
            "title_suggestion": "3BR Apartment in Bole",
        })
        mock_client = MockLLMClient(default_response=mock_output)
        mock_service = ListingExtractionService(client=mock_client)

        app.dependency_overrides[get_listing_service] = lambda: mock_service

        try:
            payload = {
                "description": "3-bedroom, 2-bathroom apartment in Bole, Addis Ababa. Rent 55,000 ETB. Has generator."
            }
            res = test_client.post("/api/v1/extract-listing", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["property_type"] == "apartment"
            assert data["bedrooms"] == 3
            assert data["monthly_rent"] == 55000.0
            assert data["currency"] == "ETB"
            assert data["neighborhood"] == "Bole"
            assert len(data["amenities"]) == 2
        finally:
            app.dependency_overrides.clear()

    def test_extract_listing_validation_error_on_empty_description(self, test_client: TestClient) -> None:
        res = test_client.post("/api/v1/extract-listing", json={"description": ""})
        assert res.status_code == 422

        res2 = test_client.post("/api/v1/extract-listing", json={"description": "   \n\t  "})
        assert res2.status_code == 422

    def test_extract_listing_missing_body_returns_422(self, test_client: TestClient) -> None:
        res = test_client.post("/api/v1/extract-listing", json={})
        assert res.status_code == 422

    def test_extract_listing_handles_auth_error(self, test_client: TestClient) -> None:
        class FailingAuthService:
            def extract_listing(self, raw_description: str):
                raise LLMAuthenticationError("API key missing or invalid.")

        app.dependency_overrides[get_listing_service] = lambda: FailingAuthService()

        try:
            res = test_client.post("/api/v1/extract-listing", json={"description": "Nice villa in Sarbet."})
            assert res.status_code == 401
            assert "API key missing" in res.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_extract_listing_handles_timeout_error(self, test_client: TestClient) -> None:
        class FailingTimeoutService:
            def extract_listing(self, raw_description: str):
                raise LLMTimeoutError("Request to model provider timed out.")

        app.dependency_overrides[get_listing_service] = lambda: FailingTimeoutService()

        try:
            res = test_client.post("/api/v1/extract-listing", json={"description": "Nice villa in Sarbet."})
            assert res.status_code == 504
            assert "timed out" in res.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()


class TestLeaseQAEndpoint:
    """Lease QA tests."""

    def test_lease_qa_with_pdf_base64_success(
        self,
        test_client: TestClient,
        sample_pdf_base64: str,
    ) -> None:
        mock_output = json.dumps({
            "answer": "The security deposit is 100,000 ETB.",
            "status": "supported",
            "citations": [
                {
                    "page_number": 1,
                    "excerpt": "Security Deposit: 100,000 ETB."
                }
            ]
        })
        mock_client = MockLLMClient(default_response=mock_output)
        mock_service = LeaseQAService(client=mock_client)

        app.dependency_overrides[get_lease_qa_service] = lambda: mock_service

        try:
            payload = {
                "question": "What is the security deposit?",
                "pdf_base64": sample_pdf_base64,
                "top_k": 3,
            }
            res = test_client.post("/api/v1/lease-qa", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "supported"
            assert data["has_sufficient_evidence"] is True
            assert "100,000 ETB" in data["answer"]
            assert len(data["citations"]) == 1
            assert data["citations"][0]["page_number"] == 1
        finally:
            app.dependency_overrides.clear()

    def test_lease_qa_with_document_text_success(self, test_client: TestClient) -> None:
        mock_output = json.dumps({
            "answer": "Monthly rent is 45,000 ETB.",
            "status": "supported",
            "citations": [
                {
                    "page_number": 1,
                    "excerpt": "Rent: 45,000 ETB"
                }
            ]
        })
        mock_client = MockLLMClient(default_response=mock_output)
        mock_service = LeaseQAService(client=mock_client)

        app.dependency_overrides[get_lease_qa_service] = lambda: mock_service

        try:
            payload = {
                "question": "How much is the rent?",
                "document_text": "RESIDENTIAL LEASE\nTenant: Solomon\nRent: 45,000 ETB per month.",
            }
            res = test_client.post("/api/v1/lease-qa", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "supported"
            assert "45,000 ETB" in data["answer"]
        finally:
            app.dependency_overrides.clear()

    def test_lease_qa_unsupported_question(
        self,
        test_client: TestClient,
        sample_pdf_base64: str,
    ) -> None:
        mock_output = json.dumps({
            "answer": "The provided lease agreement does not contain information to answer this question.",
            "status": "unsupported",
            "citations": []
        })
        mock_client = MockLLMClient(default_response=mock_output)
        mock_service = LeaseQAService(client=mock_client)

        app.dependency_overrides[get_lease_qa_service] = lambda: mock_service

        try:
            payload = {
                "question": "Are pets allowed in the building?",
                "pdf_base64": sample_pdf_base64,
            }
            res = test_client.post("/api/v1/lease-qa", json=payload)
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "unsupported"
            assert data["has_sufficient_evidence"] is False
            assert "does not contain information" in data["answer"]
            assert len(data["citations"]) == 0
        finally:
            app.dependency_overrides.clear()

    def test_lease_qa_missing_both_pdf_and_text_returns_400(self, test_client: TestClient) -> None:
        res = test_client.post("/api/v1/lease-qa", json={"question": "What is the rent?"})
        assert res.status_code == 400
        assert "Either 'pdf_base64' or 'document_text'" in res.json()["detail"]

    def test_lease_qa_invalid_base64_data_returns_400(self, test_client: TestClient) -> None:
        res = test_client.post(
            "/api/v1/lease-qa",
            json={"question": "What is the rent?", "pdf_base64": "!!!not_base64!!!"},
        )
        assert res.status_code == 400
        assert "Invalid base64" in res.json()["detail"]

    def test_lease_qa_invalid_pdf_header_returns_400(self, test_client: TestClient) -> None:
        fake_b64 = base64.b64encode(b"This is just plain text, not a PDF.").decode("utf-8")
        res = test_client.post(
            "/api/v1/lease-qa",
            json={"question": "What is the rent?", "pdf_base64": fake_b64},
        )
        assert res.status_code == 400
        assert "missing %PDF- header" in res.json()["detail"]

    def test_lease_qa_empty_question_returns_422(
        self,
        test_client: TestClient,
        sample_pdf_base64: str,
    ) -> None:
        res = test_client.post(
            "/api/v1/lease-qa",
            json={"question": "   ", "pdf_base64": sample_pdf_base64},
        )
        assert res.status_code == 422

    def test_lease_qa_oversized_question_returns_422(
        self,
        test_client: TestClient,
        sample_pdf_base64: str,
    ) -> None:
        long_q = "How much is the rent? " * 100
        res = test_client.post(
            "/api/v1/lease-qa",
            json={"question": long_q, "pdf_base64": sample_pdf_base64},
        )
        assert res.status_code == 422

    def test_lease_qa_conflicting_clauses_returns_conflicting_status(
        self,
        test_client: TestClient,
        sample_pdf_base64: str,
    ) -> None:
        mock_output = json.dumps({
            "answer": "Conflict detected: Clause 1 specifies 50,000 ETB rent while Clause 2 mentions 60,000 ETB.",
            "status": "conflicting",
            "citations": [
                {"page_number": 1, "excerpt": "Rent: 50,000 ETB"},
                {"page_number": 1, "excerpt": "Security Deposit: 100,000 ETB"}
            ],
            "confidence_notes": "Rent values conflict across sections."
        })
        mock_client = MockLLMClient(default_response=mock_output)
        mock_service = LeaseQAService(client=mock_client)

        app.dependency_overrides[get_lease_qa_service] = lambda: mock_service
        try:
            res = test_client.post(
                "/api/v1/lease-qa",
                json={"question": "What is the monthly rent?", "pdf_base64": sample_pdf_base64},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "conflicting"
            assert data["has_sufficient_evidence"] is True
            assert "conflict" in data["answer"].lower()
            assert len(data["citations"]) == 2
        finally:
            app.dependency_overrides.clear()

    def test_lease_qa_partially_supported_returns_status_and_flag(
        self,
        test_client: TestClient,
        sample_pdf_base64: str,
    ) -> None:
        mock_output = json.dumps({
            "answer": "Rent is 50,000 ETB, but no parking terms are defined in the lease.",
            "status": "partially_supported",
            "citations": [{"page_number": 1, "excerpt": "Rent: 50,000 ETB"}],
            "confidence_notes": "Parking terms are missing."
        })
        mock_client = MockLLMClient(default_response=mock_output)
        mock_service = LeaseQAService(client=mock_client)

        app.dependency_overrides[get_lease_qa_service] = lambda: mock_service
        try:
            res = test_client.post(
                "/api/v1/lease-qa",
                json={"question": "What is the rent and parking spot cost?", "pdf_base64": sample_pdf_base64},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "partially_supported"
            assert data["has_sufficient_evidence"] is False
            assert "parking" in data["confidence_notes"].lower()
        finally:
            app.dependency_overrides.clear()

    def test_lease_qa_malformed_model_response_returns_502(
        self,
        test_client: TestClient,
        sample_pdf_base64: str,
    ) -> None:
        mock_client = MockLLMClient(default_response="Not valid json from model")
        mock_service = LeaseQAService(client=mock_client)

        app.dependency_overrides[get_lease_qa_service] = lambda: mock_service
        try:
            res = test_client.post(
                "/api/v1/lease-qa",
                json={"question": "What is the rent?", "pdf_base64": sample_pdf_base64},
            )
            assert res.status_code == 502
            assert "Failed to parse model response" in res.json()["detail"]
        finally:
            app.dependency_overrides.clear()


class TestMockModeEnvironment:
    """Mock mode environment tests."""

    def test_mock_mode_flag_in_factory(self, monkeypatch: pytest.MonkeyPatch, test_client: TestClient) -> None:
        monkeypatch.setenv("AI_USE_MOCK_CLIENT", "true")
        res = test_client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["mock_mode"] is True
        assert data["provider"] == "mock"
