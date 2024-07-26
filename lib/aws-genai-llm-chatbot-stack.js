"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsGenAILLMChatbotStack = void 0;
const cdk = require("aws-cdk-lib");
const types_1 = require("./shared/types");
const authentication_1 = require("./authentication");
const user_interface_1 = require("./user-interface");
const shared_1 = require("./shared");
const chatbot_api_1 = require("./chatbot-api");
const rag_engines_1 = require("./rag-engines");
const models_1 = require("./models");
const langchain_1 = require("./model-interfaces/langchain");
const idefics_1 = require("./model-interfaces/idefics");
const subscriptions = require("aws-cdk-lib/aws-sns-subscriptions");
const sns = require("aws-cdk-lib/aws-sns");
const cdk_nag_1 = require("cdk-nag");
class AwsGenAILLMChatbotStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, {
            description: "AWS LLM CHATBOT (uksb-1tupboc16)",
            ...props,
        });
        const shared = new shared_1.Shared(this, "Shared", { config: props.config });
        const authentication = new authentication_1.Authentication(this, "Authentication");
        const models = new models_1.Models(this, "Models", {
            config: props.config,
            shared,
        });
        let ragEngines = undefined;
        if (props.config.rag.enabled) {
            ragEngines = new rag_engines_1.RagEngines(this, "RagEngines", {
                shared,
                config: props.config,
            });
        }
        const chatBotApi = new chatbot_api_1.ChatBotApi(this, "ChatBotApi", {
            shared,
            config: props.config,
            ragEngines: ragEngines,
            userPool: authentication.userPool,
            modelsParameter: models.modelsParameter,
            models: models.models,
        });
        // Langchain Interface Construct
        // This is the model interface receiving messages from the websocket interface via the message topic
        // and interacting with the model via LangChain library
        const langchainModels = models.models.filter((model) => model.interface === types_1.ModelInterface.LangChain);
        // check if any deployed model requires langchain interface or if bedrock is enabled from config
        if (langchainModels.length > 0 || props.config.bedrock?.enabled) {
            const langchainInterface = new langchain_1.LangChainInterface(this, "LangchainInterface", {
                shared,
                config: props.config,
                ragEngines,
                messagesTopic: chatBotApi.messagesTopic,
                sessionsTable: chatBotApi.sessionsTable,
                questionsTable: chatBotApi.questionsTable,
                bySessionIdIndex: chatBotApi.bySessionIdIndex,
                filesBucket: chatBotApi.filesBucket
            });
            // Route all incoming messages targeted to langchain to the langchain model interface queue
            chatBotApi.messagesTopic.addSubscription(new subscriptions.SqsSubscription(langchainInterface.ingestionQueue, {
                filterPolicyWithMessageBody: {
                    direction: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
                        allowlist: [types_1.Direction.In],
                    })),
                    modelInterface: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
                        allowlist: [types_1.ModelInterface.LangChain],
                    })),
                },
            }));
            for (const model of models.models) {
                if (model.interface === types_1.ModelInterface.LangChain) {
                    langchainInterface.addSageMakerEndpoint(model);
                }
            }
        }
        // IDEFICS Interface Construct
        // This is the model interface receiving messages from the websocket interface via the message topic
        // and interacting with IDEFICS visual language models
        const ideficsModels = models.models.filter((model) => model.interface === types_1.ModelInterface.MultiModal);
        // check if any deployed model requires idefics interface
        const ideficsInterface = new idefics_1.IdeficsInterface(this, "IdeficsInterface", {
            shared,
            config: props.config,
            messagesTopic: chatBotApi.messagesTopic,
            sessionsTable: chatBotApi.sessionsTable,
            questionsTable: chatBotApi.questionsTable,
            bySessionIdIndex: chatBotApi.bySessionIdIndex,
            chatbotFilesBucket: chatBotApi.filesBucket,
        });
        // Route all incoming messages targeted to idefics to the idefics model interface queue
        chatBotApi.messagesTopic.addSubscription(new subscriptions.SqsSubscription(ideficsInterface.ingestionQueue, {
            filterPolicyWithMessageBody: {
                direction: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
                    allowlist: [types_1.Direction.In],
                })),
                modelInterface: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
                    allowlist: [types_1.ModelInterface.MultiModal],
                })),
            },
        }));
        for (const model of models.models) {
            // if model name contains idefics then add to idefics interface
            if (model.interface === types_1.ModelInterface.MultiModal) {
                ideficsInterface.addSageMakerEndpoint(model);
            }
        }
        new user_interface_1.UserInterface(this, "UserInterface", {
            shared,
            config: props.config,
            userPoolId: authentication.userPool.userPoolId,
            userPoolClientId: authentication.userPoolClient.userPoolClientId,
            identityPool: authentication.identityPool,
            api: chatBotApi,
            chatbotFilesBucket: chatBotApi.filesBucket,
            crossEncodersEnabled: typeof ragEngines?.sageMakerRagModels?.model !== "undefined",
            sagemakerEmbeddingsEnabled: typeof ragEngines?.sageMakerRagModels?.model !== "undefined",
        });
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, [
            `/${this.stackName}/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/Resource`,
        ], [
            {
                id: "AwsSolutions-L1",
                reason: "Lambda function created implicitly by CDK.",
            },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, [
            `/${this.stackName}/Authentication/IdentityPool/AuthenticatedRole/DefaultPolicy/Resource`,
            `/${this.stackName}/Authentication/UserPool/smsRole/Resource`,
            `/${this.stackName}/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/DefaultPolicy/Resource`,
            `/${this.stackName}/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource`,
            `/${this.stackName}/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource`,
            `/${this.stackName}/LangchainInterface/RequestHandler/ServiceRole/Resource`,
            `/${this.stackName}/LangchainInterface/RequestHandler/ServiceRole/DefaultPolicy/Resource`,
            `/${this.stackName}/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/Resource`,
            `/${this.stackName}/ChatBotApi/ChatbotApi/proxyResolverFunction/ServiceRole/DefaultPolicy/Resource`,
            `/${this.stackName}/ChatBotApi/ChatbotApi/realtimeResolverFunction/ServiceRole/DefaultPolicy/Resource`,
            `/${this.stackName}/ChatBotApi/RestApi/GraphQLApiHandler/ServiceRole/Resource`,
            `/${this.stackName}/ChatBotApi/RestApi/GraphQLApiHandler/ServiceRole/DefaultPolicy/Resource`,
            `/${this.stackName}/ChatBotApi/Realtime/Resolvers/lambda-resolver/ServiceRole/Resource`,
            `/${this.stackName}/ChatBotApi/Realtime/Resolvers/outgoing-message-handler/ServiceRole/Resource`,
            `/${this.stackName}/ChatBotApi/Realtime/Resolvers/outgoing-message-handler/ServiceRole/DefaultPolicy/Resource`,
            `/${this.stackName}/IdeficsInterface/IdeficsInterfaceRequestHandler/ServiceRole/DefaultPolicy/Resource`,
            `/${this.stackName}/IdeficsInterface/IdeficsInterfaceRequestHandler/ServiceRole/Resource`,
            `/${this.stackName}/IdeficsInterface/ChatbotFilesPrivateApi/CloudWatchRole/Resource`,
            `/${this.stackName}/IdeficsInterface/S3IntegrationRole/DefaultPolicy/Resource`,
        ], [
            {
                id: "AwsSolutions-IAM4",
                reason: "IAM role implicitly created by CDK.",
            },
            {
                id: "AwsSolutions-IAM5",
                reason: "IAM role implicitly created by CDK.",
            },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, `/${this.stackName}/IdeficsInterface/ChatbotFilesPrivateApi/DeploymentStage.prod/Resource`, [
            {
                id: "AwsSolutions-APIG3",
                reason: "WAF not required due to configured Cognito auth.",
            },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, [
            `/${this.stackName}/IdeficsInterface/ChatbotFilesPrivateApi/Default/{object}/ANY/Resource`,
            `/${this.stackName}/IdeficsInterface/ChatbotFilesPrivateApi/Default/{object}/ANY/Resource`,
        ], [
            { id: "AwsSolutions-APIG4", reason: "Private API within a VPC." },
            { id: "AwsSolutions-COG4", reason: "Private API within a VPC." },
        ]);
        // RAG configuration
        if (props.config.rag.enabled) {
            cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, [
                `/${this.stackName}/RagEngines/DataImport/FileImportBatchJob/FileImportJobRole/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/DataImport/WebCrawlerBatchJob/WebCrawlerJobRole/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/DataImport/FileImportBatchJob/FileImportContainer/ExecutionRole/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/DataImport/WebCrawlerBatchJob/WebCrawlerContainer/ExecutionRole/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/DataImport/FileImportWorkflow/FileImportStateMachine/Role/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/DataImport/WebsiteCrawlingWorkflow/WebsiteCrawling/Role/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/DataImport/UploadHandler/ServiceRole/Resource`,
                `/${this.stackName}/RagEngines/DataImport/UploadHandler/ServiceRole/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/Workspaces/DeleteWorkspace/DeleteWorkspaceFunction/ServiceRole/Resource`,
                `/${this.stackName}/RagEngines/Workspaces/DeleteWorkspace/DeleteWorkspaceFunction/ServiceRole/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/Workspaces/DeleteWorkspace/DeleteWorkspace/Role/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/DataImport/FileImportBatchJob/ManagedEc2EcsComputeEnvironment/InstanceProfileRole/Resource`,
                `/${this.stackName}/RagEngines/DataImport/WebCrawlerBatchJob/WebCrawlerManagedEc2EcsComputeEnvironment/InstanceProfileRole/Resource`,
                `/${this.stackName}/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/Resource`,
                `/${this.stackName}/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/DataImport/RssSubscription/RssIngestor/ServiceRole/Resource`,
                `/${this.stackName}/RagEngines/DataImport/RssSubscription/RssIngestor/ServiceRole/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/DataImport/RssSubscription/triggerRssIngestorsFunction/ServiceRole/Resource`,
                `/${this.stackName}/RagEngines/DataImport/RssSubscription/triggerRssIngestorsFunction/ServiceRole/DefaultPolicy/Resource`,
                `/${this.stackName}/RagEngines/DataImport/RssSubscription/crawlQueuedRssPostsFunction/ServiceRole/Resource`,
                `/${this.stackName}/RagEngines/DataImport/RssSubscription/crawlQueuedRssPostsFunction/ServiceRole/DefaultPolicy/Resource`,
            ], [
                {
                    id: "AwsSolutions-IAM4",
                    reason: "IAM role implicitly created by CDK.",
                },
                {
                    id: "AwsSolutions-IAM5",
                    reason: "IAM role implicitly created by CDK.",
                },
            ]);
            if (props.config.rag.engines.aurora.enabled ||
                props.config.rag.engines.opensearch.enabled) {
                cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, [
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/CodeBuildRole/DefaultPolicy/Resource`,
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/OnEventHandler/ServiceRole/Resource`,
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/IsCompleteHandler/ServiceRole/Resource`,
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/Provider/framework-onEvent/ServiceRole/Resource`,
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/Provider/framework-onEvent/ServiceRole/DefaultPolicy/Resource`,
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/Provider/framework-isComplete/ServiceRole/Resource`,
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/Provider/framework-isComplete/ServiceRole/DefaultPolicy/Resource`,
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/Provider/framework-onTimeout/ServiceRole/Resource`,
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/Provider/framework-onTimeout/ServiceRole/DefaultPolicy/Resource`,
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/Provider/waiter-state-machine/Role/DefaultPolicy/Resource`,
                    `/${this.stackName}/RagEngines/SageMaker/Model/Multi4D3D0/SageMakerExecutionRole/DefaultPolicy/Resource`,
                ], [
                    {
                        id: "AwsSolutions-IAM4",
                        reason: "IAM role implicitly created by CDK.",
                    },
                    {
                        id: "AwsSolutions-IAM5",
                        reason: "IAM role implicitly created by CDK.",
                    },
                ]);
                if (props.config.rag.engines.aurora.enabled) {
                    cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, `/${this.stackName}/RagEngines/AuroraPgVector/AuroraDatabase/Secret/Resource`, [
                        {
                            id: "AwsSolutions-SMG4",
                            reason: "Secret created implicitly by CDK.",
                        },
                    ]);
                    cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, [
                        `/${this.stackName}/RagEngines/AuroraPgVector/DatabaseSetupFunction/ServiceRole/Resource`,
                        `/${this.stackName}/RagEngines/AuroraPgVector/DatabaseSetupProvider/framework-onEvent/ServiceRole/Resource`,
                        `/${this.stackName}/RagEngines/AuroraPgVector/DatabaseSetupProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource`,
                        `/${this.stackName}/RagEngines/AuroraPgVector/CreateAuroraWorkspace/CreateAuroraWorkspaceFunction/ServiceRole/Resource`,
                        `/${this.stackName}/RagEngines/AuroraPgVector/CreateAuroraWorkspace/CreateAuroraWorkspaceFunction/ServiceRole/DefaultPolicy/Resource`,
                        `/${this.stackName}/RagEngines/AuroraPgVector/CreateAuroraWorkspace/CreateAuroraWorkspace/Role/DefaultPolicy/Resource`,
                    ], [
                        {
                            id: "AwsSolutions-IAM4",
                            reason: "IAM role implicitly created by CDK.",
                        },
                        {
                            id: "AwsSolutions-IAM5",
                            reason: "IAM role implicitly created by CDK.",
                        },
                    ]);
                }
                if (props.config.rag.engines.opensearch.enabled) {
                    cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, [
                        `/${this.stackName}/RagEngines/OpenSearchVector/CreateOpenSearchWorkspace/CreateOpenSearchWorkspaceFunction/ServiceRole/Resource`,
                        `/${this.stackName}/RagEngines/OpenSearchVector/CreateOpenSearchWorkspace/CreateOpenSearchWorkspaceFunction/ServiceRole/DefaultPolicy/Resource`,
                        `/${this.stackName}/RagEngines/OpenSearchVector/CreateOpenSearchWorkspace/CreateOpenSearchWorkspace/Role/DefaultPolicy/Resource`,
                    ], [
                        {
                            id: "AwsSolutions-IAM4",
                            reason: "IAM role implicitly created by CDK.",
                        },
                        {
                            id: "AwsSolutions-IAM5",
                            reason: "IAM role implicitly created by CDK.",
                        },
                    ]);
                }
            }
            if (props.config.rag.engines.kendra.enabled) {
                cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, [
                    `/${this.stackName}/RagEngines/KendraRetrieval/CreateAuroraWorkspace/CreateKendraWorkspace/Role/DefaultPolicy/Resource`,
                ], [
                    {
                        id: "AwsSolutions-IAM4",
                        reason: "IAM role implicitly created by CDK.",
                    },
                    {
                        id: "AwsSolutions-IAM5",
                        reason: "IAM role implicitly created by CDK.",
                    },
                ]);
                if (props.config.rag.engines.kendra.createIndex) {
                    cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, [
                        `/${this.stackName}/RagEngines/KendraRetrieval/KendraRole/DefaultPolicy/Resource`,
                    ], [
                        {
                            id: "AwsSolutions-IAM5",
                            reason: "Access to all log groups required for CloudWatch log group creation.",
                        },
                    ]);
                }
            }
        }
        // Implicitly created resources with changing paths
        cdk_nag_1.NagSuppressions.addStackSuppressions(this, [
            {
                id: "CdkNagValidationFailure",
                reason: "Intrinstic function references.",
            },
        ]);
        // Lambda functions still using Python 3.11 even though latest runtime is 3.12. Can be removed after upgrade.
        cdk_nag_1.NagSuppressions.addStackSuppressions(this, [
            {
                id: "AwsSolutions-L1",
                reason: "Not yet upgraded from Python 3.11 to 3.12.",
            },
        ]);
        if (props.config.privateWebsite) {
            const paths = [];
            for (let index = 0; index < shared.vpc.availabilityZones.length; index++) {
                paths.push(`/${this.stackName}/UserInterface/PrivateWebsite/DescribeNetworkInterfaces-${index}/CustomResourcePolicy/Resource`);
            }
            paths.push(`/${this.stackName}/UserInterface/PrivateWebsite/describeVpcEndpoints/CustomResourcePolicy/Resource`);
            cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, paths, [
                {
                    id: "AwsSolutions-IAM5",
                    reason: "Custom Resource requires permissions to Describe VPC Endpoint Network Interfaces",
                },
            ]);
            cdk_nag_1.NagSuppressions.addResourceSuppressionsByPath(this, [
                `/${this.stackName}/AWS679f53fac002430cb0da5b7982bd2287/ServiceRole/Resource`,
            ], [
                {
                    id: "AwsSolutions-IAM4",
                    reason: "IAM role implicitly created by CDK.",
                },
            ]);
        }
    }
}
exports.AwsGenAILLMChatbotStack = AwsGenAILLMChatbotStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzLWdlbmFpLWxsbS1jaGF0Ym90LXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXdzLWdlbmFpLWxsbS1jaGF0Ym90LXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQywwQ0FBeUU7QUFDekUscURBQWtEO0FBQ2xELHFEQUFpRDtBQUNqRCxxQ0FBa0M7QUFDbEMsK0NBQTJDO0FBQzNDLCtDQUEyQztBQUMzQyxxQ0FBa0M7QUFDbEMsNERBQWtFO0FBQ2xFLHdEQUE4RDtBQUM5RCxtRUFBbUU7QUFDbkUsMkNBQTJDO0FBQzNDLHFDQUEwQztBQU0xQyxNQUFhLHVCQUF3QixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3BELFlBQ0UsS0FBZ0IsRUFDaEIsRUFBVSxFQUNWLEtBQW1DO1FBRW5DLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFO1lBQ2YsV0FBVyxFQUFFLGtDQUFrQztZQUMvQyxHQUFHLEtBQUs7U0FDVCxDQUFDLENBQUM7UUFFSCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sY0FBYyxHQUFHLElBQUksK0JBQWMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUNsRSxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFO1lBQ3hDLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixNQUFNO1NBQ1AsQ0FBQyxDQUFDO1FBRUgsSUFBSSxVQUFVLEdBQTJCLFNBQVMsQ0FBQztRQUNuRCxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRTtZQUM1QixVQUFVLEdBQUcsSUFBSSx3QkFBVSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7Z0JBQzlDLE1BQU07Z0JB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QUMzQyxJQUFJLEVBQ0o7Z0JBQ0UsSUFBSSxJQUFJLENBQUMsU0FBUywyREFBMkQ7YUFDOUUsRUFDRDtnQkFDRTtvQkFDRSxFQUFFLEVBQUUsbUJBQW1CO29CQUN2QixNQUFNLEVBQUUscUNBQXFDO2lCQUM5QzthQUNGLENBQ0YsQ0FBQztTQUNIO0lBQ0gsQ0FBQztDQUNGO0FBcGFELDBEQW9hQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBTeXN0ZW1Db25maWcsIE1vZGVsSW50ZXJmYWNlLCBEaXJlY3Rpb24gfSBmcm9tIFwiLi9zaGFyZWQvdHlwZXNcIjtcbmltcG9ydCB7IEF1dGhlbnRpY2F0aW9uIH0gZnJvbSBcIi4vYXV0aGVudGljYXRpb25cIjtcbmltcG9ydCB7IFVzZXJJbnRlcmZhY2UgfSBmcm9tIFwiLi91c2VyLWludGVyZmFjZVwiO1xuaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4vc2hhcmVkXCI7XG5pbXBvcnQgeyBDaGF0Qm90QXBpIH0gZnJvbSBcIi4vY2hhdGJvdC1hcGlcIjtcbmltcG9ydCB7IFJhZ0VuZ2luZXMgfSBmcm9tIFwiLi9yYWctZW5naW5lc1wiO1xuaW1wb3J0IHsgTW9kZWxzIH0gZnJvbSBcIi4vbW9kZWxzXCI7XG5pbXBvcnQgeyBMYW5nQ2hhaW5JbnRlcmZhY2UgfSBmcm9tIFwiLi9tb2RlbC1pbnRlcmZhY2VzL2xhbmdjaGFpblwiO1xuaW1wb3J0IHsgSWRlZmljc0ludGVyZmFjZSB9IGZyb20gXCIuL21vZGVsLWludGVyZmFjZXMvaWRlZmljc1wiO1xuaW1wb3J0ICogYXMgc3Vic2NyaXB0aW9ucyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNucy1zdWJzY3JpcHRpb25zXCI7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zbnNcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXdzR2VuQUlMTE1DaGF0Ym90U3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcbiAgcmVhZG9ubHkgY29uZmlnOiBTeXN0ZW1Db25maWc7XG59XG5cbmV4cG9ydCBjbGFzcyBBd3NHZW5BSUxMTUNoYXRib3RTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKFxuICAgIHNjb3BlOiBDb25zdHJ1Y3QsXG4gICAgaWQ6IHN0cmluZyxcbiAgICBwcm9wczogQXdzR2VuQUlMTE1DaGF0Ym90U3RhY2tQcm9wc1xuICApIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHtcbiAgICAgIGRlc2NyaXB0aW9uOiBcIkFXUyBMTE0gQ0hBVEJPVCAodWtzYi0xdHVwYm9jMTYpXCIsXG4gICAgICAuLi5wcm9wcyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHNoYXJlZCA9IG5ldyBTaGFyZWQodGhpcywgXCJTaGFyZWRcIiwgeyBjb25maWc6IHByb3BzLmNvbmZpZyB9KTtcbiAgICBjb25zdCBhdXRoZW50aWNhdGlvbiA9IG5ldyBBdXRoZW50aWNhdGlvbih0aGlzLCBcIkF1dGhlbnRpY2F0aW9uXCIpO1xuICAgIGNvbnN0IG1vZGVscyA9IG5ldyBNb2RlbHModGhpcywgXCJNb2RlbHNcIiwge1xuICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcsXG4gICAgICBzaGFyZWQsXG4gICAgfSk7XG5cbiAgICBsZXQgcmFnRW5naW5lczogUmFnRW5naW5lcyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZDtcbiAgICBpZiAocHJvcHMuY29uZmlnLnJhZy5lbmFibGVkKSB7XG4gICAgICByYWdFbmdpbmVzID0gbmV3IFJhZ0VuZ2luZXModGhpcywgXCJSYWdFbmdpbmVzXCIsIHtcbiAgICAgICAgc2hhcmVkLFxuICAgICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnN0IGNoYXRCb3RBcGkgPSBuZXcgQ2hhdEJvdEFwaSh0aGlzLCBcIkNoYXRCb3RBcGlcIiwge1xuICAgICAgc2hhcmVkLFxuICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcsXG4gICAgICByYWdFbmdpbmVzOiByYWdFbmdpbmVzLFxuICAgICAgdXNlclBvb2w6IGF1dGhlbnRpY2F0aW9uLnVzZXJQb29sLFxuICAgICAgbW9kZWxzUGFyYW1ldGVyOiBtb2RlbHMubW9kZWxzUGFyYW1ldGVyLFxuICAgICAgbW9kZWxzOiBtb2RlbHMubW9kZWxzLFxuICAgIH0pO1xuXG4gICAgLy8gTGFuZ2NoYWluIEludGVyZmFjZSBDb25zdHJ1Y3RcbiAgICAvLyBUaGlzIGlzIHRoZSBtb2RlbCBpbnRlcmZhY2UgcmVjZWl2aW5nIG1lc3NhZ2VzIGZyb20gdGhlIHdlYnNvY2tldCBpbnRlcmZhY2UgdmlhIHRoZSBtZXNzYWdlIHRvcGljXG4gICAgLy8gYW5kIGludGVyYWN0aW5nIHdpdGggdGhlIG1vZGVsIHZpYSBMYW5nQ2hhaW4gbGlicmFyeVxuICAgIGNvbnN0IGxhbmdjaGFpbk1vZGVscyA9IG1vZGVscy5tb2RlbHMuZmlsdGVyKFxuICAgICAgKG1vZGVsKSA9PiBtb2RlbC5pbnRlcmZhY2UgPT09IE1vZGVsSW50ZXJmYWNlLkxhbmdDaGFpblxuICAgICk7XG5cbiAgICAvLyBjaGVjayBpZiBhbnkgZGVwbG95ZWQgbW9kZWwgcmVxdWlyZXMgbGFuZ2NoYWluIGludGVyZmFjZSBvciBpZiBiZWRyb2NrIGlzIGVuYWJsZWQgZnJvbSBjb25maWdcbiAgICBpZiAobGFuZ2NoYWluTW9kZWxzLmxlbmd0aCA+IDAgfHwgcHJvcHMuY29uZmlnLmJlZHJvY2s/LmVuYWJsZWQpIHtcbiAgICAgIGNvbnN0IGxhbmdjaGFpbkludGVyZmFjZSA9IG5ldyBMYW5nQ2hhaW5JbnRlcmZhY2UoXG4gICAgICAgIHRoaXMsXG4gICAgICAgIFwiTGFuZ2NoYWluSW50ZXJmYWNlXCIsXG4gICAgICAgIHtcbiAgICAgICAgICBzaGFyZWQsXG4gICAgICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcsXG4gICAgICAgICAgcmFnRW5naW5lcyxcbiAgICAgICAgICBtZXNzYWdlc1RvcGljOiBjaGF0Qm90QXBpLm1lc3NhZ2VzVG9waWMsXG4gICAgICAgICAgc2Vzc2lvbnNUYWJsZTogY2hhdEJvdEFwaS5zZXNzaW9uc1RhYmxlLFxuICAgICAgICAgIHF1ZXN0aW9uc1RhYmxlOiBjaGF0Qm90QXBpLnF1ZXN0aW9uc1RhYmxlLFxuICAgICAgICAgIGJ5U2Vzc2lvbklkSW5kZXg6IGNoYXRCb3RBcGkuYnlTZXNzaW9uSWRJbmRleCxcbiAgICAgICAgICBmaWxlc0J1Y2tldDogY2hhdEJvdEFwaS5maWxlc0J1Y2tldFxuICAgICAgICB9XG4gICAgICApO1xuXG4gICAgICAvLyBSb3V0ZSBhbGwgaW5jb21pbmcgbWVzc2FnZXMgdGFyZ2V0ZWQgdG8gbGFuZ2NoYWluIHRvIHRoZSBsYW5nY2hhaW4gbW9kZWwgaW50ZXJmYWNlIHF1ZXVlXG4gICAgICBjaGF0Qm90QXBpLm1lc3NhZ2VzVG9waWMuYWRkU3Vic2NyaXB0aW9uKFxuICAgICAgICBuZXcgc3Vic2NyaXB0aW9ucy5TcXNTdWJzY3JpcHRpb24obGFuZ2NoYWluSW50ZXJmYWNlLmluZ2VzdGlvblF1ZXVlLCB7XG4gICAgICAgICAgZmlsdGVyUG9saWN5V2l0aE1lc3NhZ2VCb2R5OiB7XG4gICAgICAgICAgICBkaXJlY3Rpb246IHNucy5GaWx0ZXJPclBvbGljeS5maWx0ZXIoXG4gICAgICAgICAgICAgIHNucy5TdWJzY3JpcHRpb25GaWx0ZXIuc3RyaW5nRmlsdGVyKHtcbiAgICAgICAgICAgICAgICBhbGxvd2xpc3Q6IFtEaXJlY3Rpb24uSW5dLFxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIG1vZGVsSW50ZXJmYWNlOiBzbnMuRmlsdGVyT3JQb2xpY3kuZmlsdGVyKFxuICAgICAgICAgICAgICBzbnMuU3Vic2NyaXB0aW9uRmlsdGVyLnN0cmluZ0ZpbHRlcih7XG4gICAgICAgICAgICAgICAgYWxsb3dsaXN0OiBbTW9kZWxJbnRlcmZhY2UuTGFuZ0NoYWluXSxcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICksXG4gICAgICAgICAgfSxcbiAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICAgIGZvciAoY29uc3QgbW9kZWwgb2YgbW9kZWxzLm1vZGVscykge1xuICAgICAgICBpZiAobW9kZWwuaW50ZXJmYWNlID09PSBNb2RlbEludGVyZmFjZS5MYW5nQ2hhaW4pIHtcbiAgICAgICAgICBsYW5nY2hhaW5JbnRlcmZhY2UuYWRkU2FnZU1ha2VyRW5kcG9pbnQobW9kZWwpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gSURFRklDUyBJbnRlcmZhY2UgQ29uc3RydWN0XG4gICAgLy8gVGhpcyBpcyB0aGUgbW9kZWwgaW50ZXJmYWNlIHJlY2VpdmluZyBtZXNzYWdlcyBmcm9tIHRoZSB3ZWJzb2NrZXQgaW50ZXJmYWNlIHZpYSB0aGUgbWVzc2FnZSB0b3BpY1xuICAgIC8vIGFuZCBpbnRlcmFjdGluZyB3aXRoIElERUZJQ1MgdmlzdWFsIGxhbmd1YWdlIG1vZGVsc1xuICAgIGNvbnN0IGlkZWZpY3NNb2RlbHMgPSBtb2RlbHMubW9kZWxzLmZpbHRlcihcbiAgICAgIChtb2RlbCkgPT4gbW9kZWwuaW50ZXJmYWNlID09PSBNb2RlbEludGVyZmFjZS5NdWx0aU1vZGFsXG4gICAgKTtcblxuICAgIC8vIGNoZWNrIGlmIGFueSBkZXBsb3llZCBtb2RlbCByZXF1aXJlcyBpZGVmaWNzIGludGVyZmFjZVxuXG4gICAgY29uc3QgaWRlZmljc0ludGVyZmFjZSA9IG5ldyBJZGVmaWNzSW50ZXJmYWNlKHRoaXMsIFwiSWRlZmljc0ludGVyZmFjZVwiLCB7XG4gICAgICBzaGFyZWQsXG4gICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcbiAgICAgIG1lc3NhZ2VzVG9waWM6IGNoYXRCb3RBcGkubWVzc2FnZXNUb3BpYyxcbiAgICAgIHNlc3Npb25zVGFibGU6IGNoYXRCb3RBcGkuc2Vzc2lvbnNUYWJsZSwgICAgXG4gICAgICBxdWVzdGlvbnNUYWJsZTogY2hhdEJvdEFwaS5xdWVzdGlvbnNUYWJsZSxcbiAgICAgIGJ5U2Vzc2lvbklkSW5kZXg6IGNoYXRCb3RBcGkuYnlTZXNzaW9uSWRJbmRleCxcbiAgICAgIGNoYXRib3RGaWxlc0J1Y2tldDogY2hhdEJvdEFwaS5maWxlc0J1Y2tldCxcbiAgICB9KTtcblxuICAgIC8vIFJvdXRlIGFsbCBpbmNvbWluZyBtZXNzYWdlcyB0YXJnZXRlZCB0byBpZGVmaWNzIHRvIHRoZSBpZGVmaWNzIG1vZGVsIGludGVyZmFjZSBxdWV1ZVxuICAgIGNoYXRCb3RBcGkubWVzc2FnZXNUb3BpYy5hZGRTdWJzY3JpcHRpb24oXG4gICAgICBuZXcgc3Vic2NyaXB0aW9ucy5TcXNTdWJzY3JpcHRpb24oaWRlZmljc0ludGVyZmFjZS5pbmdlc3Rpb25RdWV1ZSwge1xuICAgICAgICBmaWx0ZXJQb2xpY3lXaXRoTWVzc2FnZUJvZHk6IHtcbiAgICAgICAgICBkaXJlY3Rpb246IHNucy5GaWx0ZXJPclBvbGljeS5maWx0ZXIoXG4gICAgICAgICAgICBzbnMuU3Vic2NyaXB0aW9uRmlsdGVyLnN0cmluZ0ZpbHRlcih7XG4gICAgICAgICAgICAgIGFsbG93bGlzdDogW0RpcmVjdGlvbi5Jbl0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICksXG4gICAgICAgICAgbW9kZWxJbnRlcmZhY2U6IHNucy5GaWx0ZXJPclBvbGljeS5maWx0ZXIoXG4gICAgICAgICAgICBzbnMuU3Vic2NyaXB0aW9uRmlsdGVyLnN0cmluZ0ZpbHRlcih7XG4gICAgICAgICAgICAgIGFsbG93bGlzdDogW01vZGVsSW50ZXJmYWNlLk11bHRpTW9kYWxdLFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApLFxuICAgICAgICB9LFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgZm9yIChjb25zdCBtb2RlbCBvZiBtb2RlbHMubW9kZWxzKSB7XG4gICAgICAvLyBpZiBtb2RlbCBuYW1lIGNvbnRhaW5zIGlkZWZpY3MgdGhlbiBhZGQgdG8gaWRlZmljcyBpbnRlcmZhY2VcbiAgICAgIGlmIChtb2RlbC5pbnRlcmZhY2UgPT09IE1vZGVsSW50ZXJmYWNlLk11bHRpTW9kYWwpIHtcbiAgICAgICAgaWRlZmljc0ludGVyZmFjZS5hZGRTYWdlTWFrZXJFbmRwb2ludChtb2RlbCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbmV3IFVzZXJJbnRlcmZhY2UodGhpcywgXCJVc2VySW50ZXJmYWNlXCIsIHtcbiAgICAgIHNoYXJlZCxcbiAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgdXNlclBvb2xJZDogYXV0aGVudGljYXRpb24udXNlclBvb2wudXNlclBvb2xJZCxcbiAgICAgIHVzZXJQb29sQ2xpZW50SWQ6IGF1dGhlbnRpY2F0aW9uLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXG4gICAgICBpZGVudGl0eVBvb2w6IGF1dGhlbnRpY2F0aW9uLmlkZW50aXR5UG9vbCxcbiAgICAgIGFwaTogY2hhdEJvdEFwaSxcbiAgICAgIGNoYXRib3RGaWxlc0J1Y2tldDogY2hhdEJvdEFwaS5maWxlc0J1Y2tldCxcbiAgICAgIGNyb3NzRW5jb2RlcnNFbmFibGVkOlxuICAgICAgICB0eXBlb2YgcmFnRW5naW5lcz8uc2FnZU1ha2VyUmFnTW9kZWxzPy5tb2RlbCAhPT0gXCJ1bmRlZmluZWRcIixcbiAgICAgIHNhZ2VtYWtlckVtYmVkZGluZ3NFbmFibGVkOlxuICAgICAgICB0eXBlb2YgcmFnRW5naW5lcz8uc2FnZU1ha2VyUmFnTW9kZWxzPy5tb2RlbCAhPT0gXCJ1bmRlZmluZWRcIixcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIENESyBOQUcgc3VwcHJlc3Npb25cbiAgICAgKi9cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnNCeVBhdGgoXG4gICAgICB0aGlzLFxuICAgICAgW1xuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0N1c3RvbTo6Q0RLQnVja2V0RGVwbG95bWVudDg2OTNCQjY0OTY4OTQ0QjY5QUFGQjBDQzlFQjg3NTZDL1Jlc291cmNlYCxcbiAgICAgIF0sXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtTDFcIixcbiAgICAgICAgICByZWFzb246IFwiTGFtYmRhIGZ1bmN0aW9uIGNyZWF0ZWQgaW1wbGljaXRseSBieSBDREsuXCIsXG4gICAgICAgIH0sXG4gICAgICBdXG4gICAgKTtcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnNCeVBhdGgoXG4gICAgICB0aGlzLFxuICAgICAgW1xuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0F1dGhlbnRpY2F0aW9uL0lkZW50aXR5UG9vbC9BdXRoZW50aWNhdGVkUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9BdXRoZW50aWNhdGlvbi9Vc2VyUG9vbC9zbXNSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9DdXN0b206OkNES0J1Y2tldERlcGxveW1lbnQ4NjkzQkI2NDk2ODk0NEI2OUFBRkIwQ0M5RUI4NzU2Qy9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9Mb2dSZXRlbnRpb25hYWUwYWEzYzViNGQ0Zjg3YjAyZDg1YjIwMWVmZGQ4YS9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vTG9nUmV0ZW50aW9uYWFlMGFhM2M1YjRkNGY4N2IwMmQ4NWIyMDFlZmRkOGEvU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vTGFuZ2NoYWluSW50ZXJmYWNlL1JlcXVlc3RIYW5kbGVyL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9MYW5nY2hhaW5JbnRlcmZhY2UvUmVxdWVzdEhhbmRsZXIvU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQ3VzdG9tOjpDREtCdWNrZXREZXBsb3ltZW50ODY5M0JCNjQ5Njg5NDRCNjlBQUZCMENDOUVCODc1NkMvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0NoYXRCb3RBcGkvQ2hhdGJvdEFwaS9wcm94eVJlc29sdmVyRnVuY3Rpb24vU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQ2hhdEJvdEFwaS9DaGF0Ym90QXBpL3JlYWx0aW1lUmVzb2x2ZXJGdW5jdGlvbi9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9DaGF0Qm90QXBpL1Jlc3RBcGkvR3JhcGhRTEFwaUhhbmRsZXIvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0NoYXRCb3RBcGkvUmVzdEFwaS9HcmFwaFFMQXBpSGFuZGxlci9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9DaGF0Qm90QXBpL1JlYWx0aW1lL1Jlc29sdmVycy9sYW1iZGEtcmVzb2x2ZXIvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0NoYXRCb3RBcGkvUmVhbHRpbWUvUmVzb2x2ZXJzL291dGdvaW5nLW1lc3NhZ2UtaGFuZGxlci9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQ2hhdEJvdEFwaS9SZWFsdGltZS9SZXNvbHZlcnMvb3V0Z29pbmctbWVzc2FnZS1oYW5kbGVyL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0lkZWZpY3NJbnRlcmZhY2UvSWRlZmljc0ludGVyZmFjZVJlcXVlc3RIYW5kbGVyL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0lkZWZpY3NJbnRlcmZhY2UvSWRlZmljc0ludGVyZmFjZVJlcXVlc3RIYW5kbGVyL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9JZGVmaWNzSW50ZXJmYWNlL0NoYXRib3RGaWxlc1ByaXZhdGVBcGkvQ2xvdWRXYXRjaFJvbGUvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0lkZWZpY3NJbnRlcmZhY2UvUzNJbnRlZ3JhdGlvblJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICBdLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTRcIixcbiAgICAgICAgICByZWFzb246IFwiSUFNIHJvbGUgaW1wbGljaXRseSBjcmVhdGVkIGJ5IENESy5cIixcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgICAgcmVhc29uOiBcIklBTSByb2xlIGltcGxpY2l0bHkgY3JlYXRlZCBieSBDREsuXCIsXG4gICAgICAgIH0sXG4gICAgICBdXG4gICAgKTtcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnNCeVBhdGgoXG4gICAgICB0aGlzLFxuICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9JZGVmaWNzSW50ZXJmYWNlL0NoYXRib3RGaWxlc1ByaXZhdGVBcGkvRGVwbG95bWVudFN0YWdlLnByb2QvUmVzb3VyY2VgLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUFQSUczXCIsXG4gICAgICAgICAgcmVhc29uOiBcIldBRiBub3QgcmVxdWlyZWQgZHVlIHRvIGNvbmZpZ3VyZWQgQ29nbml0byBhdXRoLlwiLFxuICAgICAgICB9LFxuICAgICAgXVxuICAgICk7XG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zQnlQYXRoKFxuICAgICAgdGhpcyxcbiAgICAgIFtcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9JZGVmaWNzSW50ZXJmYWNlL0NoYXRib3RGaWxlc1ByaXZhdGVBcGkvRGVmYXVsdC97b2JqZWN0fS9BTlkvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0lkZWZpY3NJbnRlcmZhY2UvQ2hhdGJvdEZpbGVzUHJpdmF0ZUFwaS9EZWZhdWx0L3tvYmplY3R9L0FOWS9SZXNvdXJjZWAsXG4gICAgICBdLFxuICAgICAgW1xuICAgICAgICB7IGlkOiBcIkF3c1NvbHV0aW9ucy1BUElHNFwiLCByZWFzb246IFwiUHJpdmF0ZSBBUEkgd2l0aGluIGEgVlBDLlwiIH0sXG4gICAgICAgIHsgaWQ6IFwiQXdzU29sdXRpb25zLUNPRzRcIiwgcmVhc29uOiBcIlByaXZhdGUgQVBJIHdpdGhpbiBhIFZQQy5cIiB9LFxuICAgICAgXVxuICAgICk7XG5cbiAgICAvLyBSQUcgY29uZmlndXJhdGlvblxuICAgIGlmIChwcm9wcy5jb25maWcucmFnLmVuYWJsZWQpIHtcbiAgICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgW1xuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9EYXRhSW1wb3J0L0ZpbGVJbXBvcnRCYXRjaEpvYi9GaWxlSW1wb3J0Sm9iUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9XZWJDcmF3bGVyQmF0Y2hKb2IvV2ViQ3Jhd2xlckpvYlJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvRmlsZUltcG9ydEJhdGNoSm9iL0ZpbGVJbXBvcnRDb250YWluZXIvRXhlY3V0aW9uUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9XZWJDcmF3bGVyQmF0Y2hKb2IvV2ViQ3Jhd2xlckNvbnRhaW5lci9FeGVjdXRpb25Sb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9EYXRhSW1wb3J0L0ZpbGVJbXBvcnRXb3JrZmxvdy9GaWxlSW1wb3J0U3RhdGVNYWNoaW5lL1JvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvV2Vic2l0ZUNyYXdsaW5nV29ya2Zsb3cvV2Vic2l0ZUNyYXdsaW5nL1JvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvVXBsb2FkSGFuZGxlci9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvVXBsb2FkSGFuZGxlci9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvV29ya3NwYWNlcy9EZWxldGVXb3Jrc3BhY2UvRGVsZXRlV29ya3NwYWNlRnVuY3Rpb24vU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9Xb3Jrc3BhY2VzL0RlbGV0ZVdvcmtzcGFjZS9EZWxldGVXb3Jrc3BhY2VGdW5jdGlvbi9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvV29ya3NwYWNlcy9EZWxldGVXb3Jrc3BhY2UvRGVsZXRlV29ya3NwYWNlL1JvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvRmlsZUltcG9ydEJhdGNoSm9iL01hbmFnZWRFYzJFY3NDb21wdXRlRW52aXJvbm1lbnQvSW5zdGFuY2VQcm9maWxlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvV2ViQ3Jhd2xlckJhdGNoSm9iL1dlYkNyYXdsZXJNYW5hZ2VkRWMyRWNzQ29tcHV0ZUVudmlyb25tZW50L0luc3RhbmNlUHJvZmlsZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQnVja2V0Tm90aWZpY2F0aW9uc0hhbmRsZXIwNTBhMDU4N2I3NTQ0NTQ3YmYzMjVmMDk0YTNkYjgzNC9Sb2xlL1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0J1Y2tldE5vdGlmaWNhdGlvbnNIYW5kbGVyMDUwYTA1ODdiNzU0NDU0N2JmMzI1ZjA5NGEzZGI4MzQvUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9Sc3NTdWJzY3JpcHRpb24vUnNzSW5nZXN0b3IvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9EYXRhSW1wb3J0L1Jzc1N1YnNjcmlwdGlvbi9Sc3NJbmdlc3Rvci9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9Sc3NTdWJzY3JpcHRpb24vdHJpZ2dlclJzc0luZ2VzdG9yc0Z1bmN0aW9uL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9Sc3NTdWJzY3JpcHRpb24vdHJpZ2dlclJzc0luZ2VzdG9yc0Z1bmN0aW9uL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9EYXRhSW1wb3J0L1Jzc1N1YnNjcmlwdGlvbi9jcmF3bFF1ZXVlZFJzc1Bvc3RzRnVuY3Rpb24vU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9EYXRhSW1wb3J0L1Jzc1N1YnNjcmlwdGlvbi9jcmF3bFF1ZXVlZFJzc1Bvc3RzRnVuY3Rpb24vU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgIF0sXG4gICAgICAgIFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgICAgICAgcmVhc29uOiBcIklBTSByb2xlIGltcGxpY2l0bHkgY3JlYXRlZCBieSBDREsuXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgICAgICAgcmVhc29uOiBcIklBTSByb2xlIGltcGxpY2l0bHkgY3JlYXRlZCBieSBDREsuXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgXVxuICAgICAgKTtcblxuICAgICAgaWYgKFxuICAgICAgICBwcm9wcy5jb25maWcucmFnLmVuZ2luZXMuYXVyb3JhLmVuYWJsZWQgfHxcbiAgICAgICAgcHJvcHMuY29uZmlnLnJhZy5lbmdpbmVzLm9wZW5zZWFyY2guZW5hYmxlZFxuICAgICAgKSB7XG4gICAgICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9TYWdlTWFrZXIvTW9kZWwvTXVsdGk0RDNEMC9Db2RlQnVpbGRSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL1NhZ2VNYWtlci9Nb2RlbC9NdWx0aTREM0QwL09uRXZlbnRIYW5kbGVyL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9TYWdlTWFrZXIvTW9kZWwvTXVsdGk0RDNEMC9Jc0NvbXBsZXRlSGFuZGxlci9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvU2FnZU1ha2VyL01vZGVsL011bHRpNEQzRDAvUHJvdmlkZXIvZnJhbWV3b3JrLW9uRXZlbnQvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL1NhZ2VNYWtlci9Nb2RlbC9NdWx0aTREM0QwL1Byb3ZpZGVyL2ZyYW1ld29yay1vbkV2ZW50L1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL1NhZ2VNYWtlci9Nb2RlbC9NdWx0aTREM0QwL1Byb3ZpZGVyL2ZyYW1ld29yay1pc0NvbXBsZXRlL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9TYWdlTWFrZXIvTW9kZWwvTXVsdGk0RDNEMC9Qcm92aWRlci9mcmFtZXdvcmstaXNDb21wbGV0ZS9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9TYWdlTWFrZXIvTW9kZWwvTXVsdGk0RDNEMC9Qcm92aWRlci9mcmFtZXdvcmstb25UaW1lb3V0L1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9TYWdlTWFrZXIvTW9kZWwvTXVsdGk0RDNEMC9Qcm92aWRlci9mcmFtZXdvcmstb25UaW1lb3V0L1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL1NhZ2VNYWtlci9Nb2RlbC9NdWx0aTREM0QwL1Byb3ZpZGVyL3dhaXRlci1zdGF0ZS1tYWNoaW5lL1JvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvU2FnZU1ha2VyL01vZGVsL011bHRpNEQzRDAvU2FnZU1ha2VyRXhlY3V0aW9uUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBdLFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTRcIixcbiAgICAgICAgICAgICAgcmVhc29uOiBcIklBTSByb2xlIGltcGxpY2l0bHkgY3JlYXRlZCBieSBDREsuXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgICAgICAgICByZWFzb246IFwiSUFNIHJvbGUgaW1wbGljaXRseSBjcmVhdGVkIGJ5IENESy5cIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgXVxuICAgICAgICApO1xuICAgICAgICBpZiAocHJvcHMuY29uZmlnLnJhZy5lbmdpbmVzLmF1cm9yYS5lbmFibGVkKSB7XG4gICAgICAgICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zQnlQYXRoKFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9BdXJvcmFQZ1ZlY3Rvci9BdXJvcmFEYXRhYmFzZS9TZWNyZXQvUmVzb3VyY2VgLFxuICAgICAgICAgICAgW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLVNNRzRcIixcbiAgICAgICAgICAgICAgICByZWFzb246IFwiU2VjcmV0IGNyZWF0ZWQgaW1wbGljaXRseSBieSBDREsuXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdXG4gICAgICAgICAgKTtcbiAgICAgICAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnNCeVBhdGgoXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgW1xuICAgICAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvQXVyb3JhUGdWZWN0b3IvRGF0YWJhc2VTZXR1cEZ1bmN0aW9uL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0F1cm9yYVBnVmVjdG9yL0RhdGFiYXNlU2V0dXBQcm92aWRlci9mcmFtZXdvcmstb25FdmVudC9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9BdXJvcmFQZ1ZlY3Rvci9EYXRhYmFzZVNldHVwUHJvdmlkZXIvZnJhbWV3b3JrLW9uRXZlbnQvU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9BdXJvcmFQZ1ZlY3Rvci9DcmVhdGVBdXJvcmFXb3Jrc3BhY2UvQ3JlYXRlQXVyb3JhV29ya3NwYWNlRnVuY3Rpb24vU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvQXVyb3JhUGdWZWN0b3IvQ3JlYXRlQXVyb3JhV29ya3NwYWNlL0NyZWF0ZUF1cm9yYVdvcmtzcGFjZUZ1bmN0aW9uL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvQXVyb3JhUGdWZWN0b3IvQ3JlYXRlQXVyb3JhV29ya3NwYWNlL0NyZWF0ZUF1cm9yYVdvcmtzcGFjZS9Sb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU00XCIsXG4gICAgICAgICAgICAgICAgcmVhc29uOiBcIklBTSByb2xlIGltcGxpY2l0bHkgY3JlYXRlZCBieSBDREsuXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgICAgICAgICAgIHJlYXNvbjogXCJJQU0gcm9sZSBpbXBsaWNpdGx5IGNyZWF0ZWQgYnkgQ0RLLlwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHByb3BzLmNvbmZpZy5yYWcuZW5naW5lcy5vcGVuc2VhcmNoLmVuYWJsZWQpIHtcbiAgICAgICAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnNCeVBhdGgoXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgW1xuICAgICAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvT3BlblNlYXJjaFZlY3Rvci9DcmVhdGVPcGVuU2VhcmNoV29ya3NwYWNlL0NyZWF0ZU9wZW5TZWFyY2hXb3Jrc3BhY2VGdW5jdGlvbi9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9PcGVuU2VhcmNoVmVjdG9yL0NyZWF0ZU9wZW5TZWFyY2hXb3Jrc3BhY2UvQ3JlYXRlT3BlblNlYXJjaFdvcmtzcGFjZUZ1bmN0aW9uL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvT3BlblNlYXJjaFZlY3Rvci9DcmVhdGVPcGVuU2VhcmNoV29ya3NwYWNlL0NyZWF0ZU9wZW5TZWFyY2hXb3Jrc3BhY2UvUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgICAgICAgICAgIHJlYXNvbjogXCJJQU0gcm9sZSBpbXBsaWNpdGx5IGNyZWF0ZWQgYnkgQ0RLLlwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICAgICAgICByZWFzb246IFwiSUFNIHJvbGUgaW1wbGljaXRseSBjcmVhdGVkIGJ5IENESy5cIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF1cbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAocHJvcHMuY29uZmlnLnJhZy5lbmdpbmVzLmtlbmRyYS5lbmFibGVkKSB7XG4gICAgICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgICAgICAgICB0aGlzLFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9LZW5kcmFSZXRyaWV2YWwvQ3JlYXRlQXVyb3JhV29ya3NwYWNlL0NyZWF0ZUtlbmRyYVdvcmtzcGFjZS9Sb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgICAgICAgICByZWFzb246IFwiSUFNIHJvbGUgaW1wbGljaXRseSBjcmVhdGVkIGJ5IENESy5cIixcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgICAgICAgIHJlYXNvbjogXCJJQU0gcm9sZSBpbXBsaWNpdGx5IGNyZWF0ZWQgYnkgQ0RLLlwiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdXG4gICAgICAgICk7XG4gICAgICAgIGlmIChwcm9wcy5jb25maWcucmFnLmVuZ2luZXMua2VuZHJhLmNyZWF0ZUluZGV4KSB7XG4gICAgICAgICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zQnlQYXRoKFxuICAgICAgICAgICAgdGhpcyxcbiAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0tlbmRyYVJldHJpZXZhbC9LZW5kcmFSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgICAgICAgICAgcmVhc29uOlxuICAgICAgICAgICAgICAgICAgXCJBY2Nlc3MgdG8gYWxsIGxvZyBncm91cHMgcmVxdWlyZWQgZm9yIENsb3VkV2F0Y2ggbG9nIGdyb3VwIGNyZWF0aW9uLlwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgLy8gSW1wbGljaXRseSBjcmVhdGVkIHJlc291cmNlcyB3aXRoIGNoYW5naW5nIHBhdGhzXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFN0YWNrU3VwcHJlc3Npb25zKHRoaXMsIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQ2RrTmFnVmFsaWRhdGlvbkZhaWx1cmVcIixcbiAgICAgICAgcmVhc29uOiBcIkludHJpbnN0aWMgZnVuY3Rpb24gcmVmZXJlbmNlcy5cIixcbiAgICAgIH0sXG4gICAgXSk7XG4gICAgLy8gTGFtYmRhIGZ1bmN0aW9ucyBzdGlsbCB1c2luZyBQeXRob24gMy4xMSBldmVuIHRob3VnaCBsYXRlc3QgcnVudGltZSBpcyAzLjEyLiBDYW4gYmUgcmVtb3ZlZCBhZnRlciB1cGdyYWRlLlxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRTdGFja1N1cHByZXNzaW9ucyh0aGlzLCBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1MMVwiLFxuICAgICAgICByZWFzb246IFwiTm90IHlldCB1cGdyYWRlZCBmcm9tIFB5dGhvbiAzLjExIHRvIDMuMTIuXCIsXG4gICAgICB9LFxuICAgIF0pO1xuXG4gICAgaWYgKHByb3BzLmNvbmZpZy5wcml2YXRlV2Vic2l0ZSkge1xuICAgICAgY29uc3QgcGF0aHMgPSBbXTtcbiAgICAgIGZvciAoXG4gICAgICAgIGxldCBpbmRleCA9IDA7XG4gICAgICAgIGluZGV4IDwgc2hhcmVkLnZwYy5hdmFpbGFiaWxpdHlab25lcy5sZW5ndGg7XG4gICAgICAgIGluZGV4KytcbiAgICAgICkge1xuICAgICAgICBwYXRocy5wdXNoKFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vVXNlckludGVyZmFjZS9Qcml2YXRlV2Vic2l0ZS9EZXNjcmliZU5ldHdvcmtJbnRlcmZhY2VzLSR7aW5kZXh9L0N1c3RvbVJlc291cmNlUG9saWN5L1Jlc291cmNlYFxuICAgICAgICApO1xuICAgICAgfVxuICAgICAgcGF0aHMucHVzaChcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9Vc2VySW50ZXJmYWNlL1ByaXZhdGVXZWJzaXRlL2Rlc2NyaWJlVnBjRW5kcG9pbnRzL0N1c3RvbVJlc291cmNlUG9saWN5L1Jlc291cmNlYFxuICAgICAgKTtcbiAgICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aCh0aGlzLCBwYXRocywgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICBcIkN1c3RvbSBSZXNvdXJjZSByZXF1aXJlcyBwZXJtaXNzaW9ucyB0byBEZXNjcmliZSBWUEMgRW5kcG9pbnQgTmV0d29yayBJbnRlcmZhY2VzXCIsXG4gICAgICAgIH0sXG4gICAgICBdKTtcbiAgICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgICAgICAgdGhpcyxcbiAgICAgICAgW1xuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQVdTNjc5ZjUzZmFjMDAyNDMwY2IwZGE1Yjc5ODJiZDIyODcvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICBdLFxuICAgICAgICBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTRcIixcbiAgICAgICAgICAgIHJlYXNvbjogXCJJQU0gcm9sZSBpbXBsaWNpdGx5IGNyZWF0ZWQgYnkgQ0RLLlwiLFxuICAgICAgICAgIH0sXG4gICAgICAgIF1cbiAgICAgICk7XG4gICAgfVxuICB9XG59XG4iXX0=