"""HTTP client for OpenAI and Gemini completions API."""

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
    """Client for OpenAI-compatible chat completion APIs."""

    def __init__(
        self,
        api_key: str | None = None,
        model_name: str | None = None,
        base_url: str | None = None,
        timeout_seconds: float = 30.0,
    ):
        gemini_key = os.environ.get("GEMINI_API_KEY")
        self._api_key = (
            api_key
            or os.environ.get("OPENAI_API_KEY")
            or os.environ.get("AI_MODEL_API_KEY")
            or gemini_key
        )
        default_model = "models/gemini-3.5-flash" if (gemini_key and not os.environ.get("OPENAI_API_KEY")) else "gpt-4o-mini"
        default_base_url = (
            "https://generativelanguage.googleapis.com/v1beta/openai"
            if (gemini_key and not os.environ.get("OPENAI_API_KEY"))
            else "https://api.openai.com/v1"
        )
        self._model_name = (
            model_name
            or os.environ.get("AI_MODEL_NAME")
            or default_model
        )
        self._base_url = (
            base_url
            or os.environ.get("AI_MODEL_BASE_URL")
            or default_base_url
        ).rstrip("/")
        self._timeout_seconds = timeout_seconds

    @property
    def provider_name(self) -> str:
        if "generativelanguage.googleapis.com" in self._base_url:
            return "gemini"
        return "openai"

    @property
    def model_name(self) -> str:
        return self._model_name

    def is_available(self) -> bool:
        """Check if an API key is present."""
        return bool(self._api_key and self._api_key.strip())

    def complete(self, prompt: str, system_prompt: str | None = None) -> str:
        """Execute chat completion request."""
        if not self.is_available():
            raise LLMAuthenticationError(
                "Model provider is not configured: OPENAI_API_KEY (or AI_MODEL_API_KEY) is missing."
            )

        endpoint = f"{self._base_url}/chat/completions"
        messages: list[dict[str, str]] = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Fall back to flash-lite if needed
        models_to_try = [self._model_name]
        if "generativelanguage.googleapis.com" in self._base_url and "lite" not in self._model_name:
            models_to_try.append("models/gemini-3.5-flash-lite")

        last_error: Exception | None = None

        for candidate_model in models_to_try:
            payload = {
                "model": candidate_model,
                "messages": messages,
                "temperature": 0.0,
            }
            data_bytes = json.dumps(payload).encode("utf-8")

            # Retry on rate limits or service unavailable
            for attempt in range(3):
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
                    if e.code in (503, 429) and attempt < 2:
                        import time
                        time.sleep(1.5 * (attempt + 1))
                        continue
                    last_error = LLMProviderError(
                        f"Provider HTTP {e.code} error: {e.reason}. Details: {error_body}"
                    )
                    break  # Move to fallback model

                except urllib.error.URLError as e:
                    reason_str = str(getattr(e, "reason", e)).lower()
                    if "timed out" in reason_str:
                        last_error = LLMTimeoutError(f"Request to provider timed out after {self._timeout_seconds}s")
                    else:
                        last_error = LLMProviderError(f"Network error connecting to provider: {e.reason}")
                    if attempt < 2:
                        import time
                        time.sleep(1.0)
                        continue

                except TimeoutError as e:
                    last_error = LLMTimeoutError(f"Request to provider timed out after {self._timeout_seconds}s")
                    if attempt < 2:
                        import time
                        time.sleep(1.0)
                        continue

                except Exception as e:
                    if isinstance(e, (LLMAuthenticationError, LLMTimeoutError, LLMProviderError)):
                        raise
                    last_error = LLMProviderError(f"Unexpected error calling provider: {e}")

        if last_error:
            raise last_error
        raise LLMProviderError("All candidate models and retry attempts failed.")
