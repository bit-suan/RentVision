"""PDF text extraction service using PyMuPDF (fitz) for lease documents."""

from pathlib import Path
from typing import BinaryIO
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None  # type: ignore[assignment]
from rentvision_ai.exceptions import InvalidPDFError, PDFExtractionError
from rentvision_ai.schemas.document import ExtractedDocument, PDFPage


class PDFExtractionService:
    """Extracts text and page-indexed metadata from text-based PDF documents."""

    def extract_from_path(self, file_path: str | Path) -> ExtractedDocument:
        """Extract text and metadata from a PDF file path.
        
        Args:
            file_path: Filesystem path to the PDF file.
            
        Returns:
            ExtractedDocument with page numbers preserved and structural metadata.
            
        Raises:
            InvalidPDFError: If file does not exist, is empty, or is not a valid PDF.
            PDFExtractionError: On parsing or extraction errors.
        """
        path = Path(file_path)
        if not path.is_file():
            raise InvalidPDFError(f"PDF file does not exist or is not a file: {file_path}")

        try:
            file_bytes = path.read_bytes()
        except Exception as e:
            raise PDFExtractionError(f"Failed to read file at {file_path}: {e}") from e

        return self.extract_from_bytes(file_bytes, filename=path.name)

    def extract_from_stream(self, stream: BinaryIO, filename: str = "document.pdf") -> ExtractedDocument:
        """Extract text from an open binary stream."""
        try:
            content = stream.read()
            return self.extract_from_bytes(content, filename=filename)
        except Exception as e:
            if isinstance(e, (InvalidPDFError, PDFExtractionError)):
                raise
            raise PDFExtractionError(f"Error reading PDF stream: {e}") from e

    def extract_from_bytes(self, pdf_bytes: bytes, filename: str = "document.pdf") -> ExtractedDocument:
        """Extract text and metadata from raw PDF bytes.
        
        Args:
            pdf_bytes: Raw bytes of the PDF.
            filename: Human-readable filename for provenance.
            
        Returns:
            ExtractedDocument containing ordered PDFPage objects and document metadata.
            
        Raises:
            InvalidPDFError: If bytes are empty or corrupted.
            PDFExtractionError: If PyMuPDF fails during processing.
        """
        if not pdf_bytes or len(pdf_bytes.strip()) == 0:
            raise InvalidPDFError(f"PDF document '{filename}' is empty (0 bytes).")

        if fitz is None:
            raise PDFExtractionError("PyMuPDF (fitz) is not installed or available on this system.")

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        except Exception as e:
            raise InvalidPDFError(f"Failed to open PDF '{filename}': File is corrupted or invalid format. Error: {e}") from e

        try:
            page_count = doc.page_count
            if page_count == 0:
                raise InvalidPDFError(f"PDF document '{filename}' contains 0 pages.")

            pages: list[PDFPage] = []
            full_text_chunks: list[str] = []
            total_extracted_chars = 0

            # PyMuPDF metadata (title, author, creationDate, etc.)
            raw_metadata = doc.metadata or {}
            cleaned_metadata = {
                k: v for k, v in raw_metadata.items()
                if v and isinstance(v, (str, int, float, bool))
            }

            for page_index in range(page_count):
                page = doc.load_page(page_index)
                page_text = page.get_text("text").strip()
                char_count = len(page_text)
                word_count = len(page_text.split()) if page_text else 0
                total_extracted_chars += char_count

                # Page numbers are 1-indexed for human and legal citation readability
                pages.append(
                    PDFPage(
                        page_number=page_index + 1,
                        text=page_text,
                        char_count=char_count,
                        word_count=word_count,
                    )
                )
                if page_text:
                    full_text_chunks.append(f"--- Page {page_index + 1} ---\n{page_text}")

            full_text = "\n\n".join(full_text_chunks)
            has_extractable_text = total_extracted_chars > 0

            return ExtractedDocument(
                filename=filename,
                page_count=page_count,
                pages=pages,
                full_text=full_text,
                metadata=cleaned_metadata,
                has_extractable_text=has_extractable_text,
            )

        except Exception as e:
            if isinstance(e, (InvalidPDFError, PDFExtractionError)):
                raise
            raise PDFExtractionError(f"Failed extracting text from '{filename}': {e}") from e
        finally:
            doc.close()
