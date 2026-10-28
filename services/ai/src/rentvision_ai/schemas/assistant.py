"""Data models for the general RentVision assistant chat endpoint."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

MAX_MESSAGES = 20
MAX_MESSAGE_CHARS = 4_000
MAX_TOTAL_CHARS = 12_000
MAX_REPLY_CHARS = 8_000


class AssistantChatMessage(BaseModel):
    """One turn in a general assistant conversation."""

    role: Literal["user", "assistant"] = Field(
        ...,
        description="Message author. Only user and assistant turns are accepted.",
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=MAX_MESSAGE_CHARS,
        description="Plain-text message content.",
    )

    @field_validator("content")
    @classmethod
    def clean_content(cls, value: str) -> str:
        cleaned = value.replace("\x00", "").strip() if value else ""
        if not cleaned:
            raise ValueError("Message content must not be empty or whitespace only.")
        if len(cleaned) > MAX_MESSAGE_CHARS:
            raise ValueError(
                f"Message content exceeds maximum length of {MAX_MESSAGE_CHARS} characters."
            )
        return cleaned


class AssistantChatRequest(BaseModel):
    """Request payload for the general assistant endpoint."""

    messages: list[AssistantChatMessage] = Field(
        ...,
        min_length=1,
        max_length=MAX_MESSAGES,
        description="Conversation history ending with the user's latest message.",
    )
    locale: Literal["en", "am"] | None = Field(
        default=None,
        description="Optional preferred response language ('en' or 'am').",
    )

    @field_validator("messages")
    @classmethod
    def validate_messages(
        cls, messages: list[AssistantChatMessage]
    ) -> list[AssistantChatMessage]:
        if not messages:
            raise ValueError("At least one message is required.")
        if messages[-1].role != "user":
            raise ValueError("The last message must come from the user.")

        total_chars = sum(len(message.content) for message in messages)
        if total_chars > MAX_TOTAL_CHARS:
            raise ValueError(
                f"Conversation exceeds maximum length of {MAX_TOTAL_CHARS} characters."
            )
        return messages


class AssistantChatResponse(BaseModel):
    """Response returned by the general assistant endpoint."""

    reply: str = Field(
        ...,
        min_length=1,
        max_length=MAX_REPLY_CHARS,
        description="Plain-text assistant reply.",
    )
    provider: str | None = Field(
        default=None,
        description="Informational model provider name. Never contains credentials.",
    )
    model: str | None = Field(
        default=None,
        description="Informational model name.",
    )
