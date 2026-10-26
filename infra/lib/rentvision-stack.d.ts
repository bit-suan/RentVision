import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RentVisionDynamoDb } from './constructs/dynamodb-construct';
import { RentVisionS3 } from './constructs/s3-construct';
import { RentVisionApi } from './constructs/api-construct';
/**
 * Properties for the RentVision infrastructure stack.
 */
export interface RentVisionStackProps extends cdk.StackProps {
    /** Environment label (e.g., 'dev', 'staging', 'prod'). Defaults to 'dev'. */
    readonly environment?: string;
    /** Budget alert email address. If provided, creates an AWS Budget with email notification. */
    readonly budgetAlertEmail?: string;
    /** Monthly budget limit in USD. Defaults to 25. */
    readonly budgetLimitUsd?: number;
}
/**
 * RentVision core AWS infrastructure stack.
 *
 * Provisions the complete serverless backend:
 *   - Amazon DynamoDB: property listings (with geospatial index), users, leases
 *   - Amazon S3: property media (photos, 360° panoramas) and private lease documents
 *   - AWS API Gateway: HTTP API with CORS for frontend integration
 *   - AWS Lambda: serverless handlers for listings, media, and lease operations
 *   - CloudWatch: log groups with 14-day retention and API access logging
 *   - AWS Budgets: optional monthly cost alert
 *
 * All resources follow least-privilege IAM policies and are tagged for
 * traceability and cost allocation.
 */
export declare class RentVisionStack extends cdk.Stack {
    /** The DynamoDB construct containing all tables. */
    readonly dynamoDb: RentVisionDynamoDb;
    /** The S3 construct containing all buckets. */
    readonly s3: RentVisionS3;
    /** The API construct containing API Gateway and Lambda functions. */
    readonly api: RentVisionApi;
    constructor(scope: Construct, id: string, props?: RentVisionStackProps);
}
