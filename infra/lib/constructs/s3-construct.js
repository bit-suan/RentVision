"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentVisionS3 = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
const constructs_1 = require("constructs");
/**
 * CDK Construct that provisions S3 buckets for RentVision media and documents.
 *
 * Buckets:
 *   - Property Media: photos, floor plans, and 360° equirectangular panoramas
 *   - Lease Documents: private encrypted PDF lease agreements
 *
 * Security:
 *   - All public access is blocked on both buckets
 *   - SSE-S3 encryption enabled
 *   - CORS configured only on the media bucket for frontend upload support
 *   - Lease documents bucket has no CORS (backend-only via presigned URLs)
 *   - Enforced SSL-only access
 */
class RentVisionS3 extends constructs_1.Construct {
    /** S3 bucket for property photos and 360° panoramas. */
    mediaBucket;
    /** S3 bucket for private lease document storage. */
    leaseDocsBucket;
    constructor(scope, id, props) {
        super(scope, id);
        const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;
        // -------------------------------------------------------------------------
        // Property Media Bucket
        // -------------------------------------------------------------------------
        // Object key convention:
        //   listings/{listingId}/photos/{uuid}_{filename}
        //   listings/{listingId}/panoramas/{uuid}_{filename}
        this.mediaBucket = new s3.Bucket(this, 'PropertyMediaBucket', {
            bucketName: `rentvision-property-media-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: false,
            removalPolicy,
            autoDeleteObjects: false,
            // CORS configuration for frontend presigned URL uploads
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.HEAD,
                    ],
                    allowedOrigins: props.corsAllowedOrigins,
                    allowedHeaders: ['*'],
                    exposedHeaders: ['ETag', 'Content-Length'],
                    maxAge: 3600,
                },
            ],
            // Lifecycle rules for cost optimization
            lifecycleRules: [
                {
                    id: 'TransitionToIA',
                    enabled: true,
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: cdk.Duration.days(90),
                        },
                    ],
                },
            ],
        });
        // -------------------------------------------------------------------------
        // Lease Documents Bucket (private, no CORS)
        // -------------------------------------------------------------------------
        // Object key convention:
        //   leases/{leaseId}/{uuid}_{filename}
        // Access: backend-only via presigned URLs
        this.leaseDocsBucket = new s3.Bucket(this, 'LeaseDocumentsBucket', {
            bucketName: `rentvision-lease-documents-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            versioned: true, // Versioning for document integrity
            removalPolicy,
            autoDeleteObjects: false,
        });
        // -------------------------------------------------------------------------
        // CloudFormation Outputs
        // -------------------------------------------------------------------------
        new cdk.CfnOutput(this, 'MediaBucketName', {
            value: this.mediaBucket.bucketName,
            description: 'S3 bucket for property media (photos and 360° panoramas)',
            exportName: `rentvision-media-bucket-${props.environment}`,
        });
        new cdk.CfnOutput(this, 'MediaBucketArn', {
            value: this.mediaBucket.bucketArn,
            description: 'ARN of the property media S3 bucket',
        });
        new cdk.CfnOutput(this, 'LeaseDocsBucketName', {
            value: this.leaseDocsBucket.bucketName,
            description: 'S3 bucket for private lease documents',
            exportName: `rentvision-lease-docs-bucket-${props.environment}`,
        });
        new cdk.CfnOutput(this, 'LeaseDocsBucketArn', {
            value: this.leaseDocsBucket.bucketArn,
            description: 'ARN of the lease documents S3 bucket',
        });
    }
}
exports.RentVisionS3 = RentVisionS3;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiczMtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiczMtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyx5Q0FBeUM7QUFDekMsMkNBQXVDO0FBY3ZDOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxNQUFhLFlBQWEsU0FBUSxzQkFBUztJQUN6Qyx3REFBd0Q7SUFDeEMsV0FBVyxDQUFZO0lBQ3ZDLG9EQUFvRDtJQUNwQyxlQUFlLENBQVk7SUFFM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3QjtRQUNoRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxhQUFhLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7UUFFdEUsNEVBQTRFO1FBQzVFLHdCQUF3QjtRQUN4Qiw0RUFBNEU7UUFDNUUseUJBQXlCO1FBQ3pCLGtEQUFrRDtRQUNsRCxxREFBcUQ7UUFDckQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzVELFVBQVUsRUFBRSw2QkFBNkIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUU7WUFDL0UsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLGFBQWE7WUFDYixpQkFBaUIsRUFBRSxLQUFLO1lBRXhCLHdEQUF3RDtZQUN4RCxJQUFJLEVBQUU7Z0JBQ0o7b0JBQ0UsY0FBYyxFQUFFO3dCQUNkLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRzt3QkFDbEIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHO3dCQUNsQixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUk7cUJBQ3BCO29CQUNELGNBQWMsRUFBRSxLQUFLLENBQUMsa0JBQWtCO29CQUN4QyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLGNBQWMsRUFBRSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQztvQkFDMUMsTUFBTSxFQUFFLElBQUk7aUJBQ2I7YUFDRjtZQUVELHdDQUF3QztZQUN4QyxjQUFjLEVBQUU7Z0JBQ2Q7b0JBQ0UsRUFBRSxFQUFFLGdCQUFnQjtvQkFDcEIsT0FBTyxFQUFFLElBQUk7b0JBQ2IsV0FBVyxFQUFFO3dCQUNYOzRCQUNFLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQjs0QkFDL0MsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzt5QkFDdkM7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILDRFQUE0RTtRQUM1RSw0Q0FBNEM7UUFDNUMsNEVBQTRFO1FBQzVFLHlCQUF5QjtRQUN6Qix1Q0FBdUM7UUFDdkMsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUNqRSxVQUFVLEVBQUUsOEJBQThCLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFO1lBQ2hGLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxVQUFVLEVBQUUsSUFBSTtZQUNoQixTQUFTLEVBQUUsSUFBSSxFQUFFLG9DQUFvQztZQUNyRCxhQUFhO1lBQ2IsaUJBQWlCLEVBQUUsS0FBSztTQUN6QixDQUFDLENBQUM7UUFFSCw0RUFBNEU7UUFDNUUseUJBQXlCO1FBQ3pCLDRFQUE0RTtRQUM1RSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3pDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVU7WUFDbEMsV0FBVyxFQUFFLDBEQUEwRDtZQUN2RSxVQUFVLEVBQUUsMkJBQTJCLEtBQUssQ0FBQyxXQUFXLEVBQUU7U0FDM0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTO1lBQ2pDLFdBQVcsRUFBRSxxQ0FBcUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVO1lBQ3RDLFdBQVcsRUFBRSx1Q0FBdUM7WUFDcEQsVUFBVSxFQUFFLGdDQUFnQyxLQUFLLENBQUMsV0FBVyxFQUFFO1NBQ2hFLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUztZQUNyQyxXQUFXLEVBQUUsc0NBQXNDO1NBQ3BELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWpHRCxvQ0FpR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbi8qKlxyXG4gKiBQcm9wZXJ0aWVzIGZvciB0aGUgUmVudFZpc2lvbiBTMyBjb25zdHJ1Y3QuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFJlbnRWaXNpb25TM1Byb3BzIHtcclxuICAvKiogRW52aXJvbm1lbnQgbGFiZWwgKGUuZy4sICdkZXYnLCAnc3RhZ2luZycsICdwcm9kJykuICovXHJcbiAgcmVhZG9ubHkgZW52aXJvbm1lbnQ6IHN0cmluZztcclxuICAvKiogQWxsb3dlZCBDT1JTIG9yaWdpbnMgZm9yIHRoZSBtZWRpYSBidWNrZXQgKGUuZy4sIFsnaHR0cDovL2xvY2FsaG9zdDozMDAwJ10pLiAqL1xyXG4gIHJlYWRvbmx5IGNvcnNBbGxvd2VkT3JpZ2luczogc3RyaW5nW107XHJcbiAgLyoqIE9wdGlvbmFsIHJlbW92YWwgcG9saWN5IG92ZXJyaWRlLiBEZWZhdWx0cyB0byBSRVRBSU4uICovXHJcbiAgcmVhZG9ubHkgcmVtb3ZhbFBvbGljeT86IGNkay5SZW1vdmFsUG9saWN5O1xyXG59XHJcblxyXG4vKipcclxuICogQ0RLIENvbnN0cnVjdCB0aGF0IHByb3Zpc2lvbnMgUzMgYnVja2V0cyBmb3IgUmVudFZpc2lvbiBtZWRpYSBhbmQgZG9jdW1lbnRzLlxyXG4gKlxyXG4gKiBCdWNrZXRzOlxyXG4gKiAgIC0gUHJvcGVydHkgTWVkaWE6IHBob3RvcywgZmxvb3IgcGxhbnMsIGFuZCAzNjDCsCBlcXVpcmVjdGFuZ3VsYXIgcGFub3JhbWFzXHJcbiAqICAgLSBMZWFzZSBEb2N1bWVudHM6IHByaXZhdGUgZW5jcnlwdGVkIFBERiBsZWFzZSBhZ3JlZW1lbnRzXHJcbiAqXHJcbiAqIFNlY3VyaXR5OlxyXG4gKiAgIC0gQWxsIHB1YmxpYyBhY2Nlc3MgaXMgYmxvY2tlZCBvbiBib3RoIGJ1Y2tldHNcclxuICogICAtIFNTRS1TMyBlbmNyeXB0aW9uIGVuYWJsZWRcclxuICogICAtIENPUlMgY29uZmlndXJlZCBvbmx5IG9uIHRoZSBtZWRpYSBidWNrZXQgZm9yIGZyb250ZW5kIHVwbG9hZCBzdXBwb3J0XHJcbiAqICAgLSBMZWFzZSBkb2N1bWVudHMgYnVja2V0IGhhcyBubyBDT1JTIChiYWNrZW5kLW9ubHkgdmlhIHByZXNpZ25lZCBVUkxzKVxyXG4gKiAgIC0gRW5mb3JjZWQgU1NMLW9ubHkgYWNjZXNzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUmVudFZpc2lvblMzIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICAvKiogUzMgYnVja2V0IGZvciBwcm9wZXJ0eSBwaG90b3MgYW5kIDM2MMKwIHBhbm9yYW1hcy4gKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgbWVkaWFCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICAvKiogUzMgYnVja2V0IGZvciBwcml2YXRlIGxlYXNlIGRvY3VtZW50IHN0b3JhZ2UuICovXHJcbiAgcHVibGljIHJlYWRvbmx5IGxlYXNlRG9jc0J1Y2tldDogczMuQnVja2V0O1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUmVudFZpc2lvblMzUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgY29uc3QgcmVtb3ZhbFBvbGljeSA9IHByb3BzLnJlbW92YWxQb2xpY3kgPz8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOO1xyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIFByb3BlcnR5IE1lZGlhIEJ1Y2tldFxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gT2JqZWN0IGtleSBjb252ZW50aW9uOlxyXG4gICAgLy8gICBsaXN0aW5ncy97bGlzdGluZ0lkfS9waG90b3Mve3V1aWR9X3tmaWxlbmFtZX1cclxuICAgIC8vICAgbGlzdGluZ3Mve2xpc3RpbmdJZH0vcGFub3JhbWFzL3t1dWlkfV97ZmlsZW5hbWV9XHJcbiAgICB0aGlzLm1lZGlhQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnUHJvcGVydHlNZWRpYUJ1Y2tldCcsIHtcclxuICAgICAgYnVja2V0TmFtZTogYHJlbnR2aXNpb24tcHJvcGVydHktbWVkaWEtJHtjZGsuQXdzLkFDQ09VTlRfSUR9LSR7Y2RrLkF3cy5SRUdJT059YCxcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICB2ZXJzaW9uZWQ6IGZhbHNlLFxyXG4gICAgICByZW1vdmFsUG9saWN5LFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogZmFsc2UsXHJcblxyXG4gICAgICAvLyBDT1JTIGNvbmZpZ3VyYXRpb24gZm9yIGZyb250ZW5kIHByZXNpZ25lZCBVUkwgdXBsb2Fkc1xyXG4gICAgICBjb3JzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtcclxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuR0VULFxyXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5QVVQsXHJcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkhFQUQsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IHByb3BzLmNvcnNBbGxvd2VkT3JpZ2lucyxcclxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcclxuICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbJ0VUYWcnLCAnQ29udGVudC1MZW5ndGgnXSxcclxuICAgICAgICAgIG1heEFnZTogMzYwMCxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG5cclxuICAgICAgLy8gTGlmZWN5Y2xlIHJ1bGVzIGZvciBjb3N0IG9wdGltaXphdGlvblxyXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiAnVHJhbnNpdGlvblRvSUEnLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIHRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUyxcclxuICAgICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDkwKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIExlYXNlIERvY3VtZW50cyBCdWNrZXQgKHByaXZhdGUsIG5vIENPUlMpXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyBPYmplY3Qga2V5IGNvbnZlbnRpb246XHJcbiAgICAvLyAgIGxlYXNlcy97bGVhc2VJZH0ve3V1aWR9X3tmaWxlbmFtZX1cclxuICAgIC8vIEFjY2VzczogYmFja2VuZC1vbmx5IHZpYSBwcmVzaWduZWQgVVJMc1xyXG4gICAgdGhpcy5sZWFzZURvY3NCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdMZWFzZURvY3VtZW50c0J1Y2tldCcsIHtcclxuICAgICAgYnVja2V0TmFtZTogYHJlbnR2aXNpb24tbGVhc2UtZG9jdW1lbnRzLSR7Y2RrLkF3cy5BQ0NPVU5UX0lEfS0ke2Nkay5Bd3MuUkVHSU9OfWAsXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcclxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgdmVyc2lvbmVkOiB0cnVlLCAvLyBWZXJzaW9uaW5nIGZvciBkb2N1bWVudCBpbnRlZ3JpdHlcclxuICAgICAgcmVtb3ZhbFBvbGljeSxcclxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IGZhbHNlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gQ2xvdWRGb3JtYXRpb24gT3V0cHV0c1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01lZGlhQnVja2V0TmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMubWVkaWFCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBidWNrZXQgZm9yIHByb3BlcnR5IG1lZGlhIChwaG90b3MgYW5kIDM2MMKwIHBhbm9yYW1hcyknLFxyXG4gICAgICBleHBvcnROYW1lOiBgcmVudHZpc2lvbi1tZWRpYS1idWNrZXQtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01lZGlhQnVja2V0QXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5tZWRpYUJ1Y2tldC5idWNrZXRBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBwcm9wZXJ0eSBtZWRpYSBTMyBidWNrZXQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xlYXNlRG9jc0J1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmxlYXNlRG9jc0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBmb3IgcHJpdmF0ZSBsZWFzZSBkb2N1bWVudHMnLFxyXG4gICAgICBleHBvcnROYW1lOiBgcmVudHZpc2lvbi1sZWFzZS1kb2NzLWJ1Y2tldC0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTGVhc2VEb2NzQnVja2V0QXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5sZWFzZURvY3NCdWNrZXQuYnVja2V0QXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FSTiBvZiB0aGUgbGVhc2UgZG9jdW1lbnRzIFMzIGJ1Y2tldCcsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19