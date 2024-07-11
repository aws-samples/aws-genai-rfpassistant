"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HuggingFaceCustomScriptModel = void 0;
const path = require("path");
const cdk = require("aws-cdk-lib");
const codebuild = require("aws-cdk-lib/aws-codebuild");
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const sagemaker = require("aws-cdk-lib/aws-sagemaker");
const cr = require("aws-cdk-lib/custom-resources");
const constructs_1 = require("constructs");
const cdk_nag_1 = require("cdk-nag");
const container_images_1 = require("../container-images");
const image_repository_mapping_1 = require("../image-repository-mapping");
class HuggingFaceCustomScriptModel extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { region, instanceType, container, codeFolder, codeBuildComputeType, env, } = props;
        const modelId = Array.isArray(props.modelId)
            ? props.modelId.join(",")
            : props.modelId;
        const logsBucket = new s3.Bucket(this, "LogsBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const buildBucket = new s3.Bucket(this, "Bucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            enforceSSL: true,
            serverAccessLogsBucket: logsBucket,
            autoDeleteObjects: true,
        });
        // Upload build code to S3
        new s3deploy.BucketDeployment(this, "Script", {
            sources: [s3deploy.Source.asset(path.join(__dirname, "./build-script"))],
            retainOnDelete: false,
            destinationBucket: buildBucket,
            destinationKeyPrefix: "build-script",
        });
        let deployment;
        // Upload model folder to S3
        if (codeFolder) {
            deployment = new s3deploy.BucketDeployment(this, "ModelCode", {
                sources: [s3deploy.Source.asset(codeFolder)],
                retainOnDelete: false,
                destinationBucket: buildBucket,
                destinationKeyPrefix: "model-code",
            });
        }
        // CodeBuild role
        const codeBuildRole = new iam.Role(this, "CodeBuildRole", {
            assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
            inlinePolicies: {
                CodeBuildPolicy: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            actions: [
                                "logs:CreateLogGroup",
                                "logs:CreateLogStream",
                                "logs:PutLogEvents",
                            ],
                            resources: ["*"],
                        }),
                    ],
                }),
            },
        });
        const buildspec = codebuild.BuildSpec.fromObject({
            version: "0.2",
            phases: {
                install: {
                    commands: [
                        'echo "Updating system packages..."',
                        "apt-get update",
                        'echo "Installing tar, pigz, awscli, virtualenv, python3-pip, and python3-dev..."',
                        "apt-get install -y tar pigz awscli virtualenv python3-pip python3-dev",
                        'echo "Updating pip..."',
                        "pip3 install --upgrade pip",
                    ],
                },
                pre_build: {
                    commands: [
                        'echo "Downloading build code from S3..."',
                        "aws s3 cp s3://$BUILD_BUCKET/build-script ./build --recursive",
                        'echo "Downloading model from S3..."',
                        "aws s3 cp s3://$BUILD_BUCKET/model-code ./model --recursive",
                        "ls -al",
                        "ls -al ./build",
                        "ls -al ./model",
                        "COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)",
                        "IMAGE_TAG=${COMMIT_HASH:=latest}",
                    ],
                },
                build: {
                    commands: [
                        'echo "Installing Python requirements..."',
                        "pip3 install -r build/requirements.txt --upgrade",
                        'echo "Running script.py..."',
                        "python3 build/script.py",
                    ],
                },
            },
        });
        // CodeBuild project
        const codeBuildProject = new codebuild.Project(this, "CodeBuildProject", {
            buildSpec: buildspec,
            role: codeBuildRole,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
                privileged: true,
                computeType: codeBuildComputeType ?? codebuild.ComputeType.LARGE,
            },
            environmentVariables: {
                MODEL_ID: {
                    value: modelId,
                },
                BUILD_BUCKET: {
                    value: buildBucket.bucketName,
                },
                HF_HUB_ENABLE_HF_TRANSFER: {
                    value: "1",
                },
                HF_HUB_DISABLE_PROGRESS_BARS: {
                    value: "1",
                },
                HF_HUB_DISABLE_TELEMETRY: {
                    value: "1",
                },
            },
        });
        if (codeFolder && deployment) {
            codeBuildProject.node.addDependency(deployment);
        }
        buildBucket.grantReadWrite(codeBuildProject.grantPrincipal);
        // custom resource lamdba handlers
        const onEventHandler = new lambda.Function(this, "OnEventHandler", {
            runtime: lambda.Runtime.PYTHON_3_11,
            architecture: lambda.Architecture.ARM_64,
            code: lambda.Code.fromAsset(path.join(__dirname, "./build-function")),
            handler: "index.on_event",
        });
        // grant the lambda role permissions to start the build
        onEventHandler.addToRolePolicy(new iam.PolicyStatement({
            actions: ["codebuild:StartBuild"],
            resources: [codeBuildProject.projectArn],
        }));
        // custom resource lamdba handlers
        const isCompleteHandler = new lambda.Function(this, "IsCompleteHandler", {
            runtime: lambda.Runtime.PYTHON_3_11,
            architecture: lambda.Architecture.ARM_64,
            code: lambda.Code.fromAsset(path.join(__dirname, "./build-function")),
            handler: "index.is_complete",
        });
        // grant the lambda role permissions to BatchGetBuilds
        isCompleteHandler.addToRolePolicy(new iam.PolicyStatement({
            actions: ["codebuild:BatchGetBuilds"],
            resources: [codeBuildProject.projectArn],
        }));
        // create a custom resource to start build and wait for it to complete
        const provider = new cr.Provider(this, "Provider", {
            onEventHandler: onEventHandler,
            isCompleteHandler: isCompleteHandler,
            queryInterval: cdk.Duration.seconds(30),
            totalTimeout: cdk.Duration.minutes(120),
        });
        provider.node.addDependency(codeBuildProject);
        // run the custom resource to start the build
        const build = new cdk.CustomResource(this, "Build", {
            // removalPolicy: cdk.RemovalPolicy.DESTROY,
            serviceToken: provider.serviceToken,
            properties: {
                ProjectName: codeBuildProject.projectName,
            },
        });
        const executionRole = new iam.Role(this, "SageMakerExecutionRole", {
            assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
            ],
        });
        buildBucket.grantRead(executionRole);
        const containerImage = container || container_images_1.ContainerImages.HF_PYTORCH_INFERENCE_LATEST;
        const imageMapping = new image_repository_mapping_1.ImageRepositoryMapping(scope, "CustomScriptModelMapping", { region });
        const image = `${imageMapping.account}.dkr.ecr.${region}.amazonaws.com/${containerImage}`;
        const model = new sagemaker.CfnModel(this, "Model", {
            executionRoleArn: executionRole.roleArn,
            primaryContainer: {
                image,
                modelDataUrl: `s3://${buildBucket.bucketName}/out/model.tar.gz`,
                mode: "SingleModel",
                environment: {
                    SAGEMAKER_CONTAINER_LOG_LEVEL: "20",
                    SAGEMAKER_REGION: region,
                    ...env,
                },
            },
            /*       vpcConfig: {
              subnets: vpc.selectSubnets({
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
              }).subnetIds,
              securityGroupIds: [vpc.vpcDefaultSecurityGroup],
            }, */
        });
        model.node.addDependency(build);
        const endpointConfig = new sagemaker.CfnEndpointConfig(this, "EndpointConfig", {
            productionVariants: [
                {
                    instanceType,
                    initialVariantWeight: 1,
                    initialInstanceCount: 1,
                    variantName: "AllTraffic",
                    modelName: model.getAtt("ModelName").toString(),
                    containerStartupHealthCheckTimeoutInSeconds: 900,
                },
            ],
        });
        endpointConfig.addDependency(model);
        const endpoint = new sagemaker.CfnEndpoint(this, "Endpoint", {
            endpointConfigName: endpointConfig
                .getAtt("EndpointConfigName")
                .toString(),
        });
        endpoint.addDependency(endpointConfig);
        this.model = model;
        this.endpoint = endpoint;
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(codeBuildRole, [
            {
                id: "AwsSolutions-IAM5",
                reason: "Access to all log groups required for CloudWatch log group creation.",
            },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(codeBuildProject, [
            {
                id: "AwsSolutions-CB4",
                reason: "Build is only ran as part of stack creation and does not contain external data.",
            },
            {
                id: "AwsSolutions-CB3",
                reason: "Privileged mode is required as build project is used to build Docker images.",
            },
        ]);
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
        cdk_nag_1.NagSuppressions.addResourceSuppressions(logsBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "Logging bucket does not require it's own access logs.",
            },
        ]);
    }
}
exports.HuggingFaceCustomScriptModel = HuggingFaceCustomScriptModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsbUNBQW1DO0FBQ25DLHVEQUF1RDtBQUV2RCwyQ0FBMkM7QUFDM0MsaURBQWlEO0FBQ2pELHlDQUF5QztBQUN6QywwREFBMEQ7QUFDMUQsdURBQXVEO0FBQ3ZELG1EQUFtRDtBQUNuRCwyQ0FBdUM7QUFDdkMscUNBQTBDO0FBRTFDLDBEQUFzRDtBQUN0RCwwRUFBcUU7QUFlckUsTUFBYSw0QkFBNkIsU0FBUSxzQkFBUztJQUl6RCxZQUNFLEtBQWdCLEVBQ2hCLEVBQVUsRUFDVixLQUF3QztRQUV4QyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFDSixNQUFNLEVBQ04sWUFBWSxFQUNaLFNBQVMsRUFDVCxVQUFVLEVBQ1Ysb0JBQW9CLEVBQ3BCLEdBQUcsR0FDSixHQUFHLEtBQUssQ0FBQztRQUNWLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztZQUMxQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO1FBRWxCLE1BQU0sVUFBVSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ25ELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixVQUFVLEVBQUUsSUFBSTtTQUNqQixDQUFDLENBQUM7UUFFSCxNQUFNLFdBQVcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUNo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LENBQUMsYUFBYSxFQUFFO1lBQ3JEO2dCQUNFLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLE1BQU0sRUFDSixnRUFBZ0U7YUFDbkU7WUFDRDtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQ0osZ0VBQWdFO2FBQ25FO1NBQ0YsQ0FBQyxDQUFDO1FBQ0gseUJBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUU7WUFDbEQ7Z0JBQ0UsRUFBRSxFQUFFLGlCQUFpQjtnQkFDckIsTUFBTSxFQUFFLHVEQUF1RDthQUNoRTtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXBURCxvRUFvVEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBjb2RlYnVpbGQgZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2RlYnVpbGRcIjtcbmltcG9ydCAqIGFzIGVjMiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjMlwiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcbmltcG9ydCAqIGFzIHMzZGVwbG95IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczMtZGVwbG95bWVudFwiO1xuaW1wb3J0ICogYXMgc2FnZW1ha2VyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc2FnZW1ha2VyXCI7XG5pbXBvcnQgKiBhcyBjciBmcm9tIFwiYXdzLWNkay1saWIvY3VzdG9tLXJlc291cmNlc1wiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmltcG9ydCB7IENvbnRhaW5lckltYWdlcyB9IGZyb20gXCIuLi9jb250YWluZXItaW1hZ2VzXCI7XG5pbXBvcnQgeyBJbWFnZVJlcG9zaXRvcnlNYXBwaW5nIH0gZnJvbSBcIi4uL2ltYWdlLXJlcG9zaXRvcnktbWFwcGluZ1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEh1Z2dpbmdGYWNlQ3VzdG9tU2NyaXB0TW9kZWxQcm9wcyB7XG4gIHZwYzogZWMyLlZwYztcbiAgcmVnaW9uOiBzdHJpbmc7XG4gIGluc3RhbmNlVHlwZTogc3RyaW5nO1xuICBtb2RlbElkOiBzdHJpbmcgfCBzdHJpbmdbXTtcbiAgY29udGFpbmVyPzogc3RyaW5nO1xuICBjb2RlRm9sZGVyPzogc3RyaW5nO1xuICBjb2RlQnVpbGRDb21wdXRlVHlwZT86IGNvZGVidWlsZC5Db21wdXRlVHlwZTtcbiAgZW52PzogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfTtcbiAgYXJjaGl0ZWN0dXJlPzogbGFtYmRhLkFyY2hpdGVjdHVyZTtcbiAgcnVudGltZT86IGxhbWJkYS5SdW50aW1lO1xufVxuXG5leHBvcnQgY2xhc3MgSHVnZ2luZ0ZhY2VDdXN0b21TY3JpcHRNb2RlbCBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBtb2RlbDogc2FnZW1ha2VyLkNmbk1vZGVsO1xuICBwdWJsaWMgcmVhZG9ubHkgZW5kcG9pbnQ6IHNhZ2VtYWtlci5DZm5FbmRwb2ludDtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBzY29wZTogQ29uc3RydWN0LFxuICAgIGlkOiBzdHJpbmcsXG4gICAgcHJvcHM6IEh1Z2dpbmdGYWNlQ3VzdG9tU2NyaXB0TW9kZWxQcm9wc1xuICApIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3Qge1xuICAgICAgcmVnaW9uLFxuICAgICAgaW5zdGFuY2VUeXBlLFxuICAgICAgY29udGFpbmVyLFxuICAgICAgY29kZUZvbGRlcixcbiAgICAgIGNvZGVCdWlsZENvbXB1dGVUeXBlLFxuICAgICAgZW52LFxuICAgIH0gPSBwcm9wcztcbiAgICBjb25zdCBtb2RlbElkID0gQXJyYXkuaXNBcnJheShwcm9wcy5tb2RlbElkKVxuICAgICAgPyBwcm9wcy5tb2RlbElkLmpvaW4oXCIsXCIpXG4gICAgICA6IHByb3BzLm1vZGVsSWQ7XG5cbiAgICBjb25zdCBsb2dzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCBcIkxvZ3NCdWNrZXRcIiwge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBidWlsZEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgXCJCdWNrZXRcIiwge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgc2VydmVyQWNjZXNzTG9nc0J1Y2tldDogbG9nc0J1Y2tldCxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gVXBsb2FkIGJ1aWxkIGNvZGUgdG8gUzNcbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCBcIlNjcmlwdFwiLCB7XG4gICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi9idWlsZC1zY3JpcHRcIikpXSxcbiAgICAgIHJldGFpbk9uRGVsZXRlOiBmYWxzZSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiBidWlsZEJ1Y2tldCxcbiAgICAgIGRlc3RpbmF0aW9uS2V5UHJlZml4OiBcImJ1aWxkLXNjcmlwdFwiLFxuICAgIH0pO1xuXG4gICAgbGV0IGRlcGxveW1lbnQ7XG4gICAgLy8gVXBsb2FkIG1vZGVsIGZvbGRlciB0byBTM1xuICAgIGlmIChjb2RlRm9sZGVyKSB7XG4gICAgICBkZXBsb3ltZW50ID0gbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgXCJNb2RlbENvZGVcIiwge1xuICAgICAgICBzb3VyY2VzOiBbczNkZXBsb3kuU291cmNlLmFzc2V0KGNvZGVGb2xkZXIpXSxcbiAgICAgICAgcmV0YWluT25EZWxldGU6IGZhbHNlLFxuICAgICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogYnVpbGRCdWNrZXQsXG4gICAgICAgIGRlc3RpbmF0aW9uS2V5UHJlZml4OiBcIm1vZGVsLWNvZGVcIixcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIENvZGVCdWlsZCByb2xlXG4gICAgY29uc3QgY29kZUJ1aWxkUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCBcIkNvZGVCdWlsZFJvbGVcIiwge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoXCJjb2RlYnVpbGQuYW1hem9uYXdzLmNvbVwiKSxcbiAgICAgIGlubGluZVBvbGljaWVzOiB7XG4gICAgICAgIENvZGVCdWlsZFBvbGljeTogbmV3IGlhbS5Qb2xpY3lEb2N1bWVudCh7XG4gICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAgICAgXCJsb2dzOkNyZWF0ZUxvZ0dyb3VwXCIsXG4gICAgICAgICAgICAgICAgXCJsb2dzOkNyZWF0ZUxvZ1N0cmVhbVwiLFxuICAgICAgICAgICAgICAgIFwibG9nczpQdXRMb2dFdmVudHNcIixcbiAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgXSxcbiAgICAgICAgfSksXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgYnVpbGRzcGVjID0gY29kZWJ1aWxkLkJ1aWxkU3BlYy5mcm9tT2JqZWN0KHtcbiAgICAgIHZlcnNpb246IFwiMC4yXCIsXG4gICAgICBwaGFzZXM6IHtcbiAgICAgICAgaW5zdGFsbDoge1xuICAgICAgICAgIGNvbW1hbmRzOiBbXG4gICAgICAgICAgICAnZWNobyBcIlVwZGF0aW5nIHN5c3RlbSBwYWNrYWdlcy4uLlwiJyxcbiAgICAgICAgICAgIFwiYXB0LWdldCB1cGRhdGVcIixcbiAgICAgICAgICAgICdlY2hvIFwiSW5zdGFsbGluZyB0YXIsIHBpZ3osIGF3c2NsaSwgdmlydHVhbGVudiwgcHl0aG9uMy1waXAsIGFuZCBweXRob24zLWRldi4uLlwiJyxcbiAgICAgICAgICAgIFwiYXB0LWdldCBpbnN0YWxsIC15IHRhciBwaWd6IGF3c2NsaSB2aXJ0dWFsZW52IHB5dGhvbjMtcGlwIHB5dGhvbjMtZGV2XCIsXG4gICAgICAgICAgICAnZWNobyBcIlVwZGF0aW5nIHBpcC4uLlwiJyxcbiAgICAgICAgICAgIFwicGlwMyBpbnN0YWxsIC0tdXBncmFkZSBwaXBcIixcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwcmVfYnVpbGQ6IHtcbiAgICAgICAgICBjb21tYW5kczogW1xuICAgICAgICAgICAgJ2VjaG8gXCJEb3dubG9hZGluZyBidWlsZCBjb2RlIGZyb20gUzMuLi5cIicsXG4gICAgICAgICAgICBcImF3cyBzMyBjcCBzMzovLyRCVUlMRF9CVUNLRVQvYnVpbGQtc2NyaXB0IC4vYnVpbGQgLS1yZWN1cnNpdmVcIixcbiAgICAgICAgICAgICdlY2hvIFwiRG93bmxvYWRpbmcgbW9kZWwgZnJvbSBTMy4uLlwiJyxcbiAgICAgICAgICAgIFwiYXdzIHMzIGNwIHMzOi8vJEJVSUxEX0JVQ0tFVC9tb2RlbC1jb2RlIC4vbW9kZWwgLS1yZWN1cnNpdmVcIixcbiAgICAgICAgICAgIFwibHMgLWFsXCIsXG4gICAgICAgICAgICBcImxzIC1hbCAuL2J1aWxkXCIsXG4gICAgICAgICAgICBcImxzIC1hbCAuL21vZGVsXCIsXG4gICAgICAgICAgICBcIkNPTU1JVF9IQVNIPSQoZWNobyAkQ09ERUJVSUxEX1JFU09MVkVEX1NPVVJDRV9WRVJTSU9OIHwgY3V0IC1jIDEtNylcIixcbiAgICAgICAgICAgIFwiSU1BR0VfVEFHPSR7Q09NTUlUX0hBU0g6PWxhdGVzdH1cIixcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBidWlsZDoge1xuICAgICAgICAgIGNvbW1hbmRzOiBbXG4gICAgICAgICAgICAnZWNobyBcIkluc3RhbGxpbmcgUHl0aG9uIHJlcXVpcmVtZW50cy4uLlwiJyxcbiAgICAgICAgICAgIFwicGlwMyBpbnN0YWxsIC1yIGJ1aWxkL3JlcXVpcmVtZW50cy50eHQgLS11cGdyYWRlXCIsXG4gICAgICAgICAgICAnZWNobyBcIlJ1bm5pbmcgc2NyaXB0LnB5Li4uXCInLFxuICAgICAgICAgICAgXCJweXRob24zIGJ1aWxkL3NjcmlwdC5weVwiLFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gQ29kZUJ1aWxkIHByb2plY3RcbiAgICBjb25zdCBjb2RlQnVpbGRQcm9qZWN0ID0gbmV3IGNvZGVidWlsZC5Qcm9qZWN0KHRoaXMsIFwiQ29kZUJ1aWxkUHJvamVjdFwiLCB7XG4gICAgICBidWlsZFNwZWM6IGJ1aWxkc3BlYyxcbiAgICAgIHJvbGU6IGNvZGVCdWlsZFJvbGUsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBidWlsZEltYWdlOiBjb2RlYnVpbGQuTGludXhCdWlsZEltYWdlLlNUQU5EQVJEXzdfMCxcbiAgICAgICAgcHJpdmlsZWdlZDogdHJ1ZSxcbiAgICAgICAgY29tcHV0ZVR5cGU6IGNvZGVCdWlsZENvbXB1dGVUeXBlID8/IGNvZGVidWlsZC5Db21wdXRlVHlwZS5MQVJHRSxcbiAgICAgIH0sXG4gICAgICBlbnZpcm9ubWVudFZhcmlhYmxlczoge1xuICAgICAgICBNT0RFTF9JRDoge1xuICAgICAgICAgIHZhbHVlOiBtb2RlbElkLFxuICAgICAgICB9LFxuICAgICAgICBCVUlMRF9CVUNLRVQ6IHtcbiAgICAgICAgICB2YWx1ZTogYnVpbGRCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgfSxcbiAgICAgICAgSEZfSFVCX0VOQUJMRV9IRl9UUkFOU0ZFUjoge1xuICAgICAgICAgIHZhbHVlOiBcIjFcIixcbiAgICAgICAgfSxcbiAgICAgICAgSEZfSFVCX0RJU0FCTEVfUFJPR1JFU1NfQkFSUzoge1xuICAgICAgICAgIHZhbHVlOiBcIjFcIixcbiAgICAgICAgfSxcbiAgICAgICAgSEZfSFVCX0RJU0FCTEVfVEVMRU1FVFJZOiB7XG4gICAgICAgICAgdmFsdWU6IFwiMVwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGlmIChjb2RlRm9sZGVyICYmIGRlcGxveW1lbnQpIHtcbiAgICAgIGNvZGVCdWlsZFByb2plY3Qubm9kZS5hZGREZXBlbmRlbmN5KGRlcGxveW1lbnQpO1xuICAgIH1cblxuICAgIGJ1aWxkQnVja2V0LmdyYW50UmVhZFdyaXRlKGNvZGVCdWlsZFByb2plY3QuZ3JhbnRQcmluY2lwYWwpO1xuXG4gICAgLy8gY3VzdG9tIHJlc291cmNlIGxhbWRiYSBoYW5kbGVyc1xuICAgIGNvbnN0IG9uRXZlbnRIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcIk9uRXZlbnRIYW5kbGVyXCIsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzExLFxuICAgICAgYXJjaGl0ZWN0dXJlOiBsYW1iZGEuQXJjaGl0ZWN0dXJlLkFSTV82NCxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4vYnVpbGQtZnVuY3Rpb25cIikpLFxuICAgICAgaGFuZGxlcjogXCJpbmRleC5vbl9ldmVudFwiLFxuICAgIH0pO1xuXG4gICAgLy8gZ3JhbnQgdGhlIGxhbWJkYSByb2xlIHBlcm1pc3Npb25zIHRvIHN0YXJ0IHRoZSBidWlsZFxuICAgIG9uRXZlbnRIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1wiY29kZWJ1aWxkOlN0YXJ0QnVpbGRcIl0sXG4gICAgICAgIHJlc291cmNlczogW2NvZGVCdWlsZFByb2plY3QucHJvamVjdEFybl0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICAvLyBjdXN0b20gcmVzb3VyY2UgbGFtZGJhIGhhbmRsZXJzXG4gICAgY29uc3QgaXNDb21wbGV0ZUhhbmRsZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsIFwiSXNDb21wbGV0ZUhhbmRsZXJcIiwge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTEsXG4gICAgICBhcmNoaXRlY3R1cmU6IGxhbWJkYS5BcmNoaXRlY3R1cmUuQVJNXzY0LFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi9idWlsZC1mdW5jdGlvblwiKSksXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmlzX2NvbXBsZXRlXCIsXG4gICAgfSk7XG5cbiAgICAvLyBncmFudCB0aGUgbGFtYmRhIHJvbGUgcGVybWlzc2lvbnMgdG8gQmF0Y2hHZXRCdWlsZHNcbiAgICBpc0NvbXBsZXRlSGFuZGxlci5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcImNvZGVidWlsZDpCYXRjaEdldEJ1aWxkc1wiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbY29kZUJ1aWxkUHJvamVjdC5wcm9qZWN0QXJuXSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIGNyZWF0ZSBhIGN1c3RvbSByZXNvdXJjZSB0byBzdGFydCBidWlsZCBhbmQgd2FpdCBmb3IgaXQgdG8gY29tcGxldGVcbiAgICBjb25zdCBwcm92aWRlciA9IG5ldyBjci5Qcm92aWRlcih0aGlzLCBcIlByb3ZpZGVyXCIsIHtcbiAgICAgIG9uRXZlbnRIYW5kbGVyOiBvbkV2ZW50SGFuZGxlcixcbiAgICAgIGlzQ29tcGxldGVIYW5kbGVyOiBpc0NvbXBsZXRlSGFuZGxlcixcbiAgICAgIHF1ZXJ5SW50ZXJ2YWw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIHRvdGFsVGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTIwKSxcbiAgICB9KTtcbiAgICBwcm92aWRlci5ub2RlLmFkZERlcGVuZGVuY3koY29kZUJ1aWxkUHJvamVjdCk7XG5cbiAgICAvLyBydW4gdGhlIGN1c3RvbSByZXNvdXJjZSB0byBzdGFydCB0aGUgYnVpbGRcbiAgICBjb25zdCBidWlsZCA9IG5ldyBjZGsuQ3VzdG9tUmVzb3VyY2UodGhpcywgXCJCdWlsZFwiLCB7XG4gICAgICAvLyByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgc2VydmljZVRva2VuOiBwcm92aWRlci5zZXJ2aWNlVG9rZW4sXG4gICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgIFByb2plY3ROYW1lOiBjb2RlQnVpbGRQcm9qZWN0LnByb2plY3ROYW1lLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgXCJTYWdlTWFrZXJFeGVjdXRpb25Sb2xlXCIsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKFwic2FnZW1ha2VyLmFtYXpvbmF3cy5jb21cIiksXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKFwiQW1hem9uU2FnZU1ha2VyRnVsbEFjY2Vzc1wiKSxcbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICBidWlsZEJ1Y2tldC5ncmFudFJlYWQoZXhlY3V0aW9uUm9sZSk7XG5cbiAgICBjb25zdCBjb250YWluZXJJbWFnZSA9XG4gICAgICBjb250YWluZXIgfHwgQ29udGFpbmVySW1hZ2VzLkhGX1BZVE9SQ0hfSU5GRVJFTkNFX0xBVEVTVDtcbiAgICBjb25zdCBpbWFnZU1hcHBpbmcgPSBuZXcgSW1hZ2VSZXBvc2l0b3J5TWFwcGluZyhcbiAgICAgIHNjb3BlLFxuICAgICAgXCJDdXN0b21TY3JpcHRNb2RlbE1hcHBpbmdcIixcbiAgICAgIHsgcmVnaW9uIH1cbiAgICApO1xuICAgIGNvbnN0IGltYWdlID0gYCR7aW1hZ2VNYXBwaW5nLmFjY291bnR9LmRrci5lY3IuJHtyZWdpb259LmFtYXpvbmF3cy5jb20vJHtjb250YWluZXJJbWFnZX1gO1xuXG4gICAgY29uc3QgbW9kZWwgPSBuZXcgc2FnZW1ha2VyLkNmbk1vZGVsKHRoaXMsIFwiTW9kZWxcIiwge1xuICAgICAgZXhlY3V0aW9uUm9sZUFybjogZXhlY3V0aW9uUm9sZS5yb2xlQXJuLFxuICAgICAgcHJpbWFyeUNvbnRhaW5lcjoge1xuICAgICAgICBpbWFnZSxcbiAgICAgICAgbW9kZWxEYXRhVXJsOiBgczM6Ly8ke2J1aWxkQnVja2V0LmJ1Y2tldE5hbWV9L291dC9tb2RlbC50YXIuZ3pgLFxuICAgICAgICBtb2RlOiBcIlNpbmdsZU1vZGVsXCIsXG4gICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgU0FHRU1BS0VSX0NPTlRBSU5FUl9MT0dfTEVWRUw6IFwiMjBcIixcbiAgICAgICAgICBTQUdFTUFLRVJfUkVHSU9OOiByZWdpb24sXG4gICAgICAgICAgLi4uZW52LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIC8qICAgICAgIHZwY0NvbmZpZzoge1xuICAgICAgICBzdWJuZXRzOiB2cGMuc2VsZWN0U3VibmV0cyh7XG4gICAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURV9XSVRIX0VHUkVTUyxcbiAgICAgICAgfSkuc3VibmV0SWRzLFxuICAgICAgICBzZWN1cml0eUdyb3VwSWRzOiBbdnBjLnZwY0RlZmF1bHRTZWN1cml0eUdyb3VwXSxcbiAgICAgIH0sICovXG4gICAgfSk7XG5cbiAgICBtb2RlbC5ub2RlLmFkZERlcGVuZGVuY3koYnVpbGQpO1xuXG4gICAgY29uc3QgZW5kcG9pbnRDb25maWcgPSBuZXcgc2FnZW1ha2VyLkNmbkVuZHBvaW50Q29uZmlnKFxuICAgICAgdGhpcyxcbiAgICAgIFwiRW5kcG9pbnRDb25maWdcIixcbiAgICAgIHtcbiAgICAgICAgcHJvZHVjdGlvblZhcmlhbnRzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaW5zdGFuY2VUeXBlLFxuICAgICAgICAgICAgaW5pdGlhbFZhcmlhbnRXZWlnaHQ6IDEsXG4gICAgICAgICAgICBpbml0aWFsSW5zdGFuY2VDb3VudDogMSxcbiAgICAgICAgICAgIHZhcmlhbnROYW1lOiBcIkFsbFRyYWZmaWNcIixcbiAgICAgICAgICAgIG1vZGVsTmFtZTogbW9kZWwuZ2V0QXR0KFwiTW9kZWxOYW1lXCIpLnRvU3RyaW5nKCksXG4gICAgICAgICAgICBjb250YWluZXJTdGFydHVwSGVhbHRoQ2hlY2tUaW1lb3V0SW5TZWNvbmRzOiA5MDAsXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgZW5kcG9pbnRDb25maWcuYWRkRGVwZW5kZW5jeShtb2RlbCk7XG5cbiAgICBjb25zdCBlbmRwb2ludCA9IG5ldyBzYWdlbWFrZXIuQ2ZuRW5kcG9pbnQodGhpcywgXCJFbmRwb2ludFwiLCB7XG4gICAgICBlbmRwb2ludENvbmZpZ05hbWU6IGVuZHBvaW50Q29uZmlnXG4gICAgICAgIC5nZXRBdHQoXCJFbmRwb2ludENvbmZpZ05hbWVcIilcbiAgICAgICAgLnRvU3RyaW5nKCksXG4gICAgfSk7XG5cbiAgICBlbmRwb2ludC5hZGREZXBlbmRlbmN5KGVuZHBvaW50Q29uZmlnKTtcblxuICAgIHRoaXMubW9kZWwgPSBtb2RlbDtcbiAgICB0aGlzLmVuZHBvaW50ID0gZW5kcG9pbnQ7XG5cbiAgICAvKipcbiAgICAgKiBDREsgTkFHIHN1cHByZXNzaW9uXG4gICAgICovXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKGNvZGVCdWlsZFJvbGUsIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgcmVhc29uOlxuICAgICAgICAgIFwiQWNjZXNzIHRvIGFsbCBsb2cgZ3JvdXBzIHJlcXVpcmVkIGZvciBDbG91ZFdhdGNoIGxvZyBncm91cCBjcmVhdGlvbi5cIixcbiAgICAgIH0sXG4gICAgXSk7XG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKGNvZGVCdWlsZFByb2plY3QsIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUNCNFwiLFxuICAgICAgICByZWFzb246XG4gICAgICAgICAgXCJCdWlsZCBpcyBvbmx5IHJhbiBhcyBwYXJ0IG9mIHN0YWNrIGNyZWF0aW9uIGFuZCBkb2VzIG5vdCBjb250YWluIGV4dGVybmFsIGRhdGEuXCIsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtQ0IzXCIsXG4gICAgICAgIHJlYXNvbjpcbiAgICAgICAgICBcIlByaXZpbGVnZWQgbW9kZSBpcyByZXF1aXJlZCBhcyBidWlsZCBwcm9qZWN0IGlzIHVzZWQgdG8gYnVpbGQgRG9ja2VyIGltYWdlcy5cIixcbiAgICAgIH0sXG4gICAgXSk7XG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKGV4ZWN1dGlvblJvbGUsIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTRcIixcbiAgICAgICAgcmVhc29uOlxuICAgICAgICAgIFwiR2l2ZXMgdXNlciBhYmlsaXR5IHRvIGRlcGxveSBhbmQgZGVsZXRlIGVuZHBvaW50cyBmcm9tIHRoZSBVSS5cIixcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgIHJlYXNvbjpcbiAgICAgICAgICBcIkdpdmVzIHVzZXIgYWJpbGl0eSB0byBkZXBsb3kgYW5kIGRlbGV0ZSBlbmRwb2ludHMgZnJvbSB0aGUgVUkuXCIsXG4gICAgICB9LFxuICAgIF0pO1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhsb2dzQnVja2V0LCBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1TMVwiLFxuICAgICAgICByZWFzb246IFwiTG9nZ2luZyBidWNrZXQgZG9lcyBub3QgcmVxdWlyZSBpdCdzIG93biBhY2Nlc3MgbG9ncy5cIixcbiAgICAgIH0sXG4gICAgXSk7XG4gIH1cbn1cbiJdfQ==