"""Factory functions for LLM client resolution."""

import os
from typing import Callable
from rentvision_ai.clients.base import LLMClient
from rentvision_ai.clients.mock_client import MockLLMClient
from rentvision_ai.clients.openai_client import OpenAIClient


def _default_dispatcher(prompt: str, system_prompt: str | None = None) -> str:
    """Route prompts to appropriate deterministic handler based on schema/tags."""
    if "<lease_passages>" in prompt or (system_prompt and "lease" in system_prompt.lower()):
        from rentvision_ai.services.lease_qa import deterministic_lease_qa_handler
        return deterministic_lease_qa_handler(prompt, system_prompt)
    from rentvision_ai.services.listing_extraction import deterministic_llm_handler
    return deterministic_llm_handler(prompt, system_prompt)


def get_default_llm_client(
    allow_mock_fallback: bool = False,
    mock_response: str = "{}",
    handler: Callable[[str, str | None], str] | None = None,
) -> LLMClient:
    """Return the configured LLM client based on environment."""
    resolved_handler = handler or (_default_dispatcher if mock_response == "{}" else None)

    if os.environ.get("AI_USE_MOCK_CLIENT", "").lower() in ("true", "1"):
        return MockLLMClient(
            default_response=mock_response,
            handler=resolved_handler,
        )

    api_key = (
        os.environ.get("OPENAI_API_KEY")
        or os.environ.get("AI_MODEL_API_KEY")
        or os.environ.get("GEMINI_API_KEY")
    )
    if api_key and api_key.strip():
        return OpenAIClient(api_key=api_key)

    if allow_mock_fallback:
        return MockLLMClient(
            default_response=mock_response,
            handler=resolved_handler,
        )

    # Default to OpenAI client (raises auth error if key is missing)
    return OpenAIClient()

