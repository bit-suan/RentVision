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
export class RentVisionDynamoDb extends Construct {
  /** DynamoDB table for property listings. */
  public readonly propertiesTable: dynamodb.Table;
  /** DynamoDB table for user profiles. */
  public readonly usersTable: dynamodb.Table;
  /** DynamoDB table for lease documents. */
  public readonly leasesTable: dynamodb.Table;

  /** Name of the geospatial GSI on the properties table. */
  public static readonly GEO_INDEX_NAME = 'geoIndex';
  /** Name of the status GSI on the properties table. */
  public static readonly STATUS_INDEX_NAME = 'statusIndex';

  constructor(scope: Construct, id: string, props: RentVisionDynamoDbProps) {
    super(scope, id);

    const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;

    // -------------------------------------------------------------------------
    // Properties Table
    // -------------------------------------------------------------------------
    this.propertiesTable = new dynamodb.Table(this, 'PropertiesTable', {
      tableName: `rentvision-properties-${props.environment}`,
      partitionKey: {
        name: 'listingId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Geospatial index: 5-character geohash prefix as partition key.
    // Enables bounding-box candidate retrieval for radius searches.
    // DynamoDB does NOT support native radius queries — the Lambda handler
    // queries candidate cells and applies Haversine distance filtering.
    this.propertiesTable.addGlobalSecondaryIndex({
      indexName: RentVisionDynamoDb.GEO_INDEX_NAME,
      partitionKey: {
        name: 'geohash',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'listingId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Status index: supports listing queries filtered by status,
    // sorted by creation time (newest first via ISO 8601 sort key).
    this.propertiesTable.addGlobalSecondaryIndex({
      indexName: RentVisionDynamoDb.STATUS_INDEX_NAME,
      partitionKey: {
        name: 'status',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // -------------------------------------------------------------------------
    // Users Table
    // -------------------------------------------------------------------------
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `rentvision-users-${props.environment}`,
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Email lookup index used by the auth handler (login / signup)
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'emailIndex',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // -------------------------------------------------------------------------
    // Leases Table
    // -------------------------------------------------------------------------
    this.leasesTable = new dynamodb.Table(this, 'LeasesTable', {
      tableName: `rentvision-leases-${props.environment}`,
      partitionKey: {
        name: 'leaseId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'listingId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // -------------------------------------------------------------------------
    // CloudFormation Outputs
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, 'PropertiesTableName', {
      value: this.propertiesTable.tableName,
      description: 'DynamoDB properties table name',
      exportName: `rentvision-properties-table-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'UsersTableName', {
      value: this.usersTable.tableName,
      description: 'DynamoDB users table name',
      exportName: `rentvision-users-table-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'LeasesTableName', {
      value: this.leasesTable.tableName,
      description: 'DynamoDB leases table name',
      exportName: `rentvision-leases-table-${props.environment}`,
    });
  }
}
