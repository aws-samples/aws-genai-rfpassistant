"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagDynamoDBTables = void 0;
const cdk = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const constructs_1 = require("constructs");
class RagDynamoDBTables extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        this.workspacesByObjectTypeIndexName = "by_object_type_idx";
        this.documentsByCompoundKeyIndexName = "by_compound_key_idx";
        this.documentsByStatusIndexName = "by_status_idx";
        const workspacesTable = new dynamodb.Table(this, "Workspaces", {
            partitionKey: {
                name: "workspace_id",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "object_type",
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        workspacesTable.addGlobalSecondaryIndex({
            indexName: this.workspacesByObjectTypeIndexName,
            partitionKey: {
                name: "object_type",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "created_at",
                type: dynamodb.AttributeType.STRING,
            },
        });
        const documentsTable = new dynamodb.Table(this, "Documents", {
            partitionKey: {
                name: "workspace_id",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "document_id",
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            pointInTimeRecovery: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        documentsTable.addGlobalSecondaryIndex({
            indexName: this.documentsByCompoundKeyIndexName,
            partitionKey: {
                name: "workspace_id",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "compound_sort_key",
                type: dynamodb.AttributeType.STRING,
            },
        });
        documentsTable.addGlobalSecondaryIndex({
            indexName: this.documentsByStatusIndexName,
            partitionKey: {
                name: "status",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "document_type",
                type: dynamodb.AttributeType.STRING,
            },
        });
        this.workspacesTable = workspacesTable;
        this.documentsTable = documentsTable;
    }
}
exports.RagDynamoDBTables = RagDynamoDBTables;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMscURBQXFEO0FBQ3JELDJDQUF1QztBQUV2QyxNQUFhLGlCQUFrQixTQUFRLHNCQUFTO0lBUzlDLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFQSCxvQ0FBK0IsR0FDN0Msb0JBQW9CLENBQUM7UUFDUCxvQ0FBK0IsR0FDN0MscUJBQXFCLENBQUM7UUFDUiwrQkFBMEIsR0FBVyxlQUFlLENBQUM7UUFLbkUsTUFBTSxlQUFlLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDN0QsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxjQUFjO2dCQUNwQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxhQUFhO2dCQUNuQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELG1CQUFtQixFQUFFLElBQUk7WUFDekIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxlQUFlLENBQUMsdUJBQXVCLENBQUM7WUFDdEMsU0FBUyxFQUFFLElBQUksQ0FBQywrQkFBK0I7WUFDL0MsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxhQUFhO2dCQUNuQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxZQUFZO2dCQUNsQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDM0QsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxjQUFjO2dCQUNwQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxhQUFhO2dCQUNuQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELG1CQUFtQixFQUFFLElBQUk7WUFDekIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxjQUFjLENBQUMsdUJBQXVCLENBQUM7WUFDckMsU0FBUyxFQUFFLElBQUksQ0FBQywrQkFBK0I7WUFDL0MsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxjQUFjO2dCQUNwQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7U0FDRixDQUFDLENBQUM7UUFFSCxjQUFjLENBQUMsdUJBQXVCLENBQUM7WUFDckMsU0FBUyxFQUFFLElBQUksQ0FBQywwQkFBMEI7WUFDMUMsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7U0FDRixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN2QyxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztJQUN2QyxDQUFDO0NBQ0Y7QUFqRkQsOENBaUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1keW5hbW9kYlwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuZXhwb3J0IGNsYXNzIFJhZ0R5bmFtb0RCVGFibGVzIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IHdvcmtzcGFjZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSBkb2N1bWVudHNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHB1YmxpYyByZWFkb25seSB3b3Jrc3BhY2VzQnlPYmplY3RUeXBlSW5kZXhOYW1lOiBzdHJpbmcgPVxuICAgIFwiYnlfb2JqZWN0X3R5cGVfaWR4XCI7XG4gIHB1YmxpYyByZWFkb25seSBkb2N1bWVudHNCeUNvbXBvdW5kS2V5SW5kZXhOYW1lOiBzdHJpbmcgPVxuICAgIFwiYnlfY29tcG91bmRfa2V5X2lkeFwiO1xuICBwdWJsaWMgcmVhZG9ubHkgZG9jdW1lbnRzQnlTdGF0dXNJbmRleE5hbWU6IHN0cmluZyA9IFwiYnlfc3RhdHVzX2lkeFwiO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3Qgd29ya3NwYWNlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIFwiV29ya3NwYWNlc1wiLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogXCJ3b3Jrc3BhY2VfaWRcIixcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiBcIm9iamVjdF90eXBlXCIsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIHdvcmtzcGFjZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6IHRoaXMud29ya3NwYWNlc0J5T2JqZWN0VHlwZUluZGV4TmFtZSxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBcIm9iamVjdF90eXBlXCIsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICAgIHNvcnRLZXk6IHtcbiAgICAgICAgbmFtZTogXCJjcmVhdGVkX2F0XCIsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRvY3VtZW50c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsIFwiRG9jdW1lbnRzXCIsIHtcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBcIndvcmtzcGFjZV9pZFwiLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6IFwiZG9jdW1lbnRfaWRcIixcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgZG9jdW1lbnRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiB0aGlzLmRvY3VtZW50c0J5Q29tcG91bmRLZXlJbmRleE5hbWUsXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcbiAgICAgICAgbmFtZTogXCJ3b3Jrc3BhY2VfaWRcIixcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXG4gICAgICB9LFxuICAgICAgc29ydEtleToge1xuICAgICAgICBuYW1lOiBcImNvbXBvdW5kX3NvcnRfa2V5XCIsXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGRvY3VtZW50c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogdGhpcy5kb2N1bWVudHNCeVN0YXR1c0luZGV4TmFtZSxcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiBcInN0YXR1c1wiLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICBzb3J0S2V5OiB7XG4gICAgICAgIG5hbWU6IFwiZG9jdW1lbnRfdHlwZVwiLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB0aGlzLndvcmtzcGFjZXNUYWJsZSA9IHdvcmtzcGFjZXNUYWJsZTtcbiAgICB0aGlzLmRvY3VtZW50c1RhYmxlID0gZG9jdW1lbnRzVGFibGU7XG4gIH1cbn1cbiJdfQ==