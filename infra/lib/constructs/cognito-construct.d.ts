import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
/**
 * Properties for the RentVision Cognito construct.
 */
export interface RentVisionCognitoProps {
    /** Environment label (e.g., 'dev', 'staging', 'prod'). */
    readonly environment: string;
}
/**
 * CDK Construct that provisions the Cognito User Pool and App Client for RentVision.
 */
export declare class RentVisionCognito extends Construct {
    /** The Cognito User Pool. */
    readonly userPool: cognito.UserPool;
    /** The Cognito User Pool Client. */
    readonly userPoolClient: cognito.UserPoolClient;
    constructor(scope: Construct, id: string, props: RentVisionCognitoProps);
}
