"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentVisionApi = void 0;
const cdk = require("aws-cdk-lib");
const apigatewayv2 = require("aws-cdk-lib/aws-apigatewayv2");
const apigatewayv2Integrations = require("aws-cdk-lib/aws-apigatewayv2-integrations");
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
 *   - HTTP API (API Gateway v2) with CORS
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
    /** Lambda function for listings CRUD and geospatial search. */
    listingsHandler;
    /** Lambda function for media presigned URL generation. */
    mediaHandler;
    /** Lambda function for lease management and AI Q&A. */
    leaseHandler;
    constructor(scope, id, props) {
        super(scope, id);
        // Path to the Lambda handler source code
        const handlersPath = path.join(__dirname, '..', '..', '..', 'services', 'api', 'src', 'handlers');
        // Common Lambda configuration
        const lambdaDefaults = {
            runtime: lambda.Runtime.NODEJS_20_X,
            architecture: lambda.Architecture.ARM_64,
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            tracing: lambda.Tracing.ACTIVE,
            bundling: {
                minify: true,
                sourceMap: true,
                target: 'es2022',
                // Externals that should not be bundled
                externalModules: [],
            },
        };
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
                ],
                maxAge: cdk.Duration.hours(1),
            },
        });
        // Lambda integrations
        const listingsIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('ListingsIntegration', this.listingsHandler);
        const mediaIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('MediaIntegration', this.mediaHandler);
        const leaseIntegration = new apigatewayv2Integrations.HttpLambdaIntegration('LeaseIntegration', this.leaseHandler);
        // -------------------------------------------------------------------------
        // API Routes
        // -------------------------------------------------------------------------
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
        });
        this.httpApi.addRoutes({
            path: '/listings/{id}',
            methods: [apigatewayv2.HttpMethod.GET],
            integration: listingsIntegration,
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
        });
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
        });
        this.httpApi.addRoutes({
            path: '/leases/{id}',
            methods: [apigatewayv2.HttpMethod.GET],
            integration: leaseIntegration,
        });
        this.httpApi.addRoutes({
            path: '/leases/{id}/qa',
            methods: [apigatewayv2.HttpMethod.POST],
            integration: leaseIntegration,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpLWNvbnN0cnVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwaS1jb25zdHJ1Y3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDZEQUE2RDtBQUM3RCxzRkFBc0Y7QUFDdEYsaURBQWlEO0FBQ2pELDhEQUE4RDtBQUc5RCw2Q0FBNkM7QUFDN0MsMkNBQTJDO0FBQzNDLDJDQUF1QztBQUN2Qyw2QkFBNkI7QUE4QjdCOzs7Ozs7Ozs7Ozs7R0FZRztBQUNILE1BQWEsYUFBYyxTQUFRLHNCQUFTO0lBQzFDLDRCQUE0QjtJQUNaLE9BQU8sQ0FBdUI7SUFDOUMsK0RBQStEO0lBQy9DLGVBQWUsQ0FBOEI7SUFDN0QsMERBQTBEO0lBQzFDLFlBQVksQ0FBOEI7SUFDMUQsdURBQXVEO0lBQ3ZDLFlBQVksQ0FBOEI7SUFFMUQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLHlDQUF5QztRQUN6QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVsRyw4QkFBOEI7UUFDOUIsTUFBTSxjQUFjLEdBQThDO1lBQ2hFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTTtZQUN4QyxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTTtZQUM5QixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFF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SSxFQUFFLFFBQVEsRUFBRTtZQUNoQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQy9CLFdBQVcsRUFBRSxxQ0FBcUM7WUFDbEQsVUFBVSxFQUFFLHNCQUFzQixLQUFLLENBQUMsV0FBVyxFQUFFO1NBQ3RELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQy9CLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUs7WUFDekIsV0FBVyxFQUFFLHdCQUF3QjtTQUN0QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFsUUQsc0NBa1FDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheXYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xyXG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5djJJbnRlZ3JhdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYU5vZGVqcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuLyoqXHJcbiAqIFByb3BlcnRpZXMgZm9yIHRoZSBSZW50VmlzaW9uIEFQSSBjb25zdHJ1Y3QuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFJlbnRWaXNpb25BcGlQcm9wcyB7XHJcbiAgLyoqIEVudmlyb25tZW50IGxhYmVsIChlLmcuLCAnZGV2JywgJ3N0YWdpbmcnLCAncHJvZCcpLiAqL1xyXG4gIHJlYWRvbmx5IGVudmlyb25tZW50OiBzdHJpbmc7XHJcbiAgLyoqIER5bmFtb0RCIHByb3BlcnRpZXMgdGFibGUuICovXHJcbiAgcmVhZG9ubHkgcHJvcGVydGllc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICAvKiogRHluYW1vREIgdXNlcnMgdGFibGUuICovXHJcbiAgcmVhZG9ubHkgdXNlcnNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgLyoqIER5bmFtb0RCIGxlYXNlcyB0YWJsZS4gKi9cclxuICByZWFkb25seSBsZWFzZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgLyoqIFMzIG1lZGlhIGJ1Y2tldCBmb3IgcHJvcGVydHkgcGhvdG9zIGFuZCBwYW5vcmFtYXMuICovXHJcbiAgcmVhZG9ubHkgbWVkaWFCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICAvKiogUzMgbGVhc2UgZG9jdW1lbnRzIGJ1Y2tldC4gKi9cclxuICByZWFkb25seSBsZWFzZURvY3NCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICAvKiogTmFtZSBvZiB0aGUgZ2Vvc3BhdGlhbCBHU0kgb24gdGhlIHByb3BlcnRpZXMgdGFibGUuICovXHJcbiAgcmVhZG9ubHkgZ2VvSW5kZXhOYW1lOiBzdHJpbmc7XHJcbiAgLyoqIE5hbWUgb2YgdGhlIHN0YXR1cyBHU0kgb24gdGhlIHByb3BlcnRpZXMgdGFibGUuICovXHJcbiAgcmVhZG9ubHkgc3RhdHVzSW5kZXhOYW1lOiBzdHJpbmc7XHJcbiAgLyoqIEFsbG93ZWQgQ09SUyBvcmlnaW5zLiAqL1xyXG4gIHJlYWRvbmx5IGNvcnNBbGxvd2VkT3JpZ2luczogc3RyaW5nW107XHJcbiAgLyoqIEFJIHNlcnZpY2UgaG9zdCBmb3IgbGVhc2UgUSZBIGludGVncmF0aW9uLiAqL1xyXG4gIHJlYWRvbmx5IGFpU2VydmljZUhvc3Q/OiBzdHJpbmc7XHJcbiAgLyoqIEFJIHNlcnZpY2UgcG9ydCBmb3IgbGVhc2UgUSZBIGludGVncmF0aW9uLiAqL1xyXG4gIHJlYWRvbmx5IGFpU2VydmljZVBvcnQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDREsgQ29uc3RydWN0IHRoYXQgcHJvdmlzaW9ucyB0aGUgQVBJIEdhdGV3YXkgSFRUUCBBUEkgYW5kIExhbWJkYSBmdW5jdGlvbnNcclxuICogZm9yIHRoZSBSZW50VmlzaW9uIGJhY2tlbmQuXHJcbiAqXHJcbiAqIEFyY2hpdGVjdHVyZTpcclxuICogICAtIEhUVFAgQVBJIChBUEkgR2F0ZXdheSB2Mikgd2l0aCBDT1JTXHJcbiAqICAgLSBMYW1iZGEgZnVuY3Rpb25zIGZvciBsaXN0aW5ncywgbWVkaWEsIGFuZCBsZWFzZXNcclxuICogICAtIEVhY2ggTGFtYmRhIGhhcyBhIGxlYXN0LXByaXZpbGVnZSBJQU0gcm9sZVxyXG4gKiAgIC0gQ2xvdWRXYXRjaCBsb2cgZ3JvdXBzIHdpdGggMTQtZGF5IHJldGVudGlvblxyXG4gKlxyXG4gKiBMYW1iZGEgZnVuY3Rpb25zIGFyZSBidW5kbGVkIGZyb20gdGhlIHNlcnZpY2VzL2FwaS9zcmMgZGlyZWN0b3J5IHVzaW5nXHJcbiAqIGVzYnVpbGQgdmlhIHRoZSBOb2RlanNGdW5jdGlvbiBjb25zdHJ1Y3QuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUmVudFZpc2lvbkFwaSBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgLyoqIFRoZSBIVFRQIEFQSSBHYXRld2F5LiAqL1xyXG4gIHB1YmxpYyByZWFkb25seSBodHRwQXBpOiBhcGlnYXRld2F5djIuSHR0cEFwaTtcclxuICAvKiogTGFtYmRhIGZ1bmN0aW9uIGZvciBsaXN0aW5ncyBDUlVEIGFuZCBnZW9zcGF0aWFsIHNlYXJjaC4gKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgbGlzdGluZ3NIYW5kbGVyOiBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb247XHJcbiAgLyoqIExhbWJkYSBmdW5jdGlvbiBmb3IgbWVkaWEgcHJlc2lnbmVkIFVSTCBnZW5lcmF0aW9uLiAqL1xyXG4gIHB1YmxpYyByZWFkb25seSBtZWRpYUhhbmRsZXI6IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbjtcclxuICAvKiogTGFtYmRhIGZ1bmN0aW9uIGZvciBsZWFzZSBtYW5hZ2VtZW50IGFuZCBBSSBRJkEuICovXHJcbiAgcHVibGljIHJlYWRvbmx5IGxlYXNlSGFuZGxlcjogbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUmVudFZpc2lvbkFwaVByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIC8vIFBhdGggdG8gdGhlIExhbWJkYSBoYW5kbGVyIHNvdXJjZSBjb2RlXHJcbiAgICBjb25zdCBoYW5kbGVyc1BhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAnLi4nLCAnc2VydmljZXMnLCAnYXBpJywgJ3NyYycsICdoYW5kbGVycycpO1xyXG5cclxuICAgIC8vIENvbW1vbiBMYW1iZGEgY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgbGFtYmRhRGVmYXVsdHM6IFBhcnRpYWw8bGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uUHJvcHM+ID0ge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgYXJjaGl0ZWN0dXJlOiBsYW1iZGEuQXJjaGl0ZWN0dXJlLkFSTV82NCxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSxcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiB0cnVlLFxyXG4gICAgICAgIHRhcmdldDogJ2VzMjAyMicsXHJcbiAgICAgICAgLy8gRXh0ZXJuYWxzIHRoYXQgc2hvdWxkIG5vdCBiZSBidW5kbGVkXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbXSxcclxuICAgICAgfSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gTGFtYmRhOiBMaXN0aW5ncyBIYW5kbGVyXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICB0aGlzLmxpc3RpbmdzSGFuZGxlciA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0xpc3RpbmdzSGFuZGxlcicsIHtcclxuICAgICAgLi4ubGFtYmRhRGVmYXVsdHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYHJlbnR2aXNpb24tbGlzdGluZ3MtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0hhbmRsZXMgcHJvcGVydHkgbGlzdGluZyBDUlVEIGFuZCBnZW9zcGF0aWFsIHJhZGl1cyBzZWFyY2gnLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKGhhbmRsZXJzUGF0aCwgJ2xpc3RpbmdzLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBEWU5BTU9EQl9QUk9QRVJUSUVTX1RBQkxFOiBwcm9wcy5wcm9wZXJ0aWVzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIExJU1RJTkdTX0dFT19JTkRFWF9OQU1FOiBwcm9wcy5nZW9JbmRleE5hbWUsXHJcbiAgICAgICAgTElTVElOR1NfU1RBVFVTX0lOREVYX05BTUU6IHByb3BzLnN0YXR1c0luZGV4TmFtZSxcclxuICAgICAgICBOT0RFX09QVElPTlM6ICctLWVuYWJsZS1zb3VyY2UtbWFwcycsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMZWFzdC1wcml2aWxlZ2U6IHJlYWQvd3JpdGUgb24gcHJvcGVydGllcyB0YWJsZSBhbmQgaXRzIGluZGV4ZXNcclxuICAgIHByb3BzLnByb3BlcnRpZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGhpcy5saXN0aW5nc0hhbmRsZXIpO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggbG9nIGdyb3VwIHdpdGggcmV0ZW50aW9uIHBvbGljeVxyXG4gICAgbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0xpc3RpbmdzSGFuZGxlckxvZ3MnLCB7XHJcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvbGFtYmRhL3JlbnR2aXNpb24tbGlzdGluZ3MtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5UV09fV0VFS1MsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyBMYW1iZGE6IE1lZGlhIEhhbmRsZXJcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIHRoaXMubWVkaWFIYW5kbGVyID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnTWVkaWFIYW5kbGVyJywge1xyXG4gICAgICAuLi5sYW1iZGFEZWZhdWx0cyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgcmVudHZpc2lvbi1tZWRpYS0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnR2VuZXJhdGVzIHByZXNpZ25lZCBVUkxzIGZvciBwcm9wZXJ0eSBtZWRpYSB1cGxvYWQgYW5kIGRvd25sb2FkJyxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihoYW5kbGVyc1BhdGgsICdtZWRpYS50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUzNfUFJPUEVSVFlfTUVESUFfQlVDS0VUOiBwcm9wcy5tZWRpYUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIE5PREVfT1BUSU9OUzogJy0tZW5hYmxlLXNvdXJjZS1tYXBzJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIExlYXN0LXByaXZpbGVnZTogcmVhZC93cml0ZSBvbiBtZWRpYSBidWNrZXQgb25seVxyXG4gICAgcHJvcHMubWVkaWFCdWNrZXQuZ3JhbnRSZWFkV3JpdGUodGhpcy5tZWRpYUhhbmRsZXIpO1xyXG5cclxuICAgIG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdNZWRpYUhhbmRsZXJMb2dzJywge1xyXG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2xhbWJkYS9yZW50dmlzaW9uLW1lZGlhLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuVFdPX1dFRUtTLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gTGFtYmRhOiBMZWFzZSBIYW5kbGVyXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICB0aGlzLmxlYXNlSGFuZGxlciA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0xlYXNlSGFuZGxlcicsIHtcclxuICAgICAgLi4ubGFtYmRhRGVmYXVsdHMsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYHJlbnR2aXNpb24tbGVhc2VzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdNYW5hZ2VzIGxlYXNlIGRvY3VtZW50czogdXBsb2FkLCByZXRyaWV2YWwsIGFuZCBBSSBRJkEnLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKGhhbmRsZXJzUGF0aCwgJ2xlYXNlcy50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUzNfTEVBU0VfRE9DVU1FTlRTX0JVQ0tFVDogcHJvcHMubGVhc2VEb2NzQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgRFlOQU1PREJfTEVBU0VTX1RBQkxFOiBwcm9wcy5sZWFzZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgQUlfU0VSVklDRV9IT1NUOiBwcm9wcy5haVNlcnZpY2VIb3N0ID8/ICcxMjcuMC4wLjEnLFxyXG4gICAgICAgIEFJX1NFUlZJQ0VfUE9SVDogcHJvcHMuYWlTZXJ2aWNlUG9ydCA/PyAnODAwMCcsXHJcbiAgICAgICAgTk9ERV9PUFRJT05TOiAnLS1lbmFibGUtc291cmNlLW1hcHMnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGVhc3QtcHJpdmlsZWdlOiByZWFkL3dyaXRlIG9uIGxlYXNlIGRvY3MgYnVja2V0IGFuZCBsZWFzZXMgdGFibGVcclxuICAgIHByb3BzLmxlYXNlRG9jc0J1Y2tldC5ncmFudFJlYWRXcml0ZSh0aGlzLmxlYXNlSGFuZGxlcik7XHJcbiAgICBwcm9wcy5sZWFzZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGhpcy5sZWFzZUhhbmRsZXIpO1xyXG5cclxuICAgIG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdMZWFzZUhhbmRsZXJMb2dzJywge1xyXG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2xhbWJkYS9yZW50dmlzaW9uLWxlYXNlcy0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIEhUVFAgQVBJIEdhdGV3YXlcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIHRoaXMuaHR0cEFwaSA9IG5ldyBhcGlnYXRld2F5djIuSHR0cEFwaSh0aGlzLCAnSHR0cEFwaScsIHtcclxuICAgICAgYXBpTmFtZTogYHJlbnR2aXNpb24tYXBpLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdSZW50VmlzaW9uIFJFU1QgQVBJIOKAlCBsaXN0aW5ncywgbWVkaWEsIGFuZCBsZWFzZSBvcGVyYXRpb25zJyxcclxuICAgICAgY29yc1ByZWZsaWdodDoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogcHJvcHMuY29yc0FsbG93ZWRPcmlnaW5zLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogW1xyXG4gICAgICAgICAgYXBpZ2F0ZXdheXYyLkNvcnNIdHRwTWV0aG9kLkdFVCxcclxuICAgICAgICAgIGFwaWdhdGV3YXl2Mi5Db3JzSHR0cE1ldGhvZC5QT1NULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheXYyLkNvcnNIdHRwTWV0aG9kLlBVVCxcclxuICAgICAgICAgIGFwaWdhdGV3YXl2Mi5Db3JzSHR0cE1ldGhvZC5ERUxFVEUsXHJcbiAgICAgICAgICBhcGlnYXRld2F5djIuQ29yc0h0dHBNZXRob2QuT1BUSU9OUyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXHJcbiAgICAgICAgICAnWC1BcGktS2V5JyxcclxuICAgICAgICAgICdYLUFtei1TZWN1cml0eS1Ub2tlbicsXHJcbiAgICAgICAgICAnWC1SZXF1ZXN0LUlkJyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRhIGludGVncmF0aW9uc1xyXG4gICAgY29uc3QgbGlzdGluZ3NJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5djJJbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKFxyXG4gICAgICAnTGlzdGluZ3NJbnRlZ3JhdGlvbicsXHJcbiAgICAgIHRoaXMubGlzdGluZ3NIYW5kbGVyLFxyXG4gICAgKTtcclxuICAgIGNvbnN0IG1lZGlhSW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheXYySW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcclxuICAgICAgJ01lZGlhSW50ZWdyYXRpb24nLFxyXG4gICAgICB0aGlzLm1lZGlhSGFuZGxlcixcclxuICAgICk7XHJcbiAgICBjb25zdCBsZWFzZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXl2MkludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oXHJcbiAgICAgICdMZWFzZUludGVncmF0aW9uJyxcclxuICAgICAgdGhpcy5sZWFzZUhhbmRsZXIsXHJcbiAgICApO1xyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIEFQSSBSb3V0ZXNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAvLyBMaXN0aW5ncyByb3V0ZXNcclxuICAgIHRoaXMuaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2xpc3RpbmdzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXl2Mi5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBsaXN0aW5nc0ludGVncmF0aW9uLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbGlzdGluZ3MnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheXYyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBsaXN0aW5nc0ludGVncmF0aW9uLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbGlzdGluZ3Mve2lkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5djIuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbGlzdGluZ3NJbnRlZ3JhdGlvbixcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2xpc3RpbmdzL3NlYXJjaCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5djIuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbGlzdGluZ3NJbnRlZ3JhdGlvbixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE1lZGlhIHJvdXRlc1xyXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbWVkaWEvdXBsb2FkLXVybCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG1lZGlhSW50ZWdyYXRpb24sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9tZWRpYS9kb3dubG9hZC11cmwnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheXYyLkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG1lZGlhSW50ZWdyYXRpb24sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMZWFzZSByb3V0ZXNcclxuICAgIHRoaXMuaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2xlYXNlcy91cGxvYWQtdXJsJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXl2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbGVhc2VJbnRlZ3JhdGlvbixcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2xlYXNlcy97aWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXl2Mi5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBsZWFzZUludGVncmF0aW9uLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5odHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbGVhc2VzL3tpZH0vcWEnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheXYyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBsZWFzZUludGVncmF0aW9uLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gQWNjZXNzIExvZ2dpbmdcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIGNvbnN0IGFjY2Vzc0xvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0FwaUFjY2Vzc0xvZ3MnLCB7XHJcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvYXBpZ2F0ZXdheS9yZW50dmlzaW9uLWFwaS0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHN0YWdlID0gdGhpcy5odHRwQXBpLmRlZmF1bHRTdGFnZT8ubm9kZS5kZWZhdWx0Q2hpbGQgYXMgYXBpZ2F0ZXdheXYyLkNmblN0YWdlO1xyXG4gICAgaWYgKHN0YWdlKSB7XHJcbiAgICAgIHN0YWdlLmFjY2Vzc0xvZ1NldHRpbmdzID0ge1xyXG4gICAgICAgIGRlc3RpbmF0aW9uQXJuOiBhY2Nlc3NMb2dHcm91cC5sb2dHcm91cEFybixcclxuICAgICAgICBmb3JtYXQ6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIHJlcXVlc3RJZDogJyRjb250ZXh0LnJlcXVlc3RJZCcsXHJcbiAgICAgICAgICBpcDogJyRjb250ZXh0LmlkZW50aXR5LnNvdXJjZUlwJyxcclxuICAgICAgICAgIHJlcXVlc3RUaW1lOiAnJGNvbnRleHQucmVxdWVzdFRpbWUnLFxyXG4gICAgICAgICAgaHR0cE1ldGhvZDogJyRjb250ZXh0Lmh0dHBNZXRob2QnLFxyXG4gICAgICAgICAgcm91dGVLZXk6ICckY29udGV4dC5yb3V0ZUtleScsXHJcbiAgICAgICAgICBzdGF0dXM6ICckY29udGV4dC5zdGF0dXMnLFxyXG4gICAgICAgICAgcHJvdG9jb2w6ICckY29udGV4dC5wcm90b2NvbCcsXHJcbiAgICAgICAgICByZXNwb25zZUxlbmd0aDogJyRjb250ZXh0LnJlc3BvbnNlTGVuZ3RoJyxcclxuICAgICAgICAgIGludGVncmF0aW9uRXJyb3I6ICckY29udGV4dC5pbnRlZ3JhdGlvbkVycm9yTWVzc2FnZScsXHJcbiAgICAgICAgICBlcnJvck1lc3NhZ2U6ICckY29udGV4dC5lcnJvci5tZXNzYWdlJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHcmFudCBBUEkgR2F0ZXdheSBwZXJtaXNzaW9uIHRvIHdyaXRlIHRvIHRoZSBhY2Nlc3MgbG9nIGdyb3VwXHJcbiAgICBhY2Nlc3NMb2dHcm91cC5ncmFudFdyaXRlKG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnYXBpZ2F0ZXdheS5hbWF6b25hd3MuY29tJykpO1xyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIENsb3VkRm9ybWF0aW9uIE91dHB1dHNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmh0dHBBcGkuYXBpRW5kcG9pbnQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUmVudFZpc2lvbiBBUEkgR2F0ZXdheSBlbmRwb2ludCBVUkwnLFxyXG4gICAgICBleHBvcnROYW1lOiBgcmVudHZpc2lvbi1hcGktdXJsLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuaHR0cEFwaS5hcGlJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdSZW50VmlzaW9uIEhUVFAgQVBJIElEJyxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=