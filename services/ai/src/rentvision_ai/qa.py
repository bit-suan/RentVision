from __future__ import annotations

import re

from rentvision_ai.extraction import get_lease
from rentvision_ai.models import LeaseQAAnswer


def answer_question(lease_id: str, question: str) -> LeaseQAAnswer:
    lease = get_lease(lease_id)
    sentences = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.\n])", lease.text)
        if sentence.strip()
    ]
    tokens = {token for token in re.findall(r"[a-zA-Z0-9]+", question.lower()) if len(token) > 2}

    ranked: list[tuple[int, str]] = []
    for sentence in sentences:
        haystack = sentence.lower()
        score = sum(1 for token in tokens if token in haystack)
        if score:
            ranked.append((score, sentence))

    ranked.sort(key=lambda item: item[0], reverse=True)
    if ranked:
        answer = ranked[0][1]
        confidence = min(0.95, 0.45 + 0.15 * ranked[0][0])
        return LeaseQAAnswer(
            lease_id=lease_id,
            question=question,
            answer=answer,
            confidence=confidence,
            source_page=1,
        )

    return LeaseQAAnswer(
        lease_id=lease_id,
        question=question,
        answer="The lease text does not contain a matching clause for that question.",
        confidence=0.2,
        source_page=1,
    )
