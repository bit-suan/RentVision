import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as apigatewayv2Authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

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
  /** Cognito user pool. */
  readonly userPool: cognito.UserPool;
  /** Cognito user pool client. */
  readonly userPoolClient: cognito.UserPoolClient;
  /** Name of the geospatial GSI on the properties table. */
  readonly geoIndexName: string;
  /** Name of the status GSI on the properties table. */
  readonly statusIndexName: string;
  /** Name of the landlord GSI on the properties table. */
  readonly landlordIndexName: string;
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
 *   - HTTP API (API Gateway v2) with CORS and JWT Authorizer
 *   - Lambda functions for listings, media, and leases
 *   - Each Lambda has a least-privilege IAM role
 *   - CloudWatch log groups with 14-day retention
 *
 * Lambda functions are bundled from the services/api/src directory using
 * esbuild via the NodejsFunction construct.
 */
export class RentVisionApi extends Construct {
  /** The HTTP API Gateway. */
  public readonly httpApi: apigatewayv2.HttpApi;
  /** The Cognito JWT Authorizer. */
  public readonly authorizer: apigatewayv2Authorizers.HttpJwtAuthorizer;
  /** Lambda function for listings CRUD and geospatial search. */
  public readonly listingsHandler: lambdaNodejs.NodejsFunction;
  /** Lambda function for media presigned URL generation. */
  public readonly mediaHandler: lambdaNodejs.NodejsFunction;
  /** Lambda function for lease management and AI Q&A. */
  public readonly leaseHandler: lambdaNodejs.NodejsFunction;
  /** Lambda function for health check. */
  public readonly healthHandler: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: RentVisionApiProps) {
    super(scope, id);

    // Path to the Lambda handler source code and API package root
    const apiPath = path.join(__dirname, '..', '..', '..', 'services', 'api');
    const handlersPath = path.join(apiPath, 'src', 'handlers');

    // Common Lambda configuration
    const lambdaDefaults: Partial<lambdaNodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      tracing: lambda.Tracing.ACTIVE,
      projectRoot: apiPath,
      depsLockFilePath: path.join(apiPath, 'package-lock.json'),
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2022',
        // Fix for bundling handlers outside the CDK root
        nodeModules: ['uuid'], // Example of forcing inclusion if needed
      },
    };

    // -------------------------------------------------------------------------
    // Lambda: Health Handler
    // -------------------------------------------------------------------------
    this.healthHandler = new lambdaNodejs.NodejsFunction(this, 'HealthHandler', {
      ...lambdaDefaults,
      functionName: `rentvision-health-${props.environment}`,
      description: 'Public health check endpoint',
      entry: path.join(handlersPath, 'health.ts'),
      handler: 'handler',
    });

    new logs.LogGroup(this, 'HealthHandlerLogs', {
      logGroupName: `/aws/lambda/rentvision-health-${props.environment}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // -------------------------------------------------------------------------
    // Lambda: Listings Handler
    // -------------------------------------------------------------------------
    this.listingsHandler = new lambdaNodejs.NodejsFunction(this, 'ListingsHandler', {
      ...lambdaDefaults,
      functionName: `rentvision-listings-${props.environment}`,
      description: 'Handles property listing CRUD and geospatial radius search',
      entry: path.join(handlersPath, 'listings.ts'),
      handler: 'handler',
      environment: {
        DYNAMODB_PROPERTIES_TABLE: props.propertiesTable.tableName,
        LISTINGS_GEO_INDEX_NAME: props.geoIndexName,
        LISTINGS_STATUS_INDEX_NAME: props.statusIndexName,
        LISTINGS_LANDLORD_INDEX_NAME: props.landlordIndexName,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // Least-privilege: read/write on properties table and its indexes
    props.propertiesTable.grantReadWriteData(this.listingsHandler);

    // CloudWatch log group with retention policy
    new logs.LogGroup(this, 'ListingsHandlerLogs', {
      logGroupName: `/aws/lambda/rentvision-listings-${props.environment}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // -------------------------------------------------------------------------
    // Lambda: Media Handler
    // -------------------------------------------------------------------------
    this.mediaHandler = new lambdaNodejs.NodejsFunction(this, 'MediaHandler', {
      ...lambdaDefaults,
      functionName: `rentvision-media-${props.environment}`,
      description: 'Generates presigned URLs for property media upload and download',
      entry: path.join(handlersPath, 'media.ts'),
      handler: 'handler',
      environment: {
        S3_PROPERTY_MEDIA_BUCKET: props.mediaBucket.bucketName,
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // Least-privilege: read/write on media bucket only
    props.mediaBucket.grantReadWrite(this.mediaHandler);

    new logs.LogGroup(this, 'MediaHandlerLogs', {
      logGroupName: `/aws/lambda/rentvision-media-${props.environment}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // -------------------------------------------------------------------------
    // Lambda: Lease Handler
    // -------------------------------------------------------------------------
    this.leaseHandler = new lambdaNodejs.NodejsFunction(this, 'LeaseHandler', {
      ...lambdaDefaults,
      functionName: `rentvision-leases-${props.environment}`,
      description: 'Manages lease documents: upload, retrieval, and AI Q&A',
      entry: path.join(handlersPath, 'leases.ts'),
      handler: 'handler',
      environment: {
        S3_LEASE_DOCUMENTS_BUCKET: props.leaseDocsBucket.bucketName,
        DYNAMODB_LEASES_TABLE: props.leasesTable.tableName,
        AI_SERVICE_HOST: props.aiServiceHost ?? '127.0.0.1',
        AI_SERVICE_PORT: props.aiServicePort ?? '8000',
        NODE_OPTIONS: '--enable-source-maps',
      },
    });

    // Least-privilege: read/write on lease docs bucket and leases table
    props.leaseDocsBucket.grantReadWrite(this.leaseHandler);
    props.leasesTable.grantReadWriteData(this.leaseHandler);

    new logs.LogGroup(this, 'LeaseHandlerLogs', {
      logGroupName: `/aws/lambda/rentvision-leases-${props.environment}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // -------------------------------------------------------------------------
    // HTTP API Gateway
    // -------------------------------------------------------------------------
    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `rentvision-api-${props.environment}`,
      description: 'RentVision REST API — listings, media, and lease operations',
      corsPreflight: {
        allowOrigins: props.corsAllowedOrigins,
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.PATCH,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Request-Id',
          'X-User-Id',
          'X-User-Role',
        ],
        maxAge: cdk.Duration.hours(1),
      },
    });

    // Cognito JWT Authorizer
    this.authorizer = new apigatewayv2Authorizers.HttpJwtAuthorizer('JwtAuthorizer', props.userPool.userPoolProviderUrl, {
      jwtAudience: [props.userPoolClient.userPoolClientId],
      authorizerName: `rentvision-jwt-authorizer-${props.environment}`,
    });

    // Lambda integrations
    const healthIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'HealthIntegration',
      this.healthHandler,
    );
    const listingsIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'ListingsIntegration',
      this.listingsHandler,
    );
    const mediaIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'MediaIntegration',
      this.mediaHandler,
    );
    const leaseIntegration = new apigatewayv2Integrations.HttpLambdaIntegration(
      'LeaseIntegration',
      this.leaseHandler,
    );

    // -------------------------------------------------------------------------
    // API Routes
    // -------------------------------------------------------------------------

    // Health route (Public)
    this.httpApi.addRoutes({
      path: '/health',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: healthIntegration,
    });

    // Listings routes
    this.httpApi.addRoutes({
      path: '/listings',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listingsIntegration,
    });

    this.httpApi.addRoutes({
      path: '/listings',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: listingsIntegration,
      authorizer: this.authorizer,
    });

    // Authenticated landlord portfolio. Registered before the parameterized
    // route so `/listings/mine` is never treated as a listing ID.
    this.httpApi.addRoutes({
      path: '/listings/mine',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listingsIntegration,
      authorizer: this.authorizer,
    });

    this.httpApi.addRoutes({
      path: '/listings/{id}',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listingsIntegration,
    });

    this.httpApi.addRoutes({
      path: '/listings/{id}',
      methods: [apigatewayv2.HttpMethod.PUT],
      integration: listingsIntegration,
      authorizer: this.authorizer,
    });

    this.httpApi.addRoutes({
      path: '/listings/{id}/status',
      methods: [apigatewayv2.HttpMethod.PATCH],
      integration: listingsIntegration,
      authorizer: this.authorizer,
    });

    this.httpApi.addRoutes({
      path: '/listings/{id}/images',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: listingsIntegration,
      authorizer: this.authorizer,
    });

    this.httpApi.addRoutes({
      path: '/listings/search',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: listingsIntegration,
    });

    // Media routes
    this.httpApi.addRoutes({
      path: '/media/upload-url',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: mediaIntegration,
      authorizer: this.authorizer,
    });

    // Public route: the handler only signs media for approved listings, so
    // listing cards work for anonymous visitors while private/non-approved
    // media stays inaccessible.
    this.httpApi.addRoutes({
      path: '/media/download-url',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: mediaIntegration,
    });

    // Lease routes
    this.httpApi.addRoutes({
      path: '/leases/upload-url',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: leaseIntegration,
      authorizer: this.authorizer,
    });

    this.httpApi.addRoutes({
      path: '/leases/{id}',
      methods: [apigatewayv2.HttpMethod.GET],
      integration: leaseIntegration,
      authorizer: this.authorizer,
    });

    this.httpApi.addRoutes({
      path: '/leases/{id}/qa',
      methods: [apigatewayv2.HttpMethod.POST],
      integration: leaseIntegration,
      authorizer: this.authorizer,
    });

    // -------------------------------------------------------------------------
    // Access Logging
    // -------------------------------------------------------------------------
    const accessLogGroup = new logs.LogGroup(this, 'ApiAccessLogs', {
      logGroupName: `/aws/apigateway/rentvision-api-${props.environment}`,
      retention: logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const stage = this.httpApi.defaultStage?.node.defaultChild as apigatewayv2.CfnStage;
    if (stage) {
      stage.accessLogSettings = {
        destinationArn: accessLogGroup.logGroupArn,
        format: JSON.stringify({
          requestId: '$context.requestId',
          ip: '$context.identity.sourceIp',
          requestTime: '$context.requestTime',
          httpMethod: '$context.httpMethod',
          routeKey: '$context.routeKey',
          status: '$context.status',
          protocol: '$context.protocol',
          responseLength: '$context.responseLength',
          integrationError: '$context.integrationErrorMessage',
          errorMessage: '$context.error.message',
        }),
      };
    }

    // Grant API Gateway permission to write to the access log group
    accessLogGroup.grantWrite(new iam.ServicePrincipal('apigateway.amazonaws.com'));

    // -------------------------------------------------------------------------
    // CloudFormation Outputs
    // -------------------------------------------------------------------------
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.httpApi.apiEndpoint,
      description: 'RentVision API Gateway endpoint URL',
      exportName: `rentvision-api-url-${props.environment}`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.httpApi.apiId,
      description: 'RentVision HTTP API ID',
    });
  }
}
