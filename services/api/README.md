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
