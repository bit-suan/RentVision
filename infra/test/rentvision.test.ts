import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { RentVisionStack } from '../lib/rentvision-stack';

function synthTemplate(): Template {
  const app = new cdk.App();
  const stack = new RentVisionStack(app, 'TestRentVisionStack', {
    env: { account: '123456789012', region: 'eu-west-1' },
    environment: 'test',
  });
  return Template.fromStack(stack);
}

describe('RentVision Infrastructure Stack', () => {
  test('creates DynamoDB tables with geospatial and status indexes', () => {
    const template = synthTemplate();
    template.resourceCountIs('AWS::DynamoDB::Table', 3);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'rentvision-properties-test',
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: 'geoIndex' }),
        Match.objectLike({ IndexName: 'statusIndex' }),
      ]),
    });
  });

  test('creates private media and lease S3 buckets', () => {
    const template = synthTemplate();
    template.resourceCountIs('AWS::S3::Bucket', 2);
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test('creates API Gateway HTTP API and Lambda handlers', () => {
    const template = synthTemplate();
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
    template.resourceCountIs('AWS::Lambda::Function', 3);
  });
});
