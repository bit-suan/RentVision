# RentVision Backend Service (`services/api`)

This directory houses the backend architecture and serverless function definitions for the RentVision platform.

## Architecture Overview

RentVision leverages a fully serverless, event-driven AWS architecture:

- **API Gateway**: AWS API Gateway (HTTP/REST APIs) acts as the public ingress, managing authentication, rate limiting, request routing, and CORS.
- **Compute Layer**: AWS Lambda functions executed in a Node.js (TypeScript) runtime for high scalability, rapid cold starts, and seamless type-sharing with the frontend.
- **Primary Database**: Amazon DynamoDB for low-latency NoSQL persistence of property listings, agent/landlord profiles, user accounts, and lease metadata.
- **Object Storage**: Amazon S3 partitioned into distinct buckets:
  - `property-media`: Standard photos, floor plans, and interactive 360° panoramic equirectangular images.
  - `lease-documents`: Encrypted, private storage for rental agreements and PDF leases accessed via pre-signed URLs.

Handlers for listings, media, and leases live in `src/handlers`. For local work without AWS credentials:

```bash
npm install
npm test
npm run start:local
```

The local server listens on `http://localhost:3001`, seeds Addis Ababa demo listings, and uses an in-memory store (`DATA_STORE=memory`).

## Target Directory Layout

When endpoint implementation begins, the service will be structured as follows:

```text
services/api/
├── src/
│   ├── handlers/          # Lambda function entry points
│   │   ├── listings/      # Property CRUD and radius search handlers
│   │   ├── panoramas/     # 360 panorama upload and hotspot handlers
│   │   └── leases/        # Lease document upload and query handlers
│   ├── services/          # Business logic and external service adapters
│   │   ├── dynamodb.ts    # DynamoDB client and access patterns
│   │   ├── s3.ts          # S3 client and pre-signed URL generators
│   │   └── ai-client.ts   # Client communicating with services/ai
│   └── utils/             # Request parsing, response formatters, error handling
├── package.json           # Service-specific dependencies and build scripts
├── tsconfig.json          # TypeScript configuration extending base settings
└── README.md
```

## Local Development Approach

To develop and test Lambda handlers locally without incurring AWS cloud costs or needing continuous remote deployments:

### 1. Contract Alignment
All request/response payloads must adhere to shared schemas defined in [`shared/contracts`](../../shared/contracts).

### 2. AWS SAM / LocalStack Emulation
- **AWS SAM CLI**:
  ```powershell
  # Emulate API Gateway and Lambda locally
  sam local start-api --port 3001
  ```
- **LocalStack (Optional)**: Emulate local DynamoDB and S3 for end-to-end integration testing:
  ```powershell
  docker run --rm -it -p 4566:4566 -p 4510-4559:4510-4559 localstack/localstack
  ```

### 3. Unit and Handler Testing
Individual Lambda handler functions will be tested using Vitest or Jest by injecting mock `APIGatewayProxyEvent` objects and verifying `APIGatewayProxyResult` responses.

## Listings search implementation

The first backend slice is implemented without an AWS dependency so it can be tested independently:

- Shared listing and search DTOs: [`../../shared/contracts/listings.ts`](../../shared/contracts/listings.ts)
- Query parsing and contract validation: [`src/utils/search-validation.ts`](src/utils/search-validation.ts)
- Consistent API errors: [`src/utils/errors.ts`](src/utils/errors.ts)
- Haversine distance, visibility filtering, sorting, and pagination: [`src/services/geospatial-search.ts`](src/services/geospatial-search.ts)

An API Gateway handler should:

1. Read `event.queryStringParameters`.
2. Call `parseSearchQuery(...)`.
3. Load listings from DynamoDB through a repository.
4. Call `searchListings(listings, query, actor)`.
5. Return the result as JSON with status `200`.
6. Convert `ApiError` with `errorBody(...)`; unexpected errors should be logged and returned as the standard `500` response.

The in-memory search function is intentionally separate from DynamoDB access. DynamoDB should use a geohash or H3 cell index to narrow candidates first; exact Haversine filtering must still happen in `searchListings` so radius boundaries are accurate.
