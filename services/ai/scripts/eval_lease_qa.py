"""Evaluation script for LeaseQAService measuring grounding, citations, and latency."""

import argparse
import json
import os
from pathlib import Path
import re
import sys
import time

from rentvision_ai.clients import MockLLMClient, OpenAIClient
from rentvision_ai.schemas.document import ExtractedDocument, PDFPage
from rentvision_ai.schemas.lease_qa import EvidenceSupportStatus, LeaseQAResponse
from rentvision_ai.services.lease_qa import LeaseQAService


def _auto_load_env() -> None:
    search_dirs = [
        Path.cwd(),
        Path(__file__).resolve().parent.parent,
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


def get_mock_evaluation_client() -> MockLLMClient:
    """Mock LLM client with deterministic responses for offline benchmarking."""
    def handler(prompt: str, system_prompt: str | None) -> str:
        # Extract user question from prompt
        question_text = ""
        q_match = re.search(r"<user_question>\s*([\s\S]*?)\s*</user_question>", prompt, re.IGNORECASE)
        if q_match:
            question_text = q_match.group(1).strip().lower()
        else:
            lines = prompt.splitlines()
            for idx, line in enumerate(lines):
                if "USER QUESTION:" in line and idx + 1 < len(lines):
                    question_text = lines[idx + 1].strip().lower()
                    break

        if not question_text:
            question_text = prompt.lower()

        if re.search(r"\b(penalty|late)\b", question_text):
            return json.dumps({
                "answer": "The provided lease agreement does not contain information to answer this question.",
                "status": "unsupported",
                "citations": [],
                "confidence_notes": "Late fee amounts are not specified in the agreement."
            })
        if re.search(r"\b(pet|pets|dog|dogs|cat|cats)\b", question_text):
            return json.dumps({
                "answer": "The provided lease agreement does not contain information to answer this question.",
                "status": "unsupported",
                "citations": [],
                "confidence_notes": "No pet policy mentioned in document."
            })
        if re.search(r"\b(sublease|subleasing)\b", question_text):
            return json.dumps({
                "answer": "Subleasing is strictly prohibited without the express prior written consent of the Landlord.",
                "status": "supported",
                "citations": [
                    {
                        "page_number": 3,
                        "excerpt": "Subleasing is strictly prohibited without the express prior written consent of the Landlord."
                    }
                ]
            })
        if re.search(r"\b(generator|utilities|utility|internet)\b", question_text):
            return json.dumps({
                "answer": "Rent includes shared backup generator fuel charges, municipal water, and 24/7 security. The tenant is solely responsible for private internet subscription.",
                "status": "supported",
                "citations": [
                    {
                        "page_number": 2,
                        "excerpt": "Rent includes: Monthly municipal water service, 24/7 security guard, and shared backup generator fuel charges."
                    }
                ]
            })
        if re.search(r"\b(deposit)\b", question_text):
            return json.dumps({
                "answer": "The security deposit is 96,000 ETB (equivalent to two months' rent), refundable within thirty (30) days of vacating subject to inspection.",
                "status": "supported",
                "citations": [
                    {
                        "page_number": 2,
                        "excerpt": "Tenant shall pay a security deposit of 96,000 ETB (equivalent to two months' rent)."
                    }
                ]
            })
        if re.search(r"\b(rent)\b", question_text):
            return json.dumps({
                "answer": "The monthly rent is 48,000 ETB, payable in advance on or before the first (1st) day of each calendar month.",
                "status": "supported",
                "citations": [
                    {
                        "page_number": 1,
                        "excerpt": "The monthly rent shall be 48,000 ETB (Ethiopian Birr), payable in advance on or before the first (1st) day of each calendar month"
                    }
                ]
            })

        return json.dumps({
            "answer": "The provided lease agreement does not contain information to answer this question.",
            "status": "unsupported",
            "citations": []
        })

    return MockLLMClient(
        model_name="mock-deterministic-grounded-v1",
        handler=handler,
    )


def evaluate_dataset(dataset_path: Path, use_live_client: bool = False) -> None:
    data = json.loads(dataset_path.read_text(encoding="utf-8"))
    doc_data = data["document"]
    queries = data["queries"]

    # Create ExtractedDocument
    pages = [
        PDFPage(
            page_number=p["page_number"],
            text=p["text"],
            char_count=len(p["text"]),
            word_count=len(p["text"].split()),
        )
        for p in doc_data["pages"]
    ]
    extracted_doc = ExtractedDocument(
        filename=doc_data["filename"],
        page_count=len(pages),
        pages=pages,
        full_text="\n\n".join(p.text for p in pages),
        has_extractable_text=True,
    )

    # Select client
    has_live_key = bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("OPENAI_API_KEY"))
    if use_live_client and has_live_key:
        client = OpenAIClient()
        mode_label = f"LIVE ({client.provider_name} - {client.model_name})"
    else:
        client = get_mock_evaluation_client()
        mode_label = f"MOCK / DETERMINISTIC ({client.model_name})"

    print("=" * 75)
    print("RENTVISION LEASE RAG EVALUATION BENCHMARK")
    print("=" * 75)
    print(f"Evaluation Mode: {mode_label}")
    print(f"Document: {extracted_doc.filename} ({extracted_doc.page_count} pages, {len(extracted_doc.full_text)} chars)")
    print(f"Total Test Questions: {len(queries)}\n")

    service = LeaseQAService(client=client)

    results: list[dict] = []
    latencies: list[float] = []

    correct_status_count = 0
    grounded_facts_hits = 0
    total_grounded_facts = 0
    correct_page_citations = 0
    total_expected_citations = 0
    hallucinated_citations = 0

    print("| ID | Status Match | Cited Pages (Pred / Exp) | Latency | Grounding Verification |")
    print("|---|---|---|---|---|")

    for q in queries:
        q_id = q["id"]
        question = q["question"]
        expected_status = q["expected_status"]
        expected_pages = set(q["expected_page_citations"])
        key_facts = q["key_grounded_facts"]
        total_grounded_facts += len(key_facts)
        total_expected_citations += len(expected_pages)

        start_time = time.perf_counter()
        response: LeaseQAResponse = service.answer_question(question, extracted_doc)
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        latencies.append(elapsed_ms)

        pred_status_str = response.status.value
        status_match = (pred_status_str == expected_status)
        if status_match:
            correct_status_count += 1

        # Check key grounded facts
        answer_lower = response.answer.lower()
        facts_present = sum(1 for f in key_facts if f.lower() in answer_lower)
        grounded_facts_hits += facts_present

        # Check citations
        pred_pages = {c.page_number for c in response.citations}
        page_match = (pred_pages == expected_pages)
        if page_match:
            correct_page_citations += 1

        # Verbatim excerpt grounding check against original page text
        for cit in response.citations:
            page_obj = next((p for p in pages if p.page_number == cit.page_number), None)
            if not page_obj:
                hallucinated_citations += 1
            else:
                clean_exc = " ".join(cit.excerpt.lower().split())
                clean_pg = " ".join(page_obj.text.lower().split())
                if clean_exc not in clean_pg:
                    # check for major sentence match
                    parts = [p.strip() for p in clean_exc.split(".") if len(p.strip()) > 10]
                    if not any(p in clean_pg for p in parts):
                        hallucinated_citations += 1

        status_icon = "PASS" if status_match else "FAIL"
        page_str = f"{sorted(list(pred_pages))} vs {sorted(list(expected_pages))}"
        facts_str = f"{facts_present}/{len(key_facts)} facts"

        print(f"| {q_id:<22} | {status_icon:<4} ({pred_status_str:<11}) | {page_str:<18} | {elapsed_ms:>6.1f} ms | {facts_str} |")

        results.append({
            "id": q_id,
            "question": question,
            "status_match": status_match,
            "pred_status": pred_status_str,
            "expected_status": expected_status,
            "pred_pages": list(pred_pages),
            "expected_pages": list(expected_pages),
            "answer": response.answer,
            "citations": [c.model_dump() for c in response.citations],
            "latency_ms": elapsed_ms,
        })

    n = len(queries)
    status_acc = (correct_status_count / n) * 100.0
    facts_cov = (grounded_facts_hits / total_grounded_facts) * 100.0 if total_grounded_facts > 0 else 100.0
    citation_acc = (correct_page_citations / n) * 100.0
    avg_latency = sum(latencies) / n if n > 0 else 0.0

    print("\n" + "=" * 75)
    print("EVALUATION SUMMARY REPORT")
    print("=" * 75)
    print(f"Status Accuracy (Supported vs Unsupported): {status_acc:.1f}% ({correct_status_count}/{n})")
    print(f"Grounded Facts Coverage:                    {facts_cov:.1f}% ({grounded_facts_hits}/{total_grounded_facts})")
    print(f"Citation Page Accuracy:                     {citation_acc:.1f}% ({correct_page_citations}/{n})")
    print(f"Hallucinated Citations Detected:            {hallucinated_citations}")
    print(f"Mean Latency per Query:                     {avg_latency:.1f} ms (Min: {min(latencies):.1f} ms, Max: {max(latencies):.1f} ms)")
    print("=" * 75)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate RentVision Lease Q&A RAG Service")
    default_dataset = Path(__file__).resolve().parent.parent / "data" / "lease_eval" / "evaluation_dataset.json"
    parser.add_argument(
        "--dataset",
        type=str,
        default=str(default_dataset),
        help="Path to evaluation dataset JSON",
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Execute against live Gemini API (requires GEMINI_API_KEY)",
    )
    args = parser.parse_args()

    data_path = Path(args.dataset)
    if not data_path.is_file():
        candidates = [
            default_dataset,
            Path(__file__).resolve().parent.parent / args.dataset,
            Path(__file__).resolve().parent.parent.parent.parent / args.dataset,
        ]
        for c in candidates:
            if c.is_file():
                data_path = c
                break
        else:
            print(f"Dataset file not found: {args.dataset}")
            sys.exit(1)

    evaluate_dataset(data_path, use_live_client=args.live)


if __name__ == "__main__":
    main()
