# Implementation Plan

- [x] 1. Install property-based testing dependencies
  - Add `fast-check@^3.19.0` to `services/api/package.json` devDependencies
  - Add `fast-check@^3.19.0` to `apps/web/package.json` devDependencies
  - Add `hypothesis>=6.100.0` to `services/ai/requirements.txt` and `pyproject.toml` dev dependencies
  - _Requirements: 5.6, 2.6, 2.7_

- [x] 2. Geohash utility property tests
- [x] 2.1 Write property tests for geohash encoding output contract and round-trip
  - Create `services/api/src/utils/geohash.property.test.ts`
  - Use `fc.float` / `fc.integer` arbitraries to generate random lat, lng, and precision values
  - *Property 5: Geohash encoding output contract* — verify output length equals precision and all chars are in Base32 alphabet
  - *Property 6: Geohash encode-decode round-trip* — verify decoding center and re-encoding returns same hash
  - Tag each test: `// Feature: rentvision-platform, Property 5/6: ...`
  - Run minimum 100 iterations per property
  - _Requirements: 2.6, 2.7_

- [x] 3. Response utility property tests
- [-] 3.1 Write property tests for response shape invariant
  - Create `services/api/src/utils/response.property.test.ts`
  - *Property 12: Response shape invariant* — for random data and codes, verify `successResponse` and `errorResponse` always produce correct shapes
  - _Requirements: 1.1, 1.2, 2.1, 4.1, 6.1_

- [x] 4. Listings handler property tests
- [x] 4.1 Write property tests for listing creation, validation, list count, and geo-search
  - Create `services/api/src/handlers/listings.property.test.ts`
  - Set `process.env.DATA_STORE = 'memory'` at top of file
  - *Property 1: Listing creation round-trip* — for random valid listing payloads, POST then GET and verify field equality, status=active, geohash length=5
  - *Property 2: Invalid listing inputs rejected* — for payloads with missing/invalid fields, verify 400 + VALIDATION_ERROR
  - *Property 3: Listing list count consistency* — after inserting N listings, GET /listings returns count === items.length, all active
  - *Property 4: Geo-search radius containment and sort order* — for random center and radius, all results have distanceKm ≤ radiusKm and are sorted ascending
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.4_

- [x] 5. Leases handler property tests
- [x] 5.1 Write property tests for lease upload round-trip
  - Create `services/api/src/handlers/leases.property.test.ts`
  - Set `process.env.DATA_STORE = 'memory'` at top of file
  - *Property 8: Lease upload round-trip* — for random valid lease payloads, POST upload-url then GET /{leaseId} and verify listingId matches
  - _Requirements: 4.1_

- [x] 6. Media handler property tests
- [x] 6.1 Write property tests for media file key path structure
  - Create `services/api/src/handlers/media.property.test.ts`
  - Set `process.env.DATA_STORE = 'memory'` at top of file
  - *Property 11: Media upload file key path structure* — for random valid combinations, verify returned fileKey matches `listings/{listingId}/{mediaType}s/{uuid}_{sanitizedFileName}`
  - _Requirements: 6.1_

- [x] 7. Tour lib property tests
- [x] 7.1 Write property tests for tour scene structure completeness
  - Create `apps/web/src/lib/tours.property.test.ts`
  - *Property 7: Tour scene structure completeness* — for any listing ID, getTour() scenes all have non-empty id, title, imageUrl, and all hotspots have pitch, yaw, text
  - _Requirements: 3.4_

- [x] 8. Checkpoint — ensure all API and web tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Python AI service property tests
- [x] 9.1 Write hypothesis property tests for lease field extraction
  - Create `services/ai/tests/test_extraction_property.py`
  - *Property 9: Lease field extraction from text* — use `@given` with strategies that generate text containing patterns like `"Monthly Rent: {n}"` and `"Landlord: {name}"`, verify extracted fields match generated values
  - Tag: `# Feature: rentvision-platform, Property 9: Lease field extraction from text`
  - Run minimum 100 examples (`settings(max_examples=100)`)
  - _Requirements: 5.5_

- [x] 9.2 Write hypothesis property tests for Pydantic model serialization round-trip
  - Create `services/ai/tests/test_models_property.py`
  - *Property 10: Pydantic model serialization round-trip* — for `LeaseExtractionResult`, `LeaseQAAnswer`, `ListingAssistResponse`, generate instances via `hypothesis` strategies, verify `model_validate(model_dump())` produces equal instance
  - Tag: `# Feature: rentvision-platform, Property 10: Pydantic model serialization round-trip`
  - _Requirements: 5.6_

- [x] 10. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
