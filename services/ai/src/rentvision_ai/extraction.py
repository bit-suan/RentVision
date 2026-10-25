from __future__ import annotations

import re
from typing import TYPE_CHECKING

from rentvision_ai.models import LeaseExtractedData, LeaseExtractionResult

LEASE_STORE: dict[str, LeaseExtractionResult] = {}

SAMPLE_LEASE_TEXT = """
RESIDENTIAL LEASE AGREEMENT
Landlord: Hana Bekele
Tenant: Dawit Mekonnen
Property: Cameroon St, Bole, Addis Ababa
Start Date: 2026-01-01
End Date: 2026-12-31
Monthly Rent: 45000 ETB payable on or before the 5th of each month.
Security Deposit: 45000 ETB held for the term of the lease.
The tenant shall not sublet the premises without written consent.
Either party may terminate with 60 days written notice.
Utilities: tenant pays electricity and water; landlord pays compound security.
"""


def extract_pdf_pages(data: bytes) -> list[str]:
    import fitz  # lazy import: only needed for PDF parsing, not for field extraction
    document = fitz.open(stream=data, filetype="pdf")
    return [page.get_text() or "" for page in document]


def extract_fields(text: str) -> LeaseExtractedData:
    def match(pattern: str) -> str | None:
        found = re.search(pattern, text, flags=re.IGNORECASE)
        return found.group(1).strip() if found else None

    rent = match(r"Monthly Rent:\s*([0-9]+)")
    deposit = match(r"Security Deposit:\s*([0-9]+)")
    terms = [
        line.strip()
        for line in text.splitlines()
        if any(
            keyword in line.lower()
            for keyword in ("shall", "terminate", "utilities", "sublet")
        )
    ]
    return LeaseExtractedData(
        start_date=match(r"Start Date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})"),
        end_date=match(r"End Date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})"),
        monthly_rent=float(rent) if rent else None,
        deposit=float(deposit) if deposit else None,
        terms=terms,
        landlord_name=match(r"Landlord:\s*(.+)"),
        tenant_name=match(r"Tenant:\s*(.+)"),
    )


def store_extracted_text(lease_id: str, text: str, pages: list[str] | None = None) -> LeaseExtractionResult:
    result = LeaseExtractionResult(
        lease_id=lease_id,
        page_count=len(pages or [text]),
        text=text,
        extracted=extract_fields(text),
    )
    LEASE_STORE[lease_id] = result
    return result


def extract_lease(lease_id: str, pdf_bytes: bytes) -> LeaseExtractionResult:
    pages = extract_pdf_pages(pdf_bytes)
    return store_extracted_text(lease_id, "\n".join(pages), pages)


def get_lease(lease_id: str) -> LeaseExtractionResult:
    if lease_id in LEASE_STORE:
        return LEASE_STORE[lease_id]
    return store_extracted_text(lease_id, SAMPLE_LEASE_TEXT, [SAMPLE_LEASE_TEXT])
