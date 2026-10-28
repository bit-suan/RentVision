"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentVisionApi = void 0;
const cdk = require("aws-cdk-lib");
const apigatewayv2 = require("aws-cdk-lib/aws-apigatewayv2");
const apigatewayv2Integrations = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const apigatewayv2Authorizers = require("aws-cdk-lib/aws-apigatewayv2-authorizers");
const lambda = require("aws-cdk-lib/aws-lambda");
const lambdaNodejs = require("aws-cdk-lib/aws-lambda-nodejs");
const logs = require("aws-cdk-lib/aws-logs");
const iam = require("aws-cdk-lib/aws-iam");
const constructs_1 = require("constructs");
const path = require("path");
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
class RentVisionApi extends constructs_1.Construct {
    /** The HTTP API Gateway. */
    httpApi;
    /** The Cognito JWT Authorizer. */
    authorizer;
    /** Lambda function for listings CRUD and geospatial search. */
    listingsHandler;
    /** Lambda function for media presigned URL generation. */
    mediaHandler;
    /** Lambda function for lease management and AI Q&A. */
    leaseHandler;
    /** Lambda function for health check. */
    healthHandler;
    constructor(scope, id, props) {
        super(scope, id);
        // Path to the Lambda handler source code and API package root
        const apiPath = path.join(__dirname, '..', '..', '..', 'services', 'api');
        const handlersPath = path.join(apiPath, 'src', 'handlers');
        // Common Lambda configuration
        const lambdaDefaults = {
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
        const healthIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('HealthIntegration', this.healthHandler);
        const listingsIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('ListingsIntegration', this.listingsHandler);
        const mediaIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('MediaIntegration', this.mediaHandler);
        const leaseIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('LeaseIntegration', this.leaseHandler);
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
        const stage = this.httpApi.defaultStage?.node.defaultChild;
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
exports.RentVisionApi = RentVisionApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwaS1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDZEQUE2RDtBQUM3RCxzRkFBc0Y7QUFDdEYsb0ZBQW9GO0FBQ3BGLGlEQUFpRDtBQUNqRCw4REFBOEQ7QUFJOUQsNkNBQTZDO0FBQzdDLDJDQUEyQztBQUMzQywyQ0FBdUM7QUFDdkMsNkJBQTZCO0FBb0M3Qjs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxNQUFhLGFBQWMsU0FBUSxzQkFBUztJQUMxQyw0QkFBNEI7SUFDWixPQUFPLENBQXVCO0lBQzlDLGtDQUFrQztJQUNsQixVQUFVLENBQTRDO0lBQ3RFLCtEQUErRDtJQUMvQyxlQUFlLENBQThCO0lBQzdELDBEQUEwRDtJQUMxQyxZQUFZLENBQThCO0lBQzFELHVEQUF1RDtJQUN2QyxZQUFZLENBQThCO0lBQzFELHdDQUF3QztJQUN4QixhQUFhLENBQThCO0lBRTNELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBeUI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQiw4REFBOEQ7UUFDOUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUzRCw4QkFBOEI7UUFDOUIsTUFBTSxjQUFjLEdBQThDO1lBQ2hFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTTtZQUN4QyxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFP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QixFQUFFLEVBQUUsNEJBQTRCO29CQUNoQyxXQUFXLEVBQUUsc0JBQXNCO29CQUNuQyxVQUFVLEVBQUUscUJBQXFCO29CQUNqQyxRQUFRLEVBQUUsbUJBQW1CO29CQUM3QixNQUFNLEVBQUUsaUJBQWlCO29CQUN6QixRQUFRLEVBQUUsbUJBQW1CO29CQUM3QixjQUFjLEVBQUUseUJBQXlCO29CQUN6QyxnQkFBZ0IsRUFBRSxrQ0FBa0M7b0JBQ3BELFlBQVksRUFBRSx3QkFBd0I7aUJBQ3ZDLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELGdFQUFnRTtRQUNoRSxjQUFjLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQztRQUVoRiw0RUFBNEU7UUFDNUUseUJBQXlCO1FBQ3pCLDRFQUE0RTtRQUM1RSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQy9CLFdBQVcsRUFBRSxxQ0FBcUM7WUFDbEQsVUFBVSxFQUFFLHNCQUFzQixLQUFLLENBQUMsV0FBVyxFQUFFO1NBQ3RELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQy9CLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUs7WUFDekIsV0FBVyxFQUFFLHdCQUF3QjtTQUN0QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFyVkQsc0NBcVZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXl2MiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXl2MkludGVncmF0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5djJBdXRob3JpemVycyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWF1dGhvcml6ZXJzJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGxhbWJkYU5vZGVqcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbi8qKlxuICogUHJvcGVydGllcyBmb3IgdGhlIFJlbnRWaXNpb24gQVBJIGNvbnN0cnVjdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZW50VmlzaW9uQXBpUHJvcHMge1xuICAvKiogRW52aXJvbm1lbnQgbGFiZWwgKGUuZy4sICdkZXYnLCAnc3RhZ2luZycsICdwcm9kJykuICovXG4gIHJlYWRvbmx5IGVudmlyb25tZW50OiBzdHJpbmc7XG4gIC8qKiBEeW5hbW9EQiBwcm9wZXJ0aWVzIHRhYmxlLiAqL1xuICByZWFkb25seSBwcm9wZXJ0aWVzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICAvKiogRHluYW1vREIgdXNlcnMgdGFibGUuICovXG4gIHJlYWRvbmx5IHVzZXJzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICAvKiogRHluYW1vREIgbGVhc2VzIHRhYmxlLiAqL1xuICByZWFkb25seSBsZWFzZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIC8qKiBTMyBtZWRpYSBidWNrZXQgZm9yIHByb3BlcnR5IHBob3RvcyBhbmQgcGFub3JhbWFzLiAqL1xuICByZWFkb25seSBtZWRpYUJ1Y2tldDogczMuQnVja2V0O1xuICAvKiogUzMgbGVhc2UgZG9jdW1lbnRzIGJ1Y2tldC4gKi9cbiAgcmVhZG9ubHkgbGVhc2VEb2NzQnVja2V0OiBzMy5CdWNrZXQ7XG4gIC8qKiBDb2duaXRvIHVzZXIgcG9vbC4gKi9cbiAgcmVhZG9ubHkgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XG4gIC8qKiBDb2duaXRvIHVzZXIgcG9vbCBjbGllbnQuICovXG4gIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xuICAvKiogTmFtZSBvZiB0aGUgZ2Vvc3BhdGlhbCBHU0kgb24gdGhlIHByb3BlcnRpZXMgdGFibGUuICovXG4gIHJlYWRvbmx5IGdlb0luZGV4TmFtZTogc3RyaW5nO1xuICAvKiogTmFtZSBvZiB0aGUgc3RhdHVzIEdTSSBvbiB0aGUgcHJvcGVydGllcyB0YWJsZS4gKi9cbiAgcmVhZG9ubHkgc3RhdHVzSW5kZXhOYW1lOiBzdHJpbmc7XG4gIC8qKiBOYW1lIG9mIHRoZSBsYW5kbG9yZCBHU0kgb24gdGhlIHByb3BlcnRpZXMgdGFibGUuICovXG4gIHJlYWRvbmx5IGxhbmRsb3JkSW5kZXhOYW1lOiBzdHJpbmc7XG4gIC8qKiBBbGxvd2VkIENPUlMgb3JpZ2lucy4gKi9cbiAgcmVhZG9ubHkgY29yc0FsbG93ZWRPcmlnaW5zOiBzdHJpbmdbXTtcbiAgLyoqIEFJIHNlcnZpY2UgaG9zdCBmb3IgbGVhc2UgUSZBIGludGVncmF0aW9uLiAqL1xuICByZWFkb25seSBhaVNlcnZpY2VIb3N0Pzogc3RyaW5nO1xuICAvKiogQUkgc2VydmljZSBwb3J0IGZvciBsZWFzZSBRJkEgaW50ZWdyYXRpb24uICovXG4gIHJlYWRvbmx5IGFpU2VydmljZVBvcnQ/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogQ0RLIENvbnN0cnVjdCB0aGF0IHByb3Zpc2lvbnMgdGhlIEFQSSBHYXRld2F5IEhUVFAgQVBJIGFuZCBMYW1iZGEgZnVuY3Rpb25zXG4gKiBmb3IgdGhlIFJlbnRWaXNpb24gYmFja2VuZC5cbiAqXG4gKiBBcmNoaXRlY3R1cmU6XG4gKiAgIC0gSFRUUCBBUEkgKEFQSSBHYXRld2F5IHYyKSB3aXRoIENPUlMgYW5kIEpXVCBBdXRob3JpemVyXG4gKiAgIC0gTGFtYmRhIGZ1bmN0aW9ucyBmb3IgbGlzdGluZ3MsIG1lZGlhLCBhbmQgbGVhc2VzXG4gKiAgIC0gRWFjaCBMYW1iZGEgaGFzIGEgbGVhc3QtcHJpdmlsZWdlIElBTSByb2xlXG4gKiAgIC0gQ2xvdWRXYXRjaCBsb2cgZ3JvdXBzIHdpdGggMTQtZGF5IHJldGVudGlvblxuICpcbiAqIExhbWJkYSBmdW5jdGlvbnMgYXJlIGJ1bmRsZWQgZnJvbSB0aGUgc2VydmljZXMvYXBpL3NyYyBkaXJlY3RvcnkgdXNpbmdcbiAqIGVzYnVpbGQgdmlhIHRoZSBOb2RlanNGdW5jdGlvbiBjb25zdHJ1Y3QuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZW50VmlzaW9uQXBpIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgLyoqIFRoZSBIVFRQIEFQSSBHYXRld2F5LiAqL1xuICBwdWJsaWMgcmVhZG9ubHkgaHR0cEFwaTogYXBpZ2F0ZXdheXYyLkh0dHBBcGk7XG4gIC8qKiBUaGUgQ29nbml0byBKV1QgQXV0aG9yaXplci4gKi9cbiAgcHVibGljIHJlYWRvbmx5IGF1dGhvcml6ZXI6IGFwaWdhdGV3YXl2MkF1dGhvcml6ZXJzLkh0dHBKd3RBdXRob3JpemVyO1xuICAvKiogTGFtYmRhIGZ1bmN0aW9uIGZvciBsaXN0aW5ncyBDUlVEIGFuZCBnZW9zcGF0aWFsIHNlYXJjaC4gKi9cbiAgcHVibGljIHJlYWRvbmx5IGxpc3RpbmdzSGFuZGxlcjogbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uO1xuICAvKiogTGFtYmRhIGZ1bmN0aW9uIGZvciBtZWRpYSBwcmVzaWduZWQgVVJMIGdlbmVyYXRpb24uICovXG4gIHB1YmxpYyByZWFkb25seSBtZWRpYUhhbmRsZXI6IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbjtcbiAgLyoqIExhbWJkYSBmdW5jdGlvbiBmb3IgbGVhc2UgbWFuYWdlbWVudCBhbmQgQUkgUSZBLiAqL1xuICBwdWJsaWMgcmVhZG9ubHkgbGVhc2VIYW5kbGVyOiBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb247XG4gIC8qKiBMYW1iZGEgZnVuY3Rpb24gZm9yIGhlYWx0aCBjaGVjay4gKi9cbiAgcHVibGljIHJlYWRvbmx5IGhlYWx0aEhhbmRsZXI6IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUmVudFZpc2lvbkFwaVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIC8vIFBhdGggdG8gdGhlIExhbWJkYSBoYW5kbGVyIHNvdXJjZSBjb2RlIGFuZCBBUEkgcGFja2FnZSByb290XG4gICAgY29uc3QgYXBpUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICcuLicsICcuLicsICdzZXJ2aWNlcycsICdhcGknKTtcbiAgICBjb25zdCBoYW5kbGVyc1BhdGggPSBwYXRoLmpvaW4oYXBpUGF0aCwgJ3NyYycsICdoYW5kbGVycycpO1xuXG4gICAgLy8gQ29tbW9uIExhbWJkYSBjb25maWd1cmF0aW9uXG4gICAgY29uc3QgbGFtYmRhRGVmYXVsdHM6IFBhcnRpYWw8bGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uUHJvcHM+ID0ge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzI0X1gsXG4gICAgICBhcmNoaXRlY3R1cmU6IGxhbWJkYS5BcmNoaXRlY3R1cmUuQVJNXzY0LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgICAgcHJvamVjdFJvb3Q6IGFwaVBhdGgsXG4gICAgICBkZXBzTG9ja0ZpbGVQYXRoOiBwYXRoLmpvaW4oYXBpUGF0aCwgJ3BhY2thZ2UtbG9jay5qc29uJyksXG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBtaW5pZnk6IHRydWUsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgdGFyZ2V0OiAnZXMyMDIyJyxcbiAgICAgICAgLy8gRml4IGZvciBidW5kbGluZyBoYW5kbGVycyBvdXRzaWRlIHRoZSBDREsgcm9vdFxuICAgICAgICBub2RlTW9kdWxlczogWyd1dWlkJ10sIC8vIEV4YW1wbGUgb2YgZm9yY2luZyBpbmNsdXNpb24gaWYgbmVlZGVkXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gTGFtYmRhOiBIZWFsdGggSGFuZGxlclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICB0aGlzLmhlYWx0aEhhbmRsZXIgPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdIZWFsdGhIYW5kbGVyJywge1xuICAgICAgLi4ubGFtYmRhRGVmYXVsdHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGByZW50dmlzaW9uLWhlYWx0aC0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICBkZXNjcmlwdGlvbjogJ1B1YmxpYyBoZWFsdGggY2hlY2sgZW5kcG9pbnQnLFxuICAgICAgZW50cnk6IHBhdGguam9pbihoYW5kbGVyc1BhdGgsICdoZWFsdGgudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICB9KTtcblxuICAgIG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdIZWFsdGhIYW5kbGVyTG9ncycsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvbGFtYmRhL3JlbnR2aXNpb24taGVhbHRoLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gTGFtYmRhOiBMaXN0aW5ncyBIYW5kbGVyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIHRoaXMubGlzdGluZ3NIYW5kbGVyID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnTGlzdGluZ3NIYW5kbGVyJywge1xuICAgICAgLi4ubGFtYmRhRGVmYXVsdHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGByZW50dmlzaW9uLWxpc3RpbmdzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnSGFuZGxlcyBwcm9wZXJ0eSBsaXN0aW5nIENSVUQgYW5kIGdlb3NwYXRpYWwgcmFkaXVzIHNlYXJjaCcsXG4gICAgICBlbnRyeTogcGF0aC5qb2luKGhhbmRsZXJzUGF0aCwgJ2xpc3RpbmdzLnRzJyksXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBEWU5BTU9EQl9QUk9QRVJUSUVTX1RBQkxFOiBwcm9wcy5wcm9wZXJ0aWVzVGFibGUudGFibGVOYW1lLFxuICAgICAgICBMSVNUSU5HU19HRU9fSU5ERVhfTkFNRTogcHJvcHMuZ2VvSW5kZXhOYW1lLFxuICAgICAgICBMSVNUSU5HU19TVEFUVVNfSU5ERVhfTkFNRTogcHJvcHMuc3RhdHVzSW5kZXhOYW1lLFxuICAgICAgICBMSVNUSU5HU19MQU5ETE9SRF9JTkRFWF9OQU1FOiBwcm9wcy5sYW5kbG9yZEluZGV4TmFtZSxcbiAgICAgICAgTk9ERV9PUFRJT05TOiAnLS1lbmFibGUtc291cmNlLW1hcHMnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIExlYXN0LXByaXZpbGVnZTogcmVhZC93cml0ZSBvbiBwcm9wZXJ0aWVzIHRhYmxlIGFuZCBpdHMgaW5kZXhlc1xuICAgIHByb3BzLnByb3BlcnRpZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGhpcy5saXN0aW5nc0hhbmRsZXIpO1xuXG4gICAgLy8gQ2xvdWRXYXRjaCBsb2cgZ3JvdXAgd2l0aCByZXRlbnRpb24gcG9saWN5XG4gICAgbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0xpc3RpbmdzSGFuZGxlckxvZ3MnLCB7XG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2xhbWJkYS9yZW50dmlzaW9uLWxpc3RpbmdzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gTGFtYmRhOiBNZWRpYSBIYW5kbGVyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIHRoaXMubWVkaWFIYW5kbGVyID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnTWVkaWFIYW5kbGVyJywge1xuICAgICAgLi4ubGFtYmRhRGVmYXVsdHMsXG4gICAgICBmdW5jdGlvbk5hbWU6IGByZW50dmlzaW9uLW1lZGlhLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIGRlc2NyaXB0aW9uOiAnR2VuZXJhdGVzIHByZXNpZ25lZCBVUkxzIGZvciBwcm9wZXJ0eSBtZWRpYSB1cGxvYWQgYW5kIGRvd25sb2FkJyxcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oaGFuZGxlcnNQYXRoLCAnbWVkaWEudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFMzX1BST1BFUlRZX01FRElBX0JVQ0tFVDogcHJvcHMubWVkaWFCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgTk9ERV9PUFRJT05TOiAnLS1lbmFibGUtc291cmNlLW1hcHMnLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIExlYXN0LXByaXZpbGVnZTogcmVhZC93cml0ZSBvbiBtZWRpYSBidWNrZXQgb25seVxuICAgIHByb3BzLm1lZGlhQnVja2V0LmdyYW50UmVhZFdyaXRlKHRoaXMubWVkaWFIYW5kbGVyKTtcblxuICAgIG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdNZWRpYUhhbmRsZXJMb2dzJywge1xuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9sYW1iZGEvcmVudHZpc2lvbi1tZWRpYS0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5UV09fV0VFS1MsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIExhbWJkYTogTGVhc2UgSGFuZGxlclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICB0aGlzLmxlYXNlSGFuZGxlciA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0xlYXNlSGFuZGxlcicsIHtcbiAgICAgIC4uLmxhbWJkYURlZmF1bHRzLFxuICAgICAgZnVuY3Rpb25OYW1lOiBgcmVudHZpc2lvbi1sZWFzZXMtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdNYW5hZ2VzIGxlYXNlIGRvY3VtZW50czogdXBsb2FkLCByZXRyaWV2YWwsIGFuZCBBSSBRJkEnLFxuICAgICAgZW50cnk6IHBhdGguam9pbihoYW5kbGVyc1BhdGgsICdsZWFzZXMudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFMzX0xFQVNFX0RPQ1VNRU5UU19CVUNLRVQ6IHByb3BzLmxlYXNlRG9jc0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICBEWU5BTU9EQl9MRUFTRVNfVEFCTEU6IHByb3BzLmxlYXNlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgICAgQUlfU0VSVklDRV9IT1NUOiBwcm9wcy5haVNlcnZpY2VIb3N0ID8/ICcxMjcuMC4wLjEnLFxuICAgICAgICBBSV9TRVJWSUNFX1BPUlQ6IHByb3BzLmFpU2VydmljZVBvcnQgPz8gJzgwMDAnLFxuICAgICAgICBOT0RFX09QVElPTlM6ICctLWVuYWJsZS1zb3VyY2UtbWFwcycsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gTGVhc3QtcHJpdmlsZWdlOiByZWFkL3dyaXRlIG9uIGxlYXNlIGRvY3MgYnVja2V0IGFuZCBsZWFzZXMgdGFibGVcbiAgICBwcm9wcy5sZWFzZURvY3NCdWNrZXQuZ3JhbnRSZWFkV3JpdGUodGhpcy5sZWFzZUhhbmRsZXIpO1xuICAgIHByb3BzLmxlYXNlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh0aGlzLmxlYXNlSGFuZGxlcik7XG5cbiAgICBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnTGVhc2VIYW5kbGVyTG9ncycsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvbGFtYmRhL3JlbnR2aXNpb24tbGVhc2VzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUyxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gSFRUUCBBUEkgR2F0ZXdheVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICB0aGlzLmh0dHBBcGkgPSBuZXcgYXBpZ2F0ZXdheXYyLkh0dHBBcGkodGhpcywgJ0h0dHBBcGknLCB7XG4gICAgICBhcGlOYW1lOiBgcmVudHZpc2lvbi1hcGktJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgZGVzY3JpcHRpb246ICdSZW50VmlzaW9uIFJFU1QgQVBJIOKAlCBsaXN0aW5ncywgbWVkaWEsIGFuZCBsZWFzZSBvcGVyYXRpb25zJyxcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBwcm9wcy5jb3JzQWxsb3dlZE9yaWdpbnMsXG4gICAgICAgIGFsbG93TWV0aG9kczogW1xuICAgICAgICAgIGFwaWdhdGV3YXl2Mi5Db3JzSHR0cE1ldGhvZC5HRVQsXG4gICAgICAgICAgYXBpZ2F0ZXdheXYyLkNvcnNIdHRwTWV0aG9kLlBPU1QsXG4gICAgICAgICAgYXBpZ2F0ZXdheXYyLkNvcnNIdHRwTWV0aG9kLlBVVCxcbiAgICAgICAgICBhcGlnYXRld2F5djIuQ29yc0h0dHBNZXRob2QuUEFUQ0gsXG4gICAgICAgICAgYXBpZ2F0ZXdheXYyLkNvcnNIdHRwTWV0aG9kLkRFTEVURSxcbiAgICAgICAgICBhcGlnYXRld2F5djIuQ29yc0h0dHBNZXRob2QuT1BUSU9OUyxcbiAgICAgICAgXSxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxuICAgICAgICAgICdYLUFtei1EYXRlJyxcbiAgICAgICAgICAnWC1BcGktS2V5JyxcbiAgICAgICAgICAnWC1BbXotU2VjdXJpdHktVG9rZW4nLFxuICAgICAgICAgICdYLVJlcXVlc3QtSWQnLFxuICAgICAgICAgICdYLVVzZXItSWQnLFxuICAgICAgICAgICdYLVVzZXItUm9sZScsXG4gICAgICAgIF0sXG4gICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIENvZ25pdG8gSldUIEF1dGhvcml6ZXJcbiAgICB0aGlzLmF1dGhvcml6ZXIgPSBuZXcgYXBpZ2F0ZXdheXYyQXV0aG9yaXplcnMuSHR0cEp3dEF1dGhvcml6ZXIoJ0p3dEF1dGhvcml6ZXInLCBwcm9wcy51c2VyUG9vbC51c2VyUG9vbFByb3ZpZGVyVXJsLCB7XG4gICAgICBqd3RBdWRpZW5jZTogW3Byb3BzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRdLFxuICAgICAgYXV0aG9yaXplck5hbWU6IGByZW50dmlzaW9uLWp3dC1hdXRob3JpemVyLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBpbnRlZ3JhdGlvbnNcbiAgICBjb25zdCBoZWFsdGhJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5djJJbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKFxuICAgICAgJ0hlYWx0aEludGVncmF0aW9uJyxcbiAgICAgIHRoaXMuaGVhbHRoSGFuZGxlcixcbiAgICApO1xuICAgIGNvbnN0IGxpc3RpbmdzSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheXYySW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcbiAgICAgICdMaXN0aW5nc0ludGVncmF0aW9uJyxcbiAgICAgIHRoaXMubGlzdGluZ3NIYW5kbGVyLFxuICAgICk7XG4gICAgY29uc3QgbWVkaWFJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5djJJbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKFxuICAgICAgJ01lZGlhSW50ZWdyYXRpb24nLFxuICAgICAgdGhpcy5tZWRpYUhhbmRsZXIsXG4gICAgKTtcbiAgICBjb25zdCBsZWFzZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXl2MkludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oXG4gICAgICAnTGVhc2VJbnRlZ3JhdGlvbicsXG4gICAgICB0aGlzLmxlYXNlSGFuZGxlcixcbiAgICApO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIEFQSSBSb3V0ZXNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgICAvLyBIZWFsdGggcm91dGUgKFB1YmxpYylcbiAgICB0aGlzLmh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvaGVhbHRoJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGhlYWx0aEludGVncmF0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gTGlzdGluZ3Mgcm91dGVzXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2xpc3RpbmdzJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGxpc3RpbmdzSW50ZWdyYXRpb24sXG4gICAgfSk7XG5cbiAgICB0aGlzLmh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvbGlzdGluZ3MnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXl2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IGxpc3RpbmdzSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiB0aGlzLmF1dGhvcml6ZXIsXG4gICAgfSk7XG5cbiAgICAvLyBBdXRoZW50aWNhdGVkIGxhbmRsb3JkIHBvcnRmb2xpby4gUmVnaXN0ZXJlZCBiZWZvcmUgdGhlIHBhcmFtZXRlcml6ZWRcbiAgICAvLyByb3V0ZSBzbyBgL2xpc3RpbmdzL21pbmVgIGlzIG5ldmVyIHRyZWF0ZWQgYXMgYSBsaXN0aW5nIElELlxuICAgIHRoaXMuaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9saXN0aW5ncy9taW5lJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGxpc3RpbmdzSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiB0aGlzLmF1dGhvcml6ZXIsXG4gICAgfSk7XG5cbiAgICB0aGlzLmh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvbGlzdGluZ3Mve2lkfScsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheXYyLkh0dHBNZXRob2QuR0VUXSxcbiAgICAgIGludGVncmF0aW9uOiBsaXN0aW5nc0ludGVncmF0aW9uLFxuICAgIH0pO1xuXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2xpc3RpbmdzL3tpZH0nLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXl2Mi5IdHRwTWV0aG9kLlBVVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbGlzdGluZ3NJbnRlZ3JhdGlvbixcbiAgICAgIGF1dGhvcml6ZXI6IHRoaXMuYXV0aG9yaXplcixcbiAgICB9KTtcblxuICAgIHRoaXMuaHR0cEFwaS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogJy9saXN0aW5ncy97aWR9L3N0YXR1cycsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheXYyLkh0dHBNZXRob2QuUEFUQ0hdLFxuICAgICAgaW50ZWdyYXRpb246IGxpc3RpbmdzSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiB0aGlzLmF1dGhvcml6ZXIsXG4gICAgfSk7XG5cbiAgICB0aGlzLmh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvbGlzdGluZ3Mve2lkfS9pbWFnZXMnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXl2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IGxpc3RpbmdzSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiB0aGlzLmF1dGhvcml6ZXIsXG4gICAgfSk7XG5cbiAgICB0aGlzLmh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvbGlzdGluZ3Mvc2VhcmNoJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGxpc3RpbmdzSW50ZWdyYXRpb24sXG4gICAgfSk7XG5cbiAgICAvLyBNZWRpYSByb3V0ZXNcbiAgICB0aGlzLmh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvbWVkaWEvdXBsb2FkLXVybCcsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheXYyLkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogbWVkaWFJbnRlZ3JhdGlvbixcbiAgICAgIGF1dGhvcml6ZXI6IHRoaXMuYXV0aG9yaXplcixcbiAgICB9KTtcblxuICAgIC8vIFB1YmxpYyByb3V0ZTogdGhlIGhhbmRsZXIgb25seSBzaWducyBtZWRpYSBmb3IgYXBwcm92ZWQgbGlzdGluZ3MsIHNvXG4gICAgLy8gbGlzdGluZyBjYXJkcyB3b3JrIGZvciBhbm9ueW1vdXMgdmlzaXRvcnMgd2hpbGUgcHJpdmF0ZS9ub24tYXBwcm92ZWRcbiAgICAvLyBtZWRpYSBzdGF5cyBpbmFjY2Vzc2libGUuXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL21lZGlhL2Rvd25sb2FkLXVybCcsXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheXYyLkh0dHBNZXRob2QuR0VUXSxcbiAgICAgIGludGVncmF0aW9uOiBtZWRpYUludGVncmF0aW9uLFxuICAgIH0pO1xuXG4gICAgLy8gTGVhc2Ugcm91dGVzXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2xlYXNlcy91cGxvYWQtdXJsJyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5djIuSHR0cE1ldGhvZC5QT1NUXSxcbiAgICAgIGludGVncmF0aW9uOiBsZWFzZUludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogdGhpcy5hdXRob3JpemVyLFxuICAgIH0pO1xuXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiAnL2xlYXNlcy97aWR9JyxcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5djIuSHR0cE1ldGhvZC5HRVRdLFxuICAgICAgaW50ZWdyYXRpb246IGxlYXNlSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiB0aGlzLmF1dGhvcml6ZXIsXG4gICAgfSk7XG5cbiAgICB0aGlzLmh0dHBBcGkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6ICcvbGVhc2VzL3tpZH0vcWEnLFxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXl2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IGxlYXNlSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiB0aGlzLmF1dGhvcml6ZXIsXG4gICAgfSk7XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gQWNjZXNzIExvZ2dpbmdcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgY29uc3QgYWNjZXNzTG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnQXBpQWNjZXNzTG9ncycsIHtcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvYXBpZ2F0ZXdheS9yZW50dmlzaW9uLWFwaS0ke3Byb3BzLmVudmlyb25tZW50fWAsXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5UV09fV0VFS1MsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgc3RhZ2UgPSB0aGlzLmh0dHBBcGkuZGVmYXVsdFN0YWdlPy5ub2RlLmRlZmF1bHRDaGlsZCBhcyBhcGlnYXRld2F5djIuQ2ZuU3RhZ2U7XG4gICAgaWYgKHN0YWdlKSB7XG4gICAgICBzdGFnZS5hY2Nlc3NMb2dTZXR0aW5ncyA9IHtcbiAgICAgICAgZGVzdGluYXRpb25Bcm46IGFjY2Vzc0xvZ0dyb3VwLmxvZ0dyb3VwQXJuLFxuICAgICAgICBmb3JtYXQ6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICByZXF1ZXN0SWQ6ICckY29udGV4dC5yZXF1ZXN0SWQnLFxuICAgICAgICAgIGlwOiAnJGNvbnRleHQuaWRlbnRpdHkuc291cmNlSXAnLFxuICAgICAgICAgIHJlcXVlc3RUaW1lOiAnJGNvbnRleHQucmVxdWVzdFRpbWUnLFxuICAgICAgICAgIGh0dHBNZXRob2Q6ICckY29udGV4dC5odHRwTWV0aG9kJyxcbiAgICAgICAgICByb3V0ZUtleTogJyRjb250ZXh0LnJvdXRlS2V5JyxcbiAgICAgICAgICBzdGF0dXM6ICckY29udGV4dC5zdGF0dXMnLFxuICAgICAgICAgIHByb3RvY29sOiAnJGNvbnRleHQucHJvdG9jb2wnLFxuICAgICAgICAgIHJlc3BvbnNlTGVuZ3RoOiAnJGNvbnRleHQucmVzcG9uc2VMZW5ndGgnLFxuICAgICAgICAgIGludGVncmF0aW9uRXJyb3I6ICckY29udGV4dC5pbnRlZ3JhdGlvbkVycm9yTWVzc2FnZScsXG4gICAgICAgICAgZXJyb3JNZXNzYWdlOiAnJGNvbnRleHQuZXJyb3IubWVzc2FnZScsXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBHcmFudCBBUEkgR2F0ZXdheSBwZXJtaXNzaW9uIHRvIHdyaXRlIHRvIHRoZSBhY2Nlc3MgbG9nIGdyb3VwXG4gICAgYWNjZXNzTG9nR3JvdXAuZ3JhbnRXcml0ZShuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2FwaWdhdGV3YXkuYW1hem9uYXdzLmNvbScpKTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBDbG91ZEZvcm1hdGlvbiBPdXRwdXRzXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XG4gICAgICB2YWx1ZTogdGhpcy5odHRwQXBpLmFwaUVuZHBvaW50LFxuICAgICAgZGVzY3JpcHRpb246ICdSZW50VmlzaW9uIEFQSSBHYXRld2F5IGVuZHBvaW50IFVSTCcsXG4gICAgICBleHBvcnROYW1lOiBgcmVudHZpc2lvbi1hcGktdXJsLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlJZCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmh0dHBBcGkuYXBpSWQsXG4gICAgICBkZXNjcmlwdGlvbjogJ1JlbnRWaXNpb24gSFRUUCBBUEkgSUQnLFxuICAgIH0pO1xuICB9XG59XG4iXX0=