"""Factory functions for LLM client resolution."""

import os
from rentvision_ai.clients.base import LLMClient
from rentvision_ai.clients.mock_client import MockLLMClient
from rentvision_ai.clients.openai_client import OpenAIClient


def get_default_llm_client(
    allow_mock_fallback: bool = False,
    mock_response: str = "{}",
) -> LLMClient:
    """Return the configured LLM client based on environment."""
    if os.environ.get("AI_USE_MOCK_CLIENT", "").lower() in ("true", "1"):
        return MockLLMClient(default_response=mock_response)

    api_key = (
        os.environ.get("OPENAI_API_KEY")
        or os.environ.get("AI_MODEL_API_KEY")
        or os.environ.get("GEMINI_API_KEY")
    )
    if api_key and api_key.strip():
        return OpenAIClient(api_key=api_key)

    if allow_mock_fallback:
        return MockLLMClient(default_response=mock_response)

    # Default to OpenAI client (raises auth error if key is missing)
    return OpenAIClient()
