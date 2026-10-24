import type { APIGatewayProxyHandler } from "aws-lambda";
import type { ListingInput } from "../../utils/listing-validation";
import { localRepository } from "../../repositories/local-repository";
import { createListingsService } from "../../services/service-factory";
import { getActor } from "../../utils/request-actor";
import { handleError, jsonResponse, parseJsonBody } from "../../utils/http";

const listingsService = createListingsService(localRepository);

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const listingId = event.pathParameters?.id;
    if (!listingId) {
      return jsonResponse(400, {
        error: { code: "INVALID_LISTING_ID", message: "Listing ID is required" },
      });
    }

    const updates = parseJsonBody<Partial<ListingInput>>(event);
    const listing = await listingsService.updateListing(
      listingId,
      updates,
      getActor(event),
    );

    return jsonResponse(200, listing);
  } catch (error) {
    return handleError(error);
  }
};
