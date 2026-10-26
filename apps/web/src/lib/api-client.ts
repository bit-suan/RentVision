import type {
  ExtractListingRequestDto,
  ExtractedPropertyListingDto,
  LeaseQARequestDto,
  LeaseQAResponseDto,
  SupportedLocale,
} from "../../../../shared/contracts";
import { resolveLocale } from "../../../../shared/contracts/locale";

const AI_SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://127.0.0.1:8000";

export interface AIClientOptions {
  locale?: SupportedLocale;
  savedPreference?: SupportedLocale;
}

export async function extractPropertyListing(
  request: ExtractListingRequestDto,
  options?: AIClientOptions,
): Promise<ExtractedPropertyListingDto> {
  const resolvedLocale = resolveLocale({
    explicitLocale: request.locale || options?.locale,
    savedPreference: options?.savedPreference,
  });

  const payload: ExtractListingRequestDto = {
    ...request,
    locale: resolvedLocale,
  };

  const response = await fetch(`${AI_SERVICE_BASE_URL}/api/v1/extract-listing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": resolvedLocale,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI extraction failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function askLeaseQuestion(
  request: LeaseQARequestDto,
  options?: AIClientOptions,
): Promise<LeaseQAResponseDto> {
  const resolvedLocale = resolveLocale({
    explicitLocale: request.locale || options?.locale,
    savedPreference: options?.savedPreference,
  });

  const payload: LeaseQARequestDto = {
    ...request,
    locale: resolvedLocale,
  };

  const response = await fetch(`${AI_SERVICE_BASE_URL}/api/v1/lease-qa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Language": resolvedLocale,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lease QA failed (${response.status}): ${errorText}`);
  }

  return response.json();
}
