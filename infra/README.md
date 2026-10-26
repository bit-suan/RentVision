# RentVision Infrastructure

This directory contains the AWS CDK infrastructure definitions for RentVision.

## Architecture

RentVision uses a serverless architecture on AWS:

- **AWS API Gateway (HTTP API)**: Entry point for the backend, handling routing, CORS, and JWT authorization.
- **Amazon Cognito**: User authentication, providing JWT tokens for authorized requests.
- **AWS Lambda**: Node.js functions handling business logic for listings, media, and leases.
- **Amazon DynamoDB**: NoSQL storage for property listings, user data, and lease metadata.
- **Amazon S3**: Object storage for property media (public-facing but secure) and private lease documents.
- **AWS Budgets**: Cost monitoring and alerts.

## Prerequisites

- Node.js 20+
- AWS CLI v2
- AWS CDK CLI (`npm install -g aws-cdk`)

## Project Structure

- `bin/infra.ts`: CDK application entry point.
- `lib/rentvision-stack.ts`: Main infrastructure stack.
- `lib/constructs/`: Modular resource definitions:
    - `api-construct.ts`: API Gateway and Lambda functions.
    - `cognito-construct.ts`: Cognito User Pool and Client.
    - `dynamodb-construct.ts`: DynamoDB tables.
    - `s3-construct.ts`: S3 buckets.

## Deployment Routes

| Method | Route | Authorization | Purpose |
|---|---|---|---|
| GET | `/health` | Public | Health check |
| GET | `/listings` | Public | List active listings |
| POST | `/listings` | JWT | Create a new listing |
| GET | `/listings/{id}` | Public | Get listing details |
| PUT | `/listings/{id}` | JWT (Owner) | Update a listing |
| PATCH | `/listings/{id}/status` | JWT (Admin) | Update listing status |
| POST | `/listings/{id}/images` | JWT (Owner) | Register images for a listing |
| GET | `/listings/search` | Public | Geospatial radius search |
| POST | `/media/upload-url` | JWT (Owner) | Get presigned URL for media upload |
| GET | `/media/download-url` | JWT | Get presigned URL for media download |
| POST | `/leases/upload-url` | JWT | Get presigned URL for lease upload |
| GET | `/leases/{id}` | JWT | Get lease details |
| POST | `/leases/{id}/qa` | JWT | AI-powered lease Q&A |

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Synthesize CloudFormation Template
```bash
npx cdk synth
```

### 3. Run Tests
```bash
npm test
```

## Security

- **Least Privilege**: Lambda functions are granted only the necessary permissions to DynamoDB tables and S3 buckets.
- **JWT Authorization**: Protected routes require a valid Cognito JWT. Handlers verify ownership before allowing mutations.
- **S3 Security**: All buckets have Block Public Access enabled. Presigned URLs are used for secure media/document access. SSL is enforced for all API and S3 traffic.

## Cost Management

A budget alert is configured to notify when forecasted monthly costs exceed $25. DynamoDB and Lambda are configured for on-demand billing to minimize costs during low usage.

## Deployment (Phase 2)

Deployment is currently restricted. Once authorized:
1. Ensure AWS credentials are configured.
2. Run `npx cdk deploy`.
3. Retrieve `ApiUrl` and `UserPoolId` from the deployment outputs.
