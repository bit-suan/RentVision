import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
/**
 * Properties for the RentVision API construct.
 */
export interface RentVisionApiProps {
    /** Environment label (e.g., 'dev', 'staging', 'prod'). */
    readonly environment: string;
    /** DynamoDB properties table. */
    readonly propertiesTable: dynamodb.Table;
    /** DynamoDB users table. */
    readonly usersTable: dynamodb.Table;
    /** DynamoDB leases table. */
    readonly leasesTable: dynamodb.Table;
    /** S3 media bucket for property photos and panoramas. */
    readonly mediaBucket: s3.Bucket;
    /** S3 lease documents bucket. */
    readonly leaseDocsBucket: s3.Bucket;
    /** Name of the geospatial GSI on the properties table. */
    readonly geoIndexName: string;
    /** Name of the status GSI on the properties table. */
    readonly statusIndexName: string;
    /** Allowed CORS origins. */
    readonly corsAllowedOrigins: string[];
    /** AI service host for lease Q&A integration. */
    readonly aiServiceHost?: string;
    /** AI service port for lease Q&A integration. */
    readonly aiServicePort?: string;
}
/**
 * CDK Construct that provisions the API Gateway HTTP API and Lambda functions
 * for the RentVision backend.
 *
 * Architecture:
 *   - HTTP API (API Gateway v2) with CORS
 *   - Lambda functions for listings, media, and leases
 *   - Each Lambda has a least-privilege IAM role
 *   - CloudWatch log groups with 14-day retention
 *
 * Lambda functions are bundled from the services/api/src directory using
 * esbuild via the NodejsFunction construct.
 */
export declare class RentVisionApi extends Construct {
    /** The HTTP API Gateway. */
    readonly httpApi: apigatewayv2.HttpApi;
    /** Lambda function for listings CRUD and geospatial search. */
    readonly listingsHandler: lambdaNodejs.NodejsFunction;
    /** Lambda function for media presigned URL generation. */
    readonly mediaHandler: lambdaNodejs.NodejsFunction;
    /** Lambda function for lease management and AI Q&A. */
    readonly leaseHandler: lambdaNodejs.NodejsFunction;
    constructor(scope: Construct, id: string, props: RentVisionApiProps);
}
