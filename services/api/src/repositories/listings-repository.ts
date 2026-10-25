import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

import type {
  Listing,
  ListingSearchQuery,
} from "../../../../shared/contracts/listings";

const GEO_CELL_SIZE_DEGREES = 0.5;
const GEO_INDEX_NAME = "GeoCellIndex";

export interface ListingsRepositoryOptions {
  tableName?: string;
  client?: DynamoDBDocumentClient;
}

function geoCell(lat: number, lng: number): string {
  const latitudeCell = Math.floor(lat / GEO_CELL_SIZE_DEGREES);
  const longitudeCell = Math.floor(lng / GEO_CELL_SIZE_DEGREES);

  return `${latitudeCell}:${longitudeCell}`;
}

function candidateCells(lat: number, lng: number): string[] {
  const latitudeCell = Math.floor(lat / GEO_CELL_SIZE_DEGREES);
  const longitudeCell = Math.floor(lng / GEO_CELL_SIZE_DEGREES);

  const cells: string[] = [];

  for (let latitudeOffset = -1; latitudeOffset <= 1; latitudeOffset += 1) {
    for (let longitudeOffset = -1; longitudeOffset <= 1; longitudeOffset += 1) {
      cells.push(
        `${latitudeCell + latitudeOffset}:${
          longitudeCell + longitudeOffset
        }`,
      );
    }
  }

  return cells;
}

function toDynamoItem(listing: Listing): Listing & { geoCell: string } {
  return {
    ...listing,
    geoCell: geoCell(listing.lat, listing.lng),
  };
}

export class ListingsRepository {
  private readonly tableName: string;
  private readonly client: DynamoDBDocumentClient;

  constructor(options: ListingsRepositoryOptions = {}) {
    this.tableName =
      options.tableName ??
      (
        globalThis as typeof globalThis & {
          process?: { env?: Record<string, string | undefined> };
        }
      ).process?.env?.DYNAMODB_PROPERTIES_TABLE ??
      "rentvision-listings-dev";

    this.client =
      options.client ??
      DynamoDBDocumentClient.from(new DynamoDBClient({}));
  }

  async getById(listingId: string): Promise<Listing | undefined> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          listingId,
        },
      }),
    );

    return result.Item as Listing | undefined;
  }

  async put(listing: Listing): Promise<void> {
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: toDynamoItem(listing),
        ConditionExpression: "attribute_not_exists(listingId)",
      }),
    );
  }

  async findCandidates(
    query: ListingSearchQuery,
  ): Promise<Listing[]> {
    if (query.lat === undefined || query.lng === undefined) {
      return this.scanAll();
    }

    const results = await Promise.all(
      candidateCells(query.lat, query.lng).map((cell) =>
        this.queryGeoCell(cell),
      ),
    );

    return results.flat();
  }

  private async queryGeoCell(cell: string): Promise<Listing[]> {
    const listings: Listing[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const result = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: GEO_INDEX_NAME,
          KeyConditionExpression: "geoCell = :geoCell",
          ExpressionAttributeValues: {
            ":geoCell": cell,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      );

      listings.push(...((result.Items ?? []) as Listing[]));

      lastEvaluatedKey = result.LastEvaluatedKey as
        | Record<string, unknown>
        | undefined;
    } while (lastEvaluatedKey !== undefined);

    return listings;
  }

  private async scanAll(): Promise<Listing[]> {
    const listings: Listing[] = [];
    let lastEvaluatedKey: Record<string, unknown> | undefined;

    do {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          ExclusiveStartKey: lastEvaluatedKey,
        }),
      );

      listings.push(...((result.Items ?? []) as Listing[]));

      lastEvaluatedKey = result.LastEvaluatedKey as
        | Record<string, unknown>
        | undefined;
    } while (lastEvaluatedKey !== undefined);

    return listings;
  }
}