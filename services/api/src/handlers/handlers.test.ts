import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from "aws-lambda";
import { beforeEach, describe, expect, it } from "@jest/globals";

import { handler as healthHandler } from "./health";
import { handler as createHandler } from "./listings/create";
import { handler as getHandler } from "./listings/get";
import { handler as searchHandler } from "./listings/search";
import { handler as updateHandler } from "./listings/update";
import { handler as updateStatusHandler } from "./listings/update-status";
import { handler as addImageHandler } from "./listings/add-image";
import { localRepository } from "../repositories/local-repository";

const event = (
  overrides: Partial<APIGatewayProxyEvent> = {},
): APIGatewayProxyEvent => ({
  body: null,
  headers: {},
  isBase64Encoded: false,
  httpMethod: "GET",
  multiValueHeaders: {},
  multiValueQueryStringParameters: null,
  path: "/",
  pathParameters: null,
  queryStringParameters: null,
  requestContext: {} as APIGatewayProxyEvent["requestContext"],
  resource: "/",
  stageVariables: null,
  ...overrides,
});

const jsonBody = (value: unknown): string => JSON.stringify(value);

const responseBody = (response: APIGatewayProxyResult): Record<string, unknown> =>
  JSON.parse(response.body) as Record<string, unknown>;

const listingInput = {
  title: "2-bedroom near Bole",
  description: "Sunny apartment",
  price: 15000,
  bedrooms: 2,
  address: "Bole, Addis Ababa",
  lat: 9.0054,
  lng: 38.7636,
  panoramas: [],
};

beforeEach(() => {
  localRepository.clear();
});

describe("API handlers", () => {
  it("returns a health response", async () => {
    const response = await healthHandler(event());
    const body = responseBody(response);

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.time).toBe("string");
  });

  it("creates, reads, searches, updates, moderates, and adds an image", async () => {
    const createdResponse = await createHandler(
      event({
        httpMethod: "POST",
        path: "/listings",
        headers: { "x-user-id": "owner-1" },
        body: jsonBody(listingInput),
      }),
      {} as never,
      () => undefined,
    );
    const created = responseBody(createdResponse);
    const listingId = created.listingId as string;

    expect(createdResponse.statusCode).toBe(201);
    expect(created.ownerId).toBe("owner-1");

    const getResponse = await getHandler(
      event({
        path: `/listings/${listingId}`,
        pathParameters: { id: listingId },
      }),
      {} as never,
      () => undefined,
    );
    expect(getResponse.statusCode).toBe(200);

    const searchResponse = await searchHandler(
      event({
        path: "/listings/search",
        queryStringParameters: {
          lat: "9.0054",
          lng: "38.7636",
          radiusKm: "5",
        },
      }),
      {} as never,
      () => undefined,
    );
    const search = responseBody(searchResponse);
    expect(searchResponse.statusCode).toBe(200);
    expect(search.total).toBe(1);

    const updateResponse = await updateHandler(
      event({
        httpMethod: "PUT",
        pathParameters: { id: listingId },
        headers: { "x-user-id": "owner-1" },
        body: jsonBody({ price: 16000 }),
      }),
      {} as never,
      () => undefined,
    );
    const updated = responseBody(updateResponse);
    expect(updateResponse.statusCode).toBe(200);
    expect(updated.price).toBe(16000);

    const statusResponse = await updateStatusHandler(
      event({
        httpMethod: "PATCH",
        pathParameters: { id: listingId },
        headers: {
          "x-user-id": "admin-1",
          "x-user-role": "admin",
        },
        body: jsonBody({ status: "pending" }),
      }),
      {} as never,
      () => undefined,
    );
    const moderated = responseBody(statusResponse);
    expect(statusResponse.statusCode).toBe(200);
    expect(moderated.status).toBe("pending");

    const imageResponse = await addImageHandler(
      event({
        httpMethod: "POST",
        pathParameters: { id: listingId },
        headers: { "x-user-id": "owner-1" },
        body: jsonBody({ s3Key: "images/example.jpg" }),
      }),
      {} as never,
      () => undefined,
    );
    const imageBody = responseBody(imageResponse);
    expect(imageResponse.statusCode).toBe(201);
    expect(imageBody.warnings).toEqual([]);
    expect(
      (imageBody.image as { s3Key: string }).s3Key,
    ).toBe("images/example.jpg");
  });

  it("returns a standard validation error for a missing create body", async () => {
    const response = await createHandler(
      event({ httpMethod: "POST", path: "/listings" }),
      {} as never,
      () => undefined,
    );
    const body = responseBody(response);

    expect(response.statusCode).toBe(400);
    expect(body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Request body is required",
      },
    });
  });

  it("rejects status changes from non-admin users", async () => {
    const createdResponse = await createHandler(
      event({
        httpMethod: "POST",
        headers: { "x-user-id": "owner-1" },
        body: jsonBody(listingInput),
      }),
      {} as never,
      () => undefined,
    );
    const listingId = responseBody(createdResponse).listingId as string;

    const response = await updateStatusHandler(
      event({
        httpMethod: "PATCH",
        pathParameters: { id: listingId },
        headers: { "x-user-id": "owner-1" },
        body: jsonBody({ status: "rejected" }),
      }),
      {} as never,
      () => undefined,
    );
    const body = responseBody(response);

    expect(response.statusCode).toBe(403);
    expect(body.error).toEqual({
      code: "FORBIDDEN",
      message: "Only admins can update listing status",
    });
  });
});
