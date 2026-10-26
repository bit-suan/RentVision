"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RentVisionDynamoDb = void 0;
const cdk = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const constructs_1 = require("constructs");
/**
 * CDK Construct that provisions all DynamoDB tables for RentVision.
 *
 * Tables:
 *   - Properties: listing records with geospatial (geohash) and status indexes
 *   - Users: landlord and tenant profiles
 *   - Leases: lease document metadata linked to listings
 *
 * All tables use PAY_PER_REQUEST billing (on-demand) to minimize cost
 * during development and hackathon usage.
 */
class RentVisionDynamoDb extends constructs_1.Construct {
    /** DynamoDB table for property listings. */
    propertiesTable;
    /** DynamoDB table for user profiles. */
    usersTable;
    /** DynamoDB table for lease documents. */
    leasesTable;
    /** Name of the geospatial GSI on the properties table. */
    static GEO_INDEX_NAME = 'geoIndex';
    /** Name of the status GSI on the properties table. */
    static STATUS_INDEX_NAME = 'statusIndex';
    constructor(scope, id, props) {
        super(scope, id);
        const removalPolicy = props.removalPolicy ?? cdk.RemovalPolicy.RETAIN;
        // -------------------------------------------------------------------------
        // Properties Table
        // -------------------------------------------------------------------------
        this.propertiesTable = new dynamodb.Table(this, 'PropertiesTable', {
            tableName: `rentvision-properties-${props.environment}`,
            partitionKey: {
                name: 'listingId',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            removalPolicy,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
        });
        // Geospatial index: 5-character geohash prefix as partition key.
        // Enables bounding-box candidate retrieval for radius searches.
        // DynamoDB does NOT support native radius queries — the Lambda handler
        // queries candidate cells and applies Haversine distance filtering.
        this.propertiesTable.addGlobalSecondaryIndex({
            indexName: RentVisionDynamoDb.GEO_INDEX_NAME,
            partitionKey: {
                name: 'geohash',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'listingId',
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Status index: supports listing queries filtered by status,
        // sorted by creation time (newest first via ISO 8601 sort key).
        this.propertiesTable.addGlobalSecondaryIndex({
            indexName: RentVisionDynamoDb.STATUS_INDEX_NAME,
            partitionKey: {
                name: 'status',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'createdAt',
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // -------------------------------------------------------------------------
        // Users Table
        // -------------------------------------------------------------------------
        this.usersTable = new dynamodb.Table(this, 'UsersTable', {
            tableName: `rentvision-users-${props.environment}`,
            partitionKey: {
                name: 'userId',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            removalPolicy,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
        });
        // -------------------------------------------------------------------------
        // Leases Table
        // -------------------------------------------------------------------------
        this.leasesTable = new dynamodb.Table(this, 'LeasesTable', {
            tableName: `rentvision-leases-${props.environment}`,
            partitionKey: {
                name: 'leaseId',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'listingId',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            pointInTimeRecovery: true,
            removalPolicy,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
        });
        // -------------------------------------------------------------------------
        // CloudFormation Outputs
        // -------------------------------------------------------------------------
        new cdk.CfnOutput(this, 'PropertiesTableName', {
            value: this.propertiesTable.tableName,
            description: 'DynamoDB properties table name',
            exportName: `rentvision-properties-table-${props.environment}`,
        });
        new cdk.CfnOutput(this, 'UsersTableName', {
            value: this.usersTable.tableName,
            description: 'DynamoDB users table name',
            exportName: `rentvision-users-table-${props.environment}`,
        });
        new cdk.CfnOutput(this, 'LeasesTableName', {
            value: this.leasesTable.tableName,
            description: 'DynamoDB leases table name',
            exportName: `rentvision-leases-table-${props.environment}`,
        });
    }
}
exports.RentVisionDynamoDb = RentVisionDynamoDb;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1vZGItY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZHluYW1vZGItY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxxREFBcUQ7QUFDckQsMkNBQXVDO0FBWXZDOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFhLGtCQUFtQixTQUFRLHNCQUFTO0lBQy9DLDRDQUE0QztJQUM1QixlQUFlLENBQWlCO0lBQ2hELHdDQUF3QztJQUN4QixVQUFVLENBQWlCO0lBQzNDLDBDQUEwQztJQUMxQixXQUFXLENBQWlCO0lBRTVDLDBEQUEwRDtJQUNuRCxNQUFNLENBQVUsY0FBYyxHQUFHLFVBQVUsQ0FBQztJQUNuRCxzREFBc0Q7SUFDL0MsTUFBTSxDQUFVLGlCQUFpQixHQUFHLGFBQWEsQ0FBQztJQUV6RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQThCO1FBQ3RFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGFBQWEsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztRQUV0RSw0RUFBNEU7UUFDNUUsbUJBQW1CO1FBQ25CLDRFQUE0RTtRQUM1RSxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDakUsU0FBUyxFQUFFLHlCQUF5QixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3ZELFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsV0FBVztnQkFDakIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUNELFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixhQUFhO1lBQ2IsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FB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QVM7WUFDaEMsV0FBVyxFQUFFLDJCQUEyQjtZQUN4QyxVQUFVLEVBQUUsMEJBQTBCLEtBQUssQ0FBQyxXQUFXLEVBQUU7U0FDMUQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN6QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTO1lBQ2pDLFdBQVcsRUFBRSw0QkFBNEI7WUFDekMsVUFBVSxFQUFFLDJCQUEyQixLQUFLLENBQUMsV0FBVyxFQUFFO1NBQzNELENBQUMsQ0FBQztJQUNMLENBQUM7O0FBdkhILGdEQXdIQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuLyoqXHJcbiAqIFByb3BlcnRpZXMgZm9yIHRoZSBSZW50VmlzaW9uIER5bmFtb0RCIGNvbnN0cnVjdC5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmVudFZpc2lvbkR5bmFtb0RiUHJvcHMge1xyXG4gIC8qKiBFbnZpcm9ubWVudCBsYWJlbCAoZS5nLiwgJ2RldicsICdzdGFnaW5nJywgJ3Byb2QnKS4gKi9cclxuICByZWFkb25seSBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIC8qKiBPcHRpb25hbCByZW1vdmFsIHBvbGljeSBvdmVycmlkZS4gRGVmYXVsdHMgdG8gUkVUQUlOLiAqL1xyXG4gIHJlYWRvbmx5IHJlbW92YWxQb2xpY3k/OiBjZGsuUmVtb3ZhbFBvbGljeTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENESyBDb25zdHJ1Y3QgdGhhdCBwcm92aXNpb25zIGFsbCBEeW5hbW9EQiB0YWJsZXMgZm9yIFJlbnRWaXNpb24uXHJcbiAqXHJcbiAqIFRhYmxlczpcclxuICogICAtIFByb3BlcnRpZXM6IGxpc3RpbmcgcmVjb3JkcyB3aXRoIGdlb3NwYXRpYWwgKGdlb2hhc2gpIGFuZCBzdGF0dXMgaW5kZXhlc1xyXG4gKiAgIC0gVXNlcnM6IGxhbmRsb3JkIGFuZCB0ZW5hbnQgcHJvZmlsZXNcclxuICogICAtIExlYXNlczogbGVhc2UgZG9jdW1lbnQgbWV0YWRhdGEgbGlua2VkIHRvIGxpc3RpbmdzXHJcbiAqXHJcbiAqIEFsbCB0YWJsZXMgdXNlIFBBWV9QRVJfUkVRVUVTVCBiaWxsaW5nIChvbi1kZW1hbmQpIHRvIG1pbmltaXplIGNvc3RcclxuICogZHVyaW5nIGRldmVsb3BtZW50IGFuZCBoYWNrYXRob24gdXNhZ2UuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUmVudFZpc2lvbkR5bmFtb0RiIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICAvKiogRHluYW1vREIgdGFibGUgZm9yIHByb3BlcnR5IGxpc3RpbmdzLiAqL1xyXG4gIHB1YmxpYyByZWFkb25seSBwcm9wZXJ0aWVzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIC8qKiBEeW5hbW9EQiB0YWJsZSBmb3IgdXNlciBwcm9maWxlcy4gKi9cclxuICBwdWJsaWMgcmVhZG9ubHkgdXNlcnNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgLyoqIER5bmFtb0RCIHRhYmxlIGZvciBsZWFzZSBkb2N1bWVudHMuICovXHJcbiAgcHVibGljIHJlYWRvbmx5IGxlYXNlc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuXHJcbiAgLyoqIE5hbWUgb2YgdGhlIGdlb3NwYXRpYWwgR1NJIG9uIHRoZSBwcm9wZXJ0aWVzIHRhYmxlLiAqL1xyXG4gIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgR0VPX0lOREVYX05BTUUgPSAnZ2VvSW5kZXgnO1xyXG4gIC8qKiBOYW1lIG9mIHRoZSBzdGF0dXMgR1NJIG9uIHRoZSBwcm9wZXJ0aWVzIHRhYmxlLiAqL1xyXG4gIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgU1RBVFVTX0lOREVYX05BTUUgPSAnc3RhdHVzSW5kZXgnO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUmVudFZpc2lvbkR5bmFtb0RiUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgY29uc3QgcmVtb3ZhbFBvbGljeSA9IHByb3BzLnJlbW92YWxQb2xpY3kgPz8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOO1xyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIFByb3BlcnRpZXMgVGFibGVcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIHRoaXMucHJvcGVydGllc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdQcm9wZXJ0aWVzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogYHJlbnR2aXNpb24tcHJvcGVydGllcy0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdsaXN0aW5nSWQnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxyXG4gICAgICByZW1vdmFsUG9saWN5LFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZW9zcGF0aWFsIGluZGV4OiA1LWNoYXJhY3RlciBnZW9oYXNoIHByZWZpeCBhcyBwYXJ0aXRpb24ga2V5LlxyXG4gICAgLy8gRW5hYmxlcyBib3VuZGluZy1ib3ggY2FuZGlkYXRlIHJldHJpZXZhbCBmb3IgcmFkaXVzIHNlYXJjaGVzLlxyXG4gICAgLy8gRHluYW1vREIgZG9lcyBOT1Qgc3VwcG9ydCBuYXRpdmUgcmFkaXVzIHF1ZXJpZXMg4oCUIHRoZSBMYW1iZGEgaGFuZGxlclxyXG4gICAgLy8gcXVlcmllcyBjYW5kaWRhdGUgY2VsbHMgYW5kIGFwcGxpZXMgSGF2ZXJzaW5lIGRpc3RhbmNlIGZpbHRlcmluZy5cclxuICAgIHRoaXMucHJvcGVydGllc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiBSZW50VmlzaW9uRHluYW1vRGIuR0VPX0lOREVYX05BTUUsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdnZW9oYXNoJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICdsaXN0aW5nSWQnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RhdHVzIGluZGV4OiBzdXBwb3J0cyBsaXN0aW5nIHF1ZXJpZXMgZmlsdGVyZWQgYnkgc3RhdHVzLFxyXG4gICAgLy8gc29ydGVkIGJ5IGNyZWF0aW9uIHRpbWUgKG5ld2VzdCBmaXJzdCB2aWEgSVNPIDg2MDEgc29ydCBrZXkpLlxyXG4gICAgdGhpcy5wcm9wZXJ0aWVzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6IFJlbnRWaXNpb25EeW5hbW9EYi5TVEFUVVNfSU5ERVhfTkFNRSxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3N0YXR1cycsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAnY3JlYXRlZEF0JyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vIFVzZXJzIFRhYmxlXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICB0aGlzLnVzZXJzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1VzZXJzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogYHJlbnR2aXNpb24tdXNlcnMtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAndXNlcklkJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeSxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gTGVhc2VzIFRhYmxlXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICB0aGlzLmxlYXNlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdMZWFzZXNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiBgcmVudHZpc2lvbi1sZWFzZXMtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnbGVhc2VJZCcsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAnbGlzdGluZ0lkJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeSxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gQ2xvdWRGb3JtYXRpb24gT3V0cHV0c1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Byb3BlcnRpZXNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnByb3BlcnRpZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgcHJvcGVydGllcyB0YWJsZSBuYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYHJlbnR2aXNpb24tcHJvcGVydGllcy10YWJsZS0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlcnNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHVzZXJzIHRhYmxlIG5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgcmVudHZpc2lvbi11c2Vycy10YWJsZS0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTGVhc2VzVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5sZWFzZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgbGVhc2VzIHRhYmxlIG5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgcmVudHZpc2lvbi1sZWFzZXMtdGFibGUtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==