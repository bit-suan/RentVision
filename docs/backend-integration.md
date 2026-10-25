# RentVision Backend Integration Guide

> **Audience**: Member 2 (Backend Developer)  
> **Service**: `services/api` (AWS Lambda & API Gateway Handlers)  
> **Status**: Infrastructure Defined in CDK (`infra/`), Cloud Resources Pending Deployment  

---

## 1. AWS Target Region

- **Primary Region**: `eu-west-1` (Europe - Ireland)
- **Selection Rationale**:
  - Broad AWS service availability (API Gateway, AWS Lambda, Amazon DynamoDB, Amazon S3, CloudWatch).
  - Low and stable latency profiles to East Africa (Ethiopia / Addis Ababa).
  - High availability zone redundancy (3 AZs) ensuring high resiliency.
  - Full feature parity for CDK v2 constructs, on-demand billing, and IAM identity integrations.

---

## 2. Amazon DynamoDB Data Layer

All tables are defined in [`infra/lib/constructs/dynamodb-construct.ts`](../infra/lib/constructs/dynamodb-construct.ts) and configured with:
- **Billing Mode**: `PAY_PER_REQUEST` (On-Demand) — zero baseline cost during development and hackathon testing.
- **Server-Side Encryption**: AWS-managed encryption at rest.
- **Point-in-Time Recovery (PITR)**: Enabled.
- **Removal Policy**: `RETAIN` (or destroyed in test environments if overridden).

### 2.1 Table Schemas

| Table Logical Name | Target Table Name (`dev`) | Partition Key (PK) | Sort Key (SK) | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Properties** | `rentvision-properties-dev` | `listingId` (String, UUIDv4) | *None* | Property listings, metadata, coordinates, pricing, and media keys. |
| **Users** | `rentvision-users-dev` | `userId` (String, Cognito / Auth ID) | *None* | Landlord, agent, and tenant profiles and preferences. |
| **Leases** | `rentvision-leases-dev` | `leaseId` (String, UUIDv4) | `listingId` (String, UUIDv4) | Rental lease documents, processing state, and extracted clause data. |

---

### 2.2 Global Secondary Indexes (GSIs)

#### 1. Geospatial Index (`geoIndex`) on `rentvision-properties-dev`
- **GSI Name**: `geoIndex`
- **Partition Key**: `geohash` (String) — **5-character geohash prefix**
- **Sort Key**: `listingId` (String)
- **Projection**: `ALL`

##### Geospatial Query Strategy & Rationale
> **Key Limitation**: Amazon DynamoDB does **NOT** support native geospatial radius queries (e.g. ST_DWithin or GIS radial queries).

To execute fast, cost-efficient radius queries:
1. **5-character geohash cell**: A 5-character geohash represents a bounding box of approximately **4.9 km × 4.9 km** (at the equator / tropics). This is the ideal bounding box size for neighborhood-level discovery across Addis Ababa subcities (e.g. Bole, Kirkos, Yeka).
2. **Two-Phase Query Pattern**:
   - **Phase 1 (Candidate Retrieval)**: Compute the 5-character geohash for the target latitude/longitude, plus its **8 immediate neighboring cells** (total of 1 to 9 cells depending on `radiusKm`). Execute parallel DynamoDB `Query` operations on `geoIndex` using `geohash = :cellHash`.
   - **Phase 2 (Exact Haversine Distance Filtering)**: In the Lambda handler memory, calculate the exact Great Circle / Haversine distance between the user's search coordinate and each listing coordinate. Discard records exceeding `radiusKm` and sort results by distance.

