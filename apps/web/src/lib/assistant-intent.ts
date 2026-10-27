import type { Listing } from "./types";
import type {
  AssistantIntent,
  AssistantListingCard,
  AssistantPropertySearchQuery,
} from "./assistant-contracts";

interface NeighborhoodDefinition {
  canonical: string;
  aliases: string[];
  latitude?: number;
  longitude?: number;
}

const NEIGHBORHOODS: NeighborhoodDefinition[] = [
  { canonical: "Bole", aliases: ["bole", "ቦሌ"], latitude: 8.9951, longitude: 38.7884 },
  {
    canonical: "Kazanchis",
    aliases: ["kazanchis", "ካዛንቺስ"],
    latitude: 9.02,
    longitude: 38.765,
  },
  { canonical: "CMC", aliases: ["cmc", "ሲኤምሲ"] },
  {
    canonical: "Sar Bet",
    aliases: ["sar bet", "sarbet", "ሳር ቤት"],
    latitude: 8.995,
    longitude: 38.745,
  },
  {
    canonical: "Old Airport",
    aliases: ["old airport", "አሮጌ አውሮፕላን ማረፊያ"],
    latitude: 9.0,
    longitude: 38.73,
  },
  {
    canonical: "4 Kilo",
    aliases: ["4 kilo", "four kilo", "አራት ኪሎ"],
    latitude: 9.033,
    longitude: 38.763,
  },
  { canonical: "Piassa", aliases: ["piassa", "piazza", "ፒያሳ"], latitude: 9.03, longitude: 38.75 },
  { canonical: "Lebu", aliases: ["lebu", "ለቡ"], latitude: 8.97, longitude: 38.71 },
  { canonical: "Ayat", aliases: ["ayat", "አያት"], latitude: 9.02, longitude: 38.85 },
  { canonical: "Gerji", aliases: ["gerji", "ገርጂ"] },
  { canonical: "Summit", aliases: ["summit", "ሰሚት"] },
  { canonical: "Megenagna", aliases: ["megenagna", "መገናኛ"] },
  { canonical: "Jemo", aliases: ["jemo", "ጀሞ"] },
  { canonical: "Lafto", aliases: ["lafto", "ላፍቶ"] },
  { canonical: "Kality", aliases: ["kality", "ካሊቲ"] },
  { canonical: "Kolfe", aliases: ["kolfe", "ኮልፌ"] },
  { canonical: "Nifas Silk", aliases: ["nifas silk", "ንፋስ ስልክ"] },
  { canonical: "Kirkos", aliases: ["kirkos", "ቂርቆስ"] },
  { canonical: "Yeka", aliases: ["yeka", "የካ"] },
  { canonical: "Akaki", aliases: ["akaki", "አካኪ"] },
];

const GREETING_RE =
  /^(?:hi|hello|hey|hiya|good\s+(?:morning|afternoon|evening)|ሰላም|ሰላምታ|እንደምን\s+ነህ|እንደምን\s+ነሽ)[\s!.,?]*$/i;

const SEARCH_VERB_RE =
  /\b(?:find|search|show|browse|looking\s+for|look\s+for|need|want|recommend|suggest)\b|ፈልግ|ፈልጋለሁ|አሳይ|ያሳዩኝ/i;

const PROPERTY_NOUN_RE =
  /\b(?:apartment|apartments|flat|flats|condo|condos|condominium|house|houses|home|villa|villas|studio|studios|commercial|office|shop|rental|rentals|property|properties|place|places)\b|አፓርታማ|ቪላ|ቤት|ንብረት|ኪራይ/i;

const BEDROOM_RE =
  /\b(?:\d+|one|two|three|four|five|six)\s*\+?\s*(?:-|\s)?\s*(?:bed(?:room)?s?|br|bdr)\b|\d+\s*\+?\s*መኝታ/i;

const BUDGET_RE =
  /\b(?:under|below|less\s+than|up\s+to|max(?:imum)?|budget|between|over|above|more\s+than|min(?:imum)?|at\s+least)\b|በጀት|ያነሰ|የሚበልጥ/i;

