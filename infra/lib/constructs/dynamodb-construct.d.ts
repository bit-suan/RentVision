import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
/**
 * Properties for the RentVision DynamoDB construct.
 */
export interface RentVisionDynamoDbProps {
    /** Environment label (e.g., 'dev', 'staging', 'prod'). */
    readonly environment: string;
    /** Optional removal policy override. Defaults to RETAIN. */
    readonly removalPolicy?: cdk.RemovalPolicy;
}
/**
 * CDK Construct that provisions all DynamoDB tables for RentVision.
 *
 * Tables:
 *   - Properties: listing records with geospatial (geohash) and status indexes
 *   - Users: landlord and tenant profiles
 *   - Leases: lease document metadata linked to listings
 *
 * All tables use PAY_PER_REQUEST billing (on-demand) to minimize cost
 * during development and hackathon usage.
 */
export declare class RentVisionDynamoDb extends Construct {
    /** DynamoDB table for property listings. */
    readonly propertiesTable: dynamodb.Table;
    /** DynamoDB table for user profiles. */
    readonly usersTable: dynamodb.Table;
    /** DynamoDB table for lease documents. */
    readonly leasesTable: dynamodb.Table;
    /** Name of the geospatial GSI on the properties table. */
    static readonly GEO_INDEX_NAME = "geoIndex";
    /** Name of the status GSI on the properties table. */
    static readonly STATUS_INDEX_NAME = "statusIndex";
    /** Name of the landlord GSI on the properties table. */
    static readonly LANDLORD_INDEX_NAME = "landlordIndex";
    constructor(scope: Construct, id: string, props: RentVisionDynamoDbProps);
}