```typescript
// Example Phase 2 Haversine Distance Calculation (Node.js / TypeScript)
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

#### 2. Status Index (`statusIndex`) on `rentvision-properties-dev`
- **GSI Name**: `statusIndex`
- **Partition Key**: `status` (String) — values: `active`, `inactive`, `pending`, `rented`
- **Sort Key**: `createdAt` (String) — ISO 8601 timestamp (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Projection**: `ALL`
- **Usage**: Fetch all active listings ordered chronologically (newest first via `ScanIndexForward: false`).

---

## 3. Amazon S3 Object Storage

Defined in [`infra/lib/constructs/s3-construct.ts`](../infra/lib/constructs/s3-construct.ts).

### 3.1 Buckets & Security Configurations

| Bucket Purpose | Bucket Name Pattern | Public Access | Encryption | CORS Enabled | Versioning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Property Media** | `rentvision-property-media-{account}-{region}` | **BLOCKED ALL** | SSE-S3 (`AES256`) | **Yes** (PUT/GET/HEAD from `localhost:3000` & web client) | Disabled |
| **Lease Documents** | `rentvision-lease-documents-{account}-{region}` | **BLOCKED ALL** | SSE-S3 (`AES256`) | **No** (Direct backend / Lambda access only) | **Enabled** |

### 3.2 Object Key Conventions

#### Property Media Bucket:
- Standard photos: `listings/{listingId}/photos/{uuid}_{filename}`
- 360° Equirectangular Panoramas: `listings/{listingId}/panoramas/{uuid}_{filename}`

#### Lease Documents Bucket:
- Private PDF Agreements: `leases/{leaseId}/{uuid}_{filename}`
- **Restrictions**: `application/pdf` only, maximum file size **25 MB**.

### 3.3 Presigned URL Workflow
Direct public access is completely blocked on both buckets. All client interactions use short-lived AWS SDK v3 presigned S3 URLs:
- **Upload URL Expiration**: **15 minutes** (900 seconds) — client uploads directly via HTTP `PUT`.
- **Download URL Expiration**: **1 hour** (3600 seconds) — client streams photos/panoramas via HTTP `GET`.

---

## 4. Environment Variables Reference

Backend services read configuration from environment variables. Copy `.env.example` to `services/api/.env` or root `.env`:

| Variable | Required | Default / Example Value | Description |
| :--- | :---: | :--- | :--- |
| `AWS_REGION` | Yes | `eu-west-1` | Target AWS deployment region. |
| `AWS_ACCOUNT_ID` | Yes | `123456789012` | 12-digit AWS account identifier. |
| `AWS_PROFILE` | Local only | `rentvision-dev` | AWS CLI local named profile for credentials. |
| `API_PORT` | Local only | `3001` | Local port for offline Lambda emulation / API server. |
| `CORS_ALLOWED_ORIGINS` | Yes | `http://localhost:3000` | Allowed origins for CORS headers. |
| `DYNAMODB_PROPERTIES_TABLE` | Yes | `rentvision-properties-dev` | Target DynamoDB table for listings. |
| `DYNAMODB_USERS_TABLE` | Yes | `rentvision-users-dev` | Target DynamoDB table for user profiles. |
| `DYNAMODB_LEASES_TABLE` | Yes | `rentvision-leases-dev` | Target DynamoDB table for lease documents. |
| `LISTINGS_GEO_INDEX_NAME` | Yes | `geoIndex` | Global Secondary Index name for geohash queries. |
| `LISTINGS_STATUS_INDEX_NAME` | Yes | `statusIndex` | Global Secondary Index name for status queries. |
| `S3_PROPERTY_MEDIA_BUCKET` | Yes | `rentvision-property-media-dev` | S3 bucket name for property images and 360 panoramas. |
| `S3_LEASE_DOCUMENTS_BUCKET`| Yes | `rentvision-lease-documents-dev`| S3 bucket name for private lease PDFs. |
| `API_BASE_URL` | Post-Deploy| `https://xxxxxxxxxx.execute-api.eu-west-1.amazonaws.com` | Deployed API Gateway invoke URL. |
| `AI_SERVICE_HOST` | Yes | `127.0.0.1` | Hostname of Python AI service (`services/ai`). |
| `AI_SERVICE_PORT` | Yes | `8000` | Port of Python AI service (`services/ai`). |
| `MAX_DOCUMENT_UPLOAD_MB` | Yes | `25` | Maximum allowable lease PDF upload size in megabytes. |

---

## 5. Local Development Authentication & Security

### 5.1 Credential Management
When developing locally:
1. **Never hardcode AWS keys** in source code or commit `.env` files with secret keys.
2. Use AWS CLI named profiles:
   ```bash
   aws configure --profile rentvision-dev
   # AWS Access Key ID [None]: <YOUR_ACCESS_KEY>
   # AWS Secret Access Key [None]: <YOUR_SECRET_KEY>
   # Default region name [None]: eu-west-1
   # Default output format [None]: json
   ```
3. Set `AWS_PROFILE=rentvision-dev` in `.env`.
4. The AWS SDK v3 default credential chain resolves credentials in this order:
   - Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
   - Shared credentials profile file (`~/.aws/credentials` via `AWS_PROFILE`)
   - Web identity token / IAM Roles Anywhere / ECS & EC2 instance metadata.

### 5.2 Least-Privilege IAM Policy for Local Development
A minimal, least-privilege IAM policy has been generated for Member 2 at [`docs/iam-local-dev-policy.json`](./iam-local-dev-policy.json).  
Replace `<ACCOUNT_ID>` with your AWS Account ID and attach this policy to your IAM local development user or role. It grants access **only** to the RentVision `dev` tables and buckets.

---

## 6. Planned Backend API Routes

All endpoints conform to contracts defined in [`shared/contracts`](../shared/contracts).

```
                      ┌────────────────────────┐
                      │    AWS API Gateway     │
                      └───────────┬────────────┘
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ /listings/*     │      │ /media/*        │      │ /leases/*       │
│ Lambda Handler  │      │ Lambda Handler  │      │ Lambda Handler  │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         ▼                        ▼                        ▼
  DynamoDB Properties          S3 Media             S3 Lease Docs &
        Table                   Bucket             Python AI Service
```