const CURRENCY_PRICE_RE =
  /\b\d[\d,]*(?:\.\d+)?\s*(?:k|thousand)?\s*(?:etb|birr|br)\b|ብር/i;

const STRONG_LEASE_RE =
  /\b(?:lease|leases|deposit|notice\s+period|clause|clauses|contract|agreement|landlord|tenant|sublet|sublease)\b|ውል|ተቀማጭ|ማስጠንቀቂያ|ተከራይ|አከራይ/i;

const LEASE_RE = /\b(?:rent\s+due|utilities?\s+included|rent)\b|ኪራይ/i;

const TRUST_RE =
  /\b(?:trust|trusted|verify|verified|verification|scam|fraud|safe|safety|legit|legitimate|duplicate|duplicates|security)\b|ማረጋገጫ|እምነት|አስተማማኝ|ማጭበርበር|ደህንነት/i;

const PLATFORM_RE =
  /\b(?:what\s+can\s+you|what\s+do\s+you|how\s+do\s+you|help|assistant|rentvision|platform|features?|use\s+this|capabilities)\b|እርዳታ|ምን\s+ማድረግ|እንዴት\s+እርዳ/i;

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
};

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9\u1200-\u137F]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "");
}

function findNeighborhood(text: string): NeighborhoodDefinition | undefined {
  const normalized = normalizeSearchText(text);
  return NEIGHBORHOODS.find((entry) =>
    entry.aliases.some((alias) => normalized.includes(normalizeSearchText(alias)))
  );
}

function parseAmountToken(token: string): number | undefined {
  const match = token
    .replace(/,/g, "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*(k|thousand)?$/i);
  if (!match) return undefined;

  const value = Number(match[1]) * (match[2] ? 1000 : 1);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value);
}

function extractPriceRange(text: string): {
  minPrice?: number;
  maxPrice?: number;
} {
  const between = text.match(
    /\bbetween\s+([\d][\d,]*(?:\.\d+)?\s*(?:k|thousand)?)\s*(?:and|to|-)\s*([\d][\d,]*(?:\.\d+)?\s*(?:k|thousand)?)/i
  );
  if (between) {
    const first = parseAmountToken(between[1]);
    const second = parseAmountToken(between[2]);
    if (first && second) {
      return {
        minPrice: Math.min(first, second),
        maxPrice: Math.max(first, second),
      };
    }
  }

  const below = text.match(
    /\b(?:under|below|less\s+than|up\s+to|max(?:imum)?|budget(?:\s+of)?|within)\s*(?:etb|birr|br)?\s*([\d][\d,]*(?:\.\d+)?\s*(?:k|thousand)?)/i
  );
  if (below) {
    const value = parseAmountToken(below[1]);
    if (value && value >= 1000) return { maxPrice: value };
  }

  const above = text.match(
    /\b(?:over|above|more\s+than|min(?:imum)?|at\s+least)\s*(?:etb|birr|br)?\s*([\d][\d,]*(?:\.\d+)?\s*(?:k|thousand)?)/i
  );
  if (above) {
    const value = parseAmountToken(above[1]);
    if (value && value >= 1000) return { minPrice: value };
  }

  const currencyAmount = text.match(
    /\b([\d][\d,]*(?:\.\d+)?\s*(?:k|thousand)?)\s*(?:etb|birr|br)\b/i
  );
  if (currencyAmount) {
    const value = parseAmountToken(currencyAmount[1]);
    if (value && value >= 1000) return { maxPrice: value };
  }

  const shorthand = text.match(/\b([\d][\d,]*(?:\.\d+)?\s*k)\b/i);
  if (shorthand) {
    const value = parseAmountToken(shorthand[1]);
    if (value && value >= 1000) return { maxPrice: value };
  }

  return {};
}

