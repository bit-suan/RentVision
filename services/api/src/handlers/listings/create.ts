import type {
  APIGatewayProxyHandler,
} from "aws-lambda";

import type {
  ListingInput,
} from "../../utils/listing-validation";

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
  parseJsonBody,
} from "../../utils/http";

const listingsService =
  createListingsService(localRepository);

export const handler: APIGatewayProxyHandler =
  async (event) => {
    try {
      const input =
        parseJsonBody<ListingInput>(event);

      const actor = getActor(event);

      const listing =
        await listingsService.createListing(
          input,
          actor,
        );

      return jsonResponse(201, listing);
    } catch (error) {
      return handleError(error);
    }
  };