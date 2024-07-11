"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployPackageModel = void 0;
const iam = require("aws-cdk-lib/aws-iam");
const sagemaker = require("aws-cdk-lib/aws-sagemaker");
const cdk_nag_1 = require("cdk-nag");
function deployPackageModel(scope, props, modelConfig) {
    const { region } = props;
    const { modelId, instanceType, containerStartupHealthCheckTimeoutInSeconds = 900, } = modelConfig;
    const executionRole = new iam.Role(scope, "SageMakerExecutionRole", {
        assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
        managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
        ],
    });
    const modelPackageMapping = modelConfig.packages(scope);
    const modelPackageName = modelPackageMapping.findInMap(region, "arn");
    const model = new sagemaker.CfnModel(scope, "Model", {
        executionRoleArn: executionRole.roleArn,
        enableNetworkIsolation: true,
        primaryContainer: {
            modelPackageName,
        },
    });
    const endpointConfig = new sagemaker.CfnEndpointConfig(scope, "EndpointConfig", {
        productionVariants: [
            {
                instanceType,
                initialVariantWeight: 1,
                initialInstanceCount: 1,
                variantName: "AllTraffic",
                modelName: model.getAtt("ModelName").toString(),
                containerStartupHealthCheckTimeoutInSeconds,
            },
        ],
    });
    endpointConfig.addDependency(model);
    const endpoint = new sagemaker.CfnEndpoint(scope, modelId, {
        endpointConfigName: endpointConfig.getAtt("EndpointConfigName").toString(),
        endpointName: modelId.split("/").join("-").split(".").join("-"),
    });
    endpoint.addDependency(endpointConfig);
    /**
     * CDK NAG suppression
     */
    cdk_nag_1.NagSuppressions.addResourceSuppressions(executionRole, [
        {
            id: "AwsSolutions-IAM4",
            reason: "Gives user ability to deploy and delete endpoints from the UI.",
        },
        {
            id: "AwsSolutions-IAM5",
            reason: "Gives user ability to deploy and delete endpoints from the UI.",
        },
    ]);
    return { model, endpoint };
}
exports.deployPackageModel = deployPackageModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95LXBhY2thZ2UtbW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkZXBsb3ktcGFja2FnZS1tb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwyQ0FBMkM7QUFDM0MsdURBQXVEO0FBSXZELHFDQUEwQztBQUUxQyxTQUFnQixrQkFBa0IsQ0FDaEMsS0FBZ0IsRUFDaEIsS0FBMEIsRUFDMUIsV0FBK0I7SUFFL0IsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztJQUN6QixNQUFNLEVBQ0osT0FBTyxFQUNQLFlBQVksRUFDWiwyQ0FBMkMsR0FBRyxHQUFHLEdBQ2xELEdBQUcsV0FBVyxDQUFDO0lBRWhCLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsd0JBQXdCLEVBQUU7UUFDbEUsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixDQUFDO1FBQzlELGVBQWUsRUFBRTtZQUNmLEdBQUcsQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsMkJBQTJCLENBQUM7U0FDeEU7S0FDRixDQUFDLENBQUM7SUFFSCxNQUFNLG1CQUFtQixHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEQsTUFBTSxnQkFBZ0IsR0FBRyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBRXRFLE1BQU0sS0FBSyxHQUFHLElBQUksU0FBUyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFO1FBQ25ELGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxPQUFPO1FBQ3ZDLHNCQUFzQixFQUFFLElBQUk7UUFDNUIsZ0JBQWdCLEVBQUU7WUFDaEIsZ0JBQWdCO1NBQ2pCO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsTUFBTSxjQUFjLEdBQUcsSUFBSSxTQUFTLENBQUMsaUJBQWlCLENBQ3BELEtBQUssRUFDTCxnQkFBZ0IsRUFDaEI7UUFDRSxrQkFBa0IsRUFBRTtZQUNsQjtnQkFDRSxZQUFZO2dCQUNaLG9CQUFvQixFQUFFLENBQUM7Z0JBQ3ZCLG9CQUFvQixFQUFFLENBQUM7Z0JBQ3ZCLFdBQVcsRUFBRSxZQUFZO2dCQUN6QixTQUFTLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEVBQUU7Z0JBQy9DLDJDQUEyQzthQUM1QztTQUNGO0tBQ0YsQ0FDRixDQUFDO0lBRUYsY0FBYyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUVwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRTtRQUN6RCxrQkFBa0IsRUFBRSxjQUFjLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUMsUUFBUSxFQUFFO1FBQzFFLFlBQVksRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztLQUNoRSxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRXZDOztPQUVHO0lBQ0gseUJBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLEVBQUU7UUFDckQ7WUFDRSxFQUFFLEVBQUUsbUJBQW1CO1lBQ3ZCLE1BQU0sRUFBRSxnRUFBZ0U7U0FDekU7UUFDRDtZQUNFLEVBQUUsRUFBRSxtQkFBbUI7WUFDdkIsTUFBTSxFQUFFLGdFQUFnRTtTQUN6RTtLQUNGLENBQUMsQ0FBQztJQUVILE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLENBQUM7QUFDN0IsQ0FBQztBQXZFRCxnREF1RUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCAqIGFzIHNhZ2VtYWtlciBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNhZ2VtYWtlclwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuaW1wb3J0IHsgU2FnZU1ha2VyTW9kZWxQcm9wcywgTW9kZWxQYWNrYWdlQ29uZmlnIH0gZnJvbSBcIi4vdHlwZXNcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXBsb3lQYWNrYWdlTW9kZWwoXG4gIHNjb3BlOiBDb25zdHJ1Y3QsXG4gIHByb3BzOiBTYWdlTWFrZXJNb2RlbFByb3BzLFxuICBtb2RlbENvbmZpZzogTW9kZWxQYWNrYWdlQ29uZmlnXG4pIHtcbiAgY29uc3QgeyByZWdpb24gfSA9IHByb3BzO1xuICBjb25zdCB7XG4gICAgbW9kZWxJZCxcbiAgICBpbnN0YW5jZVR5cGUsXG4gICAgY29udGFpbmVyU3RhcnR1cEhlYWx0aENoZWNrVGltZW91dEluU2Vjb25kcyA9IDkwMCxcbiAgfSA9IG1vZGVsQ29uZmlnO1xuXG4gIGNvbnN0IGV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUoc2NvcGUsIFwiU2FnZU1ha2VyRXhlY3V0aW9uUm9sZVwiLCB7XG4gICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoXCJzYWdlbWFrZXIuYW1hem9uYXdzLmNvbVwiKSxcbiAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcIkFtYXpvblNhZ2VNYWtlckZ1bGxBY2Nlc3NcIiksXG4gICAgXSxcbiAgfSk7XG5cbiAgY29uc3QgbW9kZWxQYWNrYWdlTWFwcGluZyA9IG1vZGVsQ29uZmlnLnBhY2thZ2VzKHNjb3BlKTtcbiAgY29uc3QgbW9kZWxQYWNrYWdlTmFtZSA9IG1vZGVsUGFja2FnZU1hcHBpbmcuZmluZEluTWFwKHJlZ2lvbiwgXCJhcm5cIik7XG5cbiAgY29uc3QgbW9kZWwgPSBuZXcgc2FnZW1ha2VyLkNmbk1vZGVsKHNjb3BlLCBcIk1vZGVsXCIsIHtcbiAgICBleGVjdXRpb25Sb2xlQXJuOiBleGVjdXRpb25Sb2xlLnJvbGVBcm4sXG4gICAgZW5hYmxlTmV0d29ya0lzb2xhdGlvbjogdHJ1ZSxcbiAgICBwcmltYXJ5Q29udGFpbmVyOiB7XG4gICAgICBtb2RlbFBhY2thZ2VOYW1lLFxuICAgIH0sXG4gIH0pO1xuXG4gIGNvbnN0IGVuZHBvaW50Q29uZmlnID0gbmV3IHNhZ2VtYWtlci5DZm5FbmRwb2ludENvbmZpZyhcbiAgICBzY29wZSxcbiAgICBcIkVuZHBvaW50Q29uZmlnXCIsXG4gICAge1xuICAgICAgcHJvZHVjdGlvblZhcmlhbnRzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpbnN0YW5jZVR5cGUsXG4gICAgICAgICAgaW5pdGlhbFZhcmlhbnRXZWlnaHQ6IDEsXG4gICAgICAgICAgaW5pdGlhbEluc3RhbmNlQ291bnQ6IDEsXG4gICAgICAgICAgdmFyaWFudE5hbWU6IFwiQWxsVHJhZmZpY1wiLFxuICAgICAgICAgIG1vZGVsTmFtZTogbW9kZWwuZ2V0QXR0KFwiTW9kZWxOYW1lXCIpLnRvU3RyaW5nKCksXG4gICAgICAgICAgY29udGFpbmVyU3RhcnR1cEhlYWx0aENoZWNrVGltZW91dEluU2Vjb25kcyxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfVxuICApO1xuXG4gIGVuZHBvaW50Q29uZmlnLmFkZERlcGVuZGVuY3kobW9kZWwpO1xuXG4gIGNvbnN0IGVuZHBvaW50ID0gbmV3IHNhZ2VtYWtlci5DZm5FbmRwb2ludChzY29wZSwgbW9kZWxJZCwge1xuICAgIGVuZHBvaW50Q29uZmlnTmFtZTogZW5kcG9pbnRDb25maWcuZ2V0QXR0KFwiRW5kcG9pbnRDb25maWdOYW1lXCIpLnRvU3RyaW5nKCksXG4gICAgZW5kcG9pbnROYW1lOiBtb2RlbElkLnNwbGl0KFwiL1wiKS5qb2luKFwiLVwiKS5zcGxpdChcIi5cIikuam9pbihcIi1cIiksXG4gIH0pO1xuXG4gIGVuZHBvaW50LmFkZERlcGVuZGVuY3koZW5kcG9pbnRDb25maWcpO1xuXG4gIC8qKlxuICAgKiBDREsgTkFHIHN1cHByZXNzaW9uXG4gICAqL1xuICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoZXhlY3V0aW9uUm9sZSwgW1xuICAgIHtcbiAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU00XCIsXG4gICAgICByZWFzb246IFwiR2l2ZXMgdXNlciBhYmlsaXR5IHRvIGRlcGxveSBhbmQgZGVsZXRlIGVuZHBvaW50cyBmcm9tIHRoZSBVSS5cIixcbiAgICB9LFxuICAgIHtcbiAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICByZWFzb246IFwiR2l2ZXMgdXNlciBhYmlsaXR5IHRvIGRlcGxveSBhbmQgZGVsZXRlIGVuZHBvaW50cyBmcm9tIHRoZSBVSS5cIixcbiAgICB9LFxuICBdKTtcblxuICByZXR1cm4geyBtb2RlbCwgZW5kcG9pbnQgfTtcbn1cbiJdfQ==