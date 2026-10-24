"""Document chunking and BM25 retriever for lease contracts."""

import math
import re
from typing import Sequence
from rentvision_ai.schemas.document import ExtractedDocument
from rentvision_ai.schemas.lease_qa import LeaseChunk

# Common stop words
STOP_WORDS: set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
    "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
    "below", "between", "both", "but", "by", "can", "cannot", "could", "couldn't",
    "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
    "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
    "have", "haven't", "having", "he", "her", "here", "hers", "herself", "him",
    "himself", "his", "how", "i", "if", "in", "into", "is", "isn't", "it", "it's",
    "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no",
    "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
    "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "should",
    "shouldn't", "so", "some", "such", "than", "that", "the", "their", "theirs",
    "them", "themselves", "then", "there", "these", "they", "this", "those",
    "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we",
    "were", "weren't", "what", "when", "where", "which", "while", "who", "whom",
    "why", "with", "won't", "would", "wouldn't", "you", "your", "yours", "yourself",
}


def stem_token(word: str) -> str:
    """Lightweight rule-based suffix normalization for English tokens."""
    w = word.lower()
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
    """Tokenize text into lowercase stemmed tokens excluding common stop words."""
    raw_tokens = re.findall(r"\b[a-zA-Z0-9_\$€]+\b", text.lower())
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
    """Split document pages into chunks while preserving page numbers.
    
    Args:
        document: The ExtractedDocument containing pages with page numbers.
        target_chunk_chars: Approximate target character length for each chunk.
        chunk_overlap_chars: Overlap character length between sequential chunks on same page.
        
    Returns:
        List of LeaseChunk objects maintaining exact page number provenance.
    """
    chunks: list[LeaseChunk] = []

    for page in document.pages:
        page_text = page.text.strip()
        if not page_text:
            continue

        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", page_text) if p.strip()]
        if not paragraphs:
            paragraphs = [page_text]

        chunk_idx = 0
        current_text = ""
        current_start = 0

        for para in paragraphs:
            # Split when target length is reached
            if current_text and (len(current_text) + len(para) + 2 > target_chunk_chars) and len(current_text) >= 120:
                c_id = f"p{page.page_number}_c{chunk_idx}"
                pos = page_text.find(current_text, current_start)
                start_offset = pos if pos >= 0 else current_start
                end_offset = start_offset + len(current_text)

                chunks.append(
                    LeaseChunk(
                        chunk_id=c_id,
                        page_number=page.page_number,
                        text=current_text,
                        char_start=max(0, start_offset),
                        char_end=max(0, end_offset),
                    )
                )
                chunk_idx += 1
                current_start = max(0, end_offset - chunk_overlap_chars)
                current_text = ""

            if len(para) > target_chunk_chars:
                # Handle oversized paragraphs with a sliding window
                start = 0
                while start < len(para):
                    end = min(start + target_chunk_chars, len(para))
                    slice_text = para[start:end].strip()
                    if slice_text:
                        c_id = f"p{page.page_number}_c{chunk_idx}"
                        pos = page_text.find(slice_text, current_start)
                        start_offset = pos if pos >= 0 else current_start
                        end_offset = start_offset + len(slice_text)

                        chunks.append(
                            LeaseChunk(
                                chunk_id=c_id,
                                page_number=page.page_number,
                                text=slice_text,
                                char_start=max(0, start_offset),
                                char_end=max(0, end_offset),
                            )
                        )
                        chunk_idx += 1
                        current_start = max(0, end_offset - chunk_overlap_chars)
                    start += max(1, target_chunk_chars - chunk_overlap_chars)
                current_text = ""
            else:
                if current_text:
                    current_text += "\n\n" + para
                else:
                    current_text = para

        if current_text:
            c_id = f"p{page.page_number}_c{chunk_idx}"
            pos = page_text.find(current_text, current_start)
            start_offset = pos if pos >= 0 else current_start
            end_offset = start_offset + len(current_text)
            chunks.append(
                LeaseChunk(
                    chunk_id=c_id,
                    page_number=page.page_number,
                    text=current_text,
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
