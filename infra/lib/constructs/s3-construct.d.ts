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
export declare class RentVisionS3 extends Construct {
    /** S3 bucket for property photos and 360° panoramas. */
    readonly mediaBucket: s3.Bucket;
    /** S3 bucket for private lease document storage. */
    readonly leaseDocsBucket: s3.Bucket;
    constructor(scope: Construct, id: string, props: RentVisionS3Props);
}
