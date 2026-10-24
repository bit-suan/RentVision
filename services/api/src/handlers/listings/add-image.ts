import type { APIGatewayProxyHandler } from "aws-lambda";
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

    const body = parseJsonBody<{ s3Key?: string }>(event);
    const listing = await listingsService.addImage(
      listingId,
      body.s3Key ?? "",
      getActor(event),
    );

    return jsonResponse(201, {
      image: listing.images[listing.images.length - 1],
      warnings: [],
      listingStatus: listing.status,
      note: "Similarity checks are not configured yet.",
    });
  } catch (error) {
    return handleError(error);
  }
};
