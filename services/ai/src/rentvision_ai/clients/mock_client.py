"""Mock LLM client implementation for testing and offline development."""

from typing import Callable
from rentvision_ai.clients.base import LLMClient
from rentvision_ai.exceptions import (
    LLMAuthenticationError,
    LLMProviderError,
    LLMTimeoutError,
)


class MockLLMClient(LLMClient):
    """Test-double LLM client supporting response scripting and error injection."""

    def __init__(
        self,
        default_response: str = "{}",
        model_name: str = "mock-model-v1",
        simulate_auth_failure: bool = False,
        simulate_timeout: bool = False,
        simulate_provider_error: bool = False,
        handler: Callable[[str, str | None], str] | None = None,
    ):
        self._default_response = default_response
        self._model_name = model_name
        self.simulate_auth_failure = simulate_auth_failure
        self.simulate_timeout = simulate_timeout
        self.simulate_provider_error = simulate_provider_error
        self.handler = handler
        self.call_history: list[dict[str, str | None]] = []

    @property
    def provider_name(self) -> str:
        return "mock"

    @property
    def model_name(self) -> str:
        return self._model_name

    def is_available(self) -> bool:
        return not self.simulate_auth_failure

    def complete(self, prompt: str, system_prompt: str | None = None) -> str:
        self.call_history.append({"prompt": prompt, "system_prompt": system_prompt})

        if self.simulate_auth_failure:
            raise LLMAuthenticationError("Mock authentication failure: API key missing or invalid.")
        if self.simulate_timeout:
            raise LLMTimeoutError("Mock timeout: LLM provider failed to respond within deadline.")
        if self.simulate_provider_error:
            raise LLMProviderError("Mock provider error: HTTP 500 Internal Server Error.")

        if self.handler:
            return self.handler(prompt, system_prompt)

        return self._default_response
