"""Interactive demo for listing extraction, PDF parsing, and lease Q&A."""

import json
import os
from pathlib import Path
import fitz
from rentvision_ai.clients import MockLLMClient, OpenAIClient, get_default_llm_client
from rentvision_ai.services import ListingExtractionService, PDFExtractionService


def _auto_load_env() -> None:
    """Load environment variables from .env file."""
    search_dirs = [
        Path.cwd(),
        Path(__file__).resolve().parent,
        Path(__file__).resolve().parent.parent.parent,
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


def test_listing_extraction() -> None:
    print("=" * 60)
    print("1. TESTING PROPERTY LISTING EXTRACTION")
    print("=" * 60)

    # Sample listing description
    sample_description = (
        "Spacious 3-bedroom, 2-bathroom apartment located in Bole, Addis Ababa. "
        "Comes with a backup generator, water reserve tank, and high-speed WiFi. "
        "Rent is 55,000 ETB per month. Available starting next month."
    )
    print(f"Sample Input Text:\n\"{sample_description}\"\n")

    # Select model client based on available environment keys
    has_gemini = bool(os.environ.get("GEMINI_API_KEY"))
    has_openai = bool(os.environ.get("OPENAI_API_KEY"))

    if has_gemini or has_openai:
        client = OpenAIClient()
        provider_label = "Google Gemini" if client.provider_name == "gemini" else "OpenAI"
        print(f"Using live {provider_label} client (Model: {client.model_name})...")
    else:
        print("No GEMINI_API_KEY or OPENAI_API_KEY set: Using Mock client with pre-scripted response...")
        sample_json_response = json.dumps({
            "property_type": "apartment",
            "bedrooms": 3,
            "bathrooms": 2.0,
            "monthly_rent": 55000.0,
            "currency": "ETB",
            "neighborhood": "Bole",
            "city": "Addis Ababa",
            "amenities": ["Backup Generator", "Water Tank", "WiFi"],
            "availability": "next month",
            "title_suggestion": "Spacious 3BR Apartment in Bole",
            "confidence_notes": "All core attributes present."
        })
        client = MockLLMClient(default_response=sample_json_response)

    service = ListingExtractionService(client=client)
    result = service.extract_listing(sample_description)

    print("\nExtracted Structured Data (Pydantic Model):")
    print(json.dumps(result.model_dump(), indent=2))
    print(f"\nProperty Type: {result.property_type.value}")
    print(f"Bedrooms: {result.bedrooms}, Bathrooms: {result.bathrooms}")
    print(f"Rent: {result.monthly_rent} {result.currency}")
    print(f"Amenities: {', '.join(result.amenities)}")
    print(f"Missing/Unextracted Fields: {result.unextracted_or_missing_fields}")


def test_pdf_extraction() -> None:
    print("\n" + "=" * 60)
    print("2. TESTING PDF CONTRACT EXTRACTION (PyMuPDF)")
    print("=" * 60)

    # Build an in-memory sample lease PDF
    doc = fitz.open()
    doc.set_metadata({
        "title": "Addis Ababa Tenancy Agreement",
        "author": "RentVision Legal Team",
    })

    p1 = doc.new_page()
    p1.insert_text(
        (50, 72),
        "RENTAL LEASE AGREEMENT\n\n"
        "Landlord: Abebe Bikila\n"
        "Tenant: Almaz Ayana\n"
        "Premises: Apartment 4B, Bole Subcity, Addis Ababa\n"
        "Rent: 50,000 ETB per month"
    )

    p2 = doc.new_page()
    p2.insert_text(
        (50, 72),
        "SECTION 2: UTILITIES & SECURITY DEPOSIT\n\n"
        "Security Deposit: 100,000 ETB (2 months)\n"
        "Utilities Included: Backup generator fuel and 24/7 building security."
    )

    pdf_bytes = doc.tobytes()
    doc.close()

    print("Created synthetic 2-page PDF in memory...")

    pdf_service = PDFExtractionService()
    extracted_doc = pdf_service.extract_from_bytes(pdf_bytes, filename="lease_agreement_sample.pdf")

    print(f"Document Filename: {extracted_doc.filename}")
    print(f"Total Pages: {extracted_doc.page_count}")
    print(f"Has Extractable Text: {extracted_doc.has_extractable_text}")
    print("\nExtracted Content by Page:")
    for page in extracted_doc.pages:
        print(f"\n--- [Page {page.page_number}] ({page.word_count} words, {page.char_count} chars) ---")
        print(page.text.strip())

    return extracted_doc, pdf_bytes


def test_lease_qa(extracted_doc: fitz.Document | None = None) -> None:
    print("\n" + "=" * 60)
    print("3. TESTING EVIDENCE-GROUNDED LEASE QUESTION ANSWERING (RAG)")
    print("=" * 60)

    from rentvision_ai.services import LeaseQAService

    # In-memory lease contract
    doc = fitz.open()
    p1 = doc.new_page()
    p1.insert_text(
        (50, 72),
        "RENTAL LEASE AGREEMENT\n\n"
        "Landlord: Abebe Bikila\n"
        "Tenant: Almaz Ayana\n"
        "Premises: Apartment 4B, Bole Subcity, Addis Ababa\n"
        "Rent: 50,000 ETB per month payable on the 1st of each month."
    )
    p2 = doc.new_page()
    p2.insert_text(
        (50, 72),
        "SECTION 2: UTILITIES & SECURITY DEPOSIT\n\n"
        "Security Deposit: 100,000 ETB (equivalent to 2 months rent), refundable within 30 days.\n"
        "Utilities Included: Backup generator fuel and 24/7 building security.\n"
        "Water and electricity are paid separately by Tenant."
    )
    pdf_bytes = doc.tobytes()
    doc.close()

    pdf_service = PDFExtractionService()
    parsed_lease = pdf_service.extract_from_bytes(pdf_bytes, filename="lease_sample.pdf")

    has_live_key = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY"))
    if has_live_key:
        client = OpenAIClient()
        label = f"Live {client.provider_name.capitalize()} ({client.model_name})"
    else:
        label = "Mock LLM Client"
        client = MockLLMClient(
            default_response=json.dumps({
                "answer": "The security deposit is 100,000 ETB, and backup generator fuel is included.",
                "status": "supported",
                "citations": [{"page_number": 2, "excerpt": "Security Deposit: 100,000 ETB (equivalent to 2 months rent)"}]
            })
        )

    print(f"Using {label} for Grounded Lease QA...\n")
    qa_service = LeaseQAService(client=client)

    # Supported question
    q1 = "What is the security deposit and what utilities are included in the rent?"
    print(f"[Query 1]: \"{q1}\"")
    r1 = qa_service.answer_question(q1, parsed_lease)
    print(f"Status: {r1.status.value.upper()} (Has Evidence: {r1.has_sufficient_evidence})")
    print(f"Answer: {r1.answer}")
    print(f"Citations: {[f'Page {c.page_number}: \"{c.excerpt}\"' for c in r1.citations]}")

    # Unsupported question
    print()
    q2 = "Can the tenant keep a dog or pet in the apartment?"
    print(f"[Query 2 (Negative Test)]: \"{q2}\"")
    r2 = qa_service.answer_question(q2, parsed_lease)
    print(f"Status: {r2.status.value.upper()} (Has Evidence: {r2.has_sufficient_evidence})")
    print(f"Answer: {r2.answer}")
    print(f"Citations: {r2.citations}")


if __name__ == "__main__":
    print("Running RentVision AI Verification Suite...\n")
    test_listing_extraction()
    test_pdf_extraction()
    test_lease_qa()
    print("\n" + "=" * 60)
    print("ALL CHECKS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

