import * as cdk from 'aws-cdk-lib';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';
import { RentVisionDynamoDb } from './constructs/dynamodb-construct';
import { RentVisionS3 } from './constructs/s3-construct';
import { RentVisionApi } from './constructs/api-construct';
import { RentVisionCognito } from './constructs/cognito-construct';

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
 *   - Amazon Cognito: user authentication and app client
 *   - AWS API Gateway: HTTP API with CORS for frontend integration
 *   - AWS Lambda: serverless handlers for listings, media, and lease operations
 *   - CloudWatch: log groups with 14-day retention and API access logging
 *   - AWS Budgets: optional monthly cost alert
 *
 * All resources follow least-privilege IAM policies and are tagged for
 * traceability and cost allocation.
 */
export class RentVisionStack extends cdk.Stack {
  /** The DynamoDB construct containing all tables. */
  public readonly dynamoDb: RentVisionDynamoDb;
  /** The S3 construct containing all buckets. */
  public readonly s3: RentVisionS3;
  /** The Cognito construct containing the user pool and client. */
  public readonly cognito: RentVisionCognito;
  /** The API construct containing API Gateway and Lambda functions. */
  public readonly api: RentVisionApi;

  constructor(scope: Construct, id: string, props?: RentVisionStackProps) {
    super(scope, id, props);

    const environment = props?.environment ?? 'dev';
    const corsOrigins = environment === 'dev'
      ? ['http://localhost:3000', 'http://localhost:3001']
      : ['https://rentvision.example.com']; // Replace with actual production domain

    // -------------------------------------------------------------------------
    // DynamoDB Tables
    // -------------------------------------------------------------------------
    this.dynamoDb = new RentVisionDynamoDb(this, 'DynamoDB', {
      environment,
      removalPolicy: environment === 'dev'
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
    });

    // -------------------------------------------------------------------------
    // S3 Buckets
    // -------------------------------------------------------------------------
    this.s3 = new RentVisionS3(this, 'S3', {
      environment,
      corsAllowedOrigins: corsOrigins,
      removalPolicy: environment === 'dev'
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
    });

    // -------------------------------------------------------------------------
    // Cognito User Pool
    // -------------------------------------------------------------------------
    this.cognito = new RentVisionCognito(this, 'Cognito', {
      environment,
    });

    // -------------------------------------------------------------------------
    // API Gateway + Lambda Functions
    // -------------------------------------------------------------------------
    this.api = new RentVisionApi(this, 'Api', {
      environment,
      propertiesTable: this.dynamoDb.propertiesTable,
      usersTable: this.dynamoDb.usersTable,
      leasesTable: this.dynamoDb.leasesTable,
      mediaBucket: this.s3.mediaBucket,
      leaseDocsBucket: this.s3.leaseDocsBucket,
      userPool: this.cognito.userPool,
      userPoolClient: this.cognito.userPoolClient,
      geoIndexName: RentVisionDynamoDb.GEO_INDEX_NAME,
      statusIndexName: RentVisionDynamoDb.STATUS_INDEX_NAME,
      corsAllowedOrigins: corsOrigins,
    });

    // -------------------------------------------------------------------------
    // AWS Budget Alert (optional)
    // -------------------------------------------------------------------------
    if (props?.budgetAlertEmail) {
      const budgetLimit = props.budgetLimitUsd ?? 25;

      new budgets.CfnBudget(this, 'MonthlyBudget', {
        budget: {
          budgetName: `RentVision-Monthly-${environment}`,
          budgetType: 'COST',
          timeUnit: 'MONTHLY',
          budgetLimit: {
            amount: budgetLimit,
            unit: 'USD',
          },
        },
        notificationsWithSubscribers: [
          {
            notification: {
              notificationType: 'ACTUAL',
              comparisonOperator: 'GREATER_THAN',
              threshold: 80,
              thresholdType: 'PERCENTAGE',
            },
            subscribers: [
              {
                subscriptionType: 'EMAIL',
                address: props.budgetAlertEmail,
              },
            ],
          },
          {
            notification: {
              notificationType: 'FORECASTED',
              comparisonOperator: 'GREATER_THAN',
              threshold: 100,
              thresholdType: 'PERCENTAGE',
            },
            subscribers: [
              {
                subscriptionType: 'EMAIL',
                address: props.budgetAlertEmail,
              },
            ],
          },
        ],
      });
    }

    // -------------------------------------------------------------------------
    // Resource Tags
    // -------------------------------------------------------------------------
    cdk.Tags.of(this).add('Project', 'RentVision');
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'cdk');
    cdk.Tags.of(this).add('Team', 'AASTU-Hackathon');
  }
}
