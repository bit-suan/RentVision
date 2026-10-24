"""Document chunking and BM25 retriever for lease contracts."""

import math
import re
from typing import Sequence
from rentvision_ai.schemas.document import ExtractedDocument
from rentvision_ai.schemas.lease_qa import LeaseChunk

# Common stop words, preserving negation terms critical for legal contracts (no, nor, not)
STOP_WORDS: set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "could",
    "did", "do", "does", "doing", "down", "during",
    "each", "few", "for", "from", "further", "had", "has",
    "have", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "my", "myself",
    "of", "off", "on", "once", "only", "or", "other", "ought", "our",
    "ours", "ourselves", "out", "over", "own", "same", "she", "should",
    "so", "some", "such", "than", "that", "the", "their", "theirs",
    "them", "themselves", "then", "there", "these", "they", "this", "those",
    "through", "to", "too", "under", "until", "up", "very", "was", "we",
    "were", "what", "when", "where", "which", "while", "who", "whom",
    "why", "with", "would", "you", "your", "yours", "yourself",
}

# Domain stem normalization for high-frequency lease terms
DOMAIN_STEMS: dict[str, str] = {
    "paid": "pay",
    "payment": "pay",
    "payments": "pay",
    "paying": "pay",
    "rental": "rent",
    "renting": "rent",
    "rented": "rent",
    "rents": "rent",
    "sublease": "sublet",
    "subleasing": "sublet",
    "subletting": "sublet",
    "sublets": "sublet",
    "utility": "util",
    "utilities": "util",
    "termination": "termin",
    "terminate": "termin",
    "terminating": "termin",
    "terminated": "termin",
    "prohibited": "prohibit",
    "prohibition": "prohibit",
    "permitted": "permit",
    "permission": "permit",
    "permits": "permit",
    "refundable": "refund",
    "refunded": "refund",
    "refunding": "refund",
    "refunds": "refund",
    "deposit": "deposit",
    "deposited": "deposit",
    "deposits": "deposit",
    "clause": "claus",
    "clauses": "claus",
    "monthly": "month",
    "annual": "year",
    "annually": "year",
    "yearly": "year",
}


def stem_token(word: str) -> str:
    """Normalize English tokens using domain stems and morphological rules."""
    w = word.lower()
    if w in DOMAIN_STEMS:
        return DOMAIN_STEMS[w]
    if len(w) <= 3:
        return w
    if w.endswith("ies") and len(w) > 4:
        return w[:-3] + "y"
    if w.endswith("es") and len(w) > 4:
        return w[:-2]
    if w.endswith("s") and not w.endswith("ss") and len(w) > 3:
        return w[:-1]
    if w.endswith("ing") and len(w) > 5:
        return w[:-3]
    if w.endswith("ed") and len(w) > 4:
        return w[:-2]
    if w.endswith("ment") and len(w) > 6:
        return w[:-4]
    if w.endswith("tion") and len(w) > 6:
        return w[:-4]
    return w


def tokenize(text: str) -> list[str]:
    """Tokenize text into lowercase stemmed tokens, normalizing numbers and supporting Ethiopic."""
    # Normalize comma-formatted numbers so '48,000' matches '48000'
    normalized_text = re.sub(r"(?<=\d),(?=\d)", "", text)
    # Match alphanumeric words, currency symbols, and Ethiopic Unicode characters (\u1200-\u137F)
    raw_tokens = re.findall(r"[a-zA-Z0-9_\$€\u1200-\u137F]+", normalized_text.lower())
    tokens: list[str] = []
    for t in raw_tokens:
        if t not in STOP_WORDS and len(t) > 1:
            tokens.append(stem_token(t))
    return tokens


def chunk_document(
    document: ExtractedDocument,
    target_chunk_chars: int = 600,
    chunk_overlap_chars: int = 80,
) -> list[LeaseChunk]:
    """Split document pages into chunks with sentence-boundary snapping and actual text overlap."""
    chunks: list[LeaseChunk] = []

    for page in document.pages:
        page_text = page.text.strip()
        if not page_text:
            continue

        raw_blocks = [p.strip() for p in re.split(r"\n\s*\n", page_text) if p.strip()]
        if not raw_blocks:
            raw_blocks = [page_text]

        # Break blocks larger than target length on sentence boundaries (. ! ? ; or newline)
        units: list[str] = []
        for block in raw_blocks:
            if len(block) > target_chunk_chars:
                sents = [s.strip() for s in re.split(r"(?<=[.!?;\n])\s+", block) if s.strip()]
                units.extend(sents if sents else [block])
            else:
                units.append(block)

        chunk_idx = 0
        current_units: list[str] = []
        current_len = 0
        last_search_pos = 0

        for unit in units:
            unit_len = len(unit)
            if current_units and (current_len + unit_len + 2 > target_chunk_chars) and current_len >= 120:
                chunk_text = "\n\n".join(current_units)
                pos = page_text.find(chunk_text, last_search_pos)
                if pos < 0:
                    pos = page_text.find(current_units[0], last_search_pos)
                start_offset = pos if pos >= 0 else last_search_pos
                end_offset = start_offset + len(chunk_text)

                if not chunks or chunks[-1].text != chunk_text:
                    chunks.append(
                        LeaseChunk(
                            chunk_id=f"p{page.page_number}_c{chunk_idx}",
                            page_number=page.page_number,
                            text=chunk_text,
                            char_start=max(0, start_offset),
                            char_end=max(0, end_offset),
                        )
                    )
                    chunk_idx += 1
                last_search_pos = max(0, start_offset)

                # Seed next chunk with trailing units to provide genuine text overlap
                overlap_units: list[str] = []
                overlap_len = 0
                for u in reversed(current_units):
                    if overlap_len + len(u) <= chunk_overlap_chars or not overlap_units:
                        overlap_units.insert(0, u)
                        overlap_len += len(u) + 2
                    else:
                        break

                current_units = list(overlap_units)
                current_len = sum(len(u) for u in current_units) + max(0, len(current_units) - 1) * 2

            current_units.append(unit)
            current_len += unit_len + 2

        if current_units:
            chunk_text = "\n\n".join(current_units)
            pos = page_text.find(chunk_text, last_search_pos)
            if pos < 0:
                pos = page_text.find(current_units[0], last_search_pos)
            start_offset = pos if pos >= 0 else last_search_pos
            end_offset = start_offset + len(chunk_text)

            if not chunks or chunks[-1].text != chunk_text:
                chunks.append(
                    LeaseChunk(
                        chunk_id=f"p{page.page_number}_c{chunk_idx}",
                        page_number=page.page_number,
                        text=chunk_text,
                        char_start=max(0, start_offset),
                        char_end=max(0, end_offset),
                    )
                )

    return chunks


