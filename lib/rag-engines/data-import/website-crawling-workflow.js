"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsiteCrawlingWorkflow = void 0;
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const sfn = require("aws-cdk-lib/aws-stepfunctions");
const iam = require("aws-cdk-lib/aws-iam");
const tasks = require("aws-cdk-lib/aws-stepfunctions-tasks");
const logs = require("aws-cdk-lib/aws-logs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class WebsiteCrawlingWorkflow extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const setProcessing = new tasks.DynamoUpdateItem(this, "SetProcessing", {
            table: props.ragDynamoDBTables.documentsTable,
            key: {
                workspace_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$.workspace_id")),
                document_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$.document_id")),
            },
            updateExpression: "set #status=:statusValue",
            expressionAttributeNames: {
                "#status": "status",
            },
            expressionAttributeValues: {
                ":statusValue": tasks.DynamoAttributeValue.fromString("processing"),
            },
            resultPath: sfn.JsonPath.DISCARD,
        });
        const setProcessed = new tasks.DynamoUpdateItem(this, "SetProcessed", {
            table: props.ragDynamoDBTables.documentsTable,
            key: {
                workspace_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$.workspace_id")),
                document_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$.document_id")),
            },
            updateExpression: "set #status=:statusValue",
            expressionAttributeNames: {
                "#status": "status",
            },
            expressionAttributeValues: {
                ":statusValue": tasks.DynamoAttributeValue.fromString("processed"),
            },
            resultPath: sfn.JsonPath.DISCARD,
        }).next(new sfn.Succeed(this, "Success"));
        const handleError = new tasks.DynamoUpdateItem(this, "HandleError", {
            table: props.ragDynamoDBTables.documentsTable,
            key: {
                workspace_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$.workspace_id")),
                document_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$.document_id")),
            },
            updateExpression: "set #status = :error",
            expressionAttributeNames: {
                "#status": "status",
            },
            expressionAttributeValues: {
                ":error": tasks.DynamoAttributeValue.fromString("error"),
            },
        });
        handleError.next(new sfn.Fail(this, "Fail", {
            cause: "Crawler failed",
        }));
        const webCrawlerJob = new sfn.CustomState(this, "WebCrawlerJob", {
            stateJson: {
                Type: "Task",
                Resource: `arn:${cdk.Aws.PARTITION}:states:::batch:submitJob.sync`,
                Parameters: {
                    JobDefinition: props.webCrawlerBatchJob.fileImportJob.jobDefinitionArn,
                    "JobName.$": "States.Format('WebCrawler-{}-{}', $.workspace_id, $.document_id)",
                    JobQueue: props.webCrawlerBatchJob.jobQueue.jobQueueArn,
                    ContainerOverrides: {
                        Environment: [
                            {
                                Name: "WORKSPACE_ID",
                                "Value.$": "$.workspace_id",
                            },
                            {
                                Name: "DOCUMENT_ID",
                                "Value.$": "$.document_id",
                            },
                            {
                                Name: "INPUT_BUCKET_NAME",
                                "Value.$": "$.bucket_name",
                            },
                            {
                                Name: "INPUT_OBJECT_KEY",
                                "Value.$": "$.object_key",
                            },
                        ],
                    },
                },
                ResultPath: "$.job",
            },
        })
            .addCatch(handleError, {
            errors: ["States.ALL"],
            resultPath: "$.job",
        });
        const logGroup = new logs.LogGroup(this, "WebsiteCrawlingSMLogGroup", {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const workflow = setProcessing.next(webCrawlerJob).next(setProcessed);
        const stateMachine = new sfn.StateMachine(this, "WebsiteCrawling", {
            definitionBody: sfn.DefinitionBody.fromChainable(workflow),
            comment: "Website Crawling Workflow",
            tracingEnabled: true,
            logs: {
                destination: logGroup,
                level: sfn.LogLevel.ALL,
            },
        });
        stateMachine.addToRolePolicy(new iam.PolicyStatement({
            actions: ["events:CreateRule", "events:PutRule", "events:PutTargets"],
            resources: ["*"],
        }));
        stateMachine.addToRolePolicy(new iam.PolicyStatement({
            actions: ["batch:SubmitJob"],
            resources: [
                props.webCrawlerBatchJob.jobQueue.jobQueueArn,
                props.webCrawlerBatchJob.fileImportJob.jobDefinitionArn,
            ],
        }));
        this.stateMachine = stateMachine;
    }
}
exports.WebsiteCrawlingWorkflow = WebsiteCrawlingWorkflow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic2l0ZS1jcmF3bGluZy13b3JrZmxvdy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndlYnNpdGUtY3Jhd2xpbmctd29ya2Zsb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUF1QztBQUt2QyxxREFBcUQ7QUFDckQsMkNBQTJDO0FBQzNDLDZEQUE2RDtBQUM3RCw2Q0FBNkM7QUFDN0MsNkNBQTRDO0FBUzVDLE1BQWEsdUJBQXdCLFNBQVEsc0JBQVM7SUFHcEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFtQztRQUMzRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sYUFBYSxHQUFHLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDdEUsS0FBSyxFQUFFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjO1lBQzdDLEdBQUcsRUFBRTtnQkFDSCxZQUFZLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FDakQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FDeEM7Z0JBQ0QsV0FBVyxFQUFFLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQ2hELEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUN2QzthQUNGO1lBQ0QsZ0JBQWdCLEVBQUUsMEJBQTBCO1lBQzVDLHdCQUF3QixFQUFFO2dCQUN4QixTQUFTLEVBQUUsUUFBUTthQUNwQjtZQUNELHlCQUF5QixFQUFFO2dCQUN6QixjQUFjLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUM7YUFDcEU7WUFDRCxVQUFVLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPO1NBQ2pDLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDcEUsS0FBSyxFQUFFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjO1lBQzdDLEdBQUcsRUFBRTtnQkFDSCxZQUFZLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FDakQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FDeEM7Z0JBQ0QsV0FBVyxFQUFFLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQ2hELEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUN2QzthQUNGO1lBQ0QsZ0JBQWdCLEVBQUUsMEJBQTBCO1lBQzVDLHdCQUF3QixFQUFFO2dCQUN4QixTQUFTLEVBQUUsUUFBUTthQUNwQjtZQUNELHlCQUF5QixFQUFFO2dCQUN6QixjQUFjLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7YUFDbkU7WUFDRCxVQUFVLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPO1NBQ2pDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sV0FBVyxHQUFHLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDbEUsS0FBSyxFQUFFLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjO1lBQzdDLEdBQUcsRUFBRTtnQkFDSCxZQUFZLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FDakQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsQ0FDeEM7Z0JBQ0QsV0FBVyxFQUFFLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQ2hELEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUN2QzthQUNGO1lBQ0QsZ0JBQWdCLEVBQUUsc0JBQXNCO1lBQ3hDLHdCQUF3QixFQUFFO2dCQUN4QixTQUFTLEVBQUUsUUFBUTthQUNwQjtZQUNELHlCQUF5QixFQUFFO2dCQUN6QixRQUFRLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7YUFDekQ7U0FDRixDQUFDLENBQUM7UUFFSCxXQUFXLENBQUMsSUFBSSxDQUNkLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFO1lBQ3pCLEtBQUssRUFBRSxnQkFBZ0I7U0FDeEIsQ0FBQyxDQUNILENBQUM7UUFDRixNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUMvRCxTQUFTLEVBQUU7Z0JBQ1QsSUFBSSxFQUFFLE1BQU07Z0JBQ1osUUFBUSxFQUFFLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLGdDQUFnQztnQkFDbEUsVUFBVSxFQUFFO29CQUNWLGFBQWEsRUFDWCxLQUFLLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLGdCQUFnQjtvQkFDekQsV0FBVyxFQUNULGtFQUFrRTtvQkFDcEUsUUFBUSxFQUFFLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsV0FBVztvQkFDdkQsa0JBQWtCLEVBQUU7d0JBQ2xCLFdBQVcsRUFBRTs0QkFDWDtnQ0FDRSxJQUFJLEVBQUUsY0FBYztnQ0FDcEIsU0FBUyxFQUFFLGdCQUFnQjs2QkFDNUI7NEJBQ0Q7Z0NBQ0UsSUFBSSxFQUFFLGFBQWE7Z0NBQ25CLFNBQVMsRUFBRSxlQUFlOzZCQUMzQjs0QkFDRDtnQ0FDRSxJQUFJLEVBQUUsbUJBQW1CO2dDQUN6QixTQUFTLEVBQUUsZUFBZTs2QkFDM0I7NEJBQ0Q7Z0NBQ0UsSUFBSSxFQUFFLGtCQUFrQjtnQ0FDeEIsU0FBUyxFQUFFLGNBQWM7NkJBQzFCO3lCQUNGO3FCQUNGO2lCQUNGO2dCQUNELFVBQVUsRUFBRSxPQUFPO2FBQ3BCO1NBQ0YsQ0FBQzthQUNELFFBQVEsQ0FBQyxXQUFXLEVBQUU7WUFDckIsTUFBTSxFQUFFLENBQUMsWUFBWSxDQUFDO1lBQ3RCLFVBQVUsRUFBRSxPQUFPO1NBQ3BCLENBQUMsQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLEVBQUU7WUFDcEUsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTztTQUNyQyxDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUN0RSxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ2pFLGNBQWMsRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUM7WUFDMUQsT0FBTyxFQUFFLDJCQUEyQjtZQUNwQyxjQUFjLEVBQUUsSUFBSTtZQUNwQixJQUFJLEVBQUU7Z0JBQ0osV0FBVyxFQUFFLFFBQVE7Z0JBQ3JCLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUc7YUFDeEI7U0FDRixDQUFDLENBQUM7UUFFSCxZQUFZLENBQUMsZUFBZSxDQUMxQixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUM7WUFDckUsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2pCLENBQUMsQ0FDSCxDQUFDO1FBRUYsWUFBWSxDQUFDLGVBQWUsQ0FDMUIsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3RCLE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDO1lBQzVCLFNBQVMsRUFBRTtnQkFDVCxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFdBQVc7Z0JBQzdDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCO2FBQ3hEO1NBQ0YsQ0FBQyxDQUNILENBQUM7UUFFRixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUNuQyxDQUFDO0NBQ0Y7QUE3SUQsMERBNklDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IFN5c3RlbUNvbmZpZyB9IGZyb20gXCIuLi8uLi9zaGFyZWQvdHlwZXNcIjtcbmltcG9ydCB7IFNoYXJlZCB9IGZyb20gXCIuLi8uLi9zaGFyZWRcIjtcbmltcG9ydCB7IFdlYkNyYXdsZXJCYXRjaEpvYiB9IGZyb20gXCIuL3dlYi1jcmF3bGVyLWJhdGNoLWpvYlwiO1xuaW1wb3J0IHsgUmFnRHluYW1vREJUYWJsZXMgfSBmcm9tIFwiLi4vcmFnLWR5bmFtb2RiLXRhYmxlc1wiO1xuaW1wb3J0ICogYXMgc2ZuIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9uc1wiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyB0YXNrcyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3NcIjtcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2Vic2l0ZUNyYXdsaW5nV29ya2Zsb3dQcm9wcyB7XG4gIHJlYWRvbmx5IGNvbmZpZzogU3lzdGVtQ29uZmlnO1xuICByZWFkb25seSBzaGFyZWQ6IFNoYXJlZDtcbiAgcmVhZG9ubHkgd2ViQ3Jhd2xlckJhdGNoSm9iOiBXZWJDcmF3bGVyQmF0Y2hKb2I7XG4gIHJlYWRvbmx5IHJhZ0R5bmFtb0RCVGFibGVzOiBSYWdEeW5hbW9EQlRhYmxlcztcbn1cblxuZXhwb3J0IGNsYXNzIFdlYnNpdGVDcmF3bGluZ1dvcmtmbG93IGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IHN0YXRlTWFjaGluZTogc2ZuLlN0YXRlTWFjaGluZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogV2Vic2l0ZUNyYXdsaW5nV29ya2Zsb3dQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBzZXRQcm9jZXNzaW5nID0gbmV3IHRhc2tzLkR5bmFtb1VwZGF0ZUl0ZW0odGhpcywgXCJTZXRQcm9jZXNzaW5nXCIsIHtcbiAgICAgIHRhYmxlOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcy5kb2N1bWVudHNUYWJsZSxcbiAgICAgIGtleToge1xuICAgICAgICB3b3Jrc3BhY2VfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC53b3Jrc3BhY2VfaWRcIilcbiAgICAgICAgKSxcbiAgICAgICAgZG9jdW1lbnRfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC5kb2N1bWVudF9pZFwiKVxuICAgICAgICApLFxuICAgICAgfSxcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb246IFwic2V0ICNzdGF0dXM9OnN0YXR1c1ZhbHVlXCIsXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgXCIjc3RhdHVzXCI6IFwic3RhdHVzXCIsXG4gICAgICB9LFxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICBcIjpzdGF0dXNWYWx1ZVwiOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKFwicHJvY2Vzc2luZ1wiKSxcbiAgICAgIH0sXG4gICAgICByZXN1bHRQYXRoOiBzZm4uSnNvblBhdGguRElTQ0FSRCxcbiAgICB9KTtcblxuICAgIGNvbnN0IHNldFByb2Nlc3NlZCA9IG5ldyB0YXNrcy5EeW5hbW9VcGRhdGVJdGVtKHRoaXMsIFwiU2V0UHJvY2Vzc2VkXCIsIHtcbiAgICAgIHRhYmxlOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcy5kb2N1bWVudHNUYWJsZSxcbiAgICAgIGtleToge1xuICAgICAgICB3b3Jrc3BhY2VfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC53b3Jrc3BhY2VfaWRcIilcbiAgICAgICAgKSxcbiAgICAgICAgZG9jdW1lbnRfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC5kb2N1bWVudF9pZFwiKVxuICAgICAgICApLFxuICAgICAgfSxcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb246IFwic2V0ICNzdGF0dXM9OnN0YXR1c1ZhbHVlXCIsXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgXCIjc3RhdHVzXCI6IFwic3RhdHVzXCIsXG4gICAgICB9LFxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICBcIjpzdGF0dXNWYWx1ZVwiOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKFwicHJvY2Vzc2VkXCIpLFxuICAgICAgfSxcbiAgICAgIHJlc3VsdFBhdGg6IHNmbi5Kc29uUGF0aC5ESVNDQVJELFxuICAgIH0pLm5leHQobmV3IHNmbi5TdWNjZWVkKHRoaXMsIFwiU3VjY2Vzc1wiKSk7XG4gICAgY29uc3QgaGFuZGxlRXJyb3IgPSBuZXcgdGFza3MuRHluYW1vVXBkYXRlSXRlbSh0aGlzLCBcIkhhbmRsZUVycm9yXCIsIHtcbiAgICAgIHRhYmxlOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcy5kb2N1bWVudHNUYWJsZSxcbiAgICAgIGtleToge1xuICAgICAgICB3b3Jrc3BhY2VfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC53b3Jrc3BhY2VfaWRcIilcbiAgICAgICAgKSxcbiAgICAgICAgZG9jdW1lbnRfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC5kb2N1bWVudF9pZFwiKVxuICAgICAgICApLFxuICAgICAgfSxcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb246IFwic2V0ICNzdGF0dXMgPSA6ZXJyb3JcIixcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xuICAgICAgICBcIiNzdGF0dXNcIjogXCJzdGF0dXNcIixcbiAgICAgIH0sXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgIFwiOmVycm9yXCI6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXCJlcnJvclwiKSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBoYW5kbGVFcnJvci5uZXh0KFxuICAgICAgbmV3IHNmbi5GYWlsKHRoaXMsIFwiRmFpbFwiLCB7XG4gICAgICAgIGNhdXNlOiBcIkNyYXdsZXIgZmFpbGVkXCIsXG4gICAgICB9KVxuICAgICk7XG4gICAgY29uc3Qgd2ViQ3Jhd2xlckpvYiA9IG5ldyBzZm4uQ3VzdG9tU3RhdGUodGhpcywgXCJXZWJDcmF3bGVySm9iXCIsIHtcbiAgICAgIHN0YXRlSnNvbjoge1xuICAgICAgICBUeXBlOiBcIlRhc2tcIixcbiAgICAgICAgUmVzb3VyY2U6IGBhcm46JHtjZGsuQXdzLlBBUlRJVElPTn06c3RhdGVzOjo6YmF0Y2g6c3VibWl0Sm9iLnN5bmNgLFxuICAgICAgICBQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgSm9iRGVmaW5pdGlvbjpcbiAgICAgICAgICAgIHByb3BzLndlYkNyYXdsZXJCYXRjaEpvYi5maWxlSW1wb3J0Sm9iLmpvYkRlZmluaXRpb25Bcm4sXG4gICAgICAgICAgXCJKb2JOYW1lLiRcIjpcbiAgICAgICAgICAgIFwiU3RhdGVzLkZvcm1hdCgnV2ViQ3Jhd2xlci17fS17fScsICQud29ya3NwYWNlX2lkLCAkLmRvY3VtZW50X2lkKVwiLFxuICAgICAgICAgIEpvYlF1ZXVlOiBwcm9wcy53ZWJDcmF3bGVyQmF0Y2hKb2Iuam9iUXVldWUuam9iUXVldWVBcm4sXG4gICAgICAgICAgQ29udGFpbmVyT3ZlcnJpZGVzOiB7XG4gICAgICAgICAgICBFbnZpcm9ubWVudDogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgTmFtZTogXCJXT1JLU1BBQ0VfSURcIixcbiAgICAgICAgICAgICAgICBcIlZhbHVlLiRcIjogXCIkLndvcmtzcGFjZV9pZFwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgTmFtZTogXCJET0NVTUVOVF9JRFwiLFxuICAgICAgICAgICAgICAgIFwiVmFsdWUuJFwiOiBcIiQuZG9jdW1lbnRfaWRcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIE5hbWU6IFwiSU5QVVRfQlVDS0VUX05BTUVcIixcbiAgICAgICAgICAgICAgICBcIlZhbHVlLiRcIjogXCIkLmJ1Y2tldF9uYW1lXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBOYW1lOiBcIklOUFVUX09CSkVDVF9LRVlcIixcbiAgICAgICAgICAgICAgICBcIlZhbHVlLiRcIjogXCIkLm9iamVjdF9rZXlcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgUmVzdWx0UGF0aDogXCIkLmpvYlwiLFxuICAgICAgfSxcbiAgICB9KVxuICAgIC5hZGRDYXRjaChoYW5kbGVFcnJvciwge1xuICAgICAgZXJyb3JzOiBbXCJTdGF0ZXMuQUxMXCJdLFxuICAgICAgcmVzdWx0UGF0aDogXCIkLmpvYlwiLFxuICAgIH0pO1xuICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgXCJXZWJzaXRlQ3Jhd2xpbmdTTUxvZ0dyb3VwXCIsIHtcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHdvcmtmbG93ID0gc2V0UHJvY2Vzc2luZy5uZXh0KHdlYkNyYXdsZXJKb2IpLm5leHQoc2V0UHJvY2Vzc2VkKTtcbiAgICBjb25zdCBzdGF0ZU1hY2hpbmUgPSBuZXcgc2ZuLlN0YXRlTWFjaGluZSh0aGlzLCBcIldlYnNpdGVDcmF3bGluZ1wiLCB7XG4gICAgICBkZWZpbml0aW9uQm9keTogc2ZuLkRlZmluaXRpb25Cb2R5LmZyb21DaGFpbmFibGUod29ya2Zsb3cpLFxuICAgICAgY29tbWVudDogXCJXZWJzaXRlIENyYXdsaW5nIFdvcmtmbG93XCIsXG4gICAgICB0cmFjaW5nRW5hYmxlZDogdHJ1ZSxcbiAgICAgIGxvZ3M6IHtcbiAgICAgICAgZGVzdGluYXRpb246IGxvZ0dyb3VwLFxuICAgICAgICBsZXZlbDogc2ZuLkxvZ0xldmVsLkFMTCxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBzdGF0ZU1hY2hpbmUuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbXCJldmVudHM6Q3JlYXRlUnVsZVwiLCBcImV2ZW50czpQdXRSdWxlXCIsIFwiZXZlbnRzOlB1dFRhcmdldHNcIl0sXG4gICAgICAgIHJlc291cmNlczogW1wiKlwiXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIHN0YXRlTWFjaGluZS5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcImJhdGNoOlN1Ym1pdEpvYlwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXG4gICAgICAgICAgcHJvcHMud2ViQ3Jhd2xlckJhdGNoSm9iLmpvYlF1ZXVlLmpvYlF1ZXVlQXJuLFxuICAgICAgICAgIHByb3BzLndlYkNyYXdsZXJCYXRjaEpvYi5maWxlSW1wb3J0Sm9iLmpvYkRlZmluaXRpb25Bcm4sXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICB0aGlzLnN0YXRlTWFjaGluZSA9IHN0YXRlTWFjaGluZTtcbiAgfVxufVxuIl19