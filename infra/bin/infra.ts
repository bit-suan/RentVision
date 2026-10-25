#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { RentVisionStack } from '../lib/rentvision-stack';

const app = new cdk.App();

const environment = process.env.DEPLOY_ENV || 'dev';

new RentVisionStack(app, `RentVisionStack-${environment}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'eu-west-1',
  },
  environment,
  description: 'RentVision core infrastructure stack: DynamoDB, S3, API Gateway, and Lambda integrations',
});
