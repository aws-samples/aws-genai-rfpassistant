"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAuroraWorkspace = void 0;
const path = require("path");
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const sfn = require("aws-cdk-lib/aws-stepfunctions");
const tasks = require("aws-cdk-lib/aws-stepfunctions-tasks");
const lambda = require("aws-cdk-lib/aws-lambda");
const logs = require("aws-cdk-lib/aws-logs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class CreateAuroraWorkspace extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const createFunction = new lambda.Function(this, "CreateAuroraWorkspaceFunction", {
            vpc: props.shared.vpc,
            code: props.shared.sharedCode.bundleWithLambdaAsset(path.join(__dirname, "./functions/create-workflow/create")),
            runtime: props.shared.pythonRuntime,
            architecture: props.shared.lambdaArchitecture,
            handler: "index.lambda_handler",
            layers: [props.shared.powerToolsLayer, props.shared.commonLayer],
            timeout: cdk.Duration.minutes(5),
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
                ...props.shared.defaultEnvironmentVariables,
                AURORA_DB_SECRET_ID: props.dbCluster.secret?.secretArn,
                WORKSPACES_TABLE_NAME: props.ragDynamoDBTables.workspacesTable.tableName,
                WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME: props.ragDynamoDBTables.workspacesByObjectTypeIndexName,
            },
        });
        props.dbCluster.secret?.grantRead(createFunction);
        props.dbCluster.connections.allowDefaultPortFrom(createFunction);
        props.ragDynamoDBTables.workspacesTable.grantReadWriteData(createFunction);
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
        const createTask = new tasks.LambdaInvoke(this, "Create", {
            lambdaFunction: createFunction,
            resultPath: "$.createResult",
        }).addCatch(handleError, {
            errors: ["States.ALL"],
            resultPath: "$.createResult",
        });
        const workflow = setCreating
            .next(createTask)
            .next(setReady)
            .next(new sfn.Succeed(this, "Success"));
        const logGroup = new logs.LogGroup(this, "CreateAuroraWorkspaceSMLogGroup", {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const stateMachine = new sfn.StateMachine(this, "CreateAuroraWorkspace", {
            definitionBody: sfn.DefinitionBody.fromChainable(workflow),
            timeout: cdk.Duration.minutes(5),
            comment: "Create Aurora Workspace Workflow",
            tracingEnabled: true,
            logs: {
                destination: logGroup,
                level: sfn.LogLevel.ALL,
            },
        });
        this.stateMachine = stateMachine;
    }
}
exports.CreateAuroraWorkspace = CreateAuroraWorkspace;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLWF1cm9yYS13b3Jrc3BhY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmVhdGUtYXVyb3JhLXdvcmtzcGFjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsbUNBQW1DO0FBQ25DLDJDQUF1QztBQUl2QyxxREFBcUQ7QUFDckQsNkRBQTZEO0FBQzdELGlEQUFpRDtBQUNqRCw2Q0FBNkM7QUFFN0MsNkNBQTRDO0FBUzVDLE1BQWEscUJBQXNCLFNBQVEsc0JBQVM7SUFHbEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFpQztRQUN6RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sY0FBYyxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FDeEMsSUFBSSxFQUNKLCtCQUErQixFQUMvQjtZQUNFLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUc7WUFDckIsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUNqRCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUMzRDtZQUNELE9BQU8sRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLGFBQWE7WUFDbkMsWUFBWSxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsa0JBQWtCO1lBQzdDLE9BQU8sRUFBRSxzQkFBc0I7WUFDL0IsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7WUFDaEUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRO1lBQ3pDLFdBQVcsRUFBRTtnQkFDWCxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsMkJBQTJCO2dCQUMzQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFtQjtnQkFDaEUscUJBQXFCLEVBQ25CLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsU0FBUztnQkFDbkQsb0NBQW9DLEVBQ2xDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQywrQkFBK0I7YUFDMUQ7U0FDRixDQUNGLENBQUM7UUFFRixLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbEQsS0FBSyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDakUsS0FBSyxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUUzRSxNQUFNLFdBQVcsR0FBRyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ2xFLEtBQUssRUFBRSxLQUFLLENBQUMsaUJBQWlCLENBQUMsZUFBZTtZQUM5QyxHQUFHLEVBQUU7Z0JBQ0gsWUFBWSxFQUFFLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQ2pELEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQ3hDO2dCQUNELFdBQVcsRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQzthQUNoRTtZQUNELGdCQUFnQixFQUFFLHNCQUFzQjtZQUN4Qyx3QkFBd0IsRUFBRTtnQkFDeEIsU0FBUyxFQUFFLFFBQVE7YUFDcEI7WUFDRCx5QkFBeUIsRUFBRTtnQkFDekIsUUFBUSxFQUFFLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO2FBQ3pEO1NBQ0YsQ0FBQyxDQUFDLElBQUksQ0FDTCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRTtZQUN6QixLQUFLLEVBQUUsMkJBQTJCO1NBQ25DLENBQUMsQ0FDSCxDQUFDO1FBRUYsTUFBTSxXQUFXLEdBQUcsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNsRSxLQUFLLEVBQUUsS0FBSyxDQUFDLGlCQUFpQixDQUFDLGVBQWU7WUFDOUMsR0FBRyxFQUFFO2dCQUNILFlBQVksRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUNqRCxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUN4QztnQkFDRCxXQUFXLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7YUFDaEU7WUFDRCxnQkFBZ0IsRUFBRSwwQkFBMEI7WUFDNUMsd0JBQXdCLEVBQUU7Z0JBQ3hCLFNBQVMsRUFBRSxRQUFRO2FBQ3BCO1lBQ0QseUJBQXlCLEVBQUU7Z0JBQ3pCLGNBQWMsRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQzthQUNsRTtZQUNELFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU87U0FDakMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUM1RCxLQUFLLEVBQUUsS0FBSyxDQUFDLGlCQUFpQixDQUFDLGVBQWU7WUFDOUMsR0FBRyxFQUFFO2dCQUNILFlBQVksRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUNqRCxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUN4QztnQkFDRCxXQUFXLEVBQUUsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUM7YUFDaEU7WUFDRCxnQkFBZ0IsRUFBRSwwQkFBMEI7WUFDNUMsd0JBQXdCLEVBQUU7Z0JBQ3hCLFNBQVMsRUFBRSxRQUFRO2FBQ3BCO1lBQ0QseUJBQXlCLEVBQUU7Z0JBQ3pCLGNBQWMsRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQzthQUMvRDtZQUNELFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU87U0FDakMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxVQUFVLEdBQUcsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDeEQsY0FBYyxFQUFFLGNBQWM7WUFDOUIsVUFBVSxFQUFFLGdCQUFnQjtTQUM3QixDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRTtZQUN2QixNQUFNLEVBQUUsQ0FBQyxZQUFZLENBQUM7WUFDdEIsVUFBVSxFQUFFLGdCQUFnQjtTQUM3QixDQUFDLENBQUM7UUFFSCxNQUFNLFFBQVEsR0FBRyxXQUFXO2FBQ3pCLElBQUksQ0FBQyxVQUFVLENBQUM7YUFDaEIsSUFBSSxDQUFDLFFBQVEsQ0FBQzthQUNkLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFFMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUNoQyxJQUFJLEVBQ0osaUNBQWlDLEVBQ2pDO1lBQ0UsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTztTQUNyQyxDQUNGLENBQUM7UUFFRixNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQ3ZFLGNBQWMsRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUM7WUFDMUQsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxPQUFPLEVBQUUsa0NBQWtDO1lBQzNDLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLElBQUksRUFBRTtnQkFDSixXQUFXLEVBQUUsUUFBUTtnQkFDckIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRzthQUN4QjtTQUNGLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0lBQ25DLENBQUM7Q0FDRjtBQTlIRCxzREE4SEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgU3lzdGVtQ29uZmlnIH0gZnJvbSBcIi4uLy4uL3NoYXJlZC90eXBlc1wiO1xuaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4uLy4uL3NoYXJlZFwiO1xuaW1wb3J0IHsgUmFnRHluYW1vREJUYWJsZXMgfSBmcm9tIFwiLi4vcmFnLWR5bmFtb2RiLXRhYmxlc1wiO1xuaW1wb3J0ICogYXMgc2ZuIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9uc1wiO1xuaW1wb3J0ICogYXMgdGFza3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzXCI7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XG5pbXBvcnQgKiBhcyByZHMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1yZHNcIjtcbmltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcblxuZXhwb3J0IGludGVyZmFjZSBDcmVhdGVBdXJvcmFXb3Jrc3BhY2VQcm9wcyB7XG4gIHJlYWRvbmx5IGNvbmZpZzogU3lzdGVtQ29uZmlnO1xuICByZWFkb25seSBzaGFyZWQ6IFNoYXJlZDtcbiAgcmVhZG9ubHkgcmFnRHluYW1vREJUYWJsZXM6IFJhZ0R5bmFtb0RCVGFibGVzO1xuICByZWFkb25seSBkYkNsdXN0ZXI6IHJkcy5EYXRhYmFzZUNsdXN0ZXI7XG59XG5cbmV4cG9ydCBjbGFzcyBDcmVhdGVBdXJvcmFXb3Jrc3BhY2UgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgc3RhdGVNYWNoaW5lOiBzZm4uU3RhdGVNYWNoaW5lO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDcmVhdGVBdXJvcmFXb3Jrc3BhY2VQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBjcmVhdGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oXG4gICAgICB0aGlzLFxuICAgICAgXCJDcmVhdGVBdXJvcmFXb3Jrc3BhY2VGdW5jdGlvblwiLFxuICAgICAge1xuICAgICAgICB2cGM6IHByb3BzLnNoYXJlZC52cGMsXG4gICAgICAgIGNvZGU6IHByb3BzLnNoYXJlZC5zaGFyZWRDb2RlLmJ1bmRsZVdpdGhMYW1iZGFBc3NldChcbiAgICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4vZnVuY3Rpb25zL2NyZWF0ZS13b3JrZmxvdy9jcmVhdGVcIilcbiAgICAgICAgKSxcbiAgICAgICAgcnVudGltZTogcHJvcHMuc2hhcmVkLnB5dGhvblJ1bnRpbWUsXG4gICAgICAgIGFyY2hpdGVjdHVyZTogcHJvcHMuc2hhcmVkLmxhbWJkYUFyY2hpdGVjdHVyZSxcbiAgICAgICAgaGFuZGxlcjogXCJpbmRleC5sYW1iZGFfaGFuZGxlclwiLFxuICAgICAgICBsYXllcnM6IFtwcm9wcy5zaGFyZWQucG93ZXJUb29sc0xheWVyLCBwcm9wcy5zaGFyZWQuY29tbW9uTGF5ZXJdLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgLi4ucHJvcHMuc2hhcmVkLmRlZmF1bHRFbnZpcm9ubWVudFZhcmlhYmxlcyxcbiAgICAgICAgICBBVVJPUkFfREJfU0VDUkVUX0lEOiBwcm9wcy5kYkNsdXN0ZXIuc2VjcmV0Py5zZWNyZXRBcm4gYXMgc3RyaW5nLFxuICAgICAgICAgIFdPUktTUEFDRVNfVEFCTEVfTkFNRTpcbiAgICAgICAgICAgIHByb3BzLnJhZ0R5bmFtb0RCVGFibGVzLndvcmtzcGFjZXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgV09SS1NQQUNFU19CWV9PQkpFQ1RfVFlQRV9JTkRFWF9OQU1FOlxuICAgICAgICAgICAgcHJvcHMucmFnRHluYW1vREJUYWJsZXMud29ya3NwYWNlc0J5T2JqZWN0VHlwZUluZGV4TmFtZSxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgcHJvcHMuZGJDbHVzdGVyLnNlY3JldD8uZ3JhbnRSZWFkKGNyZWF0ZUZ1bmN0aW9uKTtcbiAgICBwcm9wcy5kYkNsdXN0ZXIuY29ubmVjdGlvbnMuYWxsb3dEZWZhdWx0UG9ydEZyb20oY3JlYXRlRnVuY3Rpb24pO1xuICAgIHByb3BzLnJhZ0R5bmFtb0RCVGFibGVzLndvcmtzcGFjZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY3JlYXRlRnVuY3Rpb24pO1xuXG4gICAgY29uc3QgaGFuZGxlRXJyb3IgPSBuZXcgdGFza3MuRHluYW1vVXBkYXRlSXRlbSh0aGlzLCBcIkhhbmRsZUVycm9yXCIsIHtcbiAgICAgIHRhYmxlOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcy53b3Jrc3BhY2VzVGFibGUsXG4gICAgICBrZXk6IHtcbiAgICAgICAgd29ya3NwYWNlX2lkOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKFxuICAgICAgICAgIHNmbi5Kc29uUGF0aC5zdHJpbmdBdChcIiQud29ya3NwYWNlX2lkXCIpXG4gICAgICAgICksXG4gICAgICAgIG9iamVjdF90eXBlOiB0YXNrcy5EeW5hbW9BdHRyaWJ1dGVWYWx1ZS5mcm9tU3RyaW5nKFwid29ya3NwYWNlXCIpLFxuICAgICAgfSxcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb246IFwic2V0ICNzdGF0dXMgPSA6ZXJyb3JcIixcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xuICAgICAgICBcIiNzdGF0dXNcIjogXCJzdGF0dXNcIixcbiAgICAgIH0sXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgIFwiOmVycm9yXCI6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXCJlcnJvclwiKSxcbiAgICAgIH0sXG4gICAgfSkubmV4dChcbiAgICAgIG5ldyBzZm4uRmFpbCh0aGlzLCBcIkZhaWxcIiwge1xuICAgICAgICBjYXVzZTogXCJXb3Jrc3BhY2UgY3JlYXRpb24gZmFpbGVkXCIsXG4gICAgICB9KVxuICAgICk7XG5cbiAgICBjb25zdCBzZXRDcmVhdGluZyA9IG5ldyB0YXNrcy5EeW5hbW9VcGRhdGVJdGVtKHRoaXMsIFwiU2V0Q3JlYXRpbmdcIiwge1xuICAgICAgdGFibGU6IHByb3BzLnJhZ0R5bmFtb0RCVGFibGVzLndvcmtzcGFjZXNUYWJsZSxcbiAgICAgIGtleToge1xuICAgICAgICB3b3Jrc3BhY2VfaWQ6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXG4gICAgICAgICAgc2ZuLkpzb25QYXRoLnN0cmluZ0F0KFwiJC53b3Jrc3BhY2VfaWRcIilcbiAgICAgICAgKSxcbiAgICAgICAgb2JqZWN0X3R5cGU6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXCJ3b3Jrc3BhY2VcIiksXG4gICAgICB9LFxuICAgICAgdXBkYXRlRXhwcmVzc2lvbjogXCJzZXQgI3N0YXR1cz06c3RhdHVzVmFsdWVcIixcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xuICAgICAgICBcIiNzdGF0dXNcIjogXCJzdGF0dXNcIixcbiAgICAgIH0sXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgIFwiOnN0YXR1c1ZhbHVlXCI6IHRhc2tzLkR5bmFtb0F0dHJpYnV0ZVZhbHVlLmZyb21TdHJpbmcoXCJjcmVhdGluZ1wiKSxcbiAgICAgIH0sXG4gICAgICByZXN1bHRQYXRoOiBzZm4uSnNvblBhdGguRElTQ0FSRCxcbiAgICB9KTtcblxuICAgIGNvbnN0IHNldFJlYWR5ID0gbmV3IHRhc2tzLkR5bmFtb1VwZGF0ZUl0ZW0odGhpcywgXCJTZXRSZWFkeVwiLCB7XG4gICAgICB0YWJsZTogcHJvcHMucmFnRHluYW1vREJUYWJsZXMud29ya3NwYWNlc1RhYmxlLFxuICAgICAga2V5OiB7XG4gICAgICAgIHdvcmtzcGFjZV9pZDogdGFza3MuRHluYW1vQXR0cmlidXRlVmFsdWUuZnJvbVN0cmluZyhcbiAgICAgICAgICBzZm4uSnNvblBhdGguc3RyaW5nQXQoXCIkLndvcmtzcGFjZV9pZFwiKVxuICAgICAgICApLFxuICAgICAgICBvYmplY3RfdHlwZTogdGFza3MuRHluYW1vQXR0cmlidXRlVmFsdWUuZnJvbVN0cmluZyhcIndvcmtzcGFjZVwiKSxcbiAgICAgIH0sXG4gICAgICB1cGRhdGVFeHByZXNzaW9uOiBcInNldCAjc3RhdHVzPTpzdGF0dXNWYWx1ZVwiLFxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XG4gICAgICAgIFwiI3N0YXR1c1wiOiBcInN0YXR1c1wiLFxuICAgICAgfSxcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgXCI6c3RhdHVzVmFsdWVcIjogdGFza3MuRHluYW1vQXR0cmlidXRlVmFsdWUuZnJvbVN0cmluZyhcInJlYWR5XCIpLFxuICAgICAgfSxcbiAgICAgIHJlc3VsdFBhdGg6IHNmbi5Kc29uUGF0aC5ESVNDQVJELFxuICAgIH0pO1xuXG4gICAgY29uc3QgY3JlYXRlVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgXCJDcmVhdGVcIiwge1xuICAgICAgbGFtYmRhRnVuY3Rpb246IGNyZWF0ZUZ1bmN0aW9uLFxuICAgICAgcmVzdWx0UGF0aDogXCIkLmNyZWF0ZVJlc3VsdFwiLFxuICAgIH0pLmFkZENhdGNoKGhhbmRsZUVycm9yLCB7XG4gICAgICBlcnJvcnM6IFtcIlN0YXRlcy5BTExcIl0sXG4gICAgICByZXN1bHRQYXRoOiBcIiQuY3JlYXRlUmVzdWx0XCIsXG4gICAgfSk7XG5cbiAgICBjb25zdCB3b3JrZmxvdyA9IHNldENyZWF0aW5nXG4gICAgICAubmV4dChjcmVhdGVUYXNrKVxuICAgICAgLm5leHQoc2V0UmVhZHkpXG4gICAgICAubmV4dChuZXcgc2ZuLlN1Y2NlZWQodGhpcywgXCJTdWNjZXNzXCIpKTtcblxuICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAoXG4gICAgICB0aGlzLFxuICAgICAgXCJDcmVhdGVBdXJvcmFXb3Jrc3BhY2VTTUxvZ0dyb3VwXCIsXG4gICAgICB7XG4gICAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3Qgc3RhdGVNYWNoaW5lID0gbmV3IHNmbi5TdGF0ZU1hY2hpbmUodGhpcywgXCJDcmVhdGVBdXJvcmFXb3Jrc3BhY2VcIiwge1xuICAgICAgZGVmaW5pdGlvbkJvZHk6IHNmbi5EZWZpbml0aW9uQm9keS5mcm9tQ2hhaW5hYmxlKHdvcmtmbG93KSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgY29tbWVudDogXCJDcmVhdGUgQXVyb3JhIFdvcmtzcGFjZSBXb3JrZmxvd1wiLFxuICAgICAgdHJhY2luZ0VuYWJsZWQ6IHRydWUsXG4gICAgICBsb2dzOiB7XG4gICAgICAgIGRlc3RpbmF0aW9uOiBsb2dHcm91cCxcbiAgICAgICAgbGV2ZWw6IHNmbi5Mb2dMZXZlbC5BTEwsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5zdGF0ZU1hY2hpbmUgPSBzdGF0ZU1hY2hpbmU7XG4gIH1cbn1cbiJdfQ==