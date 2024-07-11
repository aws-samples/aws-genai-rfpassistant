"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateKendraWorkspace = void 0;
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const sfn = require("aws-cdk-lib/aws-stepfunctions");
const tasks = require("aws-cdk-lib/aws-stepfunctions-tasks");
const logs = require("aws-cdk-lib/aws-logs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class CreateKendraWorkspace extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const handleError = new tasks.DynamoUpdateItem(this, "HandleError", {
            table: props.ragDynamoDBTables.workspacesTable,
            key: {
                workspace_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$.workspace_id")),
                object_type: tasks.DynamoAttributeValue.fromString("workspace"),
            },
            updateExpression: "set #status = :error",
            expressionAttributeNames: {
                "#status": "status",
            },
            expressionAttributeValues: {
                ":error": tasks.DynamoAttributeValue.fromString("error"),
            },
        }).next(new sfn.Fail(this, "Fail", {
            cause: "Workspace creation failed",
        }));
        const setCreating = new tasks.DynamoUpdateItem(this, "SetCreating", {
            table: props.ragDynamoDBTables.workspacesTable,
            key: {
                workspace_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$.workspace_id")),
                object_type: tasks.DynamoAttributeValue.fromString("workspace"),
            },
            updateExpression: "set #status=:statusValue",
            expressionAttributeNames: {
                "#status": "status",
            },
            expressionAttributeValues: {
                ":statusValue": tasks.DynamoAttributeValue.fromString("creating"),
            },
            resultPath: sfn.JsonPath.DISCARD,
        });
        const setReady = new tasks.DynamoUpdateItem(this, "SetReady", {
            table: props.ragDynamoDBTables.workspacesTable,
            key: {
                workspace_id: tasks.DynamoAttributeValue.fromString(sfn.JsonPath.stringAt("$.workspace_id")),
                object_type: tasks.DynamoAttributeValue.fromString("workspace"),
            },
            updateExpression: "set #status=:statusValue",
            expressionAttributeNames: {
                "#status": "status",
            },
            expressionAttributeValues: {
                ":statusValue": tasks.DynamoAttributeValue.fromString("ready"),
            },
            resultPath: sfn.JsonPath.DISCARD,
        });
        const workflow = setCreating
            .next(setReady)
            .next(new sfn.Succeed(this, "Success"));
        const logGroup = new logs.LogGroup(this, "CreateKendraWorkspaceSMLogGroup", {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const stateMachine = new sfn.StateMachine(this, "CreateKendraWorkspace", {
            definitionBody: sfn.DefinitionBody.fromChainable(workflow),
            timeout: cdk.Duration.minutes(5),
            comment: "Create Kendra Workspace Workflow",
            tracingEnabled: true,
            logs: {
                destination: logGroup,
                level: sfn.LogLevel.ALL,
            },
        });
        this.stateMachine = stateMachine;
    }
}
exports.CreateKendraWorkspace = CreateKendraWorkspace;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLWtlbmRyYS13b3Jrc3BhY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmVhdGUta2VuZHJhLXdvcmtzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsMkNBQXVDO0FBSXZDLHFEQUFxRDtBQUNyRCw2REFBNkQ7QUFDN0QsNkNBQTZDO0FBQzdDLDZDQUE0QztBQVE1QyxNQUFhLHFCQUFzQixTQUFRLHNCQUFTO0lBR2xELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBaUM7UUFDekUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ2xFLEtBQUssRUFBRSxLQUFLLENBQUMsaUJBQWlCLENBQUMsZUFBZTtZQUM5QyxHQUFHLEVBQUU7Z0JBQ0gsWUFBWSxFQUFFLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQ2pELEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQ3hDO2dCQUNELFdBQVcsRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQzthQUNoRTtZQUNELGdCQUFnQixFQUFFLHNCQUFzQjtZQUN4Qyx3QkFBd0IsRUFBRTtnQkFDeEIsU0FBUyxFQUFFLFFBQVE7YUFDcEI7WUFDRCx5QkFBeUIsRUFBRTtnQkFDekIsUUFBUSxFQUFFLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO2FBQ3pEO1NBQ0YsQ0FBQyxDQUFDLElBQUksQ0FDTCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRTtZQUN6QixLQUFLLEVBQUUsMkJBQTJCO1NBQ25DLENBQUMsQ0FDSCxDQUFDO1FBRUYsTUFBTSxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNsRSxLQUFLLEVBQUUsS0FBSyxDQUFDLGlCQUFpQixDQUFDLGVBQWU7WUFDOUMsR0FBRyxFQUFFO2dCQUNILFlBQVksRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUNqRCxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUN4QztnQkFDRCxXQUFXLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7YUFDaEU7WUFDRCxnQkFBZ0IsRUFBRSwwQkFBMEI7WUFDNUMsd0JBQXdCLEVBQUU7Z0JBQ3hCLFNBQVMsRUFBRSxRQUFRO2FBQ3BCO1lBQ0QseUJBQXlCLEVBQUU7Z0JBQ3pCLGNBQWMsRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQzthQUNsRTtZQUNELFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU87U0FDakMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUM1RCxLQUFLLEVBQUUsS0FBSyxDQUFDLGlCQUFpQixDQUFDLGVBQWU7WUFDOUMsR0FBRyxFQUFFO2dCQUNILFlBQVksRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUNqRCxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUN4QztnQkFDRCxXQUFXLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7YUFDaEU7WUFDRCxnQkFBZ0IsRUFBRSwwQkFBMEI7WUFDNUMsd0JBQXdCLEVBQUU7Z0JBQ3hCLFNBQVMsRUFBRSxRQUFRO2FBQ3BCO1lBQ0QseUJBQXlCLEVBQUU7Z0JBQ3pCLGNBQWMsRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQzthQUMvRDtZQUNELFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU87U0FDakMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsV0FBVzthQUN6QixJQUFJLENBQUMsUUFBUSxDQUFDO2FBQ2QsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUUxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQ2hDLElBQUksRUFDSixpQ0FBaUMsRUFDakM7WUFDRSxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1NBQ3JDLENBQ0YsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDdkUsY0FBYyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQztZQUMxRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLE9BQU8sRUFBRSxrQ0FBa0M7WUFDM0MsY0FBYyxFQUFFLElBQUk7WUFDcEIsSUFBSSxFQUFFO2dCQUNKLFdBQVcsRUFBRSxRQUFRO2dCQUNyQixLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHO2FBQ3hCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDbkMsQ0FBQztDQUNGO0FBeEZELHNEQXdGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBTeXN0ZW1Db25maWcgfSBmcm9tIFwiLi4vLi4vc2hhcmVkL3R5cGVzXCI7XG5pbXBvcnQgeyBTaGFyZWQgfSBmcm9tIFwiLi4vLi4vc2hhcmVkXCI7XG5pbXBvcnQgeyBSYWdEeW5hbW9EQlRhYmxlcyB9IGZyb20gXCIuLi9yYWctZHluYW1vZGItdGFibGVzXCI7XG5pbXBvcnQgKiBhcyBzZm4gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zXCI7XG5pbXBvcnQgKiBhcyB0YXNrcyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3NcIjtcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ3JlYXRlS2VuZHJhV29ya3NwYWNlUHJvcHMge1xuICByZWFkb25seSBjb25maWc6IFN5c3RlbUNvbmZpZztcbiAgcmVhZG9ubHkgc2hhcmVkOiBTaGFyZWQ7XG4gIHJlYWRvbmx5IHJhZ0R5bmFtb0RCVGFibGVzOiBSYWdEeW5hbW9EQlRhYmxlcztcbn1cblxuZXhwb3J0IGNsYXNzIENyZWF0ZUtlbmRyYVdvcmtzcGFjZSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBzdGF0ZU1hY2hpbmU6IHNmbi5TdGF0ZU1hY2hpbmU7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENyZWF0ZUtlbmRyYVdvcmtzcGFjZVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGhhbmRsZUVycm9yID0gbmV3IHRhc2tzLkR5bmFtb1VwZGF0ZUl0ZW0odGhpcywgXCJIYW5kbGVFcnJvclwiLCB7XG4gICAgICB0YWJsZTogcHJvcHMucmFnRHluYW1vREJUYWJsZXMud29ya3NwYWNlc1RhYmxlLFxuICAgICAga2V5OiB7XG4gICAgICAgIHdvcmtzcGFjZV9pZDogdGFza3MuRHluYW1vQXR0cmlidXRlVmFsdWUuZnJvbVN0cmluZyhcbiAgICAgICAgICBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkLndvcmtzcGFjZV9pZFwiKVxuICAgICAgICApLFxuICAgICAgICBvYmplY3RfdHlwZTogdGFza3MuRHluYW1vQXR0cmlidXRlVmFsdWUuZnJvbVN0cmluZyhcIndvcmtzcGFjZVwiKSxcbiAgICAgIH0sXG4gICAgICB1cGRhdGVFeHByZXNzaW9uOiBcInNldCAjc3RhdHVzID0gOmVycm9yXCIsXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgXCIjc3RhdHVzXCI6IFwic3RhdHVzXCIsXG4gICAgICB9LFxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICBcIjplcnJvclwiOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKFwiZXJyb3JcIiksXG4gICAgICB9LFxuICAgIH0pLm5leHQoXG4gICAgICBuZXcgc2ZuLkZhaWwodGhpcywgXCJGYWlsXCIsIHtcbiAgICAgICAgY2F1c2U6IFwiV29ya3NwYWNlIGNyZWF0aW9uIGZhaWxlZFwiLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgY29uc3Qgc2V0Q3JlYXRpbmcgPSBuZXcgdGFza3MuRHluYW1vVXBkYXRlSXRlbSh0aGlzLCBcIlNldENyZWF0aW5nXCIsIHtcbiAgICAgIHRhYmxlOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcy53b3Jrc3BhY2VzVGFibGUsXG4gICAgICBrZXk6IHtcbiAgICAgICAgd29ya3NwYWNlX2lkOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKFxuICAgICAgICAgIHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQud29ya3NwYWNlX2lkXCIpXG4gICAgICAgICksXG4gICAgICAgIG9iamVjdF90eXBlOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKFwid29ya3NwYWNlXCIpLFxuICAgICAgfSxcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb246IFwic2V0ICNzdGF0dXM9OnN0YXR1c1ZhbHVlXCIsXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcbiAgICAgICAgXCIjc3RhdHVzXCI6IFwic3RhdHVzXCIsXG4gICAgICB9LFxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICBcIjpzdGF0dXNWYWx1ZVwiOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKFwiY3JlYXRpbmdcIiksXG4gICAgICB9LFxuICAgICAgcmVzdWx0UGF0aDogc2ZuLkpzb25QYXRoLkRJU0NBUkQsXG4gICAgfSk7XG5cbiAgICBjb25zdCBzZXRSZWFkeSA9IG5ldyB0YXNrcy5EeW5hbW9VcGRhdGVJdGVtKHRoaXMsIFwiU2V0UmVhZHlcIiwge1xuICAgICAgdGFibGU6IHByb3BzLnJhZ0R5bmFtb0RCVGFibGVzLndvcmtzcGFjZXNUYWJsZSxcbiAgICAgIGtleToge1xuICAgICAgICB3b3Jrc3BhY2VfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC53b3Jrc3BhY2VfaWRcIilcbiAgICAgICAgKSxcbiAgICAgICAgb2JqZWN0X3R5cGU6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXCJ3b3Jrc3BhY2VcIiksXG4gICAgICB9LFxuICAgICAgdXBkYXRlRXhwcmVzc2lvbjogXCJzZXQgI3N0YXR1cz06c3RhdHVzVmFsdWVcIixcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xuICAgICAgICBcIiNzdGF0dXNcIjogXCJzdGF0dXNcIixcbiAgICAgIH0sXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgIFwiOnN0YXR1c1ZhbHVlXCI6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXCJyZWFkeVwiKSxcbiAgICAgIH0sXG4gICAgICByZXN1bHRQYXRoOiBzZm4uSnNvblBhdGguRElTQ0FSRCxcbiAgICB9KTtcblxuICAgIGNvbnN0IHdvcmtmbG93ID0gc2V0Q3JlYXRpbmdcbiAgICAgIC5uZXh0KHNldFJlYWR5KVxuICAgICAgLm5leHQobmV3IHNmbi5TdWNjZWVkKHRoaXMsIFwiU3VjY2Vzc1wiKSk7XG5cbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKFxuICAgICAgdGhpcyxcbiAgICAgIFwiQ3JlYXRlS2VuZHJhV29ya3NwYWNlU01Mb2dHcm91cFwiLFxuICAgICAge1xuICAgICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB9XG4gICAgKTtcblxuICAgIGNvbnN0IHN0YXRlTWFjaGluZSA9IG5ldyBzZm4uU3RhdGVNYWNoaW5lKHRoaXMsIFwiQ3JlYXRlS2VuZHJhV29ya3NwYWNlXCIsIHtcbiAgICAgIGRlZmluaXRpb25Cb2R5OiBzZm4uRGVmaW5pdGlvbkJvZHkuZnJvbUNoYWluYWJsZSh3b3JrZmxvdyksXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgIGNvbW1lbnQ6IFwiQ3JlYXRlIEtlbmRyYSBXb3Jrc3BhY2UgV29ya2Zsb3dcIixcbiAgICAgIHRyYWNpbmdFbmFibGVkOiB0cnVlLFxuICAgICAgbG9nczoge1xuICAgICAgICBkZXN0aW5hdGlvbjogbG9nR3JvdXAsXG4gICAgICAgIGxldmVsOiBzZm4uTG9nTGV2ZWwuQUxMLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHRoaXMuc3RhdGVNYWNoaW5lID0gc3RhdGVNYWNoaW5lO1xuICB9XG59XG4iXX0=