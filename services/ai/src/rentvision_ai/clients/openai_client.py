"""OpenAI / OpenAI-compatible REST API client for real model inference."""

import json
import os
import urllib.error
import urllib.request
from rentvision_ai.clients.base import LLMClient
from rentvision_ai.exceptions import (
    LLMAuthenticationError,
    LLMProviderError,
    LLMTimeoutError,
)


class OpenAIClient(LLMClient):
    """Client for OpenAI and OpenAI-compatible API providers (OpenRouter, Groq, local vLLM)."""

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 30.0,
    ):
        self._api_key = (
            api_key
            or os.environ.get("OPENAI_API_KEY")
            or os.environ.get("AI_MODEL_API_KEY")
        )
        self._model_name = (
            model_name
            or os.environ.get("AI_MODEL_NAME")
            or "gpt-4o-mini"
        )
        self._base_url = (
            base_url
            or os.environ.get("AI_MODEL_BASE_URL")
            or "https://api.openai.com/v1"
        ).rstrip("/")
        self._timeout_seconds = timeout_seconds

    @property
    def provider_name(self) -> str:
        return "openai"

    @property
    def model_name(self) -> str:
        return self._model_name

    def is_available(self) -> bool:
        """Check if an API key is present."""
        return bool(self._api_key and self._api_key.strip())

    def complete(self, prompt: str, system_prompt: str | None = None) -> str:
        """Execute real model completion via OpenAI chat completions API.
        
        Raises:
            LLMAuthenticationError: When API key is missing or rejected.
            LLMTimeoutError: When network call times out.
            LLMProviderError: When upstream provider returns HTTP error or invalid response.
        """
        if not self.is_available():
            raise LLMAuthenticationError(
                "Model provider is not configured: OPENAI_API_KEY (or AI_MODEL_API_KEY) is missing."
            )

        endpoint = f"{self._base_url}/chat/completions"
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self._model_name,
            "messages": messages,
            "temperature": 0.0,
        }

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=data_bytes,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._api_key}",
                "User-Agent": "RentVision-AI/0.1.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self._timeout_seconds) as response:
                body = response.read().decode("utf-8")
                parsed = json.loads(body)
                choices = parsed.get("choices", [])
                if not choices:
                    raise LLMProviderError(f"OpenAI returned empty choices in response: {body}")
                message_content = choices[0].get("message", {}).get("content", "")
                return str(message_content)

        except urllib.error.HTTPError as e:
            error_body = ""
            try:
                error_body = e.read().decode("utf-8")
            except Exception:
                pass
            if e.code in (401, 403):
                raise LLMAuthenticationError(
                    f"Authentication error ({e.code}) from provider: {e.reason}. Details: {error_body}"
                ) from e
            raise LLMProviderError(
                f"Provider HTTP {e.code} error: {e.reason}. Details: {error_body}"
            ) from e

        except urllib.error.URLError as e:
            if "timed out" in str(e.reason).lower():
                raise LLMTimeoutError(f"Request to provider timed out after {self._timeout_seconds}s") from e
            raise LLMProviderError(f"Network error connecting to provider: {e.reason}") from e

        except TimeoutError as e:
            raise LLMTimeoutError(f"Request to provider timed out after {self._timeout_seconds}s") from e

        except Exception as e:
            if isinstance(e, (LLMAuthenticationError, LLMTimeoutError, LLMProviderError)):
                raise
            raise LLMProviderError(f"Unexpected error calling provider: {e}") from e
