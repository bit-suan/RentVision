import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "./search-validation";

describe("parseSearchQuery", () => {
  it("applies documented defaults", () => {
    expect(parseSearchQuery({})).toEqual({
      radiusKm: 5,
      limit: 20,
      offset: 0,
      mine: false,
    });
  });

  it("requires latitude and longitude together", () => {
    expect(() => parseSearchQuery({ lat: "9" })).toThrowError(
      /query parameters are invalid/,
    );
  });

  it("rejects a radius above the contract maximum", () => {
    expect(() => parseSearchQuery({ radiusKm: "51" })).toThrowError(
      /radiusKm must be > 0 and <= 50/,
    );
  });
});
