"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdeficsInterface = void 0;
const cdk = require("aws-cdk-lib");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const ec2 = require("aws-cdk-lib/aws-ec2");
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const lambdaEventSources = require("aws-cdk-lib/aws-lambda-event-sources");
const logs = require("aws-cdk-lib/aws-logs");
const sqs = require("aws-cdk-lib/aws-sqs");
const constructs_1 = require("constructs");
const path = require("path");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const cdk_nag_1 = require("cdk-nag");
class IdeficsInterface extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const lambdaDurationInMinutes = 15;
        // Create a private API to serve images and other files from S3
        // in order to avoid using signed URLs and run out of input tokens
        // with the idefics model
        const vpcDefaultSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, "VPCDefaultSecurityGroup", props.shared.vpc.vpcDefaultSecurityGroup);
        const vpcEndpoint = props.shared.vpc.addInterfaceEndpoint("PrivateApiEndpoint", {
            service: ec2.InterfaceVpcEndpointAwsService.APIGATEWAY,
            privateDnsEnabled: true,
            open: true,
            securityGroups: [vpcDefaultSecurityGroup],
        });
        const logGroup = new logs.LogGroup(this, "ChatbotFilesPrivateApiAccessLogs", {
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        const api = new apigateway.RestApi(this, "ChatbotFilesPrivateApi", {
            deployOptions: {
                stageName: "prod",
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                tracingEnabled: true,
                metricsEnabled: true,
                accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields(),
            },
            cloudWatchRole: true,
            binaryMediaTypes: ["*/*"],
            endpointConfiguration: {
                types: [apigateway.EndpointType.PRIVATE],
                vpcEndpoints: [vpcEndpoint],
            },
            policy: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        actions: ["execute-api:Invoke"],
                        effect: iam.Effect.ALLOW,
                        resources: ["execute-api:/*/*/*"],
                        principals: [new iam.AnyPrincipal()],
                    }),
                    new iam.PolicyStatement({
                        actions: ["execute-api:Invoke"],
                        effect: iam.Effect.DENY,
                        resources: ["execute-api:/*/*/*"],
                        principals: [new iam.AnyPrincipal()],
                        conditions: {
                            StringNotEquals: {
                                "aws:SourceVpce": vpcEndpoint.vpcEndpointId,
                            },
                        },
                    }),
                ],
            }),
        });
        api.addRequestValidator("ValidateRequest", {
            requestValidatorName: "chatbot-files-private-api-validator",
            validateRequestBody: true,
            validateRequestParameters: true,
        });
        // Create an API Gateway resource that proxies to the S3 bucket:
        const integrationRole = new iam.Role(this, "S3IntegrationRole", {
            assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonAPIGatewayPushToCloudWatchLogs"),
            ],
        });
        integrationRole.addToPolicy(new iam.PolicyStatement({
            actions: ["s3:Get*", "s3:List*"],
            effect: iam.Effect.ALLOW,
            resources: [
                `${props.chatbotFilesBucket.bucketArn}/*`,
                `${props.chatbotFilesBucket.bucketArn}/*/*`,
            ],
        }));
        integrationRole.addToPolicy(new iam.PolicyStatement({
            actions: ["kms:Decrypt", "kms:ReEncryptFrom"],
            effect: iam.Effect.ALLOW,
            resources: ["arn:aws:kms:*"],
        }));
        const s3Integration = new apigateway.AwsIntegration({
            service: "s3",
            integrationHttpMethod: "GET",
            region: cdk.Aws.REGION,
            path: `${props.chatbotFilesBucket.bucketName}/public/{object}`,
            options: {
                credentialsRole: integrationRole,
                requestParameters: {
                    "integration.request.path.object": "method.request.path.object",
                },
                integrationResponses: [
                    {
                        statusCode: "200",
                        responseParameters: {
                            "method.response.header.Content-Type": "integration.response.header.Content-Type",
                        },
                    },
                ],
            },
        });
        const fileResource = api.root.addResource("{object}");
        fileResource.addMethod("ANY", s3Integration, {
            methodResponses: [
                {
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Content-Type": true,
                    },
                },
            ],
            requestParameters: {
                "method.request.path.object": true,
                "method.request.header.Content-Type": true,
            },
        });
        const requestHandler = new lambda.Function(this, "IdeficsInterfaceRequestHandler", {
            vpc: props.shared.vpc,
            code: props.shared.sharedCode.bundleWithLambdaAsset(path.join(__dirname, "./functions/request-handler")),
            runtime: props.shared.pythonRuntime,
            handler: "index.handler",
            layers: [props.shared.powerToolsLayer, props.shared.commonLayer],
            architecture: props.shared.lambdaArchitecture,
            tracing: lambda.Tracing.ACTIVE,
            timeout: cdk.Duration.minutes(lambdaDurationInMinutes),
            memorySize: 1024,
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
                ...props.shared.defaultEnvironmentVariables,
                CONFIG_PARAMETER_NAME: props.shared.configParameter.parameterName,
                SESSIONS_TABLE_NAME: props.sessionsTable.tableName,
                QUESTIONS_TABLE_NAME: props.questionsTable.tableName,
                QUESTIONS_BY_SESSION_INDEX_NAME: props.bySessionIdIndex,
                MESSAGES_TOPIC_ARN: props.messagesTopic.topicArn,
                CHATBOT_FILES_BUCKET_NAME: props.chatbotFilesBucket.bucketName,
                CHATBOT_FILES_PRIVATE_API: api.url,
            },
        });
        props.chatbotFilesBucket.grantRead(requestHandler);
        props.sessionsTable.grantReadWriteData(requestHandler);
        props.messagesTopic.grantPublish(requestHandler);
        props.shared.configParameter.grantRead(requestHandler);
        requestHandler.addToRolePolicy(new iam.PolicyStatement({
            actions: ["bedrock:InvokeModel"],
            resources: ["*"],
            effect: iam.Effect.ALLOW,
        }));
        const deadLetterQueue = new sqs.Queue(this, "DLQ", {
            enforceSSL: true,
        });
        const queue = new sqs.Queue(this, "Queue", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            // https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#events-sqs-queueconfig
            visibilityTimeout: cdk.Duration.minutes(lambdaDurationInMinutes * 6),
            enforceSSL: true,
            deadLetterQueue: {
                queue: deadLetterQueue,
                maxReceiveCount: 3,
            },
        });
        queue.addToResourcePolicy(new iam.PolicyStatement({
            actions: ["sqs:SendMessage"],
            resources: [queue.queueArn],
            principals: [
                new iam.ServicePrincipal("events.amazonaws.com"),
                new iam.ServicePrincipal("sqs.amazonaws.com"),
            ],
        }));
        requestHandler.addEventSource(new lambdaEventSources.SqsEventSource(queue));
        this.ingestionQueue = queue;
        this.requestHandler = requestHandler;
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(integrationRole, [
            {
                id: "AwsSolutions-IAM4",
                reason: "Access to all log groups required for CloudWatch log group creation.",
            },
            { id: "AwsSolutions-IAM5", reason: "Access limited to KMS resources." },
        ]);
    }
    addSageMakerEndpoint({ endpoint, name, }) {
        this.requestHandler.addToRolePolicy(new iam.PolicyStatement({
            actions: ["sagemaker:InvokeEndpoint"],
            resources: [endpoint.ref],
        }));
        const cleanName = name.replace(/[\s.\-_]/g, "").toUpperCase();
        this.requestHandler.addEnvironment(`SAGEMAKER_ENDPOINT_${cleanName}`, endpoint.attrEndpointName);
    }
}
exports.IdeficsInterface = IdeficsInterface;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMseURBQXlEO0FBRXpELDJDQUEyQztBQUMzQywyQ0FBMkM7QUFDM0MsaURBQWlEO0FBQ2pELDJFQUEyRTtBQUMzRSw2Q0FBNkM7QUFJN0MsMkNBQTJDO0FBQzNDLDJDQUF1QztBQUN2Qyw2QkFBNkI7QUFHN0IsNkNBQTRDO0FBQzVDLHFDQUEwQztBQVkxQyxNQUFhLGdCQUFpQixTQUFRLHNCQUFTO0lBSTdDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBNEI7UUFDcEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLHVCQUF1QixHQUFHLEVBQUUsQ0FBQztRQUVuQywrREFBK0Q7UUFDL0Qsa0VBQWtFO1FBQ2xFLHlCQUF5QjtRQUN6QixNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsbUJBQW1CLENBQ25FLElBQUksRUFDSix5QkFBeUIsRUFDekIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQ3pDLENBQUM7UUFFRixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FDdkQsb0JBQW9CLEVBQ3BCO1lBQ0UsT0FBTyxFQUFFLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxVQUFVO1lBQ3RELGlCQUFpQixFQUFFLElBQUk7WUFDdkIsSUFBSSxFQUFFLElBQUk7WUFDVixjQUFjLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQztTQUMxQyxDQUNGLENBQUM7UUFFRixNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQ2hDLElBQUksRUFDSixrQ0FBa0MsRUFDbEM7WUFDRSxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxPQUFPO1NBQ3JDLENBQ0YsQ0FBQztRQUVGLE1BQU0sR0FBRyxH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QUMsQ0FDSCxDQUFDO1FBRUYsY0FBYyxDQUFDLGNBQWMsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRTVFLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFDO1FBQzVCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBRXJDOztXQUVHO1FBQ0gseUJBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLEVBQUU7WUFDdkQ7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsTUFBTSxFQUNKLHNFQUFzRTthQUN6RTtZQUNELEVBQUUsRUFBRSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxrQ0FBa0MsRUFBRTtTQUN4RSxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU0sb0JBQW9CLENBQUMsRUFDMUIsUUFBUSxFQUNSLElBQUksR0FJTDtRQUNDLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUNqQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFLENBQUMsMEJBQTBCLENBQUM7WUFDckMsU0FBUyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQztTQUMxQixDQUFDLENBQ0gsQ0FBQztRQUNGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzlELElBQUksQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUNoQyxzQkFBc0IsU0FBUyxFQUFFLEVBQ2pDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FDMUIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXhQRCw0Q0F3UEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheVwiO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1keW5hbW9kYlwiO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYVwiO1xuaW1wb3J0ICogYXMgbGFtYmRhRXZlbnRTb3VyY2VzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLWV2ZW50LXNvdXJjZXNcIjtcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgeyBDZm5FbmRwb2ludCB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc2FnZW1ha2VyXCI7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zbnNcIjtcbmltcG9ydCAqIGFzIHNxcyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNxc1wiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcbmltcG9ydCB7IFNoYXJlZCB9IGZyb20gXCIuLi8uLi9zaGFyZWRcIjtcbmltcG9ydCB7IFN5c3RlbUNvbmZpZyB9IGZyb20gXCIuLi8uLi9zaGFyZWQvdHlwZXNcIjtcbmltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmludGVyZmFjZSBJZGVmaWNzSW50ZXJmYWNlUHJvcHMge1xuICByZWFkb25seSBzaGFyZWQ6IFNoYXJlZDtcbiAgcmVhZG9ubHkgY29uZmlnOiBTeXN0ZW1Db25maWc7XG4gIHJlYWRvbmx5IG1lc3NhZ2VzVG9waWM6IHNucy5Ub3BpYztcbiAgcmVhZG9ubHkgc2Vzc2lvbnNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHJlYWRvbmx5IHF1ZXN0aW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcmVhZG9ubHkgYnlTZXNzaW9uSWRJbmRleDogc3RyaW5nO1xuICByZWFkb25seSBjaGF0Ym90RmlsZXNCdWNrZXQ6IHMzLkJ1Y2tldDtcbn1cblxuZXhwb3J0IGNsYXNzIElkZWZpY3NJbnRlcmZhY2UgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgaW5nZXN0aW9uUXVldWU6IHNxcy5RdWV1ZTtcbiAgcHVibGljIHJlYWRvbmx5IHJlcXVlc3RIYW5kbGVyOiBsYW1iZGEuRnVuY3Rpb247XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IElkZWZpY3NJbnRlcmZhY2VQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBsYW1iZGFEdXJhdGlvbkluTWludXRlcyA9IDE1O1xuXG4gICAgLy8gQ3JlYXRlIGEgcHJpdmF0ZSBBUEkgdG8gc2VydmUgaW1hZ2VzIGFuZCBvdGhlciBmaWxlcyBmcm9tIFMzXG4gICAgLy8gaW4gb3JkZXIgdG8gYXZvaWQgdXNpbmcgc2lnbmVkIFVSTHMgYW5kIHJ1biBvdXQgb2YgaW5wdXQgdG9rZW5zXG4gICAgLy8gd2l0aCB0aGUgaWRlZmljcyBtb2RlbFxuICAgIGNvbnN0IHZwY0RlZmF1bHRTZWN1cml0eUdyb3VwID0gZWMyLlNlY3VyaXR5R3JvdXAuZnJvbVNlY3VyaXR5R3JvdXBJZChcbiAgICAgIHRoaXMsXG4gICAgICBcIlZQQ0RlZmF1bHRTZWN1cml0eUdyb3VwXCIsXG4gICAgICBwcm9wcy5zaGFyZWQudnBjLnZwY0RlZmF1bHRTZWN1cml0eUdyb3VwXG4gICAgKTtcblxuICAgIGNvbnN0IHZwY0VuZHBvaW50ID0gcHJvcHMuc2hhcmVkLnZwYy5hZGRJbnRlcmZhY2VFbmRwb2ludChcbiAgICAgIFwiUHJpdmF0ZUFwaUVuZHBvaW50XCIsXG4gICAgICB7XG4gICAgICAgIHNlcnZpY2U6IGVjMi5JbnRlcmZhY2VWcGNFbmRwb2ludEF3c1NlcnZpY2UuQVBJR0FURVdBWSxcbiAgICAgICAgcHJpdmF0ZURuc0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIG9wZW46IHRydWUsXG4gICAgICAgIHNlY3VyaXR5R3JvdXBzOiBbdnBjRGVmYXVsdFNlY3VyaXR5R3JvdXBdLFxuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKFxuICAgICAgdGhpcyxcbiAgICAgIFwiQ2hhdGJvdEZpbGVzUHJpdmF0ZUFwaUFjY2Vzc0xvZ3NcIixcbiAgICAgIHtcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsIFwiQ2hhdGJvdEZpbGVzUHJpdmF0ZUFwaVwiLCB7XG4gICAgICBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIHN0YWdlTmFtZTogXCJwcm9kXCIsXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcbiAgICAgICAgdHJhY2luZ0VuYWJsZWQ6IHRydWUsXG4gICAgICAgIG1ldHJpY3NFbmFibGVkOiB0cnVlLFxuICAgICAgICBhY2Nlc3NMb2dEZXN0aW5hdGlvbjogbmV3IGFwaWdhdGV3YXkuTG9nR3JvdXBMb2dEZXN0aW5hdGlvbihsb2dHcm91cCksXG4gICAgICAgIGFjY2Vzc0xvZ0Zvcm1hdDogYXBpZ2F0ZXdheS5BY2Nlc3NMb2dGb3JtYXQuanNvbldpdGhTdGFuZGFyZEZpZWxkcygpLFxuICAgICAgfSxcbiAgICAgIGNsb3VkV2F0Y2hSb2xlOiB0cnVlLFxuICAgICAgYmluYXJ5TWVkaWFUeXBlczogW1wiKi8qXCJdLFxuICAgICAgZW5kcG9pbnRDb25maWd1cmF0aW9uOiB7XG4gICAgICAgIHR5cGVzOiBbYXBpZ2F0ZXdheS5FbmRwb2ludFR5cGUuUFJJVkFURV0sXG4gICAgICAgIHZwY0VuZHBvaW50czogW3ZwY0VuZHBvaW50XSxcbiAgICAgIH0sXG4gICAgICBwb2xpY3k6IG5ldyBpYW0uUG9saWN5RG9jdW1lbnQoe1xuICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgYWN0aW9uczogW1wiZXhlY3V0ZS1hcGk6SW52b2tlXCJdLFxuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCJleGVjdXRlLWFwaTovKi8qLypcIl0sXG4gICAgICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGlhbS5BbnlQcmluY2lwYWwoKV0sXG4gICAgICAgICAgfSksXG4gICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgICAgYWN0aW9uczogW1wiZXhlY3V0ZS1hcGk6SW52b2tlXCJdLFxuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkRFTlksXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtcImV4ZWN1dGUtYXBpOi8qLyovKlwiXSxcbiAgICAgICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLkFueVByaW5jaXBhbCgpXSxcbiAgICAgICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICAgICAgU3RyaW5nTm90RXF1YWxzOiB7XG4gICAgICAgICAgICAgICAgXCJhd3M6U291cmNlVnBjZVwiOiB2cGNFbmRwb2ludC52cGNFbmRwb2ludElkLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KSxcbiAgICAgICAgXSxcbiAgICAgIH0pLFxuICAgIH0pO1xuXG4gICAgYXBpLmFkZFJlcXVlc3RWYWxpZGF0b3IoXCJWYWxpZGF0ZVJlcXVlc3RcIiwge1xuICAgICAgcmVxdWVzdFZhbGlkYXRvck5hbWU6IFwiY2hhdGJvdC1maWxlcy1wcml2YXRlLWFwaS12YWxpZGF0b3JcIixcbiAgICAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXG4gICAgICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIGFuIEFQSSBHYXRld2F5IHJlc291cmNlIHRoYXQgcHJveGllcyB0byB0aGUgUzMgYnVja2V0OlxuICAgIGNvbnN0IGludGVncmF0aW9uUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCBcIlMzSW50ZWdyYXRpb25Sb2xlXCIsIHtcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKFwiYXBpZ2F0ZXdheS5hbWF6b25hd3MuY29tXCIpLFxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZShcbiAgICAgICAgICBcInNlcnZpY2Utcm9sZS9BbWF6b25BUElHYXRld2F5UHVzaFRvQ2xvdWRXYXRjaExvZ3NcIlxuICAgICAgICApLFxuICAgICAgXSxcbiAgICB9KTtcbiAgICBpbnRlZ3JhdGlvblJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcInMzOkdldCpcIiwgXCJzMzpMaXN0KlwiXSxcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgJHtwcm9wcy5jaGF0Ym90RmlsZXNCdWNrZXQuYnVja2V0QXJufS8qYCxcbiAgICAgICAgICBgJHtwcm9wcy5jaGF0Ym90RmlsZXNCdWNrZXQuYnVja2V0QXJufS8qLypgLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuICAgIGludGVncmF0aW9uUm9sZS5hZGRUb1BvbGljeShcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgYWN0aW9uczogW1wia21zOkRlY3J5cHRcIiwgXCJrbXM6UmVFbmNyeXB0RnJvbVwiXSxcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICByZXNvdXJjZXM6IFtcImFybjphd3M6a21zOipcIl0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICBjb25zdCBzM0ludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuQXdzSW50ZWdyYXRpb24oe1xuICAgICAgc2VydmljZTogXCJzM1wiLFxuICAgICAgaW50ZWdyYXRpb25IdHRwTWV0aG9kOiBcIkdFVFwiLFxuICAgICAgcmVnaW9uOiBjZGsuQXdzLlJFR0lPTixcbiAgICAgIHBhdGg6IGAke3Byb3BzLmNoYXRib3RGaWxlc0J1Y2tldC5idWNrZXROYW1lfS9wdWJsaWMve29iamVjdH1gLFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBjcmVkZW50aWFsc1JvbGU6IGludGVncmF0aW9uUm9sZSxcbiAgICAgICAgcmVxdWVzdFBhcmFtZXRlcnM6IHtcbiAgICAgICAgICBcImludGVncmF0aW9uLnJlcXVlc3QucGF0aC5vYmplY3RcIjogXCJtZXRob2QucmVxdWVzdC5wYXRoLm9iamVjdFwiLFxuICAgICAgICB9LFxuICAgICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGU6IFwiMjAwXCIsXG4gICAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkNvbnRlbnQtVHlwZVwiOlxuICAgICAgICAgICAgICAgIFwiaW50ZWdyYXRpb24ucmVzcG9uc2UuaGVhZGVyLkNvbnRlbnQtVHlwZVwiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGZpbGVSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKFwie29iamVjdH1cIik7XG4gICAgZmlsZVJlc291cmNlLmFkZE1ldGhvZChcIkFOWVwiLCBzM0ludGVncmF0aW9uLCB7XG4gICAgICBtZXRob2RSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHN0YXR1c0NvZGU6IFwiMjAwXCIsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICBcIm1ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ29udGVudC1UeXBlXCI6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgICByZXF1ZXN0UGFyYW1ldGVyczoge1xuICAgICAgICBcIm1ldGhvZC5yZXF1ZXN0LnBhdGgub2JqZWN0XCI6IHRydWUsXG4gICAgICAgIFwibWV0aG9kLnJlcXVlc3QuaGVhZGVyLkNvbnRlbnQtVHlwZVwiOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlcXVlc3RIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbihcbiAgICAgIHRoaXMsXG4gICAgICBcIklkZWZpY3NJbnRlcmZhY2VSZXF1ZXN0SGFuZGxlclwiLFxuICAgICAge1xuICAgICAgICB2cGM6IHByb3BzLnNoYXJlZC52cGMsXG4gICAgICAgIGNvZGU6IHByb3BzLnNoYXJlZC5zaGFyZWRDb2RlLmJ1bmRsZVdpdGhMYW1iZGFBc3NldChcbiAgICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4vZnVuY3Rpb25zL3JlcXVlc3QtaGFuZGxlclwiKVxuICAgICAgICApLFxuICAgICAgICBydW50aW1lOiBwcm9wcy5zaGFyZWQucHl0aG9uUnVudGltZSxcbiAgICAgICAgaGFuZGxlcjogXCJpbmRleC5oYW5kbGVyXCIsXG4gICAgICAgIGxheWVyczogW3Byb3BzLnNoYXJlZC5wb3dlclRvb2xzTGF5ZXIsIHByb3BzLnNoYXJlZC5jb21tb25MYXllcl0sXG4gICAgICAgIGFyY2hpdGVjdHVyZTogcHJvcHMuc2hhcmVkLmxhbWJkYUFyY2hpdGVjdHVyZSxcbiAgICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLFxuICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyhsYW1iZGFEdXJhdGlvbkluTWludXRlcyksXG4gICAgICAgIG1lbW9yeVNpemU6IDEwMjQsXG4gICAgICAgIGxvZ1JldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIC4uLnByb3BzLnNoYXJlZC5kZWZhdWx0RW52aXJvbm1lbnRWYXJpYWJsZXMsXG4gICAgICAgICAgQ09ORklHX1BBUkFNRVRFUl9OQU1FOiBwcm9wcy5zaGFyZWQuY29uZmlnUGFyYW1ldGVyLnBhcmFtZXRlck5hbWUsXG4gICAgICAgICAgU0VTU0lPTlNfVEFCTEVfTkFNRTogcHJvcHMuc2Vzc2lvbnNUYWJsZS50YWJsZU5hbWUsICAgICAgICAgIFxuICAgICAgICAgIFFVRVNUSU9OU19UQUJMRV9OQU1FOiBwcm9wcy5xdWVzdGlvbnNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgICAgUVVFU1RJT05TX0JZX1NFU1NJT05fSU5ERVhfTkFNRTogcHJvcHMuYnlTZXNzaW9uSWRJbmRleCxcbiAgICAgICAgICBNRVNTQUdFU19UT1BJQ19BUk46IHByb3BzLm1lc3NhZ2VzVG9waWMudG9waWNBcm4sXG4gICAgICAgICAgQ0hBVEJPVF9GSUxFU19CVUNLRVRfTkFNRTogcHJvcHMuY2hhdGJvdEZpbGVzQnVja2V0LmJ1Y2tldE5hbWUsXG4gICAgICAgICAgQ0hBVEJPVF9GSUxFU19QUklWQVRFX0FQSTogYXBpLnVybCxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgcHJvcHMuY2hhdGJvdEZpbGVzQnVja2V0LmdyYW50UmVhZChyZXF1ZXN0SGFuZGxlcik7XG4gICAgcHJvcHMuc2Vzc2lvbnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocmVxdWVzdEhhbmRsZXIpO1xuICAgIHByb3BzLm1lc3NhZ2VzVG9waWMuZ3JhbnRQdWJsaXNoKHJlcXVlc3RIYW5kbGVyKTtcbiAgICBwcm9wcy5zaGFyZWQuY29uZmlnUGFyYW1ldGVyLmdyYW50UmVhZChyZXF1ZXN0SGFuZGxlcik7XG4gICAgcmVxdWVzdEhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbXCJiZWRyb2NrOkludm9rZU1vZGVsXCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIGNvbnN0IGRlYWRMZXR0ZXJRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgXCJETFFcIiwge1xuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICB9KTtcbiAgICBjb25zdCBxdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgXCJRdWV1ZVwiLCB7XG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgLy8gaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2xhbWJkYS9sYXRlc3QvZGcvd2l0aC1zcXMuaHRtbCNldmVudHMtc3FzLXF1ZXVlY29uZmlnXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMobGFtYmRhRHVyYXRpb25Jbk1pbnV0ZXMgKiA2KSxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcbiAgICAgICAgcXVldWU6IGRlYWRMZXR0ZXJRdWV1ZSxcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHF1ZXVlLmFkZFRvUmVzb3VyY2VQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcInNxczpTZW5kTWVzc2FnZVwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbcXVldWUucXVldWVBcm5dLFxuICAgICAgICBwcmluY2lwYWxzOiBbXG4gICAgICAgICAgbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKFwiZXZlbnRzLmFtYXpvbmF3cy5jb21cIiksXG4gICAgICAgICAgbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKFwic3FzLmFtYXpvbmF3cy5jb21cIiksXG4gICAgICAgIF0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICByZXF1ZXN0SGFuZGxlci5hZGRFdmVudFNvdXJjZShuZXcgbGFtYmRhRXZlbnRTb3VyY2VzLlNxc0V2ZW50U291cmNlKHF1ZXVlKSk7XG5cbiAgICB0aGlzLmluZ2VzdGlvblF1ZXVlID0gcXVldWU7XG4gICAgdGhpcy5yZXF1ZXN0SGFuZGxlciA9IHJlcXVlc3RIYW5kbGVyO1xuXG4gICAgLyoqXG4gICAgICogQ0RLIE5BRyBzdXBwcmVzc2lvblxuICAgICAqL1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhpbnRlZ3JhdGlvblJvbGUsIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTRcIixcbiAgICAgICAgcmVhc29uOlxuICAgICAgICAgIFwiQWNjZXNzIHRvIGFsbCBsb2cgZ3JvdXBzIHJlcXVpcmVkIGZvciBDbG91ZFdhdGNoIGxvZyBncm91cCBjcmVhdGlvbi5cIixcbiAgICAgIH0sXG4gICAgICB7IGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsIHJlYXNvbjogXCJBY2Nlc3MgbGltaXRlZCB0byBLTVMgcmVzb3VyY2VzLlwiIH0sXG4gICAgXSk7XG4gIH1cblxuICBwdWJsaWMgYWRkU2FnZU1ha2VyRW5kcG9pbnQoe1xuICAgIGVuZHBvaW50LFxuICAgIG5hbWUsXG4gIH06IHtcbiAgICBlbmRwb2ludDogQ2ZuRW5kcG9pbnQ7XG4gICAgbmFtZTogc3RyaW5nO1xuICB9KSB7XG4gICAgdGhpcy5yZXF1ZXN0SGFuZGxlci5hZGRUb1JvbGVQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGFjdGlvbnM6IFtcInNhZ2VtYWtlcjpJbnZva2VFbmRwb2ludFwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbZW5kcG9pbnQucmVmXSxcbiAgICAgIH0pXG4gICAgKTtcbiAgICBjb25zdCBjbGVhbk5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXHMuXFwtX10vZywgXCJcIikudG9VcHBlckNhc2UoKTtcbiAgICB0aGlzLnJlcXVlc3RIYW5kbGVyLmFkZEVudmlyb25tZW50KFxuICAgICAgYFNBR0VNQUtFUl9FTkRQT0lOVF8ke2NsZWFuTmFtZX1gLFxuICAgICAgZW5kcG9pbnQuYXR0ckVuZHBvaW50TmFtZVxuICAgICk7XG4gIH1cbn1cbiJdfQ==