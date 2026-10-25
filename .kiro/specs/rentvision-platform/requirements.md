# Requirements Document

## Introduction

RentVision is a web-based rental property platform for the Ethiopian real estate market. It consolidates property discovery, virtual inspection, and lease comprehension into a single application. The platform provides map-based radius search powered by Leaflet, immersive 360° virtual tours via Pannellum, a serverless API backed by AWS Lambda and DynamoDB, and an AI document processing service using PyMuPDF and Pydantic for lease Q&A.

## Glossary

- **Listing**: A rental property record containing location, pricing, media references, and metadata stored in DynamoDB.
- **Geohash**: A Base32-encoded string that encodes latitude and longitude into a hierarchical grid cell, used as a DynamoDB index for proximity queries.
- **Haversine Distance**: The great-circle distance between two geographic coordinates on Earth, used to compute exact property distance from a search center.
- **Radius Search**: A geo-spatial query that returns all Listings within a given distance in kilometers from a center coordinate.
- **360° Tour**: An immersive panoramic viewer using equirectangular images rendered via Pannellum with interactive hotspots to navigate between rooms.
- **Hotspot**: A clickable annotation within a 360° scene that links to another scene or displays informational text.
- **Lease**: A PDF rental contract associated with a Listing, stored in S3 and processed by the AI service for text extraction and Q&A.
- **Lease Q&A**: A question-answering feature that accepts a natural-language question and returns an answer extracted from a Lease's text.
- **AI Service**: The Python HTTP server (`services/ai`) that runs PyMuPDF extraction and Pydantic-validated Lease Q&A.
- **Lambda Handler**: A TypeScript AWS Lambda function in `services/api` that handles HTTP requests routed through API Gateway.
- **Presigned URL**: A time-limited AWS S3 URL granting temporary upload or download access to a specific object.
- **DynamoDB**: Amazon's managed NoSQL database used to persist Listing and Lease records.
- **S3**: Amazon Simple Storage Service used to store property media (photos, panoramas) and private lease PDFs.
- **Memory Store**: An in-process Map-based data store used by Lambda handlers during local development (when `DATA_STORE=memory`).
- **Subcity**: An administrative subdivision of Addis Ababa (e.g., Bole, Kirkos, Yeka).
- **ETB**: Ethiopian Birr, the default currency for all rental prices on the platform.

---

## Requirements

### Requirement 1: Property Listing Management

**User Story:** As a landlord, I want to create and retrieve rental property listings, so that tenants can discover my properties on the platform.

#### Acceptance Criteria

1. WHEN a landlord submits a POST request to `/listings` with required fields (`title`, `description`, `price`, `propertyType`, `latitude`, `longitude`, `landlordId`), THE Listings Lambda Handler SHALL create a new Listing, assign a UUID `listingId`, compute a precision-5 geohash, set `status` to `active`, and return the created Listing with HTTP 201.
2. WHEN a POST request to `/listings` is received with any required field missing or with an invalid value (e.g., `latitude` outside `[-90, 90]`, `price` negative), THE Listings Lambda Handler SHALL return HTTP 400 with error code `VALIDATION_ERROR` and a descriptive message identifying the invalid field.
3. WHEN a GET request to `/listings/{id}` is received with a valid `listingId`, THE Listings Lambda Handler SHALL return the corresponding Listing with HTTP 200.
4. IF a GET request to `/listings/{id}` references a `listingId` that does not exist, THEN THE Listings Lambda Handler SHALL return HTTP 404 with error code `NOT_FOUND`.
5. WHEN a GET request to `/listings` is received, THE Listings Lambda Handler SHALL return a paginated collection of active Listings with a `count` field and optional `nextToken` cursor.

---

### Requirement 2: Geospatial Radius Search

**User Story:** As a tenant, I want to search for rental properties within a geographic radius on a map, so that I can find homes near a location I care about.

#### Acceptance Criteria