### 6.1 Listings & Search Endpoints
| HTTP Method | Route | Description | Query / Body Payload | Response Contract |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/listings` | List active properties with pagination | `?limit=20&nextToken=...` | `ApiResponse<ListingSearchResponse>` |
| `GET` | `/listings/{id}` | Get property listing details by ID | Path param: `id` | `ApiResponse<Listing>` |
| `POST` | `/listings` | Create a new property listing | Body: `CreateListingRequest` | `ApiResponse<Listing>` |
| `GET` | `/listings/search` | Geospatial radial search | `?lat=9.01&lng=38.76&radiusKm=5` | `ApiResponse<ListingSearchResponse>` |

### 6.2 Media & Panoramas Endpoints
| HTTP Method | Route | Description | Query / Body Payload | Response Contract |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/media/upload-url` | Generate presigned S3 PUT URL for photo/panorama | Body: `PresignedUrlRequest` | `ApiResponse<PresignedUrlResponse>` |
| `GET` | `/media/download-url` | Generate presigned S3 GET URL for secure viewing | `?fileKey=listings/...` | `ApiResponse<MediaDownloadResponse>` |

### 6.3 Lease Agreement & AI Q&A Endpoints
| HTTP Method | Route | Description | Query / Body Payload | Response Contract |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/leases/upload-url` | Generate presigned S3 PUT URL for private PDF | Body: `LeaseUploadRequest` | `ApiResponse<LeaseUploadResponse>` |
| `GET` | `/leases/{id}` | Get lease metadata and extraction status | Path param: `id` | `ApiResponse<Lease>` |
| `POST` | `/leases/{id}/qa` | Ask questions about terms in an uploaded lease | Body: `LeaseQAQuery` | `ApiResponse<LeaseQAResponse>` |

---

## 7. Cloud Resource Status Table

The cloud architecture is completely modeled and codified in AWS CDK TypeScript. No live resources are deployed yet due to local development constraints (no AWS cloud credentials in local terminal).

| Resource Type | Planned / Logical Name | Status | Verification Method |
| :--- | :--- | :--- | :--- |
| **CDK Core Stack** | `RentVisionStack` | **SYNTHESIZABLE** | `cd infra && npx cdk synth --quiet` |
| **DynamoDB Table** | `rentvision-properties-dev` | **DEFINED IN CDK** | `RentVisionDynamoDb` construct in `infra/lib/constructs/dynamodb-construct.ts` |
| **DynamoDB GSI** | `geoIndex` (`geohash` PK, `listingId` SK) | **DEFINED IN CDK** | `addGlobalSecondaryIndex` in `dynamodb-construct.ts` |
| **DynamoDB GSI** | `statusIndex` (`status` PK, `createdAt` SK)| **DEFINED IN CDK** | `addGlobalSecondaryIndex` in `dynamodb-construct.ts` |
| **DynamoDB Table** | `rentvision-users-dev` | **DEFINED IN CDK** | `RentVisionDynamoDb` construct in `infra/lib/constructs/dynamodb-construct.ts` |
| **DynamoDB Table** | `rentvision-leases-dev` | **DEFINED IN CDK** | `RentVisionDynamoDb` construct in `infra/lib/constructs/dynamodb-construct.ts` |
| **S3 Media Bucket** | `rentvision-property-media-{acc}-{reg}` | **DEFINED IN CDK** | `RentVisionS3` construct in `infra/lib/constructs/s3-construct.ts` |
| **S3 Lease Bucket** | `rentvision-lease-documents-{acc}-{reg}` | **DEFINED IN CDK** | `RentVisionS3` construct in `infra/lib/constructs/s3-construct.ts` |
| **API Gateway** | `RentVisionApi` | **DEFINED IN CDK** | `RentVisionApi` construct in `infra/lib/constructs/api-construct.ts` |
| **Lambda Handlers**| `listings`, `media`, `leases` | **IMPLEMENTED** | `services/api/src/handlers/` with local memory-store server |

---

## 8. Quick Start for Member 2

Follow these step-by-step instructions to set up the backend service:

### Step 1: Clone and Set Up Environment
```bash
git clone <repository_url>
cd RentVision

# Create local environment configuration
cp .env.example .env
```

### Step 2: Configure AWS Profile
Configure your development IAM profile using the permissions from [`docs/iam-local-dev-policy.json`](./iam-local-dev-policy.json):
```bash
aws configure --profile rentvision-dev
# Enter your AWS Access Key, Secret Key, and set default region to eu-west-1
```
Uncomment and set `AWS_PROFILE=rentvision-dev` in your `.env`.

### Step 3: Install Dependencies
```bash
# Install shared contracts dependencies
cd shared/contracts && npm ci

# Install backend API dependencies
cd ../../services/api && npm ci

# Install infrastructure dependencies
cd ../../infra && npm ci
```

### Step 4: Verify Infrastructure Synthesis
Verify that CDK can synthesize CloudFormation templates without errors:
```bash
cd infra
export CDK_DEFAULT_ACCOUNT=000000000000
export CDK_DEFAULT_REGION=eu-west-1
npx cdk synth --quiet
```

### Step 5: Start Local API Development
Run the backend tests:
```bash
cd ../services/api
npm test -- --passWithNoTests
```

Implement handlers inside `services/api/src/handlers/` using the contracts imported from `@rentvision/contracts`!
