"""Unit tests for PDF document text extraction service."""

import io
from pathlib import Path
import pytest
import fitz  # PyMuPDF
from rentvision_ai.exceptions import InvalidPDFError, PDFExtractionError
from rentvision_ai.services.pdf_extractor import PDFExtractionService


@pytest.fixture
def pdf_service() -> PDFExtractionService:
    return PDFExtractionService()


@pytest.fixture
def sample_multipage_pdf_bytes() -> bytes:
    """Generate a clean 2-page PDF document in memory using PyMuPDF."""
    doc = fitz.open()
    doc.set_metadata({
        "title": "Standard Residential Lease Agreement",
        "author": "RentVision Legal",
        "subject": "Addis Ababa Tenancy Contract",
    })

    # Page 1
    page1 = doc.new_page()
    page1.insert_text(
        (50, 72),
        "RENTAL LEASE AGREEMENT\n\n"
        "This agreement is entered into between Landlord and Tenant.\n"
        "Premises: Apartment 4B, Bole Subcity, Addis Ababa.\n"
        "Monthly Rent: 45,000 ETB payable on the 1st of each month."
    )

    # Page 2
    page2 = doc.new_page()
    page2.insert_text(
        (50, 72),
        "UTILITIES AND MAINTENANCE\n\n"
        "The tenant is responsible for internet and electricity.\n"
        "Landlord provides backup generator fuel and water reserve tank."
    )

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


@pytest.fixture
def sample_blank_pdf_bytes() -> bytes:
    """Generate a 1-page PDF document with no text (simulating blank or non-OCR scanned page)."""
    doc = fitz.open()
    doc.new_page()
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


class TestPDFExtractionService:
    """Tests covering text extraction, page indexing, metadata, and error handling."""

    def test_multipage_pdf_extraction_and_page_number_preservation(
        self,
        pdf_service: PDFExtractionService,
        sample_multipage_pdf_bytes: bytes,
    ) -> None:
        doc = pdf_service.extract_from_bytes(
            sample_multipage_pdf_bytes,
            filename="residential_lease.pdf"
        )

        assert doc.filename == "residential_lease.pdf"
        assert doc.page_count == 2
        assert len(doc.pages) == 2
        assert doc.has_extractable_text is True

        # Test page 1 preservation and 1-indexing
        p1 = doc.pages[0]
        assert p1.page_number == 1
        assert "RENTAL LEASE AGREEMENT" in p1.text
        assert "45,000 ETB" in p1.text
        assert p1.char_count > 0
        assert p1.word_count > 5

        # Test page 2 preservation and 1-indexing
        p2 = doc.pages[1]
        assert p2.page_number == 2
        assert "UTILITIES AND MAINTENANCE" in p2.text
        assert "backup generator" in p2.text.lower()
        assert p2.char_count > 0

        # Full text should contain page boundaries
        assert "--- Page 1 ---" in doc.full_text
        assert "--- Page 2 ---" in doc.full_text

        # Metadata preservation
        assert doc.metadata.get("title") == "Standard Residential Lease Agreement"
        assert doc.metadata.get("author") == "RentVision Legal"

    def test_extract_from_path(
        self,
        pdf_service: PDFExtractionService,
        sample_multipage_pdf_bytes: bytes,
        tmp_path: Path,
    ) -> None:
        test_file = tmp_path / "test_lease.pdf"
        test_file.write_bytes(sample_multipage_pdf_bytes)

        result = pdf_service.extract_from_path(test_file)
        assert result.filename == "test_lease.pdf"
        assert result.page_count == 2
        assert "Bole Subcity" in result.full_text

    def test_extract_from_stream(
        self,
        pdf_service: PDFExtractionService,
        sample_multipage_pdf_bytes: bytes,
    ) -> None:
        stream = io.BytesIO(sample_multipage_pdf_bytes)
        result = pdf_service.extract_from_stream(stream, filename="streamed_lease.pdf")
        assert result.filename == "streamed_lease.pdf"
        assert result.page_count == 2

    def test_pdf_without_extractable_text_handled_gracefully(
        self,
        pdf_service: PDFExtractionService,
        sample_blank_pdf_bytes: bytes,
    ) -> None:
        """PDFs with no text (scanned or blank) must not crash and be marked has_extractable_text=False."""
        result = pdf_service.extract_from_bytes(sample_blank_pdf_bytes, filename="blank.pdf")
        assert result.page_count == 1
        assert result.has_extractable_text is False
        assert result.pages[0].char_count == 0
        assert result.pages[0].text == ""
        assert result.full_text == ""

    def test_empty_bytes_raises_invalid_pdf_error(
        self,
        pdf_service: PDFExtractionService,
    ) -> None:
        with pytest.raises(InvalidPDFError, match="empty"):
            pdf_service.extract_from_bytes(b"", filename="empty.pdf")

    def test_corrupted_bytes_raises_invalid_pdf_error(
        self,
        pdf_service: PDFExtractionService,
    ) -> None:
        corrupted = b"NOT_A_REAL_PDF_HEADER_JUST_GARBAGE_DATA"
        with pytest.raises(InvalidPDFError, match="corrupted or invalid"):
            pdf_service.extract_from_bytes(corrupted, filename="corrupt.pdf")

    def test_nonexistent_file_path_raises_invalid_pdf_error(
        self,
        pdf_service: PDFExtractionService,
    ) -> None:
        with pytest.raises(InvalidPDFError, match="does not exist"):
            pdf_service.extract_from_path("non_existent_directory/missing_lease.pdf")

    def test_exceeding_max_pages_raises_invalid_pdf_error(self) -> None:
        doc = fitz.open()
        for _ in range(6):
            doc.new_page()
        pdf_bytes = doc.tobytes()
        doc.close()

        # Configure service with max_pages=5
        service = PDFExtractionService(max_pages=5)
        with pytest.raises(InvalidPDFError, match="exceeding the maximum allowed limit of 5 pages"):
            service.extract_from_bytes(pdf_bytes, filename="six_pages.pdf")

    def test_exceeding_max_bytes_raises_invalid_pdf_error(self) -> None:
        service = PDFExtractionService(max_bytes=500)
        oversized_bytes = b"%PDF-1.4 " + (b"A" * 600)
        with pytest.raises(InvalidPDFError, match="exceeds maximum allowed size of 500 bytes"):
            service.extract_from_bytes(oversized_bytes, filename="oversized.pdf")