function extractBedrooms(text: string): number | undefined {
  const numeric = text.match(
    /\b(\d+)\s*\+?\s*(?:-|\s)?\s*(?:bed(?:room)?s?|br|bdr)\b/i
  );
  if (numeric) {
    const value = Number(numeric[1]);
    if (Number.isInteger(value) && value > 0) return value;
  }

  const amharic = text.match(/(\d+)\s*\+?\s*መኝታ/i);
  if (amharic) {
    const value = Number(amharic[1]);
    if (Number.isInteger(value) && value > 0) return value;
  }

  const word = text.match(
    /\b(one|two|three|four|five|six)\s*(?:-|\s)?\s*(?:bed(?:room)?s?|br|bdr)\b/i
  );
  if (word) {
    return WORD_NUMBERS[word[1].toLowerCase()];
  }

  return undefined;
}

function extractPropertyType(text: string): string | undefined {
  if (/\bstudios?\b/i.test(text)) return "studio";
  if (/\bvillas?\b|ቪላ/i.test(text)) return "villa";
  if (/\b(?:commercial|offices?|shops?)\b/i.test(text)) return "commercial";
  if (/\b(?:houses?|homes?)\b/i.test(text)) return "house";
  if (/\b(?:apartments?|flats?|condos?|condominiums?)\b|አፓርታማ/i.test(text)) {
    return "apartment";
  }
  return undefined;
}

/**
 * Classifies a free-text message into a deterministic, platform-grounded intent
 * or the general AI fallback. Classification intentionally happens on the client
 * so property, trust, and lease answers can use real app data without a model.
 */
export function classifyAssistantIntent(input: string): AssistantIntent {
  const text = input.replace(/\x00/g, " ").trim();
  if (!text) return "general";
  if (GREETING_RE.test(text)) return "greeting";

  const hasPropertyContext =
    PROPERTY_NOUN_RE.test(text) ||
    BEDROOM_RE.test(text) ||
    BUDGET_RE.test(text) ||
    Boolean(findNeighborhood(text));

  const hasSearchSignal = hasPropertyContext || CURRENCY_PRICE_RE.test(text);

  // Lease questions are answered by the existing document-grounded lease flow,
  // never by the general model or by inventing clauses. Strong lease terms win
  // unless the message is clearly a property search.
  const isSearchRequest =
    BEDROOM_RE.test(text) ||
    BUDGET_RE.test(text) ||
    (SEARCH_VERB_RE.test(text) &&
      (PROPERTY_NOUN_RE.test(text) || Boolean(findNeighborhood(text))));

  if (STRONG_LEASE_RE.test(text) && !isSearchRequest) {
    return "lease";
  }

  if (
    LEASE_RE.test(text) &&
    !SEARCH_VERB_RE.test(text) &&
    !PROPERTY_NOUN_RE.test(text) &&
    !BEDROOM_RE.test(text) &&
    !BUDGET_RE.test(text)
  ) {
    return "lease";
  }

  if (
    TRUST_RE.test(text) &&
    !SEARCH_VERB_RE.test(text) &&
    !PROPERTY_NOUN_RE.test(text) &&
    !BEDROOM_RE.test(text) &&
    !BUDGET_RE.test(text)
  ) {
    return "trust";
  }

  if (hasSearchSignal || findNeighborhood(text)) {
    return "property_search";
  }

  if (PLATFORM_RE.test(text)) {
    return "platform_help";
  }

  return "general";
}

export function parsePropertySearchQuery(input: string): AssistantPropertySearchQuery {
  const text = input.replace(/\x00/g, " ").trim();
  const neighborhood = findNeighborhood(text)?.canonical;
  const priceRange = extractPriceRange(text);
  const minBedrooms = extractBedrooms(text);
  const propertyType = extractPropertyType(text);

  return {
    ...(neighborhood ? { neighborhood } : {}),
    ...priceRange,
    ...(minBedrooms ? { minBedrooms } : {}),
    ...(propertyType ? { propertyType } : {}),
  };
}

export function isAvailableListing(listing: Listing): boolean {
  const status = (listing.status || "").toLocaleLowerCase();
  // The public listings API marks published inventory as "approved", while
  // mock/demo data and older records use "active" or "available".
  return status === "approved" || status === "active" || status === "available";
}

