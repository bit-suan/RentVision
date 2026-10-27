import type { AssistantChatErrorCode } from "../../../../shared/contracts/src/assistant";

export type {
  AssistantChatErrorBody,
  AssistantChatErrorCode,
  AssistantChatMessage,
  AssistantChatRequest,
  AssistantChatResponse,
  AssistantChatRole,
} from "../../../../shared/contracts/src/assistant";

export type AssistantIntent =
  | "greeting"
  | "property_search"
  | "trust"
  | "lease"
  | "platform_help"
  | "general";

export interface AssistantPropertySearchQuery {
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  propertyType?: string;
}

export interface AssistantAction {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
}

export interface AssistantListingCard {
  listingId: string;
  title: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  location: string;
  propertyType: string;
  detailHref: string;
  leaseHref: string;
  isDemo: boolean;
}

export type AssistantMessageSource = "platform" | "ai";

export interface AssistantMessageError {
  code: AssistantChatErrorCode | "property_unavailable" | "conversation_limit";
  message: string;
  retryable: boolean;
}

export interface AssistantUiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  source?: AssistantMessageSource;
  listings?: AssistantListingCard[];
  actions?: AssistantAction[];
  error?: AssistantMessageError;
}
