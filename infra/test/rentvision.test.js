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
        template.resourceCountIs('AWS::Lambda::Function', 4);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVudHZpc2lvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVudHZpc2lvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsbUNBQW1DO0FBQ25DLHVEQUF5RDtBQUN6RCw4REFBMEQ7QUFFMUQsU0FBUyxhQUFhO0lBQ3BCLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBQzFCLE1BQU0sS0FBSyxHQUFHLElBQUksa0NBQWUsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUU7UUFDNUQsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFO1FBQ3JELFdBQVcsRUFBRSxNQUFNO0tBQ3BCLENBQUMsQ0FBQztJQUNILE9BQU8scUJBQVEsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbkMsQ0FBQztBQUVELFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7SUFDL0MsSUFBSSxDQUFDLDREQUE0RCxFQUFFLEdBQUcsRUFBRTtRQUN0RSxNQUFNLFFBQVEsR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUNqQyxRQUFRLENBQUMsZUFBZSxDQUFDLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BELFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRTtZQUNyRCxTQUFTLEVBQUUsNEJBQTRCO1lBQ3ZDLHNCQUFzQixFQUFFLGtCQUFLLENBQUMsU0FBUyxDQUFDO2dCQUN0QyxrQkFBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsQ0FBQztnQkFDM0Msa0JBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLENBQUM7YUFDL0MsQ0FBQztTQUNILENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtRQUN0RCxNQUFNLFFBQVEsR0FBRyxhQUFhLEVBQUUsQ0FBQztRQUNqQyxRQUFRLENBQUMsZUFBZSxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9DLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsRUFBRTtZQUNoRCw4QkFBOEIsRUFBRTtnQkFDOUIsZUFBZSxFQUFFLElBQUk7Z0JBQ3JCLGlCQUFpQixFQUFFLElBQUk7Z0JBQ3ZCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLHFCQUFxQixFQUFFLElBQUk7YUFDNUI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7UUFDNUQsTUFBTSxRQUFRLEdBQUcsYUFBYSxFQUFFLENBQUM7UUFDakMsUUFBUSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0RCxRQUFRLENBQUMsZUFBZSxDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgTWF0Y2gsIFRlbXBsYXRlIH0gZnJvbSAnYXdzLWNkay1saWIvYXNzZXJ0aW9ucyc7XG5pbXBvcnQgeyBSZW50VmlzaW9uU3RhY2sgfSBmcm9tICcuLi9saWIvcmVudHZpc2lvbi1zdGFjayc7XG5cbmZ1bmN0aW9uIHN5bnRoVGVtcGxhdGUoKTogVGVtcGxhdGUge1xuICBjb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuICBjb25zdCBzdGFjayA9IG5ldyBSZW50VmlzaW9uU3RhY2soYXBwLCAnVGVzdFJlbnRWaXNpb25TdGFjaycsIHtcbiAgICBlbnY6IHsgYWNjb3VudDogJzEyMzQ1Njc4OTAxMicsIHJlZ2lvbjogJ2V1LXdlc3QtMScgfSxcbiAgICBlbnZpcm9ubWVudDogJ3Rlc3QnLFxuICB9KTtcbiAgcmV0dXJuIFRlbXBsYXRlLmZyb21TdGFjayhzdGFjayk7XG59XG5cbmRlc2NyaWJlKCdSZW50VmlzaW9uIEluZnJhc3RydWN0dXJlIFN0YWNrJywgKCkgPT4ge1xuICB0ZXN0KCdjcmVhdGVzIER5bmFtb0RCIHRhYmxlcyB3aXRoIGdlb3NwYXRpYWwgYW5kIHN0YXR1cyBpbmRleGVzJywgKCkgPT4ge1xuICAgIGNvbnN0IHRlbXBsYXRlID0gc3ludGhUZW1wbGF0ZSgpO1xuICAgIHRlbXBsYXRlLnJlc291cmNlQ291bnRJcygnQVdTOjpEeW5hbW9EQjo6VGFibGUnLCAzKTtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6RHluYW1vREI6OlRhYmxlJywge1xuICAgICAgVGFibGVOYW1lOiAncmVudHZpc2lvbi1wcm9wZXJ0aWVzLXRlc3QnLFxuICAgICAgR2xvYmFsU2Vjb25kYXJ5SW5kZXhlczogTWF0Y2guYXJyYXlXaXRoKFtcbiAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7IEluZGV4TmFtZTogJ2dlb0luZGV4JyB9KSxcbiAgICAgICAgTWF0Y2gub2JqZWN0TGlrZSh7IEluZGV4TmFtZTogJ3N0YXR1c0luZGV4JyB9KSxcbiAgICAgIF0pLFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdjcmVhdGVzIHByaXZhdGUgbWVkaWEgYW5kIGxlYXNlIFMzIGJ1Y2tldHMnLCAoKSA9PiB7XG4gICAgY29uc3QgdGVtcGxhdGUgPSBzeW50aFRlbXBsYXRlKCk7XG4gICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OlMzOjpCdWNrZXQnLCAyKTtcbiAgICB0ZW1wbGF0ZS5oYXNSZXNvdXJjZVByb3BlcnRpZXMoJ0FXUzo6UzM6OkJ1Y2tldCcsIHtcbiAgICAgIFB1YmxpY0FjY2Vzc0Jsb2NrQ29uZmlndXJhdGlvbjoge1xuICAgICAgICBCbG9ja1B1YmxpY0FjbHM6IHRydWUsXG4gICAgICAgIEJsb2NrUHVibGljUG9saWN5OiB0cnVlLFxuICAgICAgICBJZ25vcmVQdWJsaWNBY2xzOiB0cnVlLFxuICAgICAgICBSZXN0cmljdFB1YmxpY0J1Y2tldHM6IHRydWUsXG4gICAgICB9LFxuICAgIH0pO1xuICB9KTtcblxuICB0ZXN0KCdjcmVhdGVzIEFQSSBHYXRld2F5IEhUVFAgQVBJIGFuZCBMYW1iZGEgaGFuZGxlcnMnLCAoKSA9PiB7XG4gICAgY29uc3QgdGVtcGxhdGUgPSBzeW50aFRlbXBsYXRlKCk7XG4gICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkFwaUdhdGV3YXlWMjo6QXBpJywgMSk7XG4gICAgdGVtcGxhdGUucmVzb3VyY2VDb3VudElzKCdBV1M6OkxhbWJkYTo6RnVuY3Rpb24nLCA0KTtcbiAgfSk7XG59KTtcbiJdfQ==