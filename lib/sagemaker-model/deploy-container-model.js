"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployContainerModel = void 0;
const iam = require("aws-cdk-lib/aws-iam");
const sagemaker = require("aws-cdk-lib/aws-sagemaker");
const container_images_1 = require("./container-images");
const image_repository_mapping_1 = require("./image-repository-mapping");
const cdk_nag_1 = require("cdk-nag");
function deployContainerModel(scope, props, modelConfig) {
    const { region } = props;
    const { modelId, instanceType, containerStartupHealthCheckTimeoutInSeconds = 900, env = {}, } = modelConfig;
    const executionRole = new iam.Role(scope, "SageMakerExecutionRole", {
        assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
        managedPolicies: [
            iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
        ],
    });
    const containerImage = modelConfig.container ||
        container_images_1.ContainerImages.HF_PYTORCH_LLM_TGI_INFERENCE_LATEST;
    const imageMapping = new image_repository_mapping_1.ImageRepositoryMapping(scope, "ContainerModelMapping", { region });
    const image = `${imageMapping.account}.dkr.ecr.${region}.amazonaws.com/${containerImage}`;
    const modelProps = {
        primaryContainer: {
            image,
            mode: "SingleModel",
            environment: {
                SAGEMAKER_CONTAINER_LOG_LEVEL: "20",
                SAGEMAKER_REGION: region,
                HF_MODEL_ID: modelId,
                ...env,
            },
        },
    };
    const model = new sagemaker.CfnModel(scope, "Model", {
        executionRoleArn: executionRole.roleArn,
        ...modelProps,
        vpcConfig: {
            securityGroupIds: [props.vpc.vpcDefaultSecurityGroup],
            subnets: props.vpc.privateSubnets.map((subnet) => subnet.subnetId),
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
exports.deployContainerModel = deployContainerModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95LWNvbnRhaW5lci1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRlcGxveS1jb250YWluZXItbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMkNBQTJDO0FBQzNDLHVEQUF1RDtBQUd2RCx5REFBcUQ7QUFDckQseUVBQW9FO0FBRXBFLHFDQUEwQztBQUUxQyxTQUFnQixvQkFBb0IsQ0FDbEMsS0FBZ0IsRUFDaEIsS0FBMEIsRUFDMUIsV0FBaUM7SUFFakMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztJQUN6QixNQUFNLEVBQ0osT0FBTyxFQUNQLFlBQVksRUFDWiwyQ0FBMkMsR0FBRyxHQUFHLEVBQ2pELEdBQUcsR0FBRyxFQUFFLEdBQ1QsR0FBRyxXQUFXLENBQUM7SUFFaEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSx3QkFBd0IsRUFBRTtRQUNsRSxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCLENBQUM7UUFDOUQsZUFBZSxFQUFFO1lBQ2YsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywyQkFBMkIsQ0FBQztTQUN4RTtLQUNGLENBQUMsQ0FBQztJQUVILE1BQU0sY0FBYyxHQUNsQixXQUFXLENBQUMsU0FBUztRQUNyQixrQ0FBZSxDQUFDLG1DQUFtQyxDQUFDO0lBQ3RELE1BQU0sWUFBWSxHQUFHLElBQUksaURBQXNCLENBQzdDLEtBQUssRUFDTCx1QkFBdUIsRUFDdkIsRUFBRSxNQUFNLEVBQUUsQ0FDWCxDQUFDO0lBQ0YsTUFBTSxLQUFLLEdBQUcsR0FBRyxZQUFZLENBQUMsT0FBTyxZQUFZLE1BQU0sa0JBQWtCLGNBQWMsRUFBRSxDQUFDO0lBRTFGLE1BQU0sVUFBVSxHQUFHO1FBQ2pCLGdCQUFnQixFQUFFO1lBQ2hCLEtBQUs7WUFDTCxJQUFJLEVBQUUsYUFBYTtZQUNuQixXQUFXLEVBQUU7Z0JBQ1gsNkJBQTZCLEVBQUUsSUFBSTtnQkFDbkMsZ0JBQWdCLEVBQUUsTUFBTTtnQkFDeEIsV0FBVyxFQUFFLE9BQU87Z0JBQ3BCLEdBQUcsR0FBRzthQUNQO1NBQ0Y7S0FDRixDQUFDO0lBRUYsTUFBTSxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUU7UUFDbkQsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLE9BQU87UUFDdkMsR0FBRyxVQUFVO1FBQ2IsU0FBUyxFQUFFO1lBQ1QsZ0JBQWdCLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDO1lBQ3JELE9BQU8sRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUM7U0FDbkU7S0FDRixDQUFDLENBQUM7SUFFSCxNQUFNLGNBQWMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxpQkFBaUIsQ0FDcEQsS0FBSyxFQUNMLGdCQUFnQixFQUNoQjtRQUNFLGtCQUFrQixFQUFFO1lBQ2xCO2dCQUNFLFlBQVk7Z0JBQ1osb0JBQW9CLEVBQUUsQ0FBQztnQkFDdkIsb0JBQW9CLEVBQUUsQ0FBQztnQkFDdkIsV0FBVyxFQUFFLFlBQVk7Z0JBQ3pCLFNBQVMsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLFFBQVEsRUFBRTtnQkFDL0MsMkNBQTJDO2FBQzVDO1NBQ0Y7S0FDRixDQUNGLENBQUM7SUFFRixjQUFjLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXBDLE1BQU0sUUFBUSxHQUFHLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFO1FBQ3pELGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxRQUFRLEVBQUU7UUFDMUUsWUFBWSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO0tBQ2hFLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLENBQUM7SUFFdkM7O09BRUc7SUFDSCx5QkFBZSxDQUFDLHVCQUF1QixDQUFDLGFBQWEsRUFBRTtRQUNyRDtZQUNFLEVBQUUsRUFBRSxtQkFBbUI7WUFDdkIsTUFBTSxFQUFFLGdFQUFnRTtTQUN6RTtRQUNEO1lBQ0UsRUFBRSxFQUFFLG1CQUFtQjtZQUN2QixNQUFNLEVBQUUsZ0VBQWdFO1NBQ3pFO0tBQ0YsQ0FBQyxDQUFDO0lBRUgsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQztBQUM3QixDQUFDO0FBN0ZELG9EQTZGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGVjMiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjMlwiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyBzYWdlbWFrZXIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zYWdlbWFrZXJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5cbmltcG9ydCB7IENvbnRhaW5lckltYWdlcyB9IGZyb20gXCIuL2NvbnRhaW5lci1pbWFnZXNcIjtcbmltcG9ydCB7IEltYWdlUmVwb3NpdG9yeU1hcHBpbmcgfSBmcm9tIFwiLi9pbWFnZS1yZXBvc2l0b3J5LW1hcHBpbmdcIjtcbmltcG9ydCB7IFNhZ2VNYWtlck1vZGVsUHJvcHMsIE1vZGVsQ29udGFpbmVyQ29uZmlnIH0gZnJvbSBcIi4vdHlwZXNcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXBsb3lDb250YWluZXJNb2RlbChcbiAgc2NvcGU6IENvbnN0cnVjdCxcbiAgcHJvcHM6IFNhZ2VNYWtlck1vZGVsUHJvcHMsXG4gIG1vZGVsQ29uZmlnOiBNb2RlbENvbnRhaW5lckNvbmZpZ1xuKSB7XG4gIGNvbnN0IHsgcmVnaW9uIH0gPSBwcm9wcztcbiAgY29uc3Qge1xuICAgIG1vZGVsSWQsXG4gICAgaW5zdGFuY2VUeXBlLFxuICAgIGNvbnRhaW5lclN0YXJ0dXBIZWFsdGhDaGVja1RpbWVvdXRJblNlY29uZHMgPSA5MDAsXG4gICAgZW52ID0ge30sXG4gIH0gPSBtb2RlbENvbmZpZztcblxuICBjb25zdCBleGVjdXRpb25Sb2xlID0gbmV3IGlhbS5Sb2xlKHNjb3BlLCBcIlNhZ2VNYWtlckV4ZWN1dGlvblJvbGVcIiwge1xuICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKFwic2FnZW1ha2VyLmFtYXpvbmF3cy5jb21cIiksXG4gICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoXCJBbWF6b25TYWdlTWFrZXJGdWxsQWNjZXNzXCIpLFxuICAgIF0sXG4gIH0pO1xuXG4gIGNvbnN0IGNvbnRhaW5lckltYWdlID1cbiAgICBtb2RlbENvbmZpZy5jb250YWluZXIgfHxcbiAgICBDb250YWluZXJJbWFnZXMuSEZfUFlUT1JDSF9MTE1fVEdJX0lORkVSRU5DRV9MQVRFU1Q7XG4gIGNvbnN0IGltYWdlTWFwcGluZyA9IG5ldyBJbWFnZVJlcG9zaXRvcnlNYXBwaW5nKFxuICAgIHNjb3BlLFxuICAgIFwiQ29udGFpbmVyTW9kZWxNYXBwaW5nXCIsXG4gICAgeyByZWdpb24gfVxuICApO1xuICBjb25zdCBpbWFnZSA9IGAke2ltYWdlTWFwcGluZy5hY2NvdW50fS5ka3IuZWNyLiR7cmVnaW9ufS5hbWF6b25hd3MuY29tLyR7Y29udGFpbmVySW1hZ2V9YDtcblxuICBjb25zdCBtb2RlbFByb3BzID0ge1xuICAgIHByaW1hcnlDb250YWluZXI6IHtcbiAgICAgIGltYWdlLFxuICAgICAgbW9kZTogXCJTaW5nbGVNb2RlbFwiLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU0FHRU1BS0VSX0NPTlRBSU5FUl9MT0dfTEVWRUw6IFwiMjBcIixcbiAgICAgICAgU0FHRU1BS0VSX1JFR0lPTjogcmVnaW9uLFxuICAgICAgICBIRl9NT0RFTF9JRDogbW9kZWxJZCxcbiAgICAgICAgLi4uZW52LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xuXG4gIGNvbnN0IG1vZGVsID0gbmV3IHNhZ2VtYWtlci5DZm5Nb2RlbChzY29wZSwgXCJNb2RlbFwiLCB7XG4gICAgZXhlY3V0aW9uUm9sZUFybjogZXhlY3V0aW9uUm9sZS5yb2xlQXJuLFxuICAgIC4uLm1vZGVsUHJvcHMsXG4gICAgdnBjQ29uZmlnOiB7XG4gICAgICBzZWN1cml0eUdyb3VwSWRzOiBbcHJvcHMudnBjLnZwY0RlZmF1bHRTZWN1cml0eUdyb3VwXSxcbiAgICAgIHN1Ym5ldHM6IHByb3BzLnZwYy5wcml2YXRlU3VibmV0cy5tYXAoKHN1Ym5ldCkgPT4gc3VibmV0LnN1Ym5ldElkKSxcbiAgICB9LFxuICB9KTtcblxuICBjb25zdCBlbmRwb2ludENvbmZpZyA9IG5ldyBzYWdlbWFrZXIuQ2ZuRW5kcG9pbnRDb25maWcoXG4gICAgc2NvcGUsXG4gICAgXCJFbmRwb2ludENvbmZpZ1wiLFxuICAgIHtcbiAgICAgIHByb2R1Y3Rpb25WYXJpYW50czogW1xuICAgICAgICB7XG4gICAgICAgICAgaW5zdGFuY2VUeXBlLFxuICAgICAgICAgIGluaXRpYWxWYXJpYW50V2VpZ2h0OiAxLFxuICAgICAgICAgIGluaXRpYWxJbnN0YW5jZUNvdW50OiAxLFxuICAgICAgICAgIHZhcmlhbnROYW1lOiBcIkFsbFRyYWZmaWNcIixcbiAgICAgICAgICBtb2RlbE5hbWU6IG1vZGVsLmdldEF0dChcIk1vZGVsTmFtZVwiKS50b1N0cmluZygpLFxuICAgICAgICAgIGNvbnRhaW5lclN0YXJ0dXBIZWFsdGhDaGVja1RpbWVvdXRJblNlY29uZHMsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH1cbiAgKTtcblxuICBlbmRwb2ludENvbmZpZy5hZGREZXBlbmRlbmN5KG1vZGVsKTtcblxuICBjb25zdCBlbmRwb2ludCA9IG5ldyBzYWdlbWFrZXIuQ2ZuRW5kcG9pbnQoc2NvcGUsIG1vZGVsSWQsIHtcbiAgICBlbmRwb2ludENvbmZpZ05hbWU6IGVuZHBvaW50Q29uZmlnLmdldEF0dChcIkVuZHBvaW50Q29uZmlnTmFtZVwiKS50b1N0cmluZygpLFxuICAgIGVuZHBvaW50TmFtZTogbW9kZWxJZC5zcGxpdChcIi9cIikuam9pbihcIi1cIikuc3BsaXQoXCIuXCIpLmpvaW4oXCItXCIpLFxuICB9KTtcblxuICBlbmRwb2ludC5hZGREZXBlbmRlbmN5KGVuZHBvaW50Q29uZmlnKTtcblxuICAvKipcbiAgICogQ0RLIE5BRyBzdXBwcmVzc2lvblxuICAgKi9cbiAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKGV4ZWN1dGlvblJvbGUsIFtcbiAgICB7XG4gICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgcmVhc29uOiBcIkdpdmVzIHVzZXIgYWJpbGl0eSB0byBkZXBsb3kgYW5kIGRlbGV0ZSBlbmRwb2ludHMgZnJvbSB0aGUgVUkuXCIsXG4gICAgfSxcbiAgICB7XG4gICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgcmVhc29uOiBcIkdpdmVzIHVzZXIgYWJpbGl0eSB0byBkZXBsb3kgYW5kIGRlbGV0ZSBlbmRwb2ludHMgZnJvbSB0aGUgVUkuXCIsXG4gICAgfSxcbiAgXSk7XG5cbiAgcmV0dXJuIHsgbW9kZWwsIGVuZHBvaW50IH07XG59XG4iXX0=