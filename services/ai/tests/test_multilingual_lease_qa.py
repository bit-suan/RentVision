"""Multilingual Lease Question Answering tests with cross-language retrieval and source citations."""

import base64
import json
import os
import fitz
import pytest
from fastapi.testclient import TestClient

from rentvision_ai.api import app
from rentvision_ai.clients.mock_client import MockLLMClient
from rentvision_ai.schemas.document import ExtractedDocument, PDFPage
from rentvision_ai.schemas.lease_qa import EvidenceSupportStatus, LeaseChunk
from rentvision_ai.services.lease_qa import (
    INSUFFICIENT_EVIDENCE_ANSWERS,
    LeaseQAService,
    deterministic_lease_qa_handler,
)
from rentvision_ai.services.retriever import (
    BM25Retriever,
    chunk_document,
    expand_cross_language_query,
    tokenize,
)


@pytest.fixture
def amharic_lease_doc() -> ExtractedDocument:
    """Two-page Amharic residential lease agreement fixture."""
    p1 = PDFPage(
        page_number=1,
        text=(
            "የመኖሪያ ቤት ኪራይ ውል ስምምነት\n\n"
            "ይህ የኪራይ ውል ስምምነት በአቶ በቀለ ታደሰ (አከራይ) እና በወይዘሮ ሳራ ገብሬ (ተከራይ) መካከል ተደርጓል።\n"
            "የቤቱ አድራሻ፡ ቦሌ ክፍለ ከተማ፣ ወረዳ 03፣ አዲስ አበባ።\n"
            "የውል ዘመን፡ ለአንድ (1) ዓመት ከህዳር 1 ቀን 2017 ጀምሮ የሚጸና ይሆናል።\n"
            "ወርሃዊ የኪራይ ክፍያ፡ ተከራይ በየወሩ መጀመሪያ 45,000 የኢትዮጵያ ብር (አርባ አምስት ሺህ ብር) በአከራይ የባንክ ሂሳብ ገቢ ያደርጋል።"
        ),
        char_count=320,
        word_count=48,
    )
    p2 = PDFPage(
        page_number=2,
        text=(
            "ክፍል 2፡ የዋስትና ተቀማጭ እና የመገልገያ ክፍያዎች\n\n"
            "የዋስትና ተቀማጭ፡ ተከራይ ቤቱን ከመረከቡ በፊት የሁለት ወር ኪራይ ተመጣጣኝ 90,000 የኢትዮጵያ ብር የዋስትና ማስያዣ ያስይዛል። "
            "ይህ ተቀማጭ ውሉ ሲጠናቀቅና ቤቱ ያለጉዳት ሲረከብ በ30 ቀናት ውስጥ ሙሉ በሙሉ ተመላሽ ይደረጋል።\n"
            "መገልገያዎች፡ የውሃ እና የመብራት ክፍያ በተከራይ የሚሸፈን ሲሆን የጀነሬተር ነዳጅ እና የጥበቃ አገልግሎት በኪራዩ ውስጥ የተካተተ ነው።\n"
            "የቤት እንስሳት፡ በግቢው ውስጥ ማንኛውንም የቤት እንስሳ (ውሻ ወይም ድመት) መያዝ በጥብቅ የተከለከለ ነው።"
        ),
        char_count=390,
        word_count=56,
    )
    return ExtractedDocument(
        filename="amharic_lease.pdf",
        page_count=2,
        pages=[p1, p2],
        full_text=f"{p1.text}\n\n{p2.text}",
        metadata={"title": "Amharic Lease Contract"},
        has_extractable_text=True,
    )


