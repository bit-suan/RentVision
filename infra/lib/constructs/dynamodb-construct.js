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
    /** Name of the landlord GSI on the properties table. */
    static LANDLORD_INDEX_NAME = 'landlordIndex';
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
        // Landlord index: lets the authenticated landlord portal list every
        // listing owned by the caller (all statuses), newest first.
        this.propertiesTable.addGlobalSecondaryIndex({
            indexName: RentVisionDynamoDb.LANDLORD_INDEX_NAME,
            partitionKey: {
                name: 'landlordId',
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
        // Email index on users table for lookup by email (used by auth handler).
        this.usersTable.addGlobalSecondaryIndex({
            indexName: 'emailIndex',
            partitionKey: {
                name: 'email',
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1vZGItY29uc3RydWN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZHluYW1vZGItY29uc3RydWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUNuQyxxREFBcUQ7QUFDckQsMkNBQXVDO0FBWXZDOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFhLGtCQUFtQixTQUFRLHNCQUFTO0lBQy9DLDRDQUE0QztJQUM1QixlQUFlLENBQWlCO0lBQ2hELHdDQUF3QztJQUN4QixVQUFVLENBQWlCO0lBQzNDLDBDQUEwQztJQUMxQixXQUFXLENBQWlCO0lBRTVDLDBEQUEwRDtJQUNuRCxNQUFNLENBQVUsY0FBYyxHQUFHLFVBQVUsQ0FBQztJQUNuRCxzREFBc0Q7SUFDL0MsTUFBTSxDQUFVLGlCQUFpQixHQUFHLGFBQWEsQ0FBQztJQUN6RCx3REFBd0Q7SUFDakQsTUFBTSxDQUFVLG1CQUFtQixHQUFHLGVBQWUsQ0FBQztJQUU3RCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQThCO1FBQ3RFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGFBQWEsSUFBSSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQztRQUV0RSw0RUFBNEU7UUFDNUUsbUJBQW1CO1FBQ25CLDRFQUE0RTtRQUM1RSxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDakUsU0FBUyxFQUFFLHlCQUF5QixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3ZELFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsV0FBVztnQkFDakIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUNELFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsbUJBQW1CLEVBQUUsSUFB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IGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbi8qKlxuICogUHJvcGVydGllcyBmb3IgdGhlIFJlbnRWaXNpb24gRHluYW1vREIgY29uc3RydWN0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJlbnRWaXNpb25EeW5hbW9EYlByb3BzIHtcbiAgLyoqIEVudmlyb25tZW50IGxhYmVsIChlLmcuLCAnZGV2JywgJ3N0YWdpbmcnLCAncHJvZCcpLiAqL1xuICByZWFkb25seSBlbnZpcm9ubWVudDogc3RyaW5nO1xuICAvKiogT3B0aW9uYWwgcmVtb3ZhbCBwb2xpY3kgb3ZlcnJpZGUuIERlZmF1bHRzIHRvIFJFVEFJTi4gKi9cbiAgcmVhZG9ubHkgcmVtb3ZhbFBvbGljeT86IGNkay5SZW1vdmFsUG9saWN5O1xufVxuXG4vKipcbiAqIENESyBDb25zdHJ1Y3QgdGhhdCBwcm92aXNpb25zIGFsbCBEeW5hbW9EQiB0YWJsZXMgZm9yIFJlbnRWaXNpb24uXG4gKlxuICogVGFibGVzOlxuICogICAtIFByb3BlcnRpZXM6IGxpc3RpbmcgcmVjb3JkcyB3aXRoIGdlb3NwYXRpYWwgKGdlb2hhc2gpIGFuZCBzdGF0dXMgaW5kZXhlc1xuICogICAtIFVzZXJzOiBsYW5kbG9yZCBhbmQgdGVuYW50IHByb2ZpbGVzXG4gKiAgIC0gTGVhc2VzOiBsZWFzZSBkb2N1bWVudCBtZXRhZGF0YSBsaW5rZWQgdG8gbGlzdGluZ3NcbiAqXG4gKiBBbGwgdGFibGVzIHVzZSBQQVlfUEVSX1JFUVVFU1QgYmlsbGluZyAob24tZGVtYW5kKSB0byBtaW5pbWl6ZSBjb3N0XG4gKiBkdXJpbmcgZGV2ZWxvcG1lbnQgYW5kIGhhY2thdGhvbiB1c2FnZS5cbiAqL1xuZXhwb3J0IGNsYXNzIFJlbnRWaXNpb25EeW5hbW9EYiBleHRlbmRzIENvbnN0cnVjdCB7XG4gIC8qKiBEeW5hbW9EQiB0YWJsZSBmb3IgcHJvcGVydHkgbGlzdGluZ3MuICovXG4gIHB1YmxpYyByZWFkb25seSBwcm9wZXJ0aWVzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICAvKiogRHluYW1vREIgdGFibGUgZm9yIHVzZXIgcHJvZmlsZXMuICovXG4gIHB1YmxpYyByZWFkb25seSB1c2Vyc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgLyoqIER5bmFtb0RCIHRhYmxlIGZvciBsZWFzZSBkb2N1bWVudHMuICovXG4gIHB1YmxpYyByZWFkb25seSBsZWFzZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XG5cbiAgLyoqIE5hbWUgb2YgdGhlIGdlb3NwYXRpYWwgR1NJIG9uIHRoZSBwcm9wZXJ0aWVzIHRhYmxlLiAqL1xuICBwdWJsaWMgc3RhdGljIHJlYWRvbmx5IEdFT19JTkRFWF9OQU1FID0gJ2dlb0luZGV4JztcbiAgLyoqIE5hbWUgb2YgdGhlIHN0YXR1cyBHU0kgb24gdGhlIHByb3BlcnRpZXMgdGFibGUuICovXG4gIHB1YmxpYyBzdGF0aWMgcmVhZG9ubHkgU1RBVFVTX0lOREVYX05BTUUgPSAnc3RhdHVzSW5kZXgnO1xuICAvKiogTmFtZSBvZiB0aGUgbGFuZGxvcmQgR1NJIG9uIHRoZSBwcm9wZXJ0aWVzIHRhYmxlLiAqL1xuICBwdWJsaWMgc3RhdGljIHJlYWRvbmx5IExBTkRMT1JEX0lOREVYX05BTUUgPSAnbGFuZGxvcmRJbmRleCc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFJlbnRWaXNpb25EeW5hbW9EYlByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHJlbW92YWxQb2xpY3kgPSBwcm9wcy5yZW1vdmFsUG9saWN5ID8/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTjtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBQcm9wZXJ0aWVzIFRhYmxlXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIHRoaXMucHJvcGVydGllc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdQcm9wZXJ0aWVzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGByZW50dmlzaW9uLXByb3BlcnRpZXMtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICdsaXN0aW5nSWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogdHJ1ZSxcbiAgICAgIHJlbW92YWxQb2xpY3ksXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgfSk7XG5cbiAgICAvLyBHZW9zcGF0aWFsIGluZGV4OiA1LWNoYXJhY3RlciBnZW9oYXNoIHByZWZpeCBhcyBwYXJ0aXRpb24ga2V5LlxuICAgIC8vIEVuYWJsZXMgYm91bmRpbmctYm94IGNhbmRpZGF0ZSByZXRyaWV2YWwgZm9yIHJhZGl1cyBzZWFyY2hlcy5cbiAgICAvLyBEeW5hbW9EQiBkb2VzIE5PVCBzdXBwb3J0IG5hdGl2ZSByYWRpdXMgcXVlcmllcyDigJQgdGhlIExhbWJkYSBoYW5kbGVyXG4gICAgLy8gcXVlcmllcyBjYW5kaWRhdGUgY2VsbHMgYW5kIGFwcGxpZXMgSGF2ZXJzaW5lIGRpc3RhbmNlIGZpbHRlcmluZy5cbiAgICB0aGlzLnByb3BlcnRpZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6IFJlbnRWaXNpb25EeW5hbW9EYi5HRU9fSU5ERVhfTkFNRSxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAnZ2VvaGFzaCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ2xpc3RpbmdJZCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXG4gICAgfSk7XG5cbiAgICAvLyBTdGF0dXMgaW5kZXg6IHN1cHBvcnRzIGxpc3RpbmcgcXVlcmllcyBmaWx0ZXJlZCBieSBzdGF0dXMsXG4gICAgLy8gc29ydGVkIGJ5IGNyZWF0aW9uIHRpbWUgKG5ld2VzdCBmaXJzdCB2aWEgSVNPIDg2MDEgc29ydCBrZXkpLlxuICAgIHRoaXMucHJvcGVydGllc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogUmVudFZpc2lvbkR5bmFtb0RiLlNUQVRVU19JTkRFWF9OQU1FLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICdzdGF0dXMnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6ICdjcmVhdGVkQXQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgIH0pO1xuXG4gICAgLy8gTGFuZGxvcmQgaW5kZXg6IGxldHMgdGhlIGF1dGhlbnRpY2F0ZWQgbGFuZGxvcmQgcG9ydGFsIGxpc3QgZXZlcnlcbiAgICAvLyBsaXN0aW5nIG93bmVkIGJ5IHRoZSBjYWxsZXIgKGFsbCBzdGF0dXNlcyksIG5ld2VzdCBmaXJzdC5cbiAgICB0aGlzLnByb3BlcnRpZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6IFJlbnRWaXNpb25EeW5hbW9EYi5MQU5ETE9SRF9JTkRFWF9OQU1FLFxuICAgICAgcGFydGl0aW9uS2V5OiB7XG4gICAgICAgIG5hbWU6ICdsYW5kbG9yZElkJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiAnY3JlYXRlZEF0JyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcbiAgICB9KTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBVc2VycyBUYWJsZVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICB0aGlzLnVzZXJzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1VzZXJzVGFibGUnLCB7XG4gICAgICB0YWJsZU5hbWU6IGByZW50dmlzaW9uLXVzZXJzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAndXNlcklkJyxcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5LFxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxuICAgIH0pO1xuXG4gICAgLy8gRW1haWwgaW5kZXggb24gdXNlcnMgdGFibGUgZm9yIGxvb2t1cCBieSBlbWFpbCAodXNlZCBieSBhdXRoIGhhbmRsZXIpLlxuICAgIHRoaXMudXNlcnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdlbWFpbEluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAnZW1haWwnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxuICAgIH0pO1xuXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIExlYXNlcyBUYWJsZVxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICB0aGlzLmxlYXNlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdMZWFzZXNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogYHJlbnR2aXNpb24tbGVhc2VzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAnbGVhc2VJZCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogJ2xpc3RpbmdJZCcsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeSxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICB9KTtcblxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyBDbG91ZEZvcm1hdGlvbiBPdXRwdXRzXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9wZXJ0aWVzVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMucHJvcGVydGllc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgcHJvcGVydGllcyB0YWJsZSBuYW1lJyxcbiAgICAgIGV4cG9ydE5hbWU6IGByZW50dmlzaW9uLXByb3BlcnRpZXMtdGFibGUtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJzVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IHRoaXMudXNlcnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHVzZXJzIHRhYmxlIG5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYHJlbnR2aXNpb24tdXNlcnMtdGFibGUtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0xlYXNlc1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmxlYXNlc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgbGVhc2VzIHRhYmxlIG5hbWUnLFxuICAgICAgZXhwb3J0TmFtZTogYHJlbnR2aXNpb24tbGVhc2VzLXRhYmxlLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcbiAgICB9KTtcbiAgfVxufVxuIl19