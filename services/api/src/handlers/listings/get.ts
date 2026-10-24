import type {
  APIGatewayProxyHandler,
} from "aws-lambda";

import { localRepository } from "../../repositories/local-repository";

import {
  createListingsService,
} from "../../services/service-factory";

import {
  getActor,
} from "../../utils/request-actor";

import {
  handleError,
  jsonResponse,
} from "../../utils/http";

const listingsService =
  createListingsService(localRepository);

export const handler: APIGatewayProxyHandler =
  async (event) => {
    try {
      const listingId =
        event.pathParameters?.id;

      if (!listingId) {
        return jsonResponse(400, {
          error: {
            code: "INVALID_LISTING_ID",
            message: "Listing ID is required",
          },
        });
      }

      const actor = getActor(event);

      const listing =
        await listingsService.getListing(
          listingId,
          actor,
        );

      return jsonResponse(200, listing);
    } catch (error) {
      return handleError(error);
    }
  };