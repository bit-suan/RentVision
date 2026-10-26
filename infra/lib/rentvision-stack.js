"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentVisionStack = void 0;
const cdk = require("aws-cdk-lib");
const budgets = require("aws-cdk-lib/aws-budgets");
const dynamodb_construct_1 = require("./constructs/dynamodb-construct");
const s3_construct_1 = require("./constructs/s3-construct");
const api_construct_1 = require("./constructs/api-construct");
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
class RentVisionStack extends cdk.Stack {
    /** The DynamoDB construct containing all tables. */
    dynamoDb;
    /** The S3 construct containing all buckets. */
    s3;
    /** The API construct containing API Gateway and Lambda functions. */
    api;
    constructor(scope, id, props) {
        super(scope, id, props);
        const environment = props?.environment ?? 'dev';
        const corsOrigins = environment === 'dev'
            ? ['http://localhost:3000', 'http://localhost:3001']
            : ['https://rentvision.example.com']; // Replace with actual production domain
        // -------------------------------------------------------------------------
        // DynamoDB Tables
        // -------------------------------------------------------------------------
        this.dynamoDb = new dynamodb_construct_1.RentVisionDynamoDb(this, 'DynamoDB', {
            environment,
            removalPolicy: environment === 'dev'
                ? cdk.RemovalPolicy.DESTROY
                : cdk.RemovalPolicy.RETAIN,
        });
        // -------------------------------------------------------------------------
        // S3 Buckets
        // -------------------------------------------------------------------------
        this.s3 = new s3_construct_1.RentVisionS3(this, 'S3', {
            environment,
            corsAllowedOrigins: corsOrigins,
            removalPolicy: environment === 'dev'
                ? cdk.RemovalPolicy.DESTROY
                : cdk.RemovalPolicy.RETAIN,
        });
        // -------------------------------------------------------------------------
        // API Gateway + Lambda Functions
        // -------------------------------------------------------------------------
        this.api = new api_construct_1.RentVisionApi(this, 'Api', {
            environment,
            propertiesTable: this.dynamoDb.propertiesTable,
            usersTable: this.dynamoDb.usersTable,
            leasesTable: this.dynamoDb.leasesTable,
            mediaBucket: this.s3.mediaBucket,
            leaseDocsBucket: this.s3.leaseDocsBucket,
            geoIndexName: dynamodb_construct_1.RentVisionDynamoDb.GEO_INDEX_NAME,
            statusIndexName: dynamodb_construct_1.RentVisionDynamoDb.STATUS_INDEX_NAME,
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
exports.RentVisionStack = RentVisionStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVudHZpc2lvbi1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlbnR2aXNpb24tc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLG1EQUFtRDtBQUVuRCx3RUFBcUU7QUFDckUsNERBQXlEO0FBQ3pELDhEQUEyRDtBQWMzRDs7Ozs7Ozs7Ozs7OztHQWFHO0FBQ0gsTUFBYSxlQUFnQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzVDLG9EQUFvRDtJQUNwQyxRQUFRLENBQXFCO0lBQzdDLCtDQUErQztJQUMvQixFQUFFLENBQWU7SUFDakMscUVBQXFFO0lBQ3JELEdBQUcsQ0FBZ0I7SUFFbkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE0QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLFdBQVcsR0FBRyxLQUFLLEVBQUUsV0FBVyxJQUFJLEtBQUssQ0FBQztRQUNoRCxNQUFNLFdBQVcsR0FBRyxXQUFXLEtBQUssS0FBSztZQUN2QyxDQUFDLENBQUMsQ0FBQyx1QkFBdUIsRUFBRSx1QkFBdUIsQ0FBQztZQUNwRCxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsd0NBQXdDO1FBRWhGLDRFQUE0RTtRQUM1RSxrQkFBa0I7UUFDbEIsNEVBQTRFO1FBQzVFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSx1Q0FBa0IsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ3ZELFdBQVc7WUFDWCxhQUFhLEVBQUUsV0FBVyxLQUFLLEtBQUs7Z0JBQ2xDLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87Z0JBQzNCLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07U0FDN0IsQ0FBQyxDQUFDO1FBRUgsNEVBQTRFO1FBQzVFLGFBQWE7UUFDYiw0RUFBNEU7UUFDNUUsSUFBSSxDQUFDLEVBQUUs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QyxHQUFHLENBQUMsTUFBTSxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNGO0FBN0dELDBDQTZHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGJ1ZGdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWJ1ZGdldHMnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgUmVudFZpc2lvbkR5bmFtb0RiIH0gZnJvbSAnLi9jb25zdHJ1Y3RzL2R5bmFtb2RiLWNvbnN0cnVjdCc7XHJcbmltcG9ydCB7IFJlbnRWaXNpb25TMyB9IGZyb20gJy4vY29uc3RydWN0cy9zMy1jb25zdHJ1Y3QnO1xyXG5pbXBvcnQgeyBSZW50VmlzaW9uQXBpIH0gZnJvbSAnLi9jb25zdHJ1Y3RzL2FwaS1jb25zdHJ1Y3QnO1xyXG5cclxuLyoqXHJcbiAqIFByb3BlcnRpZXMgZm9yIHRoZSBSZW50VmlzaW9uIGluZnJhc3RydWN0dXJlIHN0YWNrLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBSZW50VmlzaW9uU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICAvKiogRW52aXJvbm1lbnQgbGFiZWwgKGUuZy4sICdkZXYnLCAnc3RhZ2luZycsICdwcm9kJykuIERlZmF1bHRzIHRvICdkZXYnLiAqL1xyXG4gIHJlYWRvbmx5IGVudmlyb25tZW50Pzogc3RyaW5nO1xyXG4gIC8qKiBCdWRnZXQgYWxlcnQgZW1haWwgYWRkcmVzcy4gSWYgcHJvdmlkZWQsIGNyZWF0ZXMgYW4gQVdTIEJ1ZGdldCB3aXRoIGVtYWlsIG5vdGlmaWNhdGlvbi4gKi9cclxuICByZWFkb25seSBidWRnZXRBbGVydEVtYWlsPzogc3RyaW5nO1xyXG4gIC8qKiBNb250aGx5IGJ1ZGdldCBsaW1pdCBpbiBVU0QuIERlZmF1bHRzIHRvIDI1LiAqL1xyXG4gIHJlYWRvbmx5IGJ1ZGdldExpbWl0VXNkPzogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogUmVudFZpc2lvbiBjb3JlIEFXUyBpbmZyYXN0cnVjdHVyZSBzdGFjay5cclxuICpcclxuICogUHJvdmlzaW9ucyB0aGUgY29tcGxldGUgc2VydmVybGVzcyBiYWNrZW5kOlxyXG4gKiAgIC0gQW1hem9uIER5bmFtb0RCOiBwcm9wZXJ0eSBsaXN0aW5ncyAod2l0aCBnZW9zcGF0aWFsIGluZGV4KSwgdXNlcnMsIGxlYXNlc1xyXG4gKiAgIC0gQW1hem9uIFMzOiBwcm9wZXJ0eSBtZWRpYSAocGhvdG9zLCAzNjDCsCBwYW5vcmFtYXMpIGFuZCBwcml2YXRlIGxlYXNlIGRvY3VtZW50c1xyXG4gKiAgIC0gQVdTIEFQSSBHYXRld2F5OiBIVFRQIEFQSSB3aXRoIENPUlMgZm9yIGZyb250ZW5kIGludGVncmF0aW9uXHJcbiAqICAgLSBBV1MgTGFtYmRhOiBzZXJ2ZXJsZXNzIGhhbmRsZXJzIGZvciBsaXN0aW5ncywgbWVkaWEsIGFuZCBsZWFzZSBvcGVyYXRpb25zXHJcbiAqICAgLSBDbG91ZFdhdGNoOiBsb2cgZ3JvdXBzIHdpdGggMTQtZGF5IHJldGVudGlvbiBhbmQgQVBJIGFjY2VzcyBsb2dnaW5nXHJcbiAqICAgLSBBV1MgQnVkZ2V0czogb3B0aW9uYWwgbW9udGhseSBjb3N0IGFsZXJ0XHJcbiAqXHJcbiAqIEFsbCByZXNvdXJjZXMgZm9sbG93IGxlYXN0LXByaXZpbGVnZSBJQU0gcG9saWNpZXMgYW5kIGFyZSB0YWdnZWQgZm9yXHJcbiAqIHRyYWNlYWJpbGl0eSBhbmQgY29zdCBhbGxvY2F0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFJlbnRWaXNpb25TdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgLyoqIFRoZSBEeW5hbW9EQiBjb25zdHJ1Y3QgY29udGFpbmluZyBhbGwgdGFibGVzLiAqL1xyXG4gIHB1YmxpYyByZWFkb25seSBkeW5hbW9EYjogUmVudFZpc2lvbkR5bmFtb0RiO1xyXG4gIC8qKiBUaGUgUzMgY29uc3RydWN0IGNvbnRhaW5pbmcgYWxsIGJ1Y2tldHMuICovXHJcbiAgcHVibGljIHJlYWRvbmx5IHMzOiBSZW50VmlzaW9uUzM7XHJcbiAgLyoqIFRoZSBBUEkgY29uc3RydWN0IGNvbnRhaW5pbmcgQVBJIEdhdGV3YXkgYW5kIExhbWJkYSBmdW5jdGlvbnMuICovXHJcbiAgcHVibGljIHJlYWRvbmx5IGFwaTogUmVudFZpc2lvbkFwaTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBSZW50VmlzaW9uU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBwcm9wcz8uZW52aXJvbm1lbnQgPz8gJ2Rldic7XHJcbiAgICBjb25zdCBjb3JzT3JpZ2lucyA9IGVudmlyb25tZW50ID09PSAnZGV2J1xyXG4gICAgICA/IFsnaHR0cDovL2xvY2FsaG9zdDozMDAwJywgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMSddXHJcbiAgICAgIDogWydodHRwczovL3JlbnR2aXNpb24uZXhhbXBsZS5jb20nXTsgLy8gUmVwbGFjZSB3aXRoIGFjdHVhbCBwcm9kdWN0aW9uIGRvbWFpblxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIER5bmFtb0RCIFRhYmxlc1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgdGhpcy5keW5hbW9EYiA9IG5ldyBSZW50VmlzaW9uRHluYW1vRGIodGhpcywgJ0R5bmFtb0RCJywge1xyXG4gICAgICBlbnZpcm9ubWVudCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdkZXYnXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyBTMyBCdWNrZXRzXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICB0aGlzLnMzID0gbmV3IFJlbnRWaXNpb25TMyh0aGlzLCAnUzMnLCB7XHJcbiAgICAgIGVudmlyb25tZW50LFxyXG4gICAgICBjb3JzQWxsb3dlZE9yaWdpbnM6IGNvcnNPcmlnaW5zLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ2RldidcclxuICAgICAgICA/IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1lcclxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIEFQSSBHYXRld2F5ICsgTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgdGhpcy5hcGkgPSBuZXcgUmVudFZpc2lvbkFwaSh0aGlzLCAnQXBpJywge1xyXG4gICAgICBlbnZpcm9ubWVudCxcclxuICAgICAgcHJvcGVydGllc1RhYmxlOiB0aGlzLmR5bmFtb0RiLnByb3BlcnRpZXNUYWJsZSxcclxuICAgICAgdXNlcnNUYWJsZTogdGhpcy5keW5hbW9EYi51c2Vyc1RhYmxlLFxyXG4gICAgICBsZWFzZXNUYWJsZTogdGhpcy5keW5hbW9EYi5sZWFzZXNUYWJsZSxcclxuICAgICAgbWVkaWFCdWNrZXQ6IHRoaXMuczMubWVkaWFCdWNrZXQsXHJcbiAgICAgIGxlYXNlRG9jc0J1Y2tldDogdGhpcy5zMy5sZWFzZURvY3NCdWNrZXQsXHJcbiAgICAgIGdlb0luZGV4TmFtZTogUmVudFZpc2lvbkR5bmFtb0RiLkdFT19JTkRFWF9OQU1FLFxyXG4gICAgICBzdGF0dXNJbmRleE5hbWU6IFJlbnRWaXNpb25EeW5hbW9EYi5TVEFUVVNfSU5ERVhfTkFNRSxcclxuICAgICAgY29yc0FsbG93ZWRPcmlnaW5zOiBjb3JzT3JpZ2lucyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIEFXUyBCdWRnZXQgQWxlcnQgKG9wdGlvbmFsKVxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgaWYgKHByb3BzPy5idWRnZXRBbGVydEVtYWlsKSB7XHJcbiAgICAgIGNvbnN0IGJ1ZGdldExpbWl0ID0gcHJvcHMuYnVkZ2V0TGltaXRVc2QgPz8gMjU7XHJcblxyXG4gICAgICBuZXcgYnVkZ2V0cy5DZm5CdWRnZXQodGhpcywgJ01vbnRobHlCdWRnZXQnLCB7XHJcbiAgICAgICAgYnVkZ2V0OiB7XHJcbiAgICAgICAgICBidWRnZXROYW1lOiBgUmVudFZpc2lvbi1Nb250aGx5LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgICAgIGJ1ZGdldFR5cGU6ICdDT1NUJyxcclxuICAgICAgICAgIHRpbWVVbml0OiAnTU9OVEhMWScsXHJcbiAgICAgICAgICBidWRnZXRMaW1pdDoge1xyXG4gICAgICAgICAgICBhbW91bnQ6IGJ1ZGdldExpbWl0LFxyXG4gICAgICAgICAgICB1bml0OiAnVVNEJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICBub3RpZmljYXRpb25zV2l0aFN1YnNjcmliZXJzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbjoge1xyXG4gICAgICAgICAgICAgIG5vdGlmaWNhdGlvblR5cGU6ICdBQ1RVQUwnLFxyXG4gICAgICAgICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogJ0dSRUFURVJfVEhBTicsXHJcbiAgICAgICAgICAgICAgdGhyZXNob2xkOiA4MCxcclxuICAgICAgICAgICAgICB0aHJlc2hvbGRUeXBlOiAnUEVSQ0VOVEFHRScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN1YnNjcmliZXJzOiBbXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uVHlwZTogJ0VNQUlMJyxcclxuICAgICAgICAgICAgICAgIGFkZHJlc3M6IHByb3BzLmJ1ZGdldEFsZXJ0RW1haWwsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIG5vdGlmaWNhdGlvbjoge1xyXG4gICAgICAgICAgICAgIG5vdGlmaWNhdGlvblR5cGU6ICdGT1JFQ0FTVEVEJyxcclxuICAgICAgICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6ICdHUkVBVEVSX1RIQU4nLFxyXG4gICAgICAgICAgICAgIHRocmVzaG9sZDogMTAwLFxyXG4gICAgICAgICAgICAgIHRocmVzaG9sZFR5cGU6ICdQRVJDRU5UQUdFJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3Vic2NyaWJlcnM6IFtcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb25UeXBlOiAnRU1BSUwnLFxyXG4gICAgICAgICAgICAgICAgYWRkcmVzczogcHJvcHMuYnVkZ2V0QWxlcnRFbWFpbCxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyBSZXNvdXJjZSBUYWdzXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ1Byb2plY3QnLCAnUmVudFZpc2lvbicpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdFbnZpcm9ubWVudCcsIGVudmlyb25tZW50KTtcclxuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnTWFuYWdlZEJ5JywgJ2NkaycpO1xyXG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdUZWFtJywgJ0FBU1RVLUhhY2thdGhvbicpO1xyXG4gIH1cclxufVxyXG4iXX0=