"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileImportWorkflow = void 0;
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const sfn = require("aws-cdk-lib/aws-stepfunctions");
const iam = require("aws-cdk-lib/aws-iam");
const tasks = require("aws-cdk-lib/aws-stepfunctions-tasks");
const logs = require("aws-cdk-lib/aws-logs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class FileImportWorkflow extends constructs_1.Construct {
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
        const fileImportJob = new sfn.CustomState(this, "FileImportJob", {
            stateJson: {
                Type: "Task",
                Resource: `arn:${cdk.Aws.PARTITION}:states:::batch:submitJob.sync`,
                Parameters: {
                    JobDefinition: props.fileImportBatchJob.fileImportJob.jobDefinitionArn,
                    "JobName.$": "States.Format('FileImport-{}-{}', $.workspace_id, $.document_id)",
                    JobQueue: props.fileImportBatchJob.jobQueue.jobQueueArn,
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
                                "Value.$": "$.input_bucket_name",
                            },
                            {
                                Name: "INPUT_OBJECT_KEY",
                                "Value.$": "$.input_object_key",
                            },
                            {
                                Name: "PROCESSING_BUCKET_NAME",
                                "Value.$": "$.processing_bucket_name",
                            },
                            {
                                Name: "PROCESSING_OBJECT_KEY",
                                "Value.$": "$.processing_object_key",
                            },
                        ],
                    },
                },
                ResultPath: "$.job",
            },
        });
        const logGroup = new logs.LogGroup(this, "FileImportSMLogGroup", {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const workflow = setProcessing.next(fileImportJob).next(setProcessed);
        const stateMachine = new sfn.StateMachine(this, "FileImportStateMachine", {
            definitionBody: sfn.DefinitionBody.fromChainable(workflow),
            timeout: cdk.Duration.hours(12),
            comment: "File import workflow",
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
                props.fileImportBatchJob.jobQueue.jobQueueArn,
                props.fileImportBatchJob.fileImportJob.jobDefinitionArn,
            ],
        }));
        this.stateMachine = stateMachine;
    }
}
exports.FileImportWorkflow = FileImportWorkflow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1pbXBvcnQtd29ya2Zsb3cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaWxlLWltcG9ydC13b3JrZmxvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsMkNBQXVDO0FBS3ZDLHFEQUFxRDtBQUNyRCwyQ0FBMkM7QUFDM0MsNkRBQTZEO0FBQzdELDZDQUE2QztBQUM3Qyw2Q0FBNEM7QUFTNUMsTUFBYSxrQkFBbUIsU0FBUSxzQkFBUztJQUcvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQThCO1FBQ3RFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxhQUFhLEdBQUcsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN0RSxLQUFLLEVBQUUsS0FBSyxDQUFDLGlCQUFpQixDQUFDLGNBQWM7WUFDN0MsR0FBRyxFQUFFO2dCQUNILFlBQVksRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUNqRCxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUN4QztnQkFDRCxXQUFXLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FDaEQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQ3ZDO2FBQ0Y7WUFDRCxnQkFBZ0IsRUFBRSwwQkFBMEI7WUFDNUMsd0JBQXdCLEVBQUU7Z0JBQ3hCLFNBQVMsRUFBRSxRQUFRO2FBQ3BCO1lBQ0QseUJBQXlCLEVBQUU7Z0JBQ3pCLGNBQWMsRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FBQzthQUNwRTtZQUNELFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU87U0FDakMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxZQUFZLEdBQUcsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENB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LEdBQUc7YUFDeEI7U0FDRixDQUFDLENBQUM7UUFFSCxZQUFZLENBQUMsZUFBZSxDQUMxQixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLENBQUM7WUFDckUsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2pCLENBQUMsQ0FDSCxDQUFDO1FBRUYsWUFBWSxDQUFDLGVBQWUsQ0FDMUIsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3RCLE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDO1lBQzVCLFNBQVMsRUFBRTtnQkFDVCxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLFdBQVc7Z0JBQzdDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCO2FBQ3hEO1NBQ0YsQ0FBQyxDQUNILENBQUM7UUFFRixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztJQUNuQyxDQUFDO0NBQ0Y7QUE1SEQsZ0RBNEhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IFN5c3RlbUNvbmZpZyB9IGZyb20gXCIuLi8uLi9zaGFyZWQvdHlwZXNcIjtcbmltcG9ydCB7IFNoYXJlZCB9IGZyb20gXCIuLi8uLi9zaGFyZWRcIjtcbmltcG9ydCB7IEZpbGVJbXBvcnRCYXRjaEpvYiB9IGZyb20gXCIuL2ZpbGUtaW1wb3J0LWJhdGNoLWpvYlwiO1xuaW1wb3J0IHsgUmFnRHluYW1vREJUYWJsZXMgfSBmcm9tIFwiLi4vcmFnLWR5bmFtb2RiLXRhYmxlc1wiO1xuaW1wb3J0ICogYXMgc2ZuIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9uc1wiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyB0YXNrcyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3NcIjtcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmlsZUltcG9ydFdvcmtmbG93UHJvcHMge1xuICByZWFkb25seSBjb25maWc6IFN5c3RlbUNvbmZpZztcbiAgcmVhZG9ubHkgc2hhcmVkOiBTaGFyZWQ7XG4gIHJlYWRvbmx5IGZpbGVJbXBvcnRCYXRjaEpvYjogRmlsZUltcG9ydEJhdGNoSm9iO1xuICByZWFkb25seSByYWdEeW5hbW9EQlRhYmxlczogUmFnRHluYW1vREJUYWJsZXM7XG59XG5cbmV4cG9ydCBjbGFzcyBGaWxlSW1wb3J0V29ya2Zsb3cgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgc3RhdGVNYWNoaW5lOiBzZm4uU3RhdGVNYWNoaW5lO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBGaWxlSW1wb3J0V29ya2Zsb3dQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBzZXRQcm9jZXNzaW5nID0gbmV3IHRhc2tzLkR5bmFtb1VwZGF0ZUl0ZW0odGhpcywgXCJTZXRQcm9jZXNzaW5nXCIsIHtcbiAgICAgIHRhYmxlOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcy5kb2N1bWVudHNUYWJsZSxcbiAgICAgIGtleToge1xuICAgICAgICB3b3Jrc3BhY2VfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC53b3Jrc3BhY2VfaWRcIilcbiAgICAgICAgKSxcbiAgICAgICAgZG9jdW1lbnRfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC5kb2N1bWVudF9pZFwiKVxuICAgICAgICApLFxuICAgICAgfSxcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb246IFwic2V0ICNzdGF0dXM9OnN0YXR1c1ZhbHVlXCIsXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgXCIjc3RhdHVzXCI6IFwic3RhdHVzXCIsXG4gICAgICB9LFxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICBcIjpzdGF0dXNWYWx1ZVwiOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKFwicHJvY2Vzc2luZ1wiKSxcbiAgICAgIH0sXG4gICAgICByZXN1bHRQYXRoOiBzZm4uSnNvblBhdGguRElTQ0FSRCxcbiAgICB9KTtcblxuICAgIGNvbnN0IHNldFByb2Nlc3NlZCA9IG5ldyB0YXNrcy5EeW5hbW9VcGRhdGVJdGVtKHRoaXMsIFwiU2V0UHJvY2Vzc2VkXCIsIHtcbiAgICAgIHRhYmxlOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcy5kb2N1bWVudHNUYWJsZSxcbiAgICAgIGtleToge1xuICAgICAgICB3b3Jrc3BhY2VfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC53b3Jrc3BhY2VfaWRcIilcbiAgICAgICAgKSxcbiAgICAgICAgZG9jdW1lbnRfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC5kb2N1bWVudF9pZFwiKVxuICAgICAgICApLFxuICAgICAgfSxcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb246IFwic2V0ICNzdGF0dXM9OnN0YXR1c1ZhbHVlXCIsXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgXCIjc3RhdHVzXCI6IFwic3RhdHVzXCIsXG4gICAgICB9LFxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICBcIjpzdGF0dXNWYWx1ZVwiOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKFwicHJvY2Vzc2VkXCIpLFxuICAgICAgfSxcbiAgICAgIHJlc3VsdFBhdGg6IHNmbi5Kc29uUGF0aC5ESVNDQVJELFxuICAgIH0pLm5leHQobmV3IHNmbi5TdWNjZWVkKHRoaXMsIFwiU3VjY2Vzc1wiKSk7XG5cbiAgICBjb25zdCBmaWxlSW1wb3J0Sm9iID0gbmV3IHNmbi5DdXN0b21TdGF0ZSh0aGlzLCBcIkZpbGVJbXBvcnRKb2JcIiwge1xuICAgICAgc3RhdGVKc29uOiB7XG4gICAgICAgIFR5cGU6IFwiVGFza1wiLFxuICAgICAgICBSZXNvdXJjZTogYGFybjoke2Nkay5Bd3MuUEFSVElUSU9OfTpzdGF0ZXM6OjpiYXRjaDpzdWJtaXRKb2Iuc3luY2AsXG4gICAgICAgIFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICBKb2JEZWZpbml0aW9uOlxuICAgICAgICAgICAgcHJvcHMuZmlsZUltcG9ydEJhdGNoSm9iLmZpbGVJbXBvcnRKb2Iuam9iRGVmaW5pdGlvbkFybixcbiAgICAgICAgICBcIkpvYk5hbWUuJFwiOlxuICAgICAgICAgICAgXCJTdGF0ZXMuRm9ybWF0KCdGaWxlSW1wb3J0LXt9LXt9JywgJC53b3Jrc3BhY2VfaWQsICQuZG9jdW1lbnRfaWQpXCIsXG4gICAgICAgICAgSm9iUXVldWU6IHByb3BzLmZpbGVJbXBvcnRCYXRjaEpvYi5qb2JRdWV1ZS5qb2JRdWV1ZUFybixcbiAgICAgICAgICBDb250YWluZXJPdmVycmlkZXM6IHtcbiAgICAgICAgICAgIEVudmlyb25tZW50OiBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBOYW1lOiBcIldPUktTUEFDRV9JRFwiLFxuICAgICAgICAgICAgICAgIFwiVmFsdWUuJFwiOiBcIiQud29ya3NwYWNlX2lkXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBOYW1lOiBcIkRPQ1VNRU5UX0lEXCIsXG4gICAgICAgICAgICAgICAgXCJWYWx1ZS4kXCI6IFwiJC5kb2N1bWVudF9pZFwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgTmFtZTogXCJJTlBVVF9CVUNLRVRfTkFNRVwiLFxuICAgICAgICAgICAgICAgIFwiVmFsdWUuJFwiOiBcIiQuaW5wdXRfYnVja2V0X25hbWVcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIE5hbWU6IFwiSU5QVVRfT0JKRUNUX0tFWVwiLFxuICAgICAgICAgICAgICAgIFwiVmFsdWUuJFwiOiBcIiQuaW5wdXRfb2JqZWN0X2tleVwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgTmFtZTogXCJQUk9DRVNTSU5HX0JVQ0tFVF9OQU1FXCIsXG4gICAgICAgICAgICAgICAgXCJWYWx1ZS4kXCI6IFwiJC5wcm9jZXNzaW5nX2J1Y2tldF9uYW1lXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBOYW1lOiBcIlBST0NFU1NJTkdfT0JKRUNUX0tFWVwiLFxuICAgICAgICAgICAgICAgIFwiVmFsdWUuJFwiOiBcIiQucHJvY2Vzc2luZ19vYmplY3Rfa2V5XCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIFJlc3VsdFBhdGg6IFwiJC5qb2JcIixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsIFwiRmlsZUltcG9ydFNNTG9nR3JvdXBcIiwge1xuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgd29ya2Zsb3cgPSBzZXRQcm9jZXNzaW5nLm5leHQoZmlsZUltcG9ydEpvYikubmV4dChzZXRQcm9jZXNzZWQpO1xuICAgIGNvbnN0IHN0YXRlTWFjaGluZSA9IG5ldyBzZm4uU3RhdGVNYWNoaW5lKHRoaXMsIFwiRmlsZUltcG9ydFN0YXRlTWFjaGluZVwiLCB7XG4gICAgICBkZWZpbml0aW9uQm9keTogc2ZuLkRlZmluaXRpb25Cb2R5LmZyb21DaGFpbmFibGUod29ya2Zsb3cpLFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLmhvdXJzKDEyKSxcbiAgICAgIGNvbW1lbnQ6IFwiRmlsZSBpbXBvcnQgd29ya2Zsb3dcIixcbiAgICAgIHRyYWNpbmdFbmFibGVkOiB0cnVlLFxuICAgICAgbG9nczoge1xuICAgICAgICBkZXN0aW5hdGlvbjogbG9nR3JvdXAsXG4gICAgICAgIGxldmVsOiBzZm4uTG9nTGV2ZWwuQUxMLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHN0YXRlTWFjaGluZS5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcImV2ZW50czpDcmVhdGVSdWxlXCIsIFwiZXZlbnRzOlB1dFJ1bGVcIiwgXCJldmVudHM6UHV0VGFyZ2V0c1wiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgc3RhdGVNYWNoaW5lLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1wiYmF0Y2g6U3VibWl0Sm9iXCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBwcm9wcy5maWxlSW1wb3J0QmF0Y2hKb2Iuam9iUXVldWUuam9iUXVldWVBcm4sXG4gICAgICAgICAgcHJvcHMuZmlsZUltcG9ydEJhdGNoSm9iLmZpbGVJbXBvcnRKb2Iuam9iRGVmaW5pdGlvbkFybixcbiAgICAgICAgXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIHRoaXMuc3RhdGVNYWNoaW5lID0gc3RhdGVNYWNoaW5lO1xuICB9XG59XG4iXX0=