"""Factory functions for LLM client resolution."""

import os
from rentvision_ai.clients.base import LLMClient
from rentvision_ai.clients.mock_client import MockLLMClient
from rentvision_ai.clients.openai_client import OpenAIClient


def get_default_llm_client(
    allow_mock_fallback: bool = False,
    mock_response: str = "{}",
) -> LLMClient:
    """Return the configured LLM client based on environment.
    
    If OPENAI_API_KEY / AI_MODEL_API_KEY is found, returns OpenAIClient.
    If no key is found:
      - If allow_mock_fallback is True, returns MockLLMClient.
      - Otherwise, returns OpenAIClient (which will raise LLMAuthenticationError when called,
        clearly surfacing the missing configuration blocker).
    """
    api_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("AI_MODEL_API_KEY")
    if api_key and api_key.strip():
        return OpenAIClient(api_key=api_key)

    if allow_mock_fallback or os.environ.get("AI_USE_MOCK_CLIENT", "").lower() in ("true", "1"):
        return MockLLMClient(default_response=mock_response)

    # Return OpenAIClient which cleanly flags unavailable state and raises authentication error
    return OpenAIClient()