1. WHEN a GET request to `/listings/search` is received with valid `lat`, `lng`, and `radiusKm` parameters, THE Listings Lambda Handler SHALL return all active Listings within the specified radius, sorted by ascending `distanceKm`, with HTTP 200.
2. WHEN computing a radius search, THE Listings Lambda Handler SHALL use geohash prefix queries to retrieve candidate Listings from the data layer, then apply Haversine Distance filtering to exclude any candidate whose great-circle distance exceeds `radiusKm`.
3. WHEN a GET request to `/listings/search` is received without `lat` or `lng` query parameters, THE Listings Lambda Handler SHALL return HTTP 400 with error code `VALIDATION_ERROR`.
4. WHEN a radius search result is returned, each Listing item in the response SHALL include a `distanceKm` field rounded to two decimal places.
5. WHERE a `propertyType` filter parameter is provided, THE Listings Lambda Handler SHALL exclude Listings whose `propertyType` does not match the filter before returning results.
6. THE Geohash Utility SHALL encode a latitude and longitude into a Base32 geohash string of the specified precision between 1 and 12 characters.
7. THE Geohash Utility SHALL decode a geohash string into a bounding box with `minLat`, `maxLat`, `minLng`, `maxLng` fields such that re-encoding the bounding box center produces the original geohash.

---

### Requirement 3: Interactive 360° Property Tours

**User Story:** As a tenant, I want to take an immersive 360° virtual tour of a property before visiting in person, so that I can evaluate the space without a physical trip.

#### Acceptance Criteria

1. WHEN a user navigates to `/listings/{id}/tour`, THE Tour Page SHALL render the Pannellum-based PanoramaViewer component with the scenes associated with that listing.
2. WHEN the PanoramaViewer is initialized with a list of scenes and a `defaultSceneId`, THE PanoramaViewer Component SHALL mount a Pannellum multi-scene viewer, auto-loading the default scene.
3. WHEN a user clicks a hotspot with a `targetSceneId`, THE PanoramaViewer Component SHALL transition to the target scene using the configured `sceneFadeDuration`.
4. WHEN a tour scene is configured, THE Tour Scene SHALL contain an `id`, `title`, equirectangular `imageUrl`, and an array of hotspots, each with `pitch`, `yaw`, `text`, and an optional `targetSceneId`.
5. IF the PanoramaViewer component is unmounted, THE PanoramaViewer Component SHALL call `viewer.destroy()` to release WebGL resources.

---

### Requirement 4: Lease Document Upload

**User Story:** As a tenant or landlord, I want to upload a PDF lease document to the platform, so that the AI service can extract and answer questions about its contents.

#### Acceptance Criteria

1. WHEN a POST request to `/leases/upload-url` is received with valid `listingId`, `fileName`, `mimeType` of `application/pdf`, and `fileSize` greater than 0, THE Leases Lambda Handler SHALL create a Lease record, generate a Presigned URL for S3 upload, and return HTTP 201 with `leaseId`, `uploadUrl`, and `fileKey`.
2. WHEN a POST request to `/leases/upload-url` is received with `mimeType` other than `application/pdf`, THE Leases Lambda Handler SHALL return HTTP 400 with error code `VALIDATION_ERROR`.
3. WHEN a POST request to `/leases/upload-url` is received with `fileSize` exceeding 25 MB (26,214,400 bytes), THE Leases Lambda Handler SHALL return HTTP 400 with error code `VALIDATION_ERROR`.
4. WHEN a GET request to `/leases/{id}` is received with a valid `leaseId`, THE Leases Lambda Handler SHALL return the corresponding Lease record with HTTP 200.
5. IF a GET request to `/leases/{id}` references a `leaseId` that does not exist, THEN THE Leases Lambda Handler SHALL return HTTP 404 with error code `NOT_FOUND`.

---

### Requirement 5: Lease Q&A via AI Service

**User Story:** As a tenant, I want to ask natural-language questions about a lease document and receive answers extracted from its text, so that I can understand my obligations without reading the full contract.

#### Acceptance Criteria

