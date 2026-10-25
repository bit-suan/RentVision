# RentVision AI Service (`services/ai`)

This service houses the Python-based AI, document processing, and contract intelligence capabilities for the RentVision platform.

---

## Core Capabilities

1. **Property Listing Extraction (`ListingExtractionService`)**:
   - Converts unstructured landlord descriptions into validated Pydantic schemas ([`ExtractedPropertyListing`](file:///c:/Users/hp/Desktop/rentVision/services/ai/src/rentvision_ai/schemas/property.py)).
   - Enforces strict factual restraint: unmentioned attributes remain `null` and are cataloged in `unextracted_or_missing_fields`.
   - Ethiopian localization: normalizes currency ("birr" / "ETB"), detects local neighborhood names, and standardizes property types.

2. **Lease Document Text Extraction (`PDFExtractionService`)**:
   - High-fidelity PDF text parsing via [PyMuPDF (`fitz`)](https://pymupdf.readthedocs.io/).
   - Preserves 1-indexed page provenance, word counts, character counts, and document metadata.

3. **Evidence-Grounded Lease Question Answering via RAG (`LeaseQAService`)**:
   - Answers questions strictly using facts present in the uploaded lease agreement.
   - Splits document pages into semantic chunks while maintaining 1-indexed page numbering.
   - Utilizes an in-memory **BM25Okapi retriever** ([`BM25Retriever`](file:///c:/Users/hp/Desktop/rentVision/services/ai/src/rentvision_ai/services/retriever.py)) to rank and extract relevant passages without the overhead or latency of an external vector database.
   - Synthesizes answers via Google Gemini (`models/gemini-3.5-flash`), citing page numbers and verbatim excerpts.
   - Enforces an **Insufficient Evidence Rule**: if the agreement does not mention a term (e.g. pet policy or specific late fee), it returns an explicit `unsupported` status rather than hallucinating.

---

## Architecture & Data Flow

```text
[PDF Upload / Document Bytes]
            │
            ▼
┌─────────────────────────┐
│  PDFExtractionService   │ ── Page-indexed text & metadata
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│     chunk_document()    │ ── Page-preserving text segments (LeaseChunk)
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│      BM25Retriever      │ ── Top-K relevant passages scored by term relevance
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│     LeaseQAService      │ ── Strict JSON synthesis via LLMClient (Gemini / Mock)
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│     Citation Grounding  │ ── Verifies excerpts match retrieved source text
└─────────────────────────┘
            │
            ▼
[LeaseQAResponse (Answer + Citations + Evidence Support Status)]
```

---

## Request & Response Schemas

### Request (`LeaseQARequest`)
```json
{
  "question": "What is the security deposit and what utilities are included in the rent?",
  "top_k": 3
}
```

### Response (`LeaseQAResponse`)
```json
{
  "question": "What is the security deposit and what utilities are included in the rent?",
  "answer": "The security deposit is 100,000 ETB (equivalent to 2 months rent), refundable within 30 days. Backup generator fuel and 24/7 building security are included in the rent.",
  "status": "supported",
  "citations": [
    {
      "page_number": 2,
      "excerpt": "Security Deposit: 100,000 ETB (equivalent to 2 months rent), refundable within 30 days.",
      "chunk_id": "p2_c0"
    },
    {
      "page_number": 2,
      "excerpt": "Utilities Included: Backup generator fuel and 24/7 building security.",
      "chunk_id": "p2_c0"
    }
  ],
  "retrieved_passages_count": 2,
  "has_sufficient_evidence": true,
  "confidence_notes": null
}
```

### Unsupported / Insufficient Evidence Response
```json
{
  "question": "Can the tenant keep a dog or pet in the apartment?",
  "answer": "The provided lease agreement does not contain information to answer this question.",
  "status": "unsupported",
  "citations": [],
  "retrieved_passages_count": 0,
  "has_sufficient_evidence": false,
  "confidence_notes": "No passages in the lease document match the keywords of this inquiry."
}
```

---

## Usage Example

```python
from rentvision_ai.services import LeaseQAService, PDFExtractionService

pdf_service = PDFExtractionService()
lease_doc = pdf_service.extract_from_path("contracts/lease_sample.pdf")

qa_service = LeaseQAService()
response = qa_service.answer_question(
    question="What is the monthly rent and when is it due?",
    document=lease_doc,
)

print(f"Status: {response.status.value}")
print(f"Answer: {response.answer}")
for citation in response.citations:
    print(f"- Page {citation.page_number}: \"{citation.excerpt}\"")
```

---

## HTTP REST API (`rentvision_ai.api`)

The AI service exposes a lightweight FastAPI application for local development and microservice invocation.

### 1. Start the HTTP API Server

```powershell
# Activate environment and start server
.\services\ai\.venv\Scripts\Activate.ps1
uvicorn rentvision_ai.api:app --host 127.0.0.1 --port 8000 --reload
```

Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs` and ReDoc at `http://127.0.0.1:8000/redoc`.

### 2. Local Mock Development Mode (Zero API Keys)

To run the API server offline with deterministic mock responses:
```powershell
$env:AI_USE_MOCK_CLIENT="true"
uvicorn rentvision_ai.api:app --host 127.0.0.1 --port 8000
```

---

## API Endpoints Specification

### 1. Health & Diagnostics
- **Method**: `GET /health` or `GET /api/v1/health`
- **Response**:
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "provider": "google-gemini",
  "mock_mode": false
}
```

### 2. Property Listing Extraction
- **Method**: `POST /api/v1/extract-listing`
- **Request Body** (`ExtractListingRequest`):
```json
{
  "description": "Spacious 3-bedroom, 2-bathroom apartment located in Bole, Addis Ababa. Rent is 55,000 ETB per month. Includes generator and water tank."
}
```
- **Response** (`ExtractedPropertyListing`):
```json
{
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
  "raw_description": "Spacious 3-bedroom, 2-bathroom apartment located in Bole, Addis Ababa. Rent is 55,000 ETB per month. Includes generator and water tank.",
  "unextracted_or_missing_fields": [],
  "confidence_notes": null
}
```
- **Error Codes**:
  - `400 Bad Request`: Empty or whitespace-only description (`InvalidInputError`).
  - `401 Unauthorized`: Missing or invalid Gemini API key.
  - `422 Unprocessable Entity`: Schema validation failure.
  - `502 Bad Gateway`: Model provider connection failure or malformed JSON output.
  - `504 Gateway Timeout`: Upstream LLM request timeout.

### 3. Evidence-Grounded Lease Q&A (RAG)
- **Method**: `POST /api/v1/lease-qa`
- **Request Body** (`LeaseQAPayload`):
```json
{
  "question": "What is the security deposit and when is it refunded?",
  "pdf_base64": "JVBERi0xLjQKJcOkw7zDtsOf...",
  "top_k": 3
}
```
*Note: Alternatively, `document_text` can be supplied instead of `pdf_base64` for pre-extracted contracts.*

- **Response** (`LeaseQAResponse`):
```json
{
  "question": "What is the security deposit and when is it refunded?",
  "answer": "The security deposit is 100,000 ETB (equivalent to 2 months rent), refundable within 30 days.",
  "status": "supported",
  "citations": [
    {
      "page_number": 2,
      "excerpt": "Security Deposit: 100,000 ETB (equivalent to 2 months rent), refundable within 30 days.",
      "chunk_id": "p2_c0"
    }
  ],
  "retrieved_passages_count": 2,
  "has_sufficient_evidence": true,
  "confidence_notes": null
}
```
- **Unsupported / Insufficient Evidence Response**:
```json
{
  "question": "Are dogs and cats allowed?",
  "answer": "The provided lease agreement does not contain information to answer this question.",
  "status": "unsupported",
  "citations": [],
  "retrieved_passages_count": 0,
  "has_sufficient_evidence": false,
  "confidence_notes": "No passages in the lease document match the keywords of this inquiry."
}
```
- **Error Codes**:
  - `400 Bad Request`: Missing both `pdf_base64` and `document_text`, corrupted base64, or non-PDF binary data (missing `%PDF-` header).
  - `422 Unprocessable Entity`: Empty question or invalid `top_k` parameter.
  - `502 Bad Gateway`: Model or parsing failure.

---

## Shared TypeScript Contracts

The contracts defining data interchange between the Python AI service, Node.js backend (`services/api`), and Next.js frontend (`apps/web`) are located in `shared/contracts`:

- [`shared/contracts/properties.ts`](file:///c:/Users/hp/Desktop/rentVision/shared/contracts/properties.ts):
  - `PropertyType`
  - `ExtractListingRequestDto`
  - `ExtractedPropertyListingDto`
- [`shared/contracts/leases.ts`](file:///c:/Users/hp/Desktop/rentVision/shared/contracts/leases.ts):
  - `EvidenceSupportStatus` ('supported' | 'partially_supported' | 'unsupported')
  - `SourceCitationDto` (`page_number`, `excerpt`, `chunk_id`)
  - `LeaseChunkDto`
  - `LeaseQARequestDto`
  - `LeaseQAResponseDto`
- [`shared/contracts/index.ts`](file:///c:/Users/hp/Desktop/rentVision/shared/contracts/index.ts):
  - Barrel export of all shared contracts.

These contracts match the Pydantic schemas 1:1 with zero invented fields.

---

## Team Integration Guide

### How Member 2 (Backend / AWS Lambda) Should Call the AI Service

The Node.js backend (`services/api`) acts as the secure intermediary between users and the AI service:

1. **Service Client (`services/api/src/services/ai-client.ts`)**:
   - The backend reads `AI_SERVICE_HOST` (e.g., `http://127.0.0.1:8000`) and issues HTTP POST requests.
   - For listing extraction:
     ```typescript
     import { ExtractListingRequestDto, ExtractedPropertyListingDto } from '@shared/contracts';

     export async function extractListing(description: string): Promise<ExtractedPropertyListingDto> {
       const res = await fetch(`${process.env.AI_SERVICE_HOST}/api/v1/extract-listing`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ description } satisfies ExtractListingRequestDto),
       });
       if (!res.ok) throw new Error(`AI extraction failed: ${res.statusText}`);
       return res.json();
     }
     ```
   - For lease question answering:
     ```typescript
     import { LeaseQARequestDto, LeaseQAResponseDto } from '@shared/contracts';

     export async function answerLeaseQuestion(
       pdfBuffer: Buffer,
       question: string,
     ): Promise<LeaseQAResponseDto> {
       const payload: LeaseQARequestDto = {
         question,
         pdf_base64: pdfBuffer.toString('base64'),
         top_k: 3,
       };
       const res = await fetch(`${process.env.AI_SERVICE_HOST}/api/v1/lease-qa`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload),
       });
       if (!res.ok) throw new Error(`AI Lease QA failed: ${res.statusText}`);
       return res.json();
     }
     ```
2. **Security & Authorization**:
   - Backend handlers (`POST /api/v1/leases/:id/qa`) must authenticate the user with Cognito JWT and verify that the user is authorized to read lease `:id` before retrieving the PDF from the private S3 bucket `lease-documents`.
   - Never expose the Python service publicly without a gateway or reverse proxy. In production, the Python service runs within a private VPC or container task accessible only by the backend Lambda/API.

### How Member 1 (Frontend / Next.js) Should Call the Capabilities

1. **Import Shared DTOs**:
   - `apps/web` imports types from `@shared/contracts` to ensure type safety.
2. **Do Not Call Python Directly**:
   - Frontend components make authenticated requests to Member 2's backend endpoints (e.g. `POST /api/v1/properties/extract` and `POST /api/v1/leases/:id/qa`).
   - Never place Gemini API keys, LLM credentials, or internal AI URLs in frontend code or client-side bundles.
3. **Display Grounded Evidence**:
   - Use `response.status` to render status badges:
     - `'supported'`: Green badge, display `response.answer` and render each item in `response.citations` with its page number and excerpt.
     - `'partially_supported'`: Amber badge, display partial answer with citations.
     - `'unsupported'`: Gray badge, display polite notice that the lease does not address the question.

---

## Local Development & Testing

### 1. Run All Automated Unit & API Tests (Offline / Mock)
All 54 tests run offline in under 2 seconds using `MockLLMClient` with zero external network or API key requirements:
```powershell
.\services\ai\.venv\Scripts\pytest.exe services/ai
```

### 2. Run Reproducible Evaluation Benchmark
Evaluate answer grounding, citation correctness, and latency across synthetic multi-page leases:

```powershell
# Run deterministic offline mock benchmark
.\services\ai\.venv\Scripts\python.exe services/ai/scripts/eval_lease_qa.py

# Run live benchmark against Google Gemini (requires GEMINI_API_KEY in .env)
.\services\ai\.venv\Scripts\python.exe services/ai/scripts/eval_lease_qa.py --live
```

### 3. Run Interactive AI Demo
Verifies property listing extraction, PDF extraction, and live grounded lease Q&A:
```powershell
.\services\ai\.venv\Scripts\python.exe services/ai/demo.py
```

---

## Known Limitations & Boundary Conditions

1. **Scanned / Pure Image PDFs**: `PDFExtractionService` parses text-based PDFs natively. Pure image scans without embedded OCR text are flagged as `has_extractable_text: False` and return an explicit `unsupported` response. (OCR pipeline planned for future enhancement).
2. **Document Scope**: `LeaseQAService` operates per document (individual tenancy contract). Multi-document comparative reasoning across multiple distinct leases is not currently supported.
3. **Lexical Retrieval Scope**: BM25 retrieval excels at exact legal keywords (e.g., "deposit", "subleasing", "utilities", "grace period"). Highly abstract or non-lexical conceptual queries may require rephrasing or future dense embedding hybrid search.

