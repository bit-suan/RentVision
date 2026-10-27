export type AssistantChatRole = "user" | "assistant";

export interface AssistantChatMessage {
  role: AssistantChatRole;
  content: string;
}

export interface AssistantChatRequest {
  messages: AssistantChatMessage[];
  locale?: "en" | "am";
}

export interface AssistantChatResponse {
  reply: string;
  intent?: string;
  properties?: Array<{
    id: string;
    title: string;
    price: number;
    currency: string;
    location: string;
    bedrooms: number;
    bathrooms: number;
  }>;
}

export type AssistantChatErrorCode =
  | "bad_request"
  | "not_configured"
  | "rate_limited"
  | "unavailable"
  | "empty_response"
  | "network_error"
  | "invalid_request"
  | "upstream_error"
  | "timeout"
  | "rate_limit"
  | "internal_error";

export interface AssistantChatErrorBody {
  error?: {
    code: AssistantChatErrorCode;
    message: string;
    retryable: boolean;
  };
  code?: AssistantChatErrorCode;
  message?: string;
  retryable?: boolean;
}
