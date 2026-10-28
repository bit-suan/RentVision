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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiczMtY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiczMtY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyx5Q0FBeUM7QUFDekMsMkNBQXVDO0FBY3ZDOzs7Ozs7Ozs7Ozs7O0dBYUc7QUFDSCxNQUFhLFlBQWEsU0FBUSxzQkFBUztJQUN6Qyx3REFBd0Q7SUFDeEMsV0FBVyxDQUFZO0lBQ3ZDLG9EQUFvRDtJQUNwQyxlQUFlLENBQVk7SUFFM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3QjtRQUNoRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxhQUFhLElBQUksR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7UUFFdEUsNEVBQTRFO1FBQzVFLHdCQUF3QjtRQUN4Qiw0RUFBNEU7UUFDNUUseUJBQXlCO1FBQ3pCLGtEQUFrRDtRQUNsRCxxREFBcUQ7UUFDckQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzVELFVBQVUsRUFBRSw2QkFBNkIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUU7WUFDL0UsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsVUFBVSxFQUFFLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVO1lBQzFDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLGFBQWE7WUFDYixpQkFBaUIsRUFBRSxLQUFLO1lBRXhCLHdEQUF3RDtZQUN4RCxJQUFJLEVBQUU7Z0JBQ0o7b0JBQ0UsY0FBYyxFQUFFO3dCQUNkLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRzt3QkFDbEIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHO3dCQUNsQixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUk7cUJBQ3BCO29CQUNELGNBQWMsRUFBRSxLQUFLLENBQUMsa0JBQWtCO29CQUN4QyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLGNBQWMsRUFBRSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQztvQkFDMUMsTUFBTSxFQUFFLElBQUk7aUJBQ2I7YUFDRjtZQUVELHdDQUF3QztZQUN4QyxjQUFjLEVBQUU7Z0JBQ2Q7b0JBQ0UsRUFBRSxFQUFFLGdCQUFnQjtvQkFDcEIsT0FBTyxFQUFFLElBQUk7b0JBQ2IsV0FBVyxFQUFFO3dCQUNYOzRCQUNFLFlBQVksRUFBRSxFQUFFLENBQUMsWUFBWSxDQUFDLGlCQUFpQjs0QkFDL0MsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzt5QkFDdkM7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILDRFQUE0RTtRQUM1RSw0Q0FBNEM7UUFDNUMsNEVBQTRFO1FBQzVFLHlCQUF5QjtRQUN6Qix1Q0FBdUM7UUFDdkMsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUNqRSxVQUFVLEVBQUUsOEJBQThCLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFO1lBQ2hGLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxVQUFVLEVBQUUsSUFBSTtZQUNoQixTQUFTLEVBQUUsSUFBSSxFQUFFLG9DQUFvQztZQUNyRCxhQUFhO1lBQ2IsaUJBQWlCLEVBQUUsS0FBSztTQUN6QixDQUFDLENBQUM7UUFFSCw0RUFBNEU7UUFDNUUseUJBQXlCO1FBQ3pCLDRFQUE0RTtRQUM1RSxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3pDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVU7WUFDbEMsV0FBVyxFQUFFLDBEQUEwRDtZQUN2RSxVQUFVLEVBQUUsMkJBQTJCLEtBQUssQ0FBQyxXQUFXLEVBQUU7U0FDM0QsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTO1lBQ2pDLFdBQVcsRUFBRSxxQ0FBcUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3QyxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVO1lBQ3RDLFdBQVcsRUFBRSx1Q0FBdUM7WUFDcEQsVUFBVSxFQUFFLGdDQUFnQyxLQUFLLENBQUMsV0FBVyxFQUFFO1NBQ2hFLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsU0FBUztZQUNyQyxXQUFXLEVBQUUsc0NBQXNDO1NBQ3BELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWpHRCxvQ0FpR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG4vKipcbiAqIFByb3BlcnRpZXMgZm9yIHRoZSBSZW50VmlzaW9uIFMzIGNvbnN0cnVjdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZW50VmlzaW9uUzNQcm9wcyB7XG4gIC8qKiBFbnZpcm9ubWVudCBsYWJlbCAoZS5nLiwgJ2RldicsICdzdGFnaW5nJywgJ3Byb2QnKS4gKi9cbiAgcmVhZG9ubHkgZW52aXJvbm1lbnQ6IHN0cmluZztcbiAgLyoqIEFsbG93ZWQgQ09SUyBvcmlnaW5zIGZvciB0aGUgbWVkaWEgYnVja2V0IChlLmcuLCBbJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCddKS4gKi9cbiAgcmVhZG9ubHkgY29yc0FsbG93ZWRPcmlnaW5zOiBzdHJpbmdbXTtcbiAgLyoqIE9wdGlvbmFsIHJlbW92YWwgcG9saWN5IG92ZXJyaWRlLiBEZWZhdWx0cyB0byBSRVRBSU4uICovXG4gIHJlYWRvbmx5IHJlbW92YWxQb2xpY3k/OiBjZGsuUmVtb3ZhbFBvbGljeTtcbn1cblxuLyoqXG4gKiBDREsgQ29uc3RydWN0IHRoYXQgcHJvdmlzaW9ucyBTMyBidWNrZXRzIGZvciBSZW50VmlzaW9uIG1lZGlhIGFuZCBkb2N1bWVudHMuXG4gKlxuICogQnVja2V0czpcbiAqICAgLSBQcm9wZXJ0eSBNZWRpYTogcGhvdG9zLCBmbG9vciBwbGFucywgYW5kIDM2MMKwIGVxdWlyZWN0YW5ndWxhciBwYW5vcmFtYXNcbiAqICAgLSBMZWFzZSBEb2N1bWVudHM6IHByaXZhdGUgZW5jcnlwdGVkIFBERiBsZWFzZSBhZ3JlZW1lbnRzXG4gKlxuICogU2VjdXJpdHk6XG4gKiAgIC0gQWxsIHB1YmxpYyBhY2Nlc3MgaXMgYmxvY2tlZCBvbiBib3RoIGJ1Y2tldHNcbiAqICAgLSBTU0UtUzMgZW5jcnlwdGlvbiBlbmFibGVkXG4gKiAgIC0gQ09SUyBjb25maWd1cmVkIG9ubHkgb24gdGhlIG1lZGlhIGJ1Y2tldCBmb3IgZnJvbnRlbmQgdXBsb2FkIHN1cHBvcnRcbiAqICAgLSBMZWFzZSBkb2N1bWVudHMgYnVja2V0IGhhcyBubyBDT1JTIChiYWNrZW5kLW9ubHkgdmlhIHByZXNpZ25lZCBVUkxzKVxuICogICAtIEVuZm9yY2VkIFNTTC1vbmx5IGFjY2Vzc1xuICovXG5leHBvcnQgY2xhc3MgUmVudFZpc2lvblMzIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgLyoqIFMzIGJ1Y2tldCBmb3IgcHJvcGVydHkgcGhvdG9zIGFuZCAzNjDCsCBwYW5vcmFtYXMuICovXG4gIHB1YmxpYyByZWFkb25seSBtZWRpYUJ1Y2tldDogczMuQnVja2V0O1xuICAvKiogUzMgYnVja2V0IGZvciBwcml2YXRlIGxlYXNlIGRvY3VtZW50IHN0b3JhZ2UuICovXG4gIHB1YmxpYyByZWFkb25seSBsZWFzZURvY3NCdWNrZXQ6IHMzLkJ1Y2tldDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUmVudFZpc2lvblMzUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgcmVtb3ZhbFBvbGljeSA9IHByb3BzLnJlbW92YWxQb2xpY3kgPz8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIFByb3BlcnR5IE1lZGlhIEJ1Y2tldFxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBPYmplY3Qga2V5IGNvbnZlbnRpb246XG4gICAgLy8gICBsaXN0aW5ncy97bGlzdGluZ0lkfS9waG90b3Mve3V1aWR9X3tmaWxlbmFtZX1cbiAgICAvLyAgIGxpc3RpbmdzL3tsaXN0aW5nSWR9L3Bhbm9yYW1hcy97dXVpZH1fe2ZpbGVuYW1lfVxuICAgIHRoaXMubWVkaWFCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdQcm9wZXJ0eU1lZGlhQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYHJlbnR2aXNpb24tcHJvcGVydHktbWVkaWEtJHtjZGsuQXdzLkFDQ09VTlRfSUR9LSR7Y2RrLkF3cy5SRUdJT059YCxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgdmVyc2lvbmVkOiBmYWxzZSxcbiAgICAgIHJlbW92YWxQb2xpY3ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogZmFsc2UsXG5cbiAgICAgIC8vIENPUlMgY29uZmlndXJhdGlvbiBmb3IgZnJvbnRlbmQgcHJlc2lnbmVkIFVSTCB1cGxvYWRzXG4gICAgICBjb3JzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW1xuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuR0VULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUFVULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuSEVBRCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBwcm9wcy5jb3JzQWxsb3dlZE9yaWdpbnMsXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxuICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbJ0VUYWcnLCAnQ29udGVudC1MZW5ndGgnXSxcbiAgICAgICAgICBtYXhBZ2U6IDM2MDAsXG4gICAgICAgIH0sXG4gICAgICBdLFxuXG4gICAgICAvLyBMaWZlY3ljbGUgcnVsZXMgZm9yIGNvc3Qgb3B0aW1pemF0aW9uXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdUcmFuc2l0aW9uVG9JQScsXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICB0cmFuc2l0aW9uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUyxcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg5MCksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIExlYXNlIERvY3VtZW50cyBCdWNrZXQgKHByaXZhdGUsIG5vIENPUlMpXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIE9iamVjdCBrZXkgY29udmVudGlvbjpcbiAgICAvLyAgIGxlYXNlcy97bGVhc2VJZH0ve3V1aWR9X3tmaWxlbmFtZX1cbiAgICAvLyBBY2Nlc3M6IGJhY2tlbmQtb25seSB2aWEgcHJlc2lnbmVkIFVSTHNcbiAgICB0aGlzLmxlYXNlRG9jc0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0xlYXNlRG9jdW1lbnRzQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYHJlbnR2aXNpb24tbGVhc2UtZG9jdW1lbnRzLSR7Y2RrLkF3cy5BQ0NPVU5UX0lEfS0ke2Nkay5Bd3MuUkVHSU9OfWAsXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSwgLy8gVmVyc2lvbmluZyBmb3IgZG9jdW1lbnQgaW50ZWdyaXR5XG4gICAgICByZW1vdmFsUG9saWN5LFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IGZhbHNlLFxuICAgIH0pO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIENsb3VkRm9ybWF0aW9uIE91dHB1dHNcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01lZGlhQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLm1lZGlhQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBmb3IgcHJvcGVydHkgbWVkaWEgKHBob3RvcyBhbmQgMzYwwrAgcGFub3JhbWFzKScsXG4gICAgICBleHBvcnROYW1lOiBgcmVudHZpc2lvbi1tZWRpYS1idWNrZXQtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01lZGlhQnVja2V0QXJuJywge1xuICAgICAgdmFsdWU6IHRoaXMubWVkaWFCdWNrZXQuYnVja2V0QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdBUk4gb2YgdGhlIHByb3BlcnR5IG1lZGlhIFMzIGJ1Y2tldCcsXG4gICAgfSk7XG5cbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTGVhc2VEb2NzQnVja2V0TmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmxlYXNlRG9jc0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgZGVzY3JpcHRpb246ICdTMyBidWNrZXQgZm9yIHByaXZhdGUgbGVhc2UgZG9jdW1lbnRzJyxcbiAgICAgIGV4cG9ydE5hbWU6IGByZW50dmlzaW9uLWxlYXNlLWRvY3MtYnVja2V0LSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMZWFzZURvY3NCdWNrZXRBcm4nLCB7XG4gICAgICB2YWx1ZTogdGhpcy5sZWFzZURvY3NCdWNrZXQuYnVja2V0QXJuLFxuICAgICAgZGVzY3JpcHRpb246ICdBUk4gb2YgdGhlIGxlYXNlIGRvY3VtZW50cyBTMyBidWNrZXQnLFxuICAgIH0pO1xuICB9XG59XG4iXX0=