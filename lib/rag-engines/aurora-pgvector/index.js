"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuroraPgVector = void 0;
const path = require("path");
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const create_aurora_workspace_1 = require("./create-aurora-workspace");
const ec2 = require("aws-cdk-lib/aws-ec2");
const lambda = require("aws-cdk-lib/aws-lambda");
const logs = require("aws-cdk-lib/aws-logs");
const rds = require("aws-cdk-lib/aws-rds");
const cr = require("aws-cdk-lib/custom-resources");
const cdk_nag_1 = require("cdk-nag");
class AuroraPgVector extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const dbCluster = new rds.DatabaseCluster(this, "AuroraDatabase", {
            engine: rds.DatabaseClusterEngine.auroraPostgres({
                version: rds.AuroraPostgresEngineVersion.VER_15_3,
            }),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            writer: rds.ClusterInstance.serverlessV2("ServerlessInstance"),
            vpc: props.shared.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
            iamAuthentication: true,
        });
        const databaseSetupFunction = new lambda.Function(this, "DatabaseSetupFunction", {
            vpc: props.shared.vpc,
            code: props.shared.sharedCode.bundleWithLambdaAsset(path.join(__dirname, "./functions/pgvector-setup")),
            runtime: props.shared.pythonRuntime,
            architecture: props.shared.lambdaArchitecture,
            handler: "index.lambda_handler",
            layers: [props.shared.powerToolsLayer, props.shared.commonLayer],
            timeout: cdk.Duration.minutes(5),
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
                ...props.shared.defaultEnvironmentVariables,
            },
        });
        dbCluster.secret?.grantRead(databaseSetupFunction);
        dbCluster.connections.allowDefaultPortFrom(databaseSetupFunction);
        const databaseSetupProvider = new cr.Provider(this, "DatabaseSetupProvider", {
            vpc: props.shared.vpc,
            onEventHandler: databaseSetupFunction,
        });
        const dbSetupResource = new cdk.CustomResource(this, "DatabaseSetupResource", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            serviceToken: databaseSetupProvider.serviceToken,
            properties: {
                AURORA_DB_SECRET_ID: dbCluster.secret?.secretArn,
            },
        });
        dbSetupResource.node.addDependency(dbCluster);
        const createWorkflow = new create_aurora_workspace_1.CreateAuroraWorkspace(this, "CreateAuroraWorkspace", {
            config: props.config,
            shared: props.shared,
            dbCluster: dbCluster,
            ragDynamoDBTables: props.ragDynamoDBTables,
        });
        this.database = dbCluster;
        this.createAuroraWorkspaceWorkflow = createWorkflow.stateMachine;
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(dbCluster, [
            {
                id: "AwsSolutions-RDS10",
                reason: "Deletion protection disabled to allow deletion as part of the CloudFormation stack.",
            },
            {
                id: "AwsSolutions-RDS2",
                reason: "Encryption cannot be enabled on an unencrypted DB Cluster, therefore enabling will destroy existing data. Docs provide instructions for users requiring it.",
            },
        ]);
    }
}
exports.AuroraPgVector = AuroraPgVector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsbUNBQW1DO0FBQ25DLDJDQUF1QztBQUd2Qyx1RUFBa0U7QUFFbEUsMkNBQTJDO0FBQzNDLGlEQUFpRDtBQUNqRCw2Q0FBNkM7QUFDN0MsMkNBQTJDO0FBQzNDLG1EQUFtRDtBQUVuRCxxQ0FBMEM7QUFRMUMsTUFBYSxjQUFlLFNBQVEsc0JBQVM7SUFJM0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUEwQjtRQUNsRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDaEUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUM7Z0JBQy9DLE9BQU8sRUFBRSxHQUFHLENBQUMsMkJBQTJCLENBQUMsUUFBUTthQUNsRCxDQUFDO1lBQ0YsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxNQUFNLEVBQUUsR0FBRyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsb0JBQW9CLENBQUM7WUFDOUQsR0FBRyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRztZQUNyQixVQUFVLEVBQUUsRUFBRSxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRTtZQUMzRCxpQkFBaUIsRUFBRSxJQUFJO1NBQ3hCLENBQUMsQ0FBQztRQUVILE1BQU0scUJBQXFCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUMvQyxJQUFJLEVBQ0osdUJBQXVCLEVBQ3ZCO1lBQ0UsR0FBRyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRztZQUNyQixJQUFJLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMscUJBQXFCLENBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDRCQUE0QixDQUFDLENBQ25EO1lBQ0QsT0FBTyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsYUFBYTtZQUNuQyxZQUFZLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0I7WUFDN0MsT0FBTyxFQUFFLHNCQUFzQjtZQUMvQixNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztZQUNoRSxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLFlBQVksRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7WUFDekMsV0FBVyxFQUFFO2dCQUNYLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQywyQkFBMkI7YUFDNUM7U0FDRixDQUNGLENBQUM7UUFFRixTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ25ELFNBQVMsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUVsRSxNQUFNLHFCQUFxQixHQUFHLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FDM0MsSUFBSSxFQUNKLHVCQUF1QixFQUN2QjtZQUNFLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUc7WUFDckIsY0FBYyxFQUFFLHFCQUFxQjtTQUN0QyxDQUNGLENBQUM7UUFFRixNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxjQUFjLENBQzVDLElBQUksRUFDSix1QkFBdUIsRUFDdkI7WUFDRSxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLFlBQVksRUFBRSxxQkFBcUIsQ0FBQyxZQUFZO1lBQ2hELFVBQVUsRUFBRTtnQkFDVixtQkFBbUIsRUFBRSxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQW1CO2FBQzNEO1NBQ0YsQ0FDRixDQUFDO1FBRUYsZUFBZSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFOUMsTUFBTSxjQUFjLEdBQUcsSUFBSSwrQ0FBcUIsQ0FDOUMsSUFBSSxFQUNKLHVCQUF1QixFQUN2QjtZQUNFLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07WUFDcEIsU0FBUyxFQUFFLFNBQVM7WUFDcEIsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLGlCQUFpQjtTQUMzQyxDQUNGLENBQUM7UUFFRixJQUFJLENBQUMsUUFBUSxHQUFHLFNBQVMsQ0FBQztRQUMxQixJQUFJLENBQUMsNkJBQTZCLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQztRQUVqRTs7V0FFRztRQUNILHlCQUFlLENBQUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFO1lBQ2pEO2dCQUNFLEVBQUUsRUFBRSxvQkFBb0I7Z0JBQ3hCLE1BQU0sRUFDSixxRkFBcUY7YUFDeEY7WUFDRDtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQ0osNkpBQTZKO2FBQ2hLO1NBQ0YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBOUZELHdDQThGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBTeXN0ZW1Db25maWcgfSBmcm9tIFwiLi4vLi4vc2hhcmVkL3R5cGVzXCI7XG5pbXBvcnQgeyBTaGFyZWQgfSBmcm9tIFwiLi4vLi4vc2hhcmVkXCI7XG5pbXBvcnQgeyBDcmVhdGVBdXJvcmFXb3Jrc3BhY2UgfSBmcm9tIFwiLi9jcmVhdGUtYXVyb3JhLXdvcmtzcGFjZVwiO1xuaW1wb3J0IHsgUmFnRHluYW1vREJUYWJsZXMgfSBmcm9tIFwiLi4vcmFnLWR5bmFtb2RiLXRhYmxlc1wiO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XG5pbXBvcnQgKiBhcyByZHMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1yZHNcIjtcbmltcG9ydCAqIGFzIGNyIGZyb20gXCJhd3MtY2RrLWxpYi9jdXN0b20tcmVzb3VyY2VzXCI7XG5pbXBvcnQgKiBhcyBzZm4gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zXCI7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEF1cm9yYVBnVmVjdG9yUHJvcHMge1xuICByZWFkb25seSBjb25maWc6IFN5c3RlbUNvbmZpZztcbiAgcmVhZG9ubHkgc2hhcmVkOiBTaGFyZWQ7XG4gIHJlYWRvbmx5IHJhZ0R5bmFtb0RCVGFibGVzOiBSYWdEeW5hbW9EQlRhYmxlcztcbn1cblxuZXhwb3J0IGNsYXNzIEF1cm9yYVBnVmVjdG9yIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcmVhZG9ubHkgZGF0YWJhc2U6IHJkcy5EYXRhYmFzZUNsdXN0ZXI7XG4gIHB1YmxpYyByZWFkb25seSBjcmVhdGVBdXJvcmFXb3Jrc3BhY2VXb3JrZmxvdzogc2ZuLlN0YXRlTWFjaGluZTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQXVyb3JhUGdWZWN0b3JQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBkYkNsdXN0ZXIgPSBuZXcgcmRzLkRhdGFiYXNlQ2x1c3Rlcih0aGlzLCBcIkF1cm9yYURhdGFiYXNlXCIsIHtcbiAgICAgIGVuZ2luZTogcmRzLkRhdGFiYXNlQ2x1c3RlckVuZ2luZS5hdXJvcmFQb3N0Z3Jlcyh7XG4gICAgICAgIHZlcnNpb246IHJkcy5BdXJvcmFQb3N0Z3Jlc0VuZ2luZVZlcnNpb24uVkVSXzE1XzMsXG4gICAgICB9KSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICB3cml0ZXI6IHJkcy5DbHVzdGVySW5zdGFuY2Uuc2VydmVybGVzc1YyKFwiU2VydmVybGVzc0luc3RhbmNlXCIpLFxuICAgICAgdnBjOiBwcm9wcy5zaGFyZWQudnBjLFxuICAgICAgdnBjU3VibmV0czogeyBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVEIH0sXG4gICAgICBpYW1BdXRoZW50aWNhdGlvbjogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGRhdGFiYXNlU2V0dXBGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oXG4gICAgICB0aGlzLFxuICAgICAgXCJEYXRhYmFzZVNldHVwRnVuY3Rpb25cIixcbiAgICAgIHtcbiAgICAgICAgdnBjOiBwcm9wcy5zaGFyZWQudnBjLFxuICAgICAgICBjb2RlOiBwcm9wcy5zaGFyZWQuc2hhcmVkQ29kZS5idW5kbGVXaXRoTGFtYmRhQXNzZXQoXG4gICAgICAgICAgcGF0aC5qb2luKF9fZGlybmFtZSwgXCIuL2Z1bmN0aW9ucy9wZ3ZlY3Rvci1zZXR1cFwiKVxuICAgICAgICApLFxuICAgICAgICBydW50aW1lOiBwcm9wcy5zaGFyZWQucHl0aG9uUnVudGltZSxcbiAgICAgICAgYXJjaGl0ZWN0dXJlOiBwcm9wcy5zaGFyZWQubGFtYmRhQXJjaGl0ZWN0dXJlLFxuICAgICAgICBoYW5kbGVyOiBcImluZGV4LmxhbWJkYV9oYW5kbGVyXCIsXG4gICAgICAgIGxheWVyczogW3Byb3BzLnNoYXJlZC5wb3dlclRvb2xzTGF5ZXIsIHByb3BzLnNoYXJlZC5jb21tb25MYXllcl0sXG4gICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICAuLi5wcm9wcy5zaGFyZWQuZGVmYXVsdEVudmlyb25tZW50VmFyaWFibGVzLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG5cbiAgICBkYkNsdXN0ZXIuc2VjcmV0Py5ncmFudFJlYWQoZGF0YWJhc2VTZXR1cEZ1bmN0aW9uKTtcbiAgICBkYkNsdXN0ZXIuY29ubmVjdGlvbnMuYWxsb3dEZWZhdWx0UG9ydEZyb20oZGF0YWJhc2VTZXR1cEZ1bmN0aW9uKTtcblxuICAgIGNvbnN0IGRhdGFiYXNlU2V0dXBQcm92aWRlciA9IG5ldyBjci5Qcm92aWRlcihcbiAgICAgIHRoaXMsXG4gICAgICBcIkRhdGFiYXNlU2V0dXBQcm92aWRlclwiLFxuICAgICAge1xuICAgICAgICB2cGM6IHByb3BzLnNoYXJlZC52cGMsXG4gICAgICAgIG9uRXZlbnRIYW5kbGVyOiBkYXRhYmFzZVNldHVwRnVuY3Rpb24sXG4gICAgICB9XG4gICAgKTtcblxuICAgIGNvbnN0IGRiU2V0dXBSZXNvdXJjZSA9IG5ldyBjZGsuQ3VzdG9tUmVzb3VyY2UoXG4gICAgICB0aGlzLFxuICAgICAgXCJEYXRhYmFzZVNldHVwUmVzb3VyY2VcIixcbiAgICAgIHtcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgc2VydmljZVRva2VuOiBkYXRhYmFzZVNldHVwUHJvdmlkZXIuc2VydmljZVRva2VuLFxuICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgQVVST1JBX0RCX1NFQ1JFVF9JRDogZGJDbHVzdGVyLnNlY3JldD8uc2VjcmV0QXJuIGFzIHN0cmluZyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgZGJTZXR1cFJlc291cmNlLm5vZGUuYWRkRGVwZW5kZW5jeShkYkNsdXN0ZXIpO1xuXG4gICAgY29uc3QgY3JlYXRlV29ya2Zsb3cgPSBuZXcgQ3JlYXRlQXVyb3JhV29ya3NwYWNlKFxuICAgICAgdGhpcyxcbiAgICAgIFwiQ3JlYXRlQXVyb3JhV29ya3NwYWNlXCIsXG4gICAgICB7XG4gICAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgICBzaGFyZWQ6IHByb3BzLnNoYXJlZCxcbiAgICAgICAgZGJDbHVzdGVyOiBkYkNsdXN0ZXIsXG4gICAgICAgIHJhZ0R5bmFtb0RCVGFibGVzOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcyxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgdGhpcy5kYXRhYmFzZSA9IGRiQ2x1c3RlcjtcbiAgICB0aGlzLmNyZWF0ZUF1cm9yYVdvcmtzcGFjZVdvcmtmbG93ID0gY3JlYXRlV29ya2Zsb3cuc3RhdGVNYWNoaW5lO1xuXG4gICAgLyoqXG4gICAgICogQ0RLIE5BRyBzdXBwcmVzc2lvblxuICAgICAqL1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhkYkNsdXN0ZXIsIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLVJEUzEwXCIsXG4gICAgICAgIHJlYXNvbjpcbiAgICAgICAgICBcIkRlbGV0aW9uIHByb3RlY3Rpb24gZGlzYWJsZWQgdG8gYWxsb3cgZGVsZXRpb24gYXMgcGFydCBvZiB0aGUgQ2xvdWRGb3JtYXRpb24gc3RhY2suXCIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtUkRTMlwiLFxuICAgICAgICByZWFzb246XG4gICAgICAgICAgXCJFbmNyeXB0aW9uIGNhbm5vdCBiZSBlbmFibGVkIG9uIGFuIHVuZW5jcnlwdGVkIERCIENsdXN0ZXIsIHRoZXJlZm9yZSBlbmFibGluZyB3aWxsIGRlc3Ryb3kgZXhpc3RpbmcgZGF0YS4gRG9jcyBwcm92aWRlIGluc3RydWN0aW9ucyBmb3IgdXNlcnMgcmVxdWlyaW5nIGl0LlwiLFxuICAgICAgfSxcbiAgICBdKTtcbiAgfVxufVxuIl19