function listingMatchesNeighborhood(listing: Listing, neighborhood: string): boolean {
  const target = compactSearchText(neighborhood);
  if (!target) return true;

  const haystack = compactSearchText(
    [
      listing.title,
      listing.description,
      listing.address?.street,
      listing.address?.subcity,
      listing.address?.woreda,
      listing.address?.city,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return haystack.includes(target);
}

/**
 * Filters real listings returned by the app's listing API. No synthetic results
 * are ever added: an empty array means there are genuinely no matches.
 */
export function filterAvailableListings(
  listings: Listing[],
  query: AssistantPropertySearchQuery
): Listing[] {
  return listings.filter((listing) => {
    if (!isAvailableListing(listing)) return false;

    if (query.minPrice !== undefined && listing.price < query.minPrice) {
      return false;
    }
    if (query.maxPrice !== undefined && listing.price > query.maxPrice) {
      return false;
    }
    if (
      query.minBedrooms !== undefined &&
      listing.bedrooms < query.minBedrooms
    ) {
      return false;
    }
    if (
      query.propertyType &&
      listing.propertyType.toLocaleLowerCase() !==
        query.propertyType.toLocaleLowerCase()
    ) {
      return false;
    }
    if (
      query.neighborhood &&
      !listingMatchesNeighborhood(listing, query.neighborhood)
    ) {
      return false;
    }

    return true;
  });
}

export function buildPropertiesHref(query: AssistantPropertySearchQuery): string {
  const params = new URLSearchParams();
  const neighborhood = query.neighborhood
    ? NEIGHBORHOODS.find((entry) => entry.canonical === query.neighborhood)
    : undefined;

  if (neighborhood?.latitude !== undefined && neighborhood.longitude !== undefined) {
    params.set("lat", String(neighborhood.latitude));
    params.set("lng", String(neighborhood.longitude));
    params.set("radiusKm", "5");
  } else if (query.neighborhood) {
    params.set("q", query.neighborhood);
  }

  if (query.minPrice !== undefined) params.set("minPrice", String(query.minPrice));
  if (query.maxPrice !== undefined) params.set("maxPrice", String(query.maxPrice));
  if (query.minBedrooms !== undefined) {
    params.set("bedrooms", String(query.minBedrooms));
  }
  if (query.propertyType) params.set("propertyType", query.propertyType);

  const search = params.toString();
  return search ? `/properties?${search}` : "/properties";
}

export function listingDetailHref(listing: Listing, isDemo: boolean): string {
  const id = encodeURIComponent(listing.listingId);
  return isDemo ? `/properties/${id}` : `/listings/${id}`;
}

export function listingLeaseHref(listingId: string, isDemo: boolean): string {
  const route = isDemo ? "properties" : "listings";
  return `/${route}/${encodeURIComponent(listingId)}/lease`;
}

export function toAssistantListingCard(
  listing: Listing,
  isDemo: boolean
): AssistantListingCard {
  const location = [
    listing.address?.street,
    listing.address?.subcity,
    listing.address?.city,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    listingId: listing.listingId,
    title: listing.title,
    price: listing.price,
    currency: listing.currency,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    location,
    propertyType: listing.propertyType,
    detailHref: listingDetailHref(listing, isDemo),
    leaseHref: listingLeaseHref(listing.listingId, isDemo),
    isDemo,
  };
}

export function describePropertySearch(query: AssistantPropertySearchQuery): string {
  const parts: string[] = [];
  if (query.propertyType) parts.push(query.propertyType);
  if (query.minBedrooms) parts.push(`${query.minBedrooms}+ bedrooms`);
  if (query.neighborhood) parts.push(`in ${query.neighborhood}`);
  if (query.maxPrice) parts.push(`under ${query.maxPrice.toLocaleString("en-US")} ETB`);
  if (query.minPrice) parts.push(`over ${query.minPrice.toLocaleString("en-US")} ETB`);
  return parts.join(" ");
}
