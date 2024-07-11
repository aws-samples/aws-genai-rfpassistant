"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Shared = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const lambda = require("aws-cdk-lib/aws-lambda");
const secretsmanager = require("aws-cdk-lib/aws-secretsmanager");
const ssm = require("aws-cdk-lib/aws-ssm");
const logs = require("aws-cdk-lib/aws-logs");
const constructs_1 = require("constructs");
const path = require("path");
const layer_1 = require("../layer");
const types_1 = require("./types");
const shared_asset_bundler_1 = require("./shared-asset-bundler");
const cdk_nag_1 = require("cdk-nag");
const pythonRuntime = lambda.Runtime.PYTHON_3_11;
const lambdaArchitecture = lambda.Architecture.X86_64;
process.env.DOCKER_DEFAULT_PLATFORM = lambdaArchitecture.dockerPlatform;
class Shared extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        this.pythonRuntime = pythonRuntime;
        this.lambdaArchitecture = lambdaArchitecture;
        const powerToolsLayerVersion = "46";
        this.defaultEnvironmentVariables = {
            POWERTOOLS_DEV: "false",
            LOG_LEVEL: "INFO",
            POWERTOOLS_LOGGER_LOG_EVENT: "true",
            POWERTOOLS_SERVICE_NAME: "chatbot",
        };
        let vpc;
        if (!props.config.vpc?.vpcId) {
            vpc = new ec2.Vpc(this, "VPC", {
                natGateways: 1,
                restrictDefaultSecurityGroup: false,
                subnetConfiguration: [
                    {
                        name: "public",
                        subnetType: ec2.SubnetType.PUBLIC,
                    },
                    {
                        name: "private",
                        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    },
                    {
                        name: "isolated",
                        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    },
                ],
            });
            const logGroup = new logs.LogGroup(this, "FLowLogsLogGroup", {
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            });
            new ec2.FlowLog(this, "FlowLog", {
                resourceType: ec2.FlowLogResourceType.fromVpc(vpc),
                destination: ec2.FlowLogDestination.toCloudWatchLogs(logGroup),
            });
        }
        else {
            vpc = ec2.Vpc.fromLookup(this, "VPC", {
                vpcId: props.config.vpc.vpcId,
            });
        }
        if (typeof props.config.vpc?.createVpcEndpoints === "undefined" ||
            props.config.vpc?.createVpcEndpoints === true) {
            // Create a VPC endpoint for S3.
            const s3GatewayEndpoint = vpc.addGatewayEndpoint("S3GatewayEndpoint", {
                service: ec2.GatewayVpcEndpointAwsService.S3,
            });
            const s3vpcEndpoint = vpc.addInterfaceEndpoint("S3InterfaceEndpoint", {
                service: ec2.InterfaceVpcEndpointAwsService.S3,
                privateDnsEnabled: true,
                open: true,
            });
            this.s3vpcEndpoint = s3vpcEndpoint;
            s3vpcEndpoint.node.addDependency(s3GatewayEndpoint);
            // Create a VPC endpoint for DynamoDB.
            vpc.addGatewayEndpoint("DynamoDBEndpoint", {
                service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
            });
            // Create VPC Endpoint for Secrets Manager
            vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
                service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
                open: true,
            });
            // Create VPC Endpoint for SageMaker Runtime
            vpc.addInterfaceEndpoint("SageMakerRuntimeEndpoint", {
                service: ec2.InterfaceVpcEndpointAwsService.SAGEMAKER_RUNTIME,
                open: true,
            });
            if (props.config.privateWebsite) {
                // Create VPC Endpoint for AppSync
                vpc.addInterfaceEndpoint("AppSyncEndpoint", {
                    service: ec2.InterfaceVpcEndpointAwsService.APP_SYNC,
                });
                // Create VPC Endpoint for Lambda
                vpc.addInterfaceEndpoint("LambdaEndpoint", {
                    service: ec2.InterfaceVpcEndpointAwsService.LAMBDA,
                });
                // Create VPC Endpoint for SNS
                vpc.addInterfaceEndpoint("SNSEndpoint", {
                    service: ec2.InterfaceVpcEndpointAwsService.SNS,
                });
                // Create VPC Endpoint for Step Functions
                vpc.addInterfaceEndpoint("StepFunctionsEndpoint", {
                    service: ec2.InterfaceVpcEndpointAwsService.STEP_FUNCTIONS,
                });
                // Create VPC Endpoint for SSM
                vpc.addInterfaceEndpoint("SSMEndpoint", {
                    service: ec2.InterfaceVpcEndpointAwsService.SSM,
                });
                // Create VPC Endpoint for KMS
                vpc.addInterfaceEndpoint("KMSEndpoint", {
                    service: ec2.InterfaceVpcEndpointAwsService.KMS,
                });
                // Create VPC Endpoint for Bedrock
                if (props.config.bedrock?.enabled && Object.values(types_1.SupportedBedrockRegion).some(val => val === cdk.Stack.of(this).region)) {
                    if (props.config.bedrock?.region !== cdk.Stack.of(this).region) {
                        throw new Error(`Bedrock is only supported in the same region as the stack when using private website (Bedrock region: ${props.config.bedrock?.region}, Stack region: ${cdk.Stack.of(this).region}).`);
                    }
                    vpc.addInterfaceEndpoint("BedrockEndpoint", {
                        service: new ec2.InterfaceVpcEndpointService('com.amazonaws.' + cdk.Aws.REGION + '.bedrock-runtime', 443),
                        privateDnsEnabled: true
                    });
                }
                // Create VPC Endpoint for Kendra
                if (props.config.rag.engines.kendra.enabled) {
                    vpc.addInterfaceEndpoint("KendraEndpoint", {
                        service: ec2.InterfaceVpcEndpointAwsService.KENDRA,
                    });
                }
                // Create VPC Endpoint for RDS/Aurora
                if (props.config.rag.engines.aurora.enabled) {
                    vpc.addInterfaceEndpoint("RDSEndpoint", {
                        service: ec2.InterfaceVpcEndpointAwsService.RDS,
                    });
                    // Create VPC Endpoint for RDS Data
                    vpc.addInterfaceEndpoint("RDSDataEndpoint", {
                        service: ec2.InterfaceVpcEndpointAwsService.RDS_DATA,
                    });
                }
                // Create VPC Endpoints needed for Aurora & Opensearch Indexing
                if (props.config.rag.engines.aurora.enabled ||
                    props.config.rag.engines.opensearch.enabled) {
                    // Create VPC Endpoint for ECS
                    vpc.addInterfaceEndpoint("ECSEndpoint", {
                        service: ec2.InterfaceVpcEndpointAwsService.ECS,
                    });
                    // Create VPC Endpoint for Batch
                    vpc.addInterfaceEndpoint("BatchEndpoint", {
                        service: ec2.InterfaceVpcEndpointAwsService.BATCH,
                    });
                    // Create VPC Endpoint for EC2
                    vpc.addInterfaceEndpoint("EC2Endpoint", {
                        service: ec2.InterfaceVpcEndpointAwsService.EC2,
                    });
                }
            }
        }
        const configParameter = new ssm.StringParameter(this, "Config", {
            stringValue: JSON.stringify(props.config),
        });
        let companyName = "DefaultCompany";
        if (props.config.companyName) {
            companyName = props.config.companyName;
        }
        const companyParameter = new ssm.StringParameter(this, "CompanyName", {
            stringValue: companyName,
        });
        const powerToolsArn = lambdaArchitecture === lambda.Architecture.X86_64
            ? `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:017000801446:layer:AWSLambdaPowertoolsPythonV2:${powerToolsLayerVersion}`
            : `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:017000801446:layer:AWSLambdaPowertoolsPythonV2-Arm64:${powerToolsLayerVersion}`;
        const powerToolsLayer = lambda.LayerVersion.fromLayerVersionArn(this, "PowertoolsLayer", powerToolsArn);
        const commonLayer = new layer_1.Layer(this, "CommonLayer", {
            runtime: pythonRuntime,
            architecture: lambdaArchitecture,
            path: path.join(__dirname, "./layers/common"),
        });
        this.sharedCode = new shared_asset_bundler_1.SharedAssetBundler(this, "genai-core", [
            path.join(__dirname, "layers", "python-sdk", "python", "genai_core"),
        ]);
        const xOriginVerifySecret = new secretsmanager.Secret(this, "X-Origin-Verify-Secret", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            generateSecretString: {
                excludePunctuation: true,
                generateStringKey: "headerValue",
                secretStringTemplate: "{}",
            },
        });
        const apiKeysSecret = new secretsmanager.Secret(this, "ApiKeysSecret", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            secretObjectValue: {},
        });
        this.vpc = vpc;
        this.configParameter = configParameter;
        this.companyParameter = companyParameter;
        this.xOriginVerifySecret = xOriginVerifySecret;
        this.apiKeysSecret = apiKeysSecret;
        this.powerToolsLayer = powerToolsLayer;
        this.commonLayer = commonLayer.layer;
        new cdk.CfnOutput(this, "ApiKeysSecretName", {
            value: apiKeysSecret.secretName,
        });
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(xOriginVerifySecret, [
            { id: "AwsSolutions-SMG4", reason: "Secret is generated by CDK." },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(apiKeysSecret, [
            { id: "AwsSolutions-SMG4", reason: "Secret value is blank." },
        ]);
    }
}
exports.Shared = Shared;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsMkNBQTJDO0FBQzNDLGlEQUFpRDtBQUNqRCxpRUFBaUU7QUFDakUsMkNBQTJDO0FBQzNDLDZDQUE2QztBQUM3QywyQ0FBdUM7QUFDdkMsNkJBQTZCO0FBQzdCLG9DQUFpQztBQUNqQyxtQ0FBK0Q7QUFDL0QsaUVBQTREO0FBQzVELHFDQUEwQztBQUUxQyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztBQUNqRCxNQUFNLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDO0FBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEdBQUcsa0JBQWtCLENBQUMsY0FBYyxDQUFDO0FBTXhFLE1BQWEsTUFBTyxTQUFRLHNCQUFTO0lBY25DLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDMUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQVZWLGtCQUFhLEdBQW1CLGFBQWEsQ0FBQztRQUM5Qyx1QkFBa0IsR0FBd0Isa0JBQWtCLENBQUM7UUFXcEUsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUM7UUFFcEMsSUFBSSxDQUFDLDJCQUEyQixHQUFHO1lBQ2pDLGNBQWMsRUFBRSxPQUFPO1lBQ3ZCLFNBQVMsRUFBRSxNQUFNO1lBQ2pCLDJCQUEyQixFQUFFLE1BQU07WUFDbkMsdUJBQXVCLEVBQUUsU0FBUztTQUNuQyxDQUFDO1FBRUYsSUFBSSxHQUFZLENBQUM7UUFDakIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRTtZQUM1QixHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7Z0JBQzdCLFdBQVcsRUFBRSxDQUFDO2dCQUNkLDRCQUE0QixFQUFFLEtBQUs7Z0JBQ25DLG1CQUFtQixFQUFFO29CQUNuQjt3QkFDRSxJQUFJLEVBQUUsUUFBUTt3QkFDZCxVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNO3FCQUNsQztvQkFDRDt3QkFDRSxJQUFJLEVBQUUsU0FBUzt3QkFDZixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxtQkFBbUI7cUJBQy9DO29CQUNEO3dCQUNFLElBQUksRUFBRSxVQUFVO3dCQUNoQixVQUFVLEVBQUUsR0FBRyxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0I7cUJBQzVDO2lCQUNGO2FBQ0YsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtnQkFDM0QsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTzthQUN6QyxDQUFDLENBQUM7WUFDSCxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRTtnQkFDL0IsWUFBWSxFQUFFLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUNsRCxXQUFXLEVBQUUsR0FBRyxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQzthQUMvRCxDQUFDLENBQUM7U0FDSjthQUFNO1lBQ0wsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7Z0JBQ3BDLEtBQUssRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLO2FBQzlCLENBQVksQ0FBQztTQUNmO1FBRUQsSUFDRSxPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLGtCQUFrQixLQUFLLFdBQVc7WUFDM0QsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsa0JBQWtCLEtBQUssSUFBSSxFQUM3QztZQUNBLGdDQUFnQztZQUNoQyxNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxtQkFBbUIsRUFBRTtnQkFDcEUsT0FBTyxFQUFFLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFO2FBQzdDLENBQUMsQ0FBQztZQUVILE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxxQkFBcUIsRUFBRTtnQkFDcEUsT0FBTyxFQUFFLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxFQUFFO2dCQUM5QyxpQkFBaUIsRUFBRSxJQUFJO2dCQUN2QixJQUFJLEVBQUUsSUFBSTthQUNYLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1lBRW5DLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFFcEQsc0NBQXNDO1lBQ3RDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsRUFBRTtnQkFDekMsT0FBTyxFQUFFLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxRQUFRO2FBQ25ELENBQUMsQ0FBQztZQUVILDBDQUEwQztZQUMxQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLEVBQUU7Z0JBQ2pELE9BQU8sRUFBRSxHQUFHLENBQUMsOEJBQThCLENBQUMsZUFBZTtnQkFDM0QsSUFBSSxFQUFFLElBQUk7YUFDWCxDQUFDLENBQUM7WUFFSCw0Q0FBNEM7WUFDNUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLDBCQUEwQixFQUFFO2dCQUNuRCxPQUFPLEVBQUUsR0FBRyxDQUFDLDhCQUE4QixDQUFDLGlCQUFpQjtnQkFDN0QsSUFBSSxFQUFFLElBQUk7YUFDWCxDQUFDLENBQUM7WUFFSCxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFO2dCQUMvQixrQ0FBa0M7Z0JBQ2xDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsRUFBRTtvQkFDeEMsT0FBTyxFQUFFLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxRQUFRO2lCQUN2RCxDQUFDLENBQUM7Z0JBRUgsaUNBQWlDO2dCQUNqQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUU7b0JBQ3ZDLE9BQU8sRUFBRSxHQUFHLENBQUMsOEJBQThCLENBQUMsTUFBTTtpQkFDckQsQ0FBQyxDQUFDO2dCQUVILDhCQUE4QjtnQkFDOUIsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRTtvQkFDcEMsT0FBTyxFQUFFLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHO2lCQUNsRCxDQUFDLENBQUM7Z0JBRUgseUNBQXlDO2dCQUN6QyxHQUFHLENBQUMsb0JBQW9CLENBQUMsdUJBQXVCLEVBQUU7b0JBQzlDLE9BQU8sRUFBRSxHQUFHLENBQUMsOEJBQThCLENBQUMsY0FBYztpQkFDN0QsQ0FBQyxDQUFDO2dCQUVILDhCQUE4QjtnQkFDOUIsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRTtvQkFDcEMsT0FBTyxFQUFFLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHO2lCQUNsRCxDQUFDLENBQUM7Z0JBRUgsOEJBQThCO2dCQUM5QixHQUFHLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFO29CQUNwQyxPQUFPLEVBQUUsR0FBRyxDQUFDLDhCQUE4QixDQUFDLEdBQUc7aUJBQ2xELENBQUMsQ0FBQztnQkFFSCxrQ0FBa0M7Z0JBQ2xDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsT0FBTyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsOEJBQXNCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUM7b0JBQ3hILElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRTt3QkFDOUQsTUFBTSxJQUFJLEtBQUssQ0FBQyx5R0FBeUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQztxQkFDeE07b0JBQ0QsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQixFQUFFO3dCQUMxQyxPQUFPLEVBQUUsSUFBSSxHQUFHLENBQUMsMkJBQTJCLENBQUMsZ0JBQWdCLEdBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUMsa0JBQWtCLEVBQUUsR0FBRyxDQUFDO3dCQUNyRyxpQkFBaUIsRUFBRSxJQUFJO3FCQUN4QixDQUFDLENBQUM7aUJBQ0o7Z0JBRUQsaUNBQWlDO2dCQUNqQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFDO29CQUMxQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUU7d0JBQ3ZDLE9BQU8sRUFBRSxHQUFHLENBQUMsOEJBQThCLENBQUMsTUFBTTtxQkFDckQsQ0FBQyxDQUFDO2lCQUNKO2dCQUVELHFDQUFxQztnQkFDckMsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRTtvQkFDM0MsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRTt3QkFDcEMsT0FBTyxFQUFFLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxHQUFHO3FCQUNsRCxDQUFDLENBQUM7b0JBRUgsbUNBQW1DO29CQUNuQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCLEVBQUU7d0JBQ3hDLE9BQU8sRUFBRSxHQUFHLENBQUMsOEJBQThCLENBQUMsUUFBUTtxQkFDdkQsQ0FBQyxDQUFDO2lCQUNKO2dCQUVELCtEQUErRDtnQkFDL0QsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU87b0JBQ3pDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFO29CQUM3Qyw4QkFBOEI7b0JBQzlCLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLEVBQUU7d0JBQ3BDLE9BQU8sRUFBRSxHQUFHLENBQUMsOEJBQThCLENBQUMsR0FBRztxQkFDbEQsQ0FBQyxDQUFDO29CQUVILGdDQUFnQztvQkFDaEMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGVBQWUsRUFBRTt3QkFDdEMsT0FBTyxFQUFFLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxLQUFLO3FCQUNwRCxDQUFDLENBQUM7b0JBRUgsOEJBQThCO29CQUM5QixHQUFHLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFO3dCQUNwQyxPQUFPLEVBQUUsR0FBRyxDQUFDLDhCQUE4QixDQUFDLEdBQUc7cUJBQ2xELENBQUMsQ0FBQztpQkFDSjthQUNGO1NBQ0Y7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRTtZQUM5RCxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO1NBQzFDLENBQUMsQ0FBQztRQUVILElBQUksV0FBVyxHQUFHLGdCQUFnQixDQUFBO1FBQ2xDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUU7WUFDNUIsV0FBVyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFBO1NBQ3ZDO1FBR0QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNwRSxXQUFXLEVBQUUsV0FBVztTQUN6QixDQUFDLENBQUE7UUFHRixNQUFNLGFBQWEsR0FDakIsa0JBQWtCLEtBQUssTUFBTSxDQUFDLFlBQVksQ0FBQyxNQUFNO1lBQy9DLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxXQUFXLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxtREFBbUQsc0JBQXNCLEVBQUU7WUFDOUgsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLFdBQVcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLHlEQUF5RCxzQkFBc0IsRUFBRSxDQUFDO1FBRXpJLE1BQU0sZUFBZSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQzdELElBQUksRUFDSixpQkFBaUIsRUFDakIsYUFBYSxDQUNkLENBQUM7UUFFRixNQUFNLFdBQVcsR0FBRyxJQUFJLGFBQUssQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ2pELE9BQU8sRUFBRSxhQUFhO1lBQ3RCLFlBQVksRUFBRSxrQkFBa0I7WUFDaEMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGlCQUFpQixDQUFDO1NBQzlDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSx5Q0FBa0IsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQzNELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFlBQVksQ0FBQztTQUNyRSxDQUFDLENBQUM7UUFFSCxNQUFNLG1CQUFtQixHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FDbkQsSUFBSSxFQUNKLHdCQUF3QixFQUN4QjtZQUNFLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsb0JBQW9CLEVBQUU7Z0JBQ3BCLGtCQUFrQixFQUFFLElBQUk7Z0JBQ3hCLGlCQUFpQixFQUFFLGFBQWE7Z0JBQ2hDLG9CQUFvQixFQUFFLElBQUk7YUFDM0I7U0FDRixDQUNGLENBQUM7UUFFRixNQUFNLGFBQWEsR0FBRyxJQUFJLGNBQWMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUNyRSxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLEVBQUU7U0FDdEIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN2QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7UUFDekMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLG1CQUFtQixDQUFDO1FBQy9DLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDO1FBQ25DLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQztRQUVyQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzNDLEtBQUssRUFBRSxhQUFhLENBQUMsVUFBVTtTQUNoQyxDQUFDLENBQUM7UUFFSDs7V0FFRztRQUNILHlCQUFlLENBQUMsdUJBQXVCLENBQUMsbUJBQW1CLEVBQUU7WUFDM0QsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLDZCQUE2QixFQUFFO1NBQ25FLENBQUMsQ0FBQztRQUNILHlCQUFlLENBQUMsdUJBQXVCLENBQUMsYUFBYSxFQUFFO1lBQ3JELEVBQUUsRUFBRSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSx3QkFBd0IsRUFBRTtTQUM5RCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE3UEQsd0JBNlBDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXJcIjtcbmltcG9ydCAqIGFzIHNzbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNzbVwiO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxvZ3NcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBMYXllciB9IGZyb20gXCIuLi9sYXllclwiO1xuaW1wb3J0IHsgU3lzdGVtQ29uZmlnLCBTdXBwb3J0ZWRCZWRyb2NrUmVnaW9uIH0gZnJvbSBcIi4vdHlwZXNcIjtcbmltcG9ydCB7IFNoYXJlZEFzc2V0QnVuZGxlciB9IGZyb20gXCIuL3NoYXJlZC1hc3NldC1idW5kbGVyXCI7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuXG5jb25zdCBweXRob25SdW50aW1lID0gbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTE7XG5jb25zdCBsYW1iZGFBcmNoaXRlY3R1cmUgPSBsYW1iZGEuQXJjaGl0ZWN0dXJlLlg4Nl82NDtcbnByb2Nlc3MuZW52LkRPQ0tFUl9ERUZBVUxUX1BMQVRGT1JNID0gbGFtYmRhQXJjaGl0ZWN0dXJlLmRvY2tlclBsYXRmb3JtO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNoYXJlZFByb3BzIHtcbiAgcmVhZG9ubHkgY29uZmlnOiBTeXN0ZW1Db25maWc7XG59XG5cbmV4cG9ydCBjbGFzcyBTaGFyZWQgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICByZWFkb25seSB2cGM6IGVjMi5WcGM7XG4gIHJlYWRvbmx5IGRlZmF1bHRFbnZpcm9ubWVudFZhcmlhYmxlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgcmVhZG9ubHkgY29uZmlnUGFyYW1ldGVyOiBzc20uU3RyaW5nUGFyYW1ldGVyO1xuICByZWFkb25seSBjb21wYW55UGFyYW1ldGVyOiBzc20uU3RyaW5nUGFyYW1ldGVyO1xuICByZWFkb25seSBweXRob25SdW50aW1lOiBsYW1iZGEuUnVudGltZSA9IHB5dGhvblJ1bnRpbWU7XG4gIHJlYWRvbmx5IGxhbWJkYUFyY2hpdGVjdHVyZTogbGFtYmRhLkFyY2hpdGVjdHVyZSA9IGxhbWJkYUFyY2hpdGVjdHVyZTtcbiAgcmVhZG9ubHkgeE9yaWdpblZlcmlmeVNlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xuICByZWFkb25seSBhcGlLZXlzU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XG4gIHJlYWRvbmx5IGNvbW1vbkxheWVyOiBsYW1iZGEuSUxheWVyVmVyc2lvbjtcbiAgcmVhZG9ubHkgcG93ZXJUb29sc0xheWVyOiBsYW1iZGEuSUxheWVyVmVyc2lvbjtcbiAgcmVhZG9ubHkgc2hhcmVkQ29kZTogU2hhcmVkQXNzZXRCdW5kbGVyO1xuICByZWFkb25seSBzM3ZwY0VuZHBvaW50OiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnQ7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFNoYXJlZFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHBvd2VyVG9vbHNMYXllclZlcnNpb24gPSBcIjQ2XCI7XG5cbiAgICB0aGlzLmRlZmF1bHRFbnZpcm9ubWVudFZhcmlhYmxlcyA9IHtcbiAgICAgIFBPV0VSVE9PTFNfREVWOiBcImZhbHNlXCIsXG4gICAgICBMT0dfTEVWRUw6IFwiSU5GT1wiLFxuICAgICAgUE9XRVJUT09MU19MT0dHRVJfTE9HX0VWRU5UOiBcInRydWVcIixcbiAgICAgIFBPV0VSVE9PTFNfU0VSVklDRV9OQU1FOiBcImNoYXRib3RcIixcbiAgICB9O1xuXG4gICAgbGV0IHZwYzogZWMyLlZwYztcbiAgICBpZiAoIXByb3BzLmNvbmZpZy52cGM/LnZwY0lkKSB7XG4gICAgICB2cGMgPSBuZXcgZWMyLlZwYyh0aGlzLCBcIlZQQ1wiLCB7XG4gICAgICAgIG5hdEdhdGV3YXlzOiAxLFxuICAgICAgICByZXN0cmljdERlZmF1bHRTZWN1cml0eUdyb3VwOiBmYWxzZSxcbiAgICAgICAgc3VibmV0Q29uZmlndXJhdGlvbjogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6IFwicHVibGljXCIsXG4gICAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QVUJMSUMsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcInByaXZhdGVcIixcbiAgICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBuYW1lOiBcImlzb2xhdGVkXCIsXG4gICAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgXCJGTG93TG9nc0xvZ0dyb3VwXCIsIHtcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIH0pO1xuICAgICAgbmV3IGVjMi5GbG93TG9nKHRoaXMsIFwiRmxvd0xvZ1wiLCB7XG4gICAgICAgIHJlc291cmNlVHlwZTogZWMyLkZsb3dMb2dSZXNvdXJjZVR5cGUuZnJvbVZwYyh2cGMpLFxuICAgICAgICBkZXN0aW5hdGlvbjogZWMyLkZsb3dMb2dEZXN0aW5hdGlvbi50b0Nsb3VkV2F0Y2hMb2dzKGxvZ0dyb3VwKSxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB2cGMgPSBlYzIuVnBjLmZyb21Mb29rdXAodGhpcywgXCJWUENcIiwge1xuICAgICAgICB2cGNJZDogcHJvcHMuY29uZmlnLnZwYy52cGNJZCxcbiAgICAgIH0pIGFzIGVjMi5WcGM7XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgdHlwZW9mIHByb3BzLmNvbmZpZy52cGM/LmNyZWF0ZVZwY0VuZHBvaW50cyA9PT0gXCJ1bmRlZmluZWRcIiB8fFxuICAgICAgcHJvcHMuY29uZmlnLnZwYz8uY3JlYXRlVnBjRW5kcG9pbnRzID09PSB0cnVlXG4gICAgKSB7XG4gICAgICAvLyBDcmVhdGUgYSBWUEMgZW5kcG9pbnQgZm9yIFMzLlxuICAgICAgY29uc3QgczNHYXRld2F5RW5kcG9pbnQgPSB2cGMuYWRkR2F0ZXdheUVuZHBvaW50KFwiUzNHYXRld2F5RW5kcG9pbnRcIiwge1xuICAgICAgICBzZXJ2aWNlOiBlYzIuR2F0ZXdheVZwY0VuZHBvaW50QXdzU2VydmljZS5TMyxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBzM3ZwY0VuZHBvaW50ID0gdnBjLmFkZEludGVyZmFjZUVuZHBvaW50KFwiUzNJbnRlcmZhY2VFbmRwb2ludFwiLCB7XG4gICAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuUzMsXG4gICAgICAgIHByaXZhdGVEbnNFbmFibGVkOiB0cnVlLFxuICAgICAgICBvcGVuOiB0cnVlLFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHRoaXMuczN2cGNFbmRwb2ludCA9IHMzdnBjRW5kcG9pbnQ7XG5cbiAgICAgIHMzdnBjRW5kcG9pbnQubm9kZS5hZGREZXBlbmRlbmN5KHMzR2F0ZXdheUVuZHBvaW50KTtcblxuICAgICAgLy8gQ3JlYXRlIGEgVlBDIGVuZHBvaW50IGZvciBEeW5hbW9EQi5cbiAgICAgIHZwYy5hZGRHYXRld2F5RW5kcG9pbnQoXCJEeW5hbW9EQkVuZHBvaW50XCIsIHtcbiAgICAgICAgc2VydmljZTogZWMyLkdhdGV3YXlWcGNFbmRwb2ludEF3c1NlcnZpY2UuRFlOQU1PREIsXG4gICAgICB9KTtcblxuICAgICAgLy8gQ3JlYXRlIFZQQyBFbmRwb2ludCBmb3IgU2VjcmV0cyBNYW5hZ2VyXG4gICAgICB2cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoXCJTZWNyZXRzTWFuYWdlckVuZHBvaW50XCIsIHtcbiAgICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5TRUNSRVRTX01BTkFHRVIsXG4gICAgICAgIG9wZW46IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgLy8gQ3JlYXRlIFZQQyBFbmRwb2ludCBmb3IgU2FnZU1ha2VyIFJ1bnRpbWVcbiAgICAgIHZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludChcIlNhZ2VNYWtlclJ1bnRpbWVFbmRwb2ludFwiLCB7XG4gICAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuU0FHRU1BS0VSX1JVTlRJTUUsXG4gICAgICAgIG9wZW46IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgaWYgKHByb3BzLmNvbmZpZy5wcml2YXRlV2Vic2l0ZSkge1xuICAgICAgICAvLyBDcmVhdGUgVlBDIEVuZHBvaW50IGZvciBBcHBTeW5jXG4gICAgICAgIHZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludChcIkFwcFN5bmNFbmRwb2ludFwiLCB7XG4gICAgICAgICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLkFQUF9TWU5DLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgVlBDIEVuZHBvaW50IGZvciBMYW1iZGFcbiAgICAgICAgdnBjLmFkZEludGVyZmFjZUVuZHBvaW50KFwiTGFtYmRhRW5kcG9pbnRcIiwge1xuICAgICAgICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5MQU1CREEsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZSBWUEMgRW5kcG9pbnQgZm9yIFNOU1xuICAgICAgICB2cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoXCJTTlNFbmRwb2ludFwiLCB7XG4gICAgICAgICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlNOUyxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIFZQQyBFbmRwb2ludCBmb3IgU3RlcCBGdW5jdGlvbnNcbiAgICAgICAgdnBjLmFkZEludGVyZmFjZUVuZHBvaW50KFwiU3RlcEZ1bmN0aW9uc0VuZHBvaW50XCIsIHtcbiAgICAgICAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuU1RFUF9GVU5DVElPTlMsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENyZWF0ZSBWUEMgRW5kcG9pbnQgZm9yIFNTTVxuICAgICAgICB2cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoXCJTU01FbmRwb2ludFwiLCB7XG4gICAgICAgICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLlNTTSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIFZQQyBFbmRwb2ludCBmb3IgS01TXG4gICAgICAgIHZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludChcIktNU0VuZHBvaW50XCIsIHtcbiAgICAgICAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuS01TLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDcmVhdGUgVlBDIEVuZHBvaW50IGZvciBCZWRyb2NrXG4gICAgICAgIGlmIChwcm9wcy5jb25maWcuYmVkcm9jaz8uZW5hYmxlZCAmJiBPYmplY3QudmFsdWVzKFN1cHBvcnRlZEJlZHJvY2tSZWdpb24pLnNvbWUodmFsID0+IHZhbCA9PT0gY2RrLlN0YWNrLm9mKHRoaXMpLnJlZ2lvbikpe1xuICAgICAgICAgIGlmIChwcm9wcy5jb25maWcuYmVkcm9jaz8ucmVnaW9uICE9PSBjZGsuU3RhY2sub2YodGhpcykucmVnaW9uKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEJlZHJvY2sgaXMgb25seSBzdXBwb3J0ZWQgaW4gdGhlIHNhbWUgcmVnaW9uIGFzIHRoZSBzdGFjayB3aGVuIHVzaW5nIHByaXZhdGUgd2Vic2l0ZSAoQmVkcm9jayByZWdpb246ICR7cHJvcHMuY29uZmlnLmJlZHJvY2s/LnJlZ2lvbn0sIFN0YWNrIHJlZ2lvbjogJHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufSkuYCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludChcIkJlZHJvY2tFbmRwb2ludFwiLCB7XG4gICAgICAgICAgICBzZXJ2aWNlOiBuZXcgZWMyLkludGVyZmFjZVZwY0VuZHBvaW50U2VydmljZSgnY29tLmFtYXpvbmF3cy4nK2Nkay5Bd3MuUkVHSU9OKycuYmVkcm9jay1ydW50aW1lJywgNDQzKSxcbiAgICAgICAgICAgIHByaXZhdGVEbnNFbmFibGVkOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgVlBDIEVuZHBvaW50IGZvciBLZW5kcmFcbiAgICAgICAgaWYgKHByb3BzLmNvbmZpZy5yYWcuZW5naW5lcy5rZW5kcmEuZW5hYmxlZCl7XG4gICAgICAgICAgdnBjLmFkZEludGVyZmFjZUVuZHBvaW50KFwiS2VuZHJhRW5kcG9pbnRcIiwge1xuICAgICAgICAgICAgICBzZXJ2aWNlOiBlYzIuSW50ZXJmYWNlVnBjRW5kcG9pbnRBd3NTZXJ2aWNlLktFTkRSQSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBWUEMgRW5kcG9pbnQgZm9yIFJEUy9BdXJvcmFcbiAgICAgICAgaWYgKHByb3BzLmNvbmZpZy5yYWcuZW5naW5lcy5hdXJvcmEuZW5hYmxlZCkge1xuICAgICAgICAgIHZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludChcIlJEU0VuZHBvaW50XCIsIHtcbiAgICAgICAgICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5SRFMsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICAvLyBDcmVhdGUgVlBDIEVuZHBvaW50IGZvciBSRFMgRGF0YVxuICAgICAgICAgIHZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludChcIlJEU0RhdGFFbmRwb2ludFwiLCB7XG4gICAgICAgICAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuUkRTX0RBVEEsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgVlBDIEVuZHBvaW50cyBuZWVkZWQgZm9yIEF1cm9yYSAmIE9wZW5zZWFyY2ggSW5kZXhpbmdcbiAgICAgICAgaWYgKHByb3BzLmNvbmZpZy5yYWcuZW5naW5lcy5hdXJvcmEuZW5hYmxlZCB8fFxuICAgICAgICAgIHByb3BzLmNvbmZpZy5yYWcuZW5naW5lcy5vcGVuc2VhcmNoLmVuYWJsZWQpIHtcbiAgICAgICAgICAvLyBDcmVhdGUgVlBDIEVuZHBvaW50IGZvciBFQ1NcbiAgICAgICAgICB2cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoXCJFQ1NFbmRwb2ludFwiLCB7XG4gICAgICAgICAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuRUNTLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgLy8gQ3JlYXRlIFZQQyBFbmRwb2ludCBmb3IgQmF0Y2hcbiAgICAgICAgICB2cGMuYWRkSW50ZXJmYWNlRW5kcG9pbnQoXCJCYXRjaEVuZHBvaW50XCIsIHtcbiAgICAgICAgICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5CQVRDSCxcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIENyZWF0ZSBWUEMgRW5kcG9pbnQgZm9yIEVDMlxuICAgICAgICAgIHZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludChcIkVDMkVuZHBvaW50XCIsIHtcbiAgICAgICAgICAgICAgc2VydmljZTogZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5FQzIsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBjb25zdCBjb25maWdQYXJhbWV0ZXIgPSBuZXcgc3NtLlN0cmluZ1BhcmFtZXRlcih0aGlzLCBcIkNvbmZpZ1wiLCB7XG4gICAgICBzdHJpbmdWYWx1ZTogSlNPTi5zdHJpbmdpZnkocHJvcHMuY29uZmlnKSxcbiAgICB9KTtcbiAgICBcbiAgICBsZXQgY29tcGFueU5hbWUgPSBcIkRlZmF1bHRDb21wYW55XCJcbiAgICBpZiAocHJvcHMuY29uZmlnLmNvbXBhbnlOYW1lKSB7XG4gICAgICBjb21wYW55TmFtZSA9IHByb3BzLmNvbmZpZy5jb21wYW55TmFtZVxuICAgIH1cbiAgICBcbiAgICBcbiAgICBjb25zdCBjb21wYW55UGFyYW1ldGVyID0gbmV3IHNzbS5TdHJpbmdQYXJhbWV0ZXIodGhpcywgXCJDb21wYW55TmFtZVwiLCB7XG4gICAgICBzdHJpbmdWYWx1ZTogY29tcGFueU5hbWUsXG4gICAgfSlcblxuXG4gICAgY29uc3QgcG93ZXJUb29sc0FybiA9XG4gICAgICBsYW1iZGFBcmNoaXRlY3R1cmUgPT09IGxhbWJkYS5BcmNoaXRlY3R1cmUuWDg2XzY0XG4gICAgICAgID8gYGFybjoke2Nkay5Bd3MuUEFSVElUSU9OfTpsYW1iZGE6JHtjZGsuQXdzLlJFR0lPTn06MDE3MDAwODAxNDQ2OmxheWVyOkFXU0xhbWJkYVBvd2VydG9vbHNQeXRob25WMjoke3Bvd2VyVG9vbHNMYXllclZlcnNpb259YFxuICAgICAgICA6IGBhcm46JHtjZGsuQXdzLlBBUlRJVElPTn06bGFtYmRhOiR7Y2RrLkF3cy5SRUdJT059OjAxNzAwMDgwMTQ0NjpsYXllcjpBV1NMYW1iZGFQb3dlcnRvb2xzUHl0aG9uVjItQXJtNjQ6JHtwb3dlclRvb2xzTGF5ZXJWZXJzaW9ufWA7XG5cbiAgICBjb25zdCBwb3dlclRvb2xzTGF5ZXIgPSBsYW1iZGEuTGF5ZXJWZXJzaW9uLmZyb21MYXllclZlcnNpb25Bcm4oXG4gICAgICB0aGlzLFxuICAgICAgXCJQb3dlcnRvb2xzTGF5ZXJcIixcbiAgICAgIHBvd2VyVG9vbHNBcm5cbiAgICApO1xuXG4gICAgY29uc3QgY29tbW9uTGF5ZXIgPSBuZXcgTGF5ZXIodGhpcywgXCJDb21tb25MYXllclwiLCB7XG4gICAgICBydW50aW1lOiBweXRob25SdW50aW1lLFxuICAgICAgYXJjaGl0ZWN0dXJlOiBsYW1iZGFBcmNoaXRlY3R1cmUsXG4gICAgICBwYXRoOiBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4vbGF5ZXJzL2NvbW1vblwiKSxcbiAgICB9KTtcblxuICAgIHRoaXMuc2hhcmVkQ29kZSA9IG5ldyBTaGFyZWRBc3NldEJ1bmRsZXIodGhpcywgXCJnZW5haS1jb3JlXCIsIFtcbiAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsIFwibGF5ZXJzXCIsIFwicHl0aG9uLXNka1wiLCBcInB5dGhvblwiLCBcImdlbmFpX2NvcmVcIiksXG4gICAgXSk7XG5cbiAgICBjb25zdCB4T3JpZ2luVmVyaWZ5U2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldChcbiAgICAgIHRoaXMsXG4gICAgICBcIlgtT3JpZ2luLVZlcmlmeS1TZWNyZXRcIixcbiAgICAgIHtcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgICAgICBleGNsdWRlUHVuY3R1YXRpb246IHRydWUsXG4gICAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6IFwiaGVhZGVyVmFsdWVcIixcbiAgICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogXCJ7fVwiLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBhcGlLZXlzU2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCBcIkFwaUtleXNTZWNyZXRcIiwge1xuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIHNlY3JldE9iamVjdFZhbHVlOiB7fSxcbiAgICB9KTtcblxuICAgIHRoaXMudnBjID0gdnBjO1xuICAgIHRoaXMuY29uZmlnUGFyYW1ldGVyID0gY29uZmlnUGFyYW1ldGVyO1xuICAgIHRoaXMuY29tcGFueVBhcmFtZXRlciA9IGNvbXBhbnlQYXJhbWV0ZXI7XG4gICAgdGhpcy54T3JpZ2luVmVyaWZ5U2VjcmV0ID0geE9yaWdpblZlcmlmeVNlY3JldDtcbiAgICB0aGlzLmFwaUtleXNTZWNyZXQgPSBhcGlLZXlzU2VjcmV0O1xuICAgIHRoaXMucG93ZXJUb29sc0xheWVyID0gcG93ZXJUb29sc0xheWVyO1xuICAgIHRoaXMuY29tbW9uTGF5ZXIgPSBjb21tb25MYXllci5sYXllcjtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiQXBpS2V5c1NlY3JldE5hbWVcIiwge1xuICAgICAgdmFsdWU6IGFwaUtleXNTZWNyZXQuc2VjcmV0TmFtZSxcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIENESyBOQUcgc3VwcHJlc3Npb25cbiAgICAgKi9cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoeE9yaWdpblZlcmlmeVNlY3JldCwgW1xuICAgICAgeyBpZDogXCJBd3NTb2x1dGlvbnMtU01HNFwiLCByZWFzb246IFwiU2VjcmV0IGlzIGdlbmVyYXRlZCBieSBDREsuXCIgfSxcbiAgICBdKTtcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoYXBpS2V5c1NlY3JldCwgW1xuICAgICAgeyBpZDogXCJBd3NTb2x1dGlvbnMtU01HNFwiLCByZWFzb246IFwiU2VjcmV0IHZhbHVlIGlzIGJsYW5rLlwiIH0sXG4gICAgXSk7XG4gIH1cbn1cbiJdfQ==