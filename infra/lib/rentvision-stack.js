"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentVisionStack = void 0;
const cdk = require("aws-cdk-lib");
const budgets = require("aws-cdk-lib/aws-budgets");
const dynamodb_construct_1 = require("./constructs/dynamodb-construct");
const s3_construct_1 = require("./constructs/s3-construct");
const api_construct_1 = require("./constructs/api-construct");
const cognito_construct_1 = require("./constructs/cognito-construct");
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
class RentVisionStack extends cdk.Stack {
    /** The DynamoDB construct containing all tables. */
    dynamoDb;
    /** The S3 construct containing all buckets. */
    s3;
    /** The Cognito construct containing the user pool and client. */
    cognito;
    /** The API construct containing API Gateway and Lambda functions. */
    api;
    constructor(scope, id, props) {
        super(scope, id, props);
        const environment = props?.environment ?? 'dev';
        const corsOrigins = environment === 'dev'
            ? ['http://localhost:3000', 'http://localhost:3001']
            : (process.env.CORS_ALLOWED_ORIGINS
                ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
                : ['https://rentvision.example.com']); // Replace with actual production domain
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
        // Cognito User Pool
        // -------------------------------------------------------------------------
        this.cognito = new cognito_construct_1.RentVisionCognito(this, 'Cognito', {
            environment,
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
            userPool: this.cognito.userPool,
            userPoolClient: this.cognito.userPoolClient,
            geoIndexName: dynamodb_construct_1.RentVisionDynamoDb.GEO_INDEX_NAME,
            statusIndexName: dynamodb_construct_1.RentVisionDynamoDb.STATUS_INDEX_NAME,
            landlordIndexName: dynamodb_construct_1.RentVisionDynamoDb.LANDLORD_INDEX_NAME,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVudHZpc2lvbi1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlbnR2aXNpb24tc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLG1EQUFtRDtBQUVuRCx3RUFBcUU7QUFDckUsNERBQXlEO0FBQ3pELDhEQUEyRDtBQUMzRCxzRUFBbUU7QUFjbkU7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxNQUFhLGVBQWdCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDNUMsb0RBQW9EO0lBQ3BDLFFBQVEsQ0FBcUI7SUFDN0MsK0NBQStDO0lBQy9CLEVBQUUsQ0FBZTtJQUNqQyxpRUFBaUU7SUFDakQsT0FBTyxDQUFvQjtJQUMzQyxxRUFBcUU7SUFDckQsR0FBRyxDQUFnQjtJQUVuQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxXQUFXLElBQUksS0FBSyxDQUFDO1FBQ2hELE1BQU0sV0FBVyxHQUFHLFdBQVcsS0FBSyxLQUFLO1lBQ3ZDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixFQUFFLHVCQUF1QixDQUFDO1lBQ3BELENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CO2dCQUMvQixDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO2dCQUM1RixDQUFDLENBQUMsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyx3Q0FBd0M7UUFFckYsNEVBQTRFO1FBQzVFLGtCQUFrQjtRQUNsQiw0RUFBNEU7UUFD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OzRCQUNkLGFBQWEsRUFBRSxZQUFZO3lCQUM1Qjt3QkFDRCxXQUFXLEVBQUU7NEJBQ1g7Z0NBQ0UsZ0JBQWdCLEVBQUUsT0FBTztnQ0FDekIsT0FBTyxFQUFFLEtBQUssQ0FBQyxnQkFBZ0I7NkJBQ2hDO3lCQUNGO3FCQUNGO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELDRFQUE0RTtRQUM1RSxnQkFBZ0I7UUFDaEIsNEVBQTRFO1FBQzVFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDL0MsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNsRCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNuRCxDQUFDO0NBQ0Y7QUEzSEQsMENBMkhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGJ1ZGdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWJ1ZGdldHMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBSZW50VmlzaW9uRHluYW1vRGIgfSBmcm9tICcuL2NvbnN0cnVjdHMvZHluYW1vZGItY29uc3RydWN0JztcbmltcG9ydCB7IFJlbnRWaXNpb25TMyB9IGZyb20gJy4vY29uc3RydWN0cy9zMy1jb25zdHJ1Y3QnO1xuaW1wb3J0IHsgUmVudFZpc2lvbkFwaSB9IGZyb20gJy4vY29uc3RydWN0cy9hcGktY29uc3RydWN0JztcbmltcG9ydCB7IFJlbnRWaXNpb25Db2duaXRvIH0gZnJvbSAnLi9jb25zdHJ1Y3RzL2NvZ25pdG8tY29uc3RydWN0JztcblxuLyoqXG4gKiBQcm9wZXJ0aWVzIGZvciB0aGUgUmVudFZpc2lvbiBpbmZyYXN0cnVjdHVyZSBzdGFjay5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZW50VmlzaW9uU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgLyoqIEVudmlyb25tZW50IGxhYmVsIChlLmcuLCAnZGV2JywgJ3N0YWdpbmcnLCAncHJvZCcpLiBEZWZhdWx0cyB0byAnZGV2Jy4gKi9cbiAgcmVhZG9ubHkgZW52aXJvbm1lbnQ/OiBzdHJpbmc7XG4gIC8qKiBCdWRnZXQgYWxlcnQgZW1haWwgYWRkcmVzcy4gSWYgcHJvdmlkZWQsIGNyZWF0ZXMgYW4gQVdTIEJ1ZGdldCB3aXRoIGVtYWlsIG5vdGlmaWNhdGlvbi4gKi9cbiAgcmVhZG9ubHkgYnVkZ2V0QWxlcnRFbWFpbD86IHN0cmluZztcbiAgLyoqIE1vbnRobHkgYnVkZ2V0IGxpbWl0IGluIFVTRC4gRGVmYXVsdHMgdG8gMjUuICovXG4gIHJlYWRvbmx5IGJ1ZGdldExpbWl0VXNkPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFJlbnRWaXNpb24gY29yZSBBV1MgaW5mcmFzdHJ1Y3R1cmUgc3RhY2suXG4gKlxuICogUHJvdmlzaW9ucyB0aGUgY29tcGxldGUgc2VydmVybGVzcyBiYWNrZW5kOlxuICogICAtIEFtYXpvbiBEeW5hbW9EQjogcHJvcGVydHkgbGlzdGluZ3MgKHdpdGggZ2Vvc3BhdGlhbCBpbmRleCksIHVzZXJzLCBsZWFzZXNcbiAqICAgLSBBbWF6b24gUzM6IHByb3BlcnR5IG1lZGlhIChwaG90b3MsIDM2MMKwIHBhbm9yYW1hcykgYW5kIHByaXZhdGUgbGVhc2UgZG9jdW1lbnRzXG4gKiAgIC0gQW1hem9uIENvZ25pdG86IHVzZXIgYXV0aGVudGljYXRpb24gYW5kIGFwcCBjbGllbnRcbiAqICAgLSBBV1MgQVBJIEdhdGV3YXk6IEhUVFAgQVBJIHdpdGggQ09SUyBmb3IgZnJvbnRlbmQgaW50ZWdyYXRpb25cbiAqICAgLSBBV1MgTGFtYmRhOiBzZXJ2ZXJsZXNzIGhhbmRsZXJzIGZvciBsaXN0aW5ncywgbWVkaWEsIGFuZCBsZWFzZSBvcGVyYXRpb25zXG4gKiAgIC0gQ2xvdWRXYXRjaDogbG9nIGdyb3VwcyB3aXRoIDE0LWRheSByZXRlbnRpb24gYW5kIEFQSSBhY2Nlc3MgbG9nZ2luZ1xuICogICAtIEFXUyBCdWRnZXRzOiBvcHRpb25hbCBtb250aGx5IGNvc3QgYWxlcnRcbiAqXG4gKiBBbGwgcmVzb3VyY2VzIGZvbGxvdyBsZWFzdC1wcml2aWxlZ2UgSUFNIHBvbGljaWVzIGFuZCBhcmUgdGFnZ2VkIGZvclxuICogdHJhY2VhYmlsaXR5IGFuZCBjb3N0IGFsbG9jYXRpb24uXG4gKi9cbmV4cG9ydCBjbGFzcyBSZW50VmlzaW9uU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICAvKiogVGhlIER5bmFtb0RCIGNvbnN0cnVjdCBjb250YWluaW5nIGFsbCB0YWJsZXMuICovXG4gIHB1YmxpYyByZWFkb25seSBkeW5hbW9EYjogUmVudFZpc2lvbkR5bmFtb0RiO1xuICAvKiogVGhlIFMzIGNvbnN0cnVjdCBjb250YWluaW5nIGFsbCBidWNrZXRzLiAqL1xuICBwdWJsaWMgcmVhZG9ubHkgczM6IFJlbnRWaXNpb25TMztcbiAgLyoqIFRoZSBDb2duaXRvIGNvbnN0cnVjdCBjb250YWluaW5nIHRoZSB1c2VyIHBvb2wgYW5kIGNsaWVudC4gKi9cbiAgcHVibGljIHJlYWRvbmx5IGNvZ25pdG86IFJlbnRWaXNpb25Db2duaXRvO1xuICAvKiogVGhlIEFQSSBjb25zdHJ1Y3QgY29udGFpbmluZyBBUEkgR2F0ZXdheSBhbmQgTGFtYmRhIGZ1bmN0aW9ucy4gKi9cbiAgcHVibGljIHJlYWRvbmx5IGFwaTogUmVudFZpc2lvbkFwaTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFJlbnRWaXNpb25TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IHByb3BzPy5lbnZpcm9ubWVudCA/PyAnZGV2JztcbiAgICBjb25zdCBjb3JzT3JpZ2lucyA9IGVudmlyb25tZW50ID09PSAnZGV2J1xuICAgICAgPyBbJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsICdodHRwOi8vbG9jYWxob3N0OjMwMDEnXVxuICAgICAgOiAocHJvY2Vzcy5lbnYuQ09SU19BTExPV0VEX09SSUdJTlNcbiAgICAgICAgICA/IHByb2Nlc3MuZW52LkNPUlNfQUxMT1dFRF9PUklHSU5TLnNwbGl0KCcsJykubWFwKChvcmlnaW4pID0+IG9yaWdpbi50cmltKCkpLmZpbHRlcihCb29sZWFuKVxuICAgICAgICAgIDogWydodHRwczovL3JlbnR2aXNpb24uZXhhbXBsZS5jb20nXSk7IC8vIFJlcGxhY2Ugd2l0aCBhY3R1YWwgcHJvZHVjdGlvbiBkb21haW5cblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBEeW5hbW9EQiBUYWJsZXNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgdGhpcy5keW5hbW9EYiA9IG5ldyBSZW50VmlzaW9uRHluYW1vRGIodGhpcywgJ0R5bmFtb0RCJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ2RldidcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZXG4gICAgICAgIDogY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOLFxuICAgIH0pO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIFMzIEJ1Y2tldHNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgdGhpcy5zMyA9IG5ldyBSZW50VmlzaW9uUzModGhpcywgJ1MzJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBjb3JzQWxsb3dlZE9yaWdpbnM6IGNvcnNPcmlnaW5zLFxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdkZXYnXG4gICAgICAgID8gY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWVxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcbiAgICB9KTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBDb2duaXRvIFVzZXIgUG9vbFxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICB0aGlzLmNvZ25pdG8gPSBuZXcgUmVudFZpc2lvbkNvZ25pdG8odGhpcywgJ0NvZ25pdG8nLCB7XG4gICAgICBlbnZpcm9ubWVudCxcbiAgICB9KTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBBUEkgR2F0ZXdheSArIExhbWJkYSBGdW5jdGlvbnNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgdGhpcy5hcGkgPSBuZXcgUmVudFZpc2lvbkFwaSh0aGlzLCAnQXBpJywge1xuICAgICAgZW52aXJvbm1lbnQsXG4gICAgICBwcm9wZXJ0aWVzVGFibGU6IHRoaXMuZHluYW1vRGIucHJvcGVydGllc1RhYmxlLFxuICAgICAgdXNlcnNUYWJsZTogdGhpcy5keW5hbW9EYi51c2Vyc1RhYmxlLFxuICAgICAgbGVhc2VzVGFibGU6IHRoaXMuZHluYW1vRGIubGVhc2VzVGFibGUsXG4gICAgICBtZWRpYUJ1Y2tldDogdGhpcy5zMy5tZWRpYUJ1Y2tldCxcbiAgICAgIGxlYXNlRG9jc0J1Y2tldDogdGhpcy5zMy5sZWFzZURvY3NCdWNrZXQsXG4gICAgICB1c2VyUG9vbDogdGhpcy5jb2duaXRvLnVzZXJQb29sLFxuICAgICAgdXNlclBvb2xDbGllbnQ6IHRoaXMuY29nbml0by51c2VyUG9vbENsaWVudCxcbiAgICAgIGdlb0luZGV4TmFtZTogUmVudFZpc2lvbkR5bmFtb0RiLkdFT19JTkRFWF9OQU1FLFxuICAgICAgc3RhdHVzSW5kZXhOYW1lOiBSZW50VmlzaW9uRHluYW1vRGIuU1RBVFVTX0lOREVYX05BTUUsXG4gICAgICBsYW5kbG9yZEluZGV4TmFtZTogUmVudFZpc2lvbkR5bmFtb0RiLkxBTkRMT1JEX0lOREVYX05BTUUsXG4gICAgICBjb3JzQWxsb3dlZE9yaWdpbnM6IGNvcnNPcmlnaW5zLFxuICAgIH0pO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIEFXUyBCdWRnZXQgQWxlcnQgKG9wdGlvbmFsKVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBpZiAocHJvcHM/LmJ1ZGdldEFsZXJ0RW1haWwpIHtcbiAgICAgIGNvbnN0IGJ1ZGdldExpbWl0ID0gcHJvcHMuYnVkZ2V0TGltaXRVc2QgPz8gMjU7XG5cbiAgICAgIG5ldyBidWRnZXRzLkNmbkJ1ZGdldCh0aGlzLCAnTW9udGhseUJ1ZGdldCcsIHtcbiAgICAgICAgYnVkZ2V0OiB7XG4gICAgICAgICAgYnVkZ2V0TmFtZTogYFJlbnRWaXNpb24tTW9udGhseS0ke2Vudmlyb25tZW50fWAsXG4gICAgICAgICAgYnVkZ2V0VHlwZTogJ0NPU1QnLFxuICAgICAgICAgIHRpbWVVbml0OiAnTU9OVEhMWScsXG4gICAgICAgICAgYnVkZ2V0TGltaXQ6IHtcbiAgICAgICAgICAgIGFtb3VudDogYnVkZ2V0TGltaXQsXG4gICAgICAgICAgICB1bml0OiAnVVNEJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBub3RpZmljYXRpb25zV2l0aFN1YnNjcmliZXJzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgbm90aWZpY2F0aW9uOiB7XG4gICAgICAgICAgICAgIG5vdGlmaWNhdGlvblR5cGU6ICdBQ1RVQUwnLFxuICAgICAgICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6ICdHUkVBVEVSX1RIQU4nLFxuICAgICAgICAgICAgICB0aHJlc2hvbGQ6IDgwLFxuICAgICAgICAgICAgICB0aHJlc2hvbGRUeXBlOiAnUEVSQ0VOVEFHRScsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc3Vic2NyaWJlcnM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHN1YnNjcmlwdGlvblR5cGU6ICdFTUFJTCcsXG4gICAgICAgICAgICAgICAgYWRkcmVzczogcHJvcHMuYnVkZ2V0QWxlcnRFbWFpbCxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBub3RpZmljYXRpb246IHtcbiAgICAgICAgICAgICAgbm90aWZpY2F0aW9uVHlwZTogJ0ZPUkVDQVNURUQnLFxuICAgICAgICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6ICdHUkVBVEVSX1RIQU4nLFxuICAgICAgICAgICAgICB0aHJlc2hvbGQ6IDEwMCxcbiAgICAgICAgICAgICAgdGhyZXNob2xkVHlwZTogJ1BFUkNFTlRBR0UnLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHN1YnNjcmliZXJzOiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBzdWJzY3JpcHRpb25UeXBlOiAnRU1BSUwnLFxuICAgICAgICAgICAgICAgIGFkZHJlc3M6IHByb3BzLmJ1ZGdldEFsZXJ0RW1haWwsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gUmVzb3VyY2UgVGFnc1xuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBjZGsuVGFncy5vZih0aGlzKS5hZGQoJ1Byb2plY3QnLCAnUmVudFZpc2lvbicpO1xuICAgIGNkay5UYWdzLm9mKHRoaXMpLmFkZCgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdNYW5hZ2VkQnknLCAnY2RrJyk7XG4gICAgY2RrLlRhZ3Mub2YodGhpcykuYWRkKCdUZWFtJywgJ0FBU1RVLUhhY2thdGhvbicpO1xuICB9XG59XG4iXX0=