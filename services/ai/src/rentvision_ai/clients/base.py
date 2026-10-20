"""Base client abstraction for LLM providers."""

from abc import ABC, abstractmethod


class LLMClient(ABC):
    """Abstract interface for LLM model inference."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. 'openai', 'gemini', 'mock')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Name of the model being invoked."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider credentials and network/endpoint are configured."""
        pass

    @abstractmethod
    def complete(self, prompt: str, system_prompt: str | None = None) -> str:
        """Send completion request to LLM and return the raw text response.
        
        Raises:
            LLMAuthenticationError: When API keys or auth credentials are missing/invalid.
            LLMTimeoutError: When the request times out.
            LLMProviderError: On any upstream API or server error.
        """
        pass