class BM25Retriever:
    """BM25 retrieval engine for text chunks with cross-page and multi-aspect coverage."""

    def __init__(
        self,
        chunks: Sequence[LeaseChunk],
        k1: float = 1.5,
        b: float = 0.75,
    ):
        self.chunks: list[LeaseChunk] = list(chunks)
        self.k1 = k1
        self.b = b
        self.doc_count = len(self.chunks)

        # Precompute token frequencies and lengths
        self.doc_tokens: list[list[str]] = [tokenize(c.text) for c in self.chunks]
        self.doc_lens: list[int] = [len(tokens) for tokens in self.doc_tokens]
        self.avg_doc_len: float = (
            sum(self.doc_lens) / self.doc_count if self.doc_count > 0 else 0.0
        )

        # Document frequencies
        self.doc_freqs: dict[str, int] = {}
        for tokens in self.doc_tokens:
            unique_terms = set(tokens)
            for term in unique_terms:
                self.doc_freqs[term] = self.doc_freqs.get(term, 0) + 1

        # Inverse document frequencies
        self.idf: dict[str, float] = {}
        for term, freq in self.doc_freqs.items():
            self.idf[term] = math.log(
                (self.doc_count - freq + 0.5) / (freq + 0.5) + 1.0
            )

    def retrieve(
        self,
        query: str,
        top_k: int = 4,
        min_score: float = 0.05,
    ) -> list[tuple[LeaseChunk, float]]:
        """Rank chunks by relevance to query using BM25 with multi-aspect and cross-page diversity."""
        if not self.chunks or self.doc_count == 0:
            return []

        query_tokens = tokenize(query)
        if not query_tokens:
            return []

        scores: list[float] = [0.0] * self.doc_count
        chunk_matched_terms: list[set[str]] = [set() for _ in range(self.doc_count)]

        for q_term in set(query_tokens):
            idf = self.idf.get(q_term)
            if idf is None or idf <= 0.0:
                continue

            for idx, tokens in enumerate(self.doc_tokens):
                tf = tokens.count(q_term)
                if tf == 0:
                    continue

                chunk_matched_terms[idx].add(q_term)
                doc_len = self.doc_lens[idx]
                denom = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / self.avg_doc_len))
                term_score = idf * (tf * (self.k1 + 1.0)) / denom
                scores[idx] += term_score

        # Boost exact phrase matches
        clean_query = query.strip().lower()
        if len(query_tokens) > 1 and clean_query:
            for idx, chunk in enumerate(self.chunks):
                if clean_query in chunk.text.lower():
                    scores[idx] += 2.5

        # Filter by minimum score threshold
        scored_candidates = [
            (i, self.chunks[i], scores[i], chunk_matched_terms[i])
            for i in range(self.doc_count)
            if scores[i] >= min_score
        ]

        if not scored_candidates:
            return []

        # Sort candidates descending by score
        scored_candidates.sort(key=lambda x: x[2], reverse=True)

        # Select diverse top_k: balance top score, distinct query term coverage, and distinct pages
        selected: list[tuple[LeaseChunk, float]] = []
        covered_terms: set[str] = set()
        covered_pages: dict[int, int] = {}
        remaining = list(scored_candidates)

        while remaining and len(selected) < top_k:
            best_idx = -1
            best_selection_score = -1e9

            for idx, (_, chunk, base_score, matched_terms) in enumerate(remaining):
                # Calculate marginal value: base score + novelty bonus
                new_terms_count = len(matched_terms - covered_terms)
                page_usage = covered_pages.get(chunk.page_number, 0)

                # Prioritize unseen query terms and cross-page diversity (prevent single page monopolizing)
                novelty_bonus = new_terms_count * 2.0
                page_penalty = 1.0 if page_usage >= 2 else 0.0

                selection_score = base_score + novelty_bonus - page_penalty
                if selection_score > best_selection_score:
                    best_selection_score = selection_score
                    best_idx = idx

            if best_idx >= 0:
                _, chosen_chunk, chosen_score, chosen_terms = remaining.pop(best_idx)
                selected.append((chosen_chunk, chosen_score))
                covered_terms.update(chosen_terms)
                covered_pages[chosen_chunk.page_number] = covered_pages.get(chosen_chunk.page_number, 0) + 1
            else:
                break

        return selected