1. WHEN a POST request to `/leases/{id}/qa` is received with a non-empty `question` string, THE Leases Lambda Handler SHALL forward the question to the AI Service and return an answer with `leaseId`, `question`, `answer`, `confidence`, and optional `sourcePage` fields with HTTP 200.
2. WHEN a POST request to `/leases/{id}/qa` is received with an empty or whitespace-only `question`, THE Leases Lambda Handler SHALL return HTTP 400 with error code `VALIDATION_ERROR`.
3. IF the AI Service is unavailable or times out, THEN THE Leases Lambda Handler SHALL return HTTP 200 with a graceful fallback answer and a `confidence` of 0.
4. WHEN the AI Service receives a `question` about a lease, THE AI Service SHALL rank sentences from the extracted lease text by token overlap with the question and return the top-ranked sentence as the `answer`.
5. WHEN the AI Service extracts text from a PDF lease document via PyMuPDF, THE AI Service SHALL parse `start_date`, `end_date`, `monthly_rent`, `deposit`, `landlord_name`, `tenant_name`, and `terms` fields using regex patterns and return a `LeaseExtractionResult`.
6. WHEN the AI Service serializes or deserializes a `LeaseExtractionResult`, `LeaseQAAnswer`, `ListingAssistResponse`, or any Pydantic model, THE AI Service SHALL produce and accept JSON that round-trips without data loss.

---

### Requirement 6: Property Media Upload and Download

**User Story:** As a landlord, I want to upload property photos and 360° panorama images, and as a tenant, I want to download them, so that listings have rich visual content.

#### Acceptance Criteria

1. WHEN a POST request to `/media/upload-url` is received with valid `listingId`, `fileName`, `mediaType` (one of `photo`, `panorama`, `document`), and `contentType` (one of `image/jpeg`, `image/png`, `image/webp`), THE Media Lambda Handler SHALL generate and return a Presigned upload URL with the file stored under a path of `listings/{listingId}/{mediaType}s/{uuid}_{fileName}`.
2. WHEN a POST request to `/media/upload-url` is received with an unsupported `contentType`, THE Media Lambda Handler SHALL return HTTP 400 with error code `VALIDATION_ERROR`.
3. WHEN a GET request to `/media/download-url` is received with a valid `fileKey` query parameter, THE Media Lambda Handler SHALL generate and return a Presigned download URL.
4. IF a GET request to `/media/download-url` is received without a `fileKey` query parameter, THEN THE Media Lambda Handler SHALL return HTTP 400 with error code `VALIDATION_ERROR`.

---

### Requirement 7: Map-Based Search Frontend

**User Story:** As a tenant, I want to explore rental properties on an interactive map with a configurable search radius, so that I can visually discover properties near any location.

#### Acceptance Criteria

1. WHEN the MapExplorer component mounts, THE MapExplorer Component SHALL initialize a Leaflet map centered on the default coordinates (9.010793, 38.761252) at zoom level 13 and fetch Listings from the API using the current `lat`, `lng`, `radiusKm`, and optional `propertyType` parameters.
2. WHEN a user clicks on the Leaflet map, THE MapExplorer Component SHALL update the search center to the clicked coordinates and re-fetch Listings.
3. WHEN the API returns a non-empty list of Listings, THE MapExplorer Component SHALL render a circle overlay matching the search radius and a CircleMarker for each Listing at its coordinates.
4. WHEN a user clicks a Listing card in the sidebar, THE MapExplorer Component SHALL set that Listing as selected, and the corresponding map marker SHALL render at an increased radius of 11 pixels with the highlight color.
5. IF the Listings API call fails, THEN THE MapExplorer Component SHALL display an error message guiding the user to start the local API server.
6. WHEN the Leaflet map is unmounted, THE MapExplorer Component SHALL call `map.remove()` and `circle.remove()` to clean up the DOM.

---

### Requirement 8: Listing Detail and Lease Q&A Frontend

**User Story:** As a tenant, I want to view full property details and ask questions about the lease from the browser, so that I can evaluate a property end-to-end without leaving the application.

#### Acceptance Criteria

1. WHEN a user navigates to `/listings/{id}`, THE Listing Detail Page SHALL fetch the Listing by ID and display `title`, `price`, `currency`, `address`, `description`, `propertyType`, `bedrooms`, `bathrooms`, `areaSqm`, and `amenities`.
2. WHEN a user submits a question on the Lease Q&A page at `/listings/{id}/lease`, THE Lease Q&A Page SHALL POST the question to the API and display the returned `answer`, `confidence` percentage, and optional `sourcePage`.
3. IF the Lease Q&A API call fails, THEN THE Lease Q&A Page SHALL display an error message.
4. WHEN a user submits a question on the Lease Q&A page, THE Lease Q&A Page SHALL disable the submit button and show "Reading lease..." while the request is in flight.
