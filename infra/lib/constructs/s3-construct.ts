import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * Properties for the RentVision S3 construct.
 */
export interface RentVisionS3Props {
  /** Environment label (e.g., 'dev', 'staging', 'prod'). */
  readonly environment: string;
  /** Allowed CORS origins for the media bucket (e.g., ['http://localhost:3000']). */
  readonly corsAllowedOrigins: string[];
  /** Optional removal policy override. Defaults to RETAIN. */
  readonly removalPolicy?: cdk.RemovalPolicy;
}

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
export class RentVisionS3 extends Construct {
  /** S3 bucket for property photos and 360° panoramas. */
  public readonly mediaBucket: s3.Bucket;
  /** S3 bucket for private lease document storage. */
  public readonly leaseDocsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: RentVisionS3Props) {
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