@pytest.fixture
def english_lease_doc() -> ExtractedDocument:
    """Two-page English residential lease agreement fixture."""
    p1 = PDFPage(
        page_number=1,
        text=(
            "RESIDENTIAL LEASE AGREEMENT\n\n"
            "This Tenancy Agreement is entered into between Dawit Haile (Landlord) and Bethlehem Mengistu (Tenant).\n"
            "Premises: Apartment 2B, Kazanchis, Kirkos Subcity, Addis Ababa.\n"
            "Term: Twelve (12) calendar months starting December 1, 2026.\n"
            "Monthly Rent: 60,000 ETB payable in advance on or before the 5th day of every month."
        ),
        char_count=330,
        word_count=46,
    )
    p2 = PDFPage(
        page_number=2,
        text=(
            "CLAUSE 4: SECURITY DEPOSIT AND UTILITIES\n\n"
            "Security Deposit: Tenant shall pay a refundable deposit of 120,000 ETB prior to key handover. "
            "The deposit is refundable within 30 days of lease expiration.\n"
            "Utilities: Rent includes 24/7 security guard and generator fuel. Tenant pays municipal water and electricity bills.\n"
            "Subletting: Subletting the apartment is strictly prohibited under any conditions."
        ),
        char_count=370,
        word_count=52,
    )
    return ExtractedDocument(
        filename="english_lease.pdf",
        page_count=2,
        pages=[p1, p2],
        full_text=f"{p1.text}\n\n{p2.text}",
        metadata={"title": "English Lease Contract"},
        has_extractable_text=True,
    )


@pytest.fixture
def detailed_english_lease_doc() -> ExtractedDocument:
    """Two-page English residential lease agreement with maintenance, utilities, and term details."""
    p1 = PDFPage(
        page_number=1,
        text=(
            "RESIDENTIAL TENANCY AGREEMENT\n\n"
            "Parties: Dawit Haile (Landlord) and Bethlehem Mengistu (Tenant).\n"
            "Premises: House 4B, Bole Subcity, Addis Ababa.\n"
            "Lease Term: The lease agreement duration is for one (1) year starting September 1, 2026.\n"
            "Rent: Monthly rent is 55,000 ETB payable on the 1st of each month via bank transfer."
        ),
        char_count=350,
        word_count=50,
    )
    p2 = PDFPage(
        page_number=2,
        text=(
            "CLAUSE 5: REPAIRS AND MAINTENANCE\n"
            "The landlord is responsible for major structural and plumbing repairs, including broken pipes, "
            "unless damage is caused by tenant negligence. Tenant is responsible for minor interior upkeep.\n\n"
            "CLAUSE 6: UTILITIES\n"
            "Rent includes shared backup generator fuel and compound security. "
            "Tenant must pay for municipal water, electricity, and internet bills directly."
        ),
        char_count=420,
        word_count=58,
    )
    return ExtractedDocument(
        filename="detailed_lease.pdf",
        page_count=2,
        pages=[p1, p2],
        full_text=f"{p1.text}\n\n{p2.text}",
        metadata={"title": "Detailed Lease Contract"},
        has_extractable_text=True,
    )



class TestCrossLanguageRetrieval:
    """Tests for cross-language BM25 retrieval between English and Amharic."""

    def test_english_query_retrieves_amharic_security_deposit(
        self, amharic_lease_doc: ExtractedDocument
    ) -> None:
        chunks = chunk_document(amharic_lease_doc)
        retriever = BM25Retriever(chunks)

        results = retriever.retrieve("What is the security deposit amount and is it refundable?")
        assert len(results) > 0
        top_chunk, score = results[0]
        assert top_chunk.page_number == 2
        assert "የዋስትና" in top_chunk.text
        assert "90,000" in top_chunk.text
        assert score > 0.0

    def test_english_query_retrieves_amharic_rent_due_date(
        self, amharic_lease_doc: ExtractedDocument
    ) -> None:
        chunks = chunk_document(amharic_lease_doc)
        retriever = BM25Retriever(chunks)

        results = retriever.retrieve("How much is the monthly rent payment?")
        assert len(results) > 0
        top_chunk, score = results[0]
        assert top_chunk.page_number == 1
        assert "45,000" in top_chunk.text
        assert "ኪራይ" in top_chunk.text

    def test_english_query_retrieves_amharic_pet_rules(
        self, amharic_lease_doc: ExtractedDocument
    ) -> None:
        chunks = chunk_document(amharic_lease_doc)
        retriever = BM25Retriever(chunks)

        results = retriever.retrieve("Are pets such as dogs or cats allowed?")
        assert len(results) > 0
        top_chunk, _ = results[0]
        assert top_chunk.page_number == 2
        assert "የቤት እንስሳት" in top_chunk.text or "የተከለከለ" in top_chunk.text

    def test_amharic_query_retrieves_english_security_deposit(
        self, english_lease_doc: ExtractedDocument
    ) -> None:
        chunks = chunk_document(english_lease_doc)
        retriever = BM25Retriever(chunks)

        results = retriever.retrieve("የዋስትና ተቀማጭ ገንዘብ ስንት ነው?")
        assert len(results) > 0
        top_chunk, score = results[0]
        assert top_chunk.page_number == 2
        assert "120,000 ETB" in top_chunk.text
        assert "Deposit" in top_chunk.text
        assert score > 0.0

    def test_amharic_query_retrieves_english_rent(
        self, english_lease_doc: ExtractedDocument
    ) -> None:
        chunks = chunk_document(english_lease_doc)
        retriever = BM25Retriever(chunks)

        results = retriever.retrieve("ወርሃዊ የኪራይ ክፍያ ስንት ነው?")
        assert len(results) > 0
        top_chunk, _ = results[0]
        assert top_chunk.page_number == 1
        assert "60,000 ETB" in top_chunk.text

    def test_amharic_query_retrieves_english_subletting_rule(
        self, english_lease_doc: ExtractedDocument
    ) -> None:
        chunks = chunk_document(english_lease_doc)
        retriever = BM25Retriever(chunks)

        results = retriever.retrieve("ቤቱን ለሌላ ሰው ማከራየት ይፈቀዳል?")
        assert len(results) > 0
        top_chunk, _ = results[0]
        assert top_chunk.page_number == 2
        assert "Subletting" in top_chunk.text

    def test_mixed_language_query_retrieval(
        self, amharic_lease_doc: ExtractedDocument, english_lease_doc: ExtractedDocument
    ) -> None:
        # Mixed query on Amharic lease
        am_retriever = BM25Retriever(chunk_document(amharic_lease_doc))
        am_res = am_retriever.retrieve("deposit ስንት ነው?")
        assert len(am_res) > 0
        assert am_res[0][0].page_number == 2

        # Mixed query on English lease
        en_retriever = BM25Retriever(chunk_document(english_lease_doc))
        en_res = en_retriever.retrieve("የኪራይ rent due date መቼ ነው?")
        assert len(en_res) > 0
        assert en_res[0][0].page_number == 1

    def test_irrelevant_cross_language_query_yields_no_irrelevant_matches(
        self, amharic_lease_doc: ExtractedDocument
    ) -> None:
        chunks = chunk_document(amharic_lease_doc)
        retriever = BM25Retriever(chunks)

        results = retriever.retrieve("quantum physics supersonic aircraft propulsion")
        assert len(results) == 0

    def test_amharic_character_normalization_retrieval(self) -> None:
        # Document uses 'ሐ', query uses 'ሀ'
        chunk = LeaseChunk(
            chunk_id="p1_c0",
            page_number=1,
            text="የኪራይ ውል ስምምነት የኃይል እና የመብራት ክፍያ።",
            char_start=0,
            char_end=35,
        )
        retriever = BM25Retriever([chunk])
        results = retriever.retrieve("የሀይል መብራት")
        assert len(results) == 1
        assert results[0][1] > 0.0


class TestCrossLanguageQAService:
    """Grounded QA service tests for cross-lingual synthesis and source preservation."""

    def test_english_question_on_amharic_lease_returns_english_answer_and_amharic_citation(
        self, amharic_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="What is the security deposit amount and when is it refunded?",
            document=amharic_lease_doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.SUPPORTED
        assert response.has_sufficient_evidence is True
        assert response.response_language == "en"
        assert "90,000" in response.answer
        assert len(response.citations) >= 1
        citation = response.citations[0]
        assert citation.page_number == 2
        # Critical citation requirement: source excerpt MUST be in original Amharic
        assert "የዋስትና" in citation.excerpt
        assert "90,000" in citation.excerpt
        assert not citation.excerpt.isascii(), "Citation excerpt must preserve original Amharic text"

    def test_amharic_question_on_english_lease_returns_amharic_answer_and_english_citation(
        self, english_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="የዋስትና ተቀማጭ ገንዘብ መጠኑ ስንት ነው?",
            document=english_lease_doc,
            locale="am",
        )

        assert response.status == EvidenceSupportStatus.SUPPORTED
        assert response.has_sufficient_evidence is True
        assert response.response_language == "am"
        assert "120,000" in response.answer
        assert len(response.citations) >= 1
        citation = response.citations[0]
        assert citation.page_number == 2
        # Critical citation requirement: source excerpt MUST be in original English
        assert "Security Deposit" in citation.excerpt or "120,000 ETB" in citation.excerpt
        assert citation.excerpt.isascii(), "Citation excerpt must preserve original English text"

    def test_english_question_on_amharic_lease_with_amharic_locale(
        self, amharic_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="What is the monthly rent?",
            document=amharic_lease_doc,
            locale="am",
        )

        assert response.status == EvidenceSupportStatus.SUPPORTED
        assert response.response_language == "am"
        assert "45,000" in response.answer
        assert len(response.citations) >= 1
        assert response.citations[0].page_number == 1
        assert "45,000" in response.citations[0].excerpt

    def test_unsupported_question_in_english_returns_safe_refusal_and_no_citations(
        self, amharic_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="Is there an Olympic swimming pool or tennis court on the premises?",
            document=amharic_lease_doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.UNSUPPORTED
        assert response.has_sufficient_evidence is False
        assert len(response.citations) == 0
        assert "does not contain information" in response.answer.lower()

    def test_unsupported_question_in_amharic_returns_amharic_refusal_and_no_citations(
        self, english_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="በግቢው ውስጥ የዋና ገንዳ ወይም የቴኒስ ሜዳ አለ?",
            document=english_lease_doc,
            locale="am",
        )

        assert response.status == EvidenceSupportStatus.UNSUPPORTED
        assert response.has_sufficient_evidence is False
        assert len(response.citations) == 0
        assert INSUFFICIENT_EVIDENCE_ANSWERS["am"] in response.answer

    def test_conflicting_clauses_detection_and_dual_citations(self) -> None:
        p1 = PDFPage(
            page_number=1,
            text="Clause 4: Pets are permitted with written consent of the landlord.",
            char_count=65,
            word_count=10,
        )
        p2 = PDFPage(
            page_number=2,
            text="Clause 12: Pets are strictly prohibited under all circumstances without exception.",
            char_count=82,
            word_count=11,
        )
        doc = ExtractedDocument(
            filename="conflicting_lease.pdf",
            page_count=2,
            pages=[p1, p2],
            full_text=f"{p1.text}\n\n{p2.text}",
            has_extractable_text=True,
        )

        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="Are pets allowed in the apartment?",
            document=doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.CONFLICTING
        assert response.has_sufficient_evidence is True
        assert len(response.citations) == 2
        pages = {c.page_number for c in response.citations}
        assert pages == {1, 2}
        assert "contradictory" in response.answer.lower() or "conflicting" in response.answer.lower()

    def test_fabricated_citation_rejected_by_grounding_verification(
        self, amharic_lease_doc: ExtractedDocument
    ) -> None:
        # Mock payload contains a fabricated clause that doesn't exist on page 1
        fake_payload = json.dumps({
            "answer": "Tenant is allowed to paint walls and alter electrical wiring.",
            "status": "supported",
            "citations": [
                {
                    "page_number": 1,
                    "excerpt": "ተከራይ የኤሌክትሪክ መስመሮችን እና ግድግዳዎችን እንደፈለገ መቀየር ይችላል።",
                }
            ],
            "confidence_notes": "Fabricated clause test.",
        })
        client = MockLLMClient(default_response=fake_payload)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="Can tenant alter electrical wiring?",
            document=amharic_lease_doc,
            locale="en",
        )

        # Citation must be rejected because excerpt does not exist on page 1
        assert len(response.citations) == 0
        assert response.status == EvidenceSupportStatus.PARTIALLY_SUPPORTED
        assert response.has_sufficient_evidence is False
        assert "could not be substantiated" in str(response.confidence_notes).lower()

    def test_utility_costs_question_does_not_return_50k_or_rent_amount(
        self, detailed_english_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="Which utility costs must the tenant pay directly?",
            document=detailed_english_lease_doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.SUPPORTED
        assert "50,000" not in response.answer
        assert "water" in response.answer.lower()
        assert "electricity" in response.answer.lower()
        assert len(response.citations) >= 1
        assert response.citations[0].page_number == 2
        assert "water" in response.citations[0].excerpt.lower()

    def test_whether_rent_includes_electricity_and_water(
        self, detailed_english_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="Does rent include electricity and water?",
            document=detailed_english_lease_doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.SUPPORTED
        assert "50,000" not in response.answer
        assert "tenant" in response.answer.lower()
        assert "generator" in response.answer.lower()
        assert len(response.citations) >= 1
        assert response.citations[0].page_number == 2

    def test_broken_water_pipe_repair_responsibility(
        self, detailed_english_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="Who must repair a broken water pipe?",
            document=detailed_english_lease_doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.SUPPORTED
        assert "landlord" in response.answer.lower()
        assert "plumbing" in response.answer.lower() or "structural" in response.answer.lower()
        assert "bank account" not in response.answer.lower()
        assert len(response.citations) >= 1
        assert response.citations[0].page_number == 2
        assert "broken pipes" in response.citations[0].excerpt.lower()

    def test_unsupported_landlord_bank_account_number_returns_unsupported_no_citations(
        self, detailed_english_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="What is the landlord's specific bank account number?",
            document=detailed_english_lease_doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.UNSUPPORTED
        assert response.has_sufficient_evidence is False
        assert len(response.citations) == 0
        assert "does not contain" in response.answer.lower()

    def test_unsupported_parking_capacity_returns_unsupported_no_citations(
        self, detailed_english_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="How many vehicles can park in the assigned parking space?",
            document=detailed_english_lease_doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.UNSUPPORTED
        assert response.has_sufficient_evidence is False
        assert len(response.citations) == 0
        assert "does not contain" in response.answer.lower()

    def test_immediate_eviction_question_returns_unsupported_with_disclaimer(
        self, detailed_english_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="Can the landlord immediately evict the tenant if rent is three days late?",
            document=detailed_english_lease_doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.UNSUPPORTED
        assert response.has_sufficient_evidence is False
        assert len(response.citations) == 0
        assert "statutory" in response.answer.lower() or "notice" in response.answer.lower() or "not contain" in response.answer.lower()

    def test_lease_duration_and_start_date_extracted_accurately(
        self, detailed_english_lease_doc: ExtractedDocument
    ) -> None:
        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="How long does the lease agreement last and when does it begin?",
            document=detailed_english_lease_doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.SUPPORTED
        assert "one" in response.answer.lower() or "1" in response.answer or "year" in response.answer.lower()
        assert "september 1, 2026" in response.answer.lower()
        assert len(response.citations) >= 1
        assert response.citations[0].page_number == 1

    def test_conflicting_rent_amounts_returns_conflicting_with_dual_citations(self) -> None:
        p1 = PDFPage(
            page_number=1,
            text="Clause 2 (Financial Terms): The monthly rent for the premises is 35,000 ETB payable on the 1st.",
            char_count=98,
            word_count=16,
        )
        p2 = PDFPage(
            page_number=2,
            text="Clause 8 (Rental Payment): The monthly rent shall be 40,000 ETB payable on the 5th of each calendar month.",
            char_count=107,
            word_count=18,
        )
        doc = ExtractedDocument(
            filename="conflicting_rent_lease.pdf",
            page_count=2,
            pages=[p1, p2],
            full_text=f"{p1.text}\n\n{p2.text}",
            has_extractable_text=True,
        )

        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        response = service.answer_question(
            question="How much is the monthly rent?",
            document=doc,
            locale="en",
        )

        assert response.status == EvidenceSupportStatus.CONFLICTING
        assert response.has_sufficient_evidence is True
        assert len(response.citations) >= 2
        pages = {c.page_number for c in response.citations}
        assert 1 in pages and 2 in pages
        assert "35,000" in response.answer and "40,000" in response.answer


class TestPDFExtractionAndPagePreservation:
    """PDF extraction with Ethiopic Unicode text and page number verification."""

    def test_multipage_pdf_creation_and_amharic_extraction(self) -> None:
        doc = fitz.open()
        nyala_path = "C:/Windows/Fonts/nyala.ttf"
        has_nyala = os.path.exists(nyala_path)

        p1 = doc.new_page()
        if has_nyala:
            p1.insert_font(fontname="nyala", fontfile=nyala_path)
            p1.insert_text(
                (50, 72),
                "የመኖሪያ ቤት ኪራይ ውል\nወርሃዊ ኪራይ፡ 55,000 የኢትዮጵያ ብር።",
                fontname="nyala",
            )
        else:
            p1.insert_text(
                (50, 72),
                "Residential Lease Agreement\nMonthly Rent: 55,000 ETB.",
            )

        p2 = doc.new_page()
        if has_nyala:
            p2.insert_font(fontname="nyala", fontfile=nyala_path)
            p2.insert_text(
                (50, 72),
                "የዋስትና ተቀማጭ፡ 110,000 የኢትዮጵያ ብር በቅድሚያ ይከፈላል።\nየቤት እንስሳት በጥብቅ የተከለከሉ ናቸው።",
                fontname="nyala",
            )
        else:
            p2.insert_text(
                (50, 72),
                "Security Deposit: 110,000 ETB payable in advance.\nPets are strictly prohibited.",
            )

        pdf_bytes = doc.tobytes()
        doc.close()

        client = MockLLMClient(handler=deterministic_lease_qa_handler)
        service = LeaseQAService(client=client)

        # Question on Page 2
        res = service.answer_from_pdf_bytes(
            question="What is the security deposit amount?",
            pdf_bytes=pdf_bytes,
            locale="en",
        )
        assert res.status == EvidenceSupportStatus.SUPPORTED
        assert "110,000" in res.answer
        assert len(res.citations) >= 1
        assert res.citations[0].page_number == 2
        assert "110,000" in res.citations[0].excerpt


class TestLeaseQAEndpoints:
    """FastAPI endpoint tests for multilingual lease QA."""

    @pytest.fixture
    def test_client(self) -> TestClient:
        return TestClient(app)

    def test_endpoint_cross_language_amharic_doc_english_query(
        self, test_client: TestClient, amharic_lease_doc: ExtractedDocument
    ) -> None:
        payload = {
            "question": "What is the security deposit amount?",
            "document_text": amharic_lease_doc.full_text,
            "locale": "en",
        }
        res = test_client.post("/api/v1/lease-qa", json=payload)
        assert res.status_code == 200
        assert res.headers["Content-Language"] == "en"
        data = res.json()
        assert data["status"] == "supported"
        assert data["response_language"] == "en"
        assert "90,000" in data["answer"]
        assert len(data["citations"]) >= 1
        assert "የዋስትና" in data["citations"][0]["excerpt"]

    def test_endpoint_cross_language_english_doc_amharic_query(
        self, test_client: TestClient, english_lease_doc: ExtractedDocument
    ) -> None:
        payload = {
            "question": "የዋስትና ተቀማጭ ገንዘብ ስንት ነው?",
            "document_text": english_lease_doc.full_text,
            "locale": "am",
        }
        res = test_client.post("/api/v1/lease-qa", json=payload)
        assert res.status_code == 200
        assert res.headers["Content-Language"] == "am"
        data = res.json()
        assert data["status"] == "supported"
        assert data["response_language"] == "am"
        assert "120,000" in data["answer"]
        assert len(data["citations"]) >= 1
        assert "Security Deposit" in data["citations"][0]["excerpt"]

    def test_endpoint_unsupported_question_localized_refusal(
        self, test_client: TestClient, amharic_lease_doc: ExtractedDocument
    ) -> None:
        payload = {
            "question": "How many interstellar spacecraft are parked in the hangar?",
            "document_text": amharic_lease_doc.full_text,
            "locale": "am",
        }
        res = test_client.post("/api/v1/lease-qa", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "unsupported"
        assert data["has_sufficient_evidence"] is False
        assert len(data["citations"]) == 0
        assert INSUFFICIENT_EVIDENCE_ANSWERS["am"] in data["answer"]
