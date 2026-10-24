import type { APIGatewayProxyHandler } from "aws-lambda";
import type { ListingStatus } from "../../../../../shared/contracts/listings";
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

    const body = parseJsonBody<{ status?: ListingStatus }>(event);
    if (body.status !== "approved" && body.status !== "pending" && body.status !== "rejected") {
      return jsonResponse(400, {
        error: { code: "INVALID_STATUS", message: "status must be approved, pending, or rejected" },
      });
    }

    const listing = await listingsService.updateStatus(
      listingId,
      body.status,
      getActor(event),
    );

    return jsonResponse(200, listing);
  } catch (error) {
    return handleError(error);
  }
};
