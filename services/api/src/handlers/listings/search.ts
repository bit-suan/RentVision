import type { APIGatewayProxyHandler } from "aws-lambda";

import { localRepository } from "../../repositories/local-repository";
import { searchListings } from "../../services/geospatial-search";
import { parseSearchQuery } from "../../utils/search-validation";
import { getActor } from "../../utils/request-actor";
import { handleError, jsonResponse } from "../../utils/http";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const query = parseSearchQuery(event.queryStringParameters ?? {});
    const actor = getActor(event);
    const candidates = await localRepository.findCandidates(query);

    const result = searchListings(candidates, query, {
      userId: actor.userId,
      isAdmin: actor.role === "admin",
    });

    return jsonResponse(200, result);
  } catch (error) {
    return handleError(error);
  }
};
