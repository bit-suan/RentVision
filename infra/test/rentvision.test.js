"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("aws-cdk-lib");
const assertions_1 = require("aws-cdk-lib/assertions");
const rentvision_stack_1 = require("../lib/rentvision-stack");
function synthTemplate() {
    const app = new cdk.App();
    const stack = new rentvision_stack_1.RentVisionStack(app, 'TestRentVisionStack', {
        env: { account: '123456789012', region: 'eu-west-1' },
        environment: 'test',
    });
    return assertions_1.Template.fromStack(stack);
}
describe('RentVision Infrastructure Stack', () => {
    test('creates DynamoDB tables with geospatial and status indexes', () => {
        const template = synthTemplate();
        template.resourceCountIs('AWS::DynamoDB::Table', 3);
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            TableName: 'rentvision-properties-test',
            GlobalSecondaryIndexes: assertions_1.Match.arrayWith([
                assertions_1.Match.objectLike({ IndexName: 'geoIndex' }),
                assertions_1.Match.objectLike({ IndexName: 'statusIndex' }),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVudHZpc2lvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVudHZpc2lvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbUNBQW1DO0FBQ25DLHVEQUF5RDtBQUN6RCw4REFBMEQ7QUFFMUQsU0FBUyxhQUFhO0lBQ3BCLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzFCLE1BQU0sS0FBSyxHQUFHLElBQUksa0NBQWUsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUU7UUFDNUQsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFO1FBQ3JELFdBQVcsRUFBRSxNQUFNO0tBQ3BCLENBQUMsQ0FBQztJQUNILE9BQU8scUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkMsQ0FBQztBQUVELFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7SUFDL0MsSUFBSSxDQUFDLDREQUE0RCxFQUFFLEdBQUcsRUFBRTtRQUN0RSxNQUFNLFFBQVEsR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUNqQyxRQUFRLENBQUMsZUFBZSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRTtZQUNyRCxTQUFTLEVBQUUsNEJBQTRCO1lBQ3ZDLHNCQUFzQixFQUFFLGtCQUFLLENBQUMsU0FBUyxDQUFDO2dCQUN0QyxrQkFBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQztnQkFDM0Msa0JBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLENBQUM7YUFDL0MsQ0FBQztTQUNILENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtRQUN0RCxNQUFNLFFBQVEsR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUNqQyxRQUFRLENBQUMsZUFBZSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9DLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRTtZQUNoRCw4QkFBOEIsRUFBRTtnQkFDOUIsZUFBZSxFQUFFLElBQUk7Z0JBQ3JCLGlCQUFpQixFQUFFLElBQUk7Z0JBQ3ZCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLHFCQUFxQixFQUFFLElBQUk7YUFDNUI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7UUFDNUQsTUFBTSxRQUFRLEdBQUcsYUFBYSxFQUFFLENBQUM7UUFDakMsUUFBUSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RCxRQUFRLENBQUMsZUFBZSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBNYXRjaCwgVGVtcGxhdGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hc3NlcnRpb25zJztcclxuaW1wb3J0IHsgUmVudFZpc2lvblN0YWNrIH0gZnJvbSAnLi4vbGliL3JlbnR2aXNpb24tc3RhY2snO1xyXG5cclxuZnVuY3Rpb24gc3ludGhUZW1wbGF0ZSgpOiBUZW1wbGF0ZSB7XHJcbiAgY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcclxuICBjb25zdCBzdGFjayA9IG5ldyBSZW50VmlzaW9uU3RhY2soYXBwLCAnVGVzdFJlbnRWaXNpb25TdGFjaycsIHtcclxuICAgIGVudjogeyBhY2NvdW50OiAnMTIzNDU2Nzg5MDEyJywgcmVnaW9uOiAnZXUtd2VzdC0xJyB9LFxyXG4gICAgZW52aXJvbm1lbnQ6ICd0ZXN0JyxcclxuICB9KTtcclxuICByZXR1cm4gVGVtcGxhdGUuZnJvbVN0YWNrKHN0YWNrKTtcclxufVxyXG5cclxuZGVzY3JpYmUoJ1JlbnRWaXNpb24gSW5mcmFzdHJ1Y3R1cmUgU3RhY2snLCAoKSA9PiB7XHJcbiAgdGVzdCgnY3JlYXRlcyBEeW5hbW9EQiB0YWJsZXMgd2l0aCBnZW9zcGF0aWFsIGFuZCBzdGF0dXMgaW5kZXhlcycsICgpID0+IHtcclxuICAgIGNvbnN0IHRlbXBsYXRlID0gc3ludGhUZW1wbGF0ZSgpO1xyXG4gICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIDMpO1xyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OkR5bmFtb0RCOjpUYWJsZScsIHtcclxuICAgICAgVGFibGVOYW1lOiAncmVudHZpc2lvbi1wcm9wZXJ0aWVzLXRlc3QnLFxyXG4gICAgICBHbG9iYWxTZWNvbmRhcnlJbmRleGVzOiBNYXRjaC5hcnJheVdpdGgoW1xyXG4gICAgICAgIE1hdGNoLm9iamVjdExpa2UoeyBJbmRleE5hbWU6ICdnZW9JbmRleCcgfSksXHJcbiAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7IEluZGV4TmFtZTogJ3N0YXR1c0luZGV4JyB9KSxcclxuICAgICAgXSksXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgdGVzdCgnY3JlYXRlcyBwcml2YXRlIG1lZGlhIGFuZCBsZWFzZSBTMyBidWNrZXRzJywgKCkgPT4ge1xyXG4gICAgY29uc3QgdGVtcGxhdGUgPSBzeW50aFRlbXBsYXRlKCk7XHJcbiAgICB0ZW1wbGF0ZS5yZXNvdXJjZUNvdW50SXMoJ0FXUzo6UzM6OkJ1Y2tldCcsIDIpO1xyXG4gICAgdGVtcGxhdGUuaGFzUmVzb3VyY2VQcm9wZXJ0aWVzKCdBV1M6OlMzOjpCdWNrZXQnLCB7XHJcbiAgICAgIFB1YmxpY0FjY2Vzc0Jsb2NrQ29uZmlndXJhdGlvbjoge1xyXG4gICAgICAgIEJsb2NrUHVibGljQWNsczogdHJ1ZSxcclxuICAgICAgICBCbG9ja1B1YmxpY1BvbGljeTogdHJ1ZSxcclxuICAgICAgICBJZ25vcmVQdWJsaWNBY2xzOiB0cnVlLFxyXG4gICAgICAgIFJlc3RyaWN0UHVibGljQnVja2V0czogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICB0ZXN0KCdjcmVhdGVzIEFQSSBHYXRld2F5IEhUVFAgQVBJIGFuZCBMYW1iZGEgaGFuZGxlcnMnLCAoKSA9PiB7XHJcbiAgICBjb25zdCB0ZW1wbGF0ZSA9IHN5bnRoVGVtcGxhdGUoKTtcclxuICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpBcGlHYXRld2F5VjI6OkFwaScsIDEpO1xyXG4gICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCAzKTtcclxuICB9KTtcclxufSk7XHJcbiJdfQ==