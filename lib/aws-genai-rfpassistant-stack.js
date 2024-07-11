"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwsGenaiRfpAssistantStack = void 0;
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
class AwsGenaiRfpAssistantStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, {
            description: "AWS RFP CHATBOT",
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
                // NagSuppressions.addResourceSuppressionsByPath(
                //   this,
                //   [
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/CodeBuildRole/DefaultPolicy/Resource`,
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/OnEventHandler/ServiceRole/Resource`,
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/IsCompleteHandler/ServiceRole/Resource`,
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/Provider/framework-onEvent/ServiceRole/Resource`,
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/Provider/framework-onEvent/ServiceRole/DefaultPolicy/Resource`,
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/Provider/framework-isComplete/ServiceRole/Resource`,
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/Provider/framework-isComplete/ServiceRole/DefaultPolicy/Resource`,
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/Provider/framework-onTimeout/ServiceRole/Resource`,
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/Provider/framework-onTimeout/ServiceRole/DefaultPolicy/Resource`,
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/Provider/waiter-state-machine/Role/DefaultPolicy/Resource`,
                //     `/${this.stackName}/RagEngines/SageMaker/Model/MultiAB24A/SageMakerExecutionRole/DefaultPolicy/Resource`,
                //   ],
                //   [
                //     {
                //       id: "AwsSolutions-IAM4",
                //       reason: "IAM role implicitly created by CDK.",
                //     },
                //     {
                //       id: "AwsSolutions-IAM5",
                //       reason: "IAM role implicitly created by CDK.",
                //     },
                //   ]
                // );
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
exports.AwsGenaiRfpAssistantStack = AwsGenaiRfpAssistantStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzLWdlbmFpLXJmcGFzc2lzdGFudC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF3cy1nZW5haS1yZnBhc3Npc3RhbnQtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBRW5DLDBDQUF5RTtBQUN6RSxxREFBa0Q7QUFDbEQscURBQWlEO0FBQ2pELHFDQUFrQztBQUNsQywrQ0FBMkM7QUFDM0MsK0NBQTJDO0FBQzNDLHFDQUFrQztBQUNsQyw0REFBa0U7QUFDbEUsd0RBQThEO0FBQzlELG1FQUFtRTtBQUNuRSwyQ0FBMkM7QUFDM0MscUNBQTBDO0FBTTFDLE1BQWEseUJBQTBCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDdEQsWUFDRSxLQUFnQixFQUNoQixFQUFVLEVBQ1YsS0FBbUM7UUFFbkMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUU7WUFDZixXQUFXLEVBQUUsaUJBQWlCO1lBQzlCLEdBQUcsS0FBSztTQUNULENBQUMsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDcEUsTUFBTSxjQUFjLEdBQUcsSUFBSSwrQkFBYyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2xFLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDeEMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3BCLE1BQU07U0FDUCxDQUFDLENBQUM7UUFFSCxJQUFJLFVBQVUsR0FBMkIsU0FBUyxDQUFDO1FBQ25ELElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFO1lBQzVCLFVBQVUsR0FBRyxJQUFJLHdCQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtnQkFDOUMsTUFBTTtn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bmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBTeXN0ZW1Db25maWcsIE1vZGVsSW50ZXJmYWNlLCBEaXJlY3Rpb24gfSBmcm9tIFwiLi9zaGFyZWQvdHlwZXNcIjtcbmltcG9ydCB7IEF1dGhlbnRpY2F0aW9uIH0gZnJvbSBcIi4vYXV0aGVudGljYXRpb25cIjtcbmltcG9ydCB7IFVzZXJJbnRlcmZhY2UgfSBmcm9tIFwiLi91c2VyLWludGVyZmFjZVwiO1xuaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4vc2hhcmVkXCI7XG5pbXBvcnQgeyBDaGF0Qm90QXBpIH0gZnJvbSBcIi4vY2hhdGJvdC1hcGlcIjtcbmltcG9ydCB7IFJhZ0VuZ2luZXMgfSBmcm9tIFwiLi9yYWctZW5naW5lc1wiO1xuaW1wb3J0IHsgTW9kZWxzIH0gZnJvbSBcIi4vbW9kZWxzXCI7XG5pbXBvcnQgeyBMYW5nQ2hhaW5JbnRlcmZhY2UgfSBmcm9tIFwiLi9tb2RlbC1pbnRlcmZhY2VzL2xhbmdjaGFpblwiO1xuaW1wb3J0IHsgSWRlZmljc0ludGVyZmFjZSB9IGZyb20gXCIuL21vZGVsLWludGVyZmFjZXMvaWRlZmljc1wiO1xuaW1wb3J0ICogYXMgc3Vic2NyaXB0aW9ucyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNucy1zdWJzY3JpcHRpb25zXCI7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zbnNcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXdzR2VuYWlSZnBBc3Npc3RhbnRTdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xuICByZWFkb25seSBjb25maWc6IFN5c3RlbUNvbmZpZztcbn1cblxuZXhwb3J0IGNsYXNzIEF3c0dlbmFpUmZwQXNzaXN0YW50U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihcbiAgICBzY29wZTogQ29uc3RydWN0LFxuICAgIGlkOiBzdHJpbmcsXG4gICAgcHJvcHM6IEF3c0dlbkFJTExNQ2hhdGJvdFN0YWNrUHJvcHNcbiAgKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCB7XG4gICAgICBkZXNjcmlwdGlvbjogXCJBV1MgUkZQIENIQVRCT1RcIixcbiAgICAgIC4uLnByb3BzLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgc2hhcmVkID0gbmV3IFNoYXJlZCh0aGlzLCBcIlNoYXJlZFwiLCB7IGNvbmZpZzogcHJvcHMuY29uZmlnIH0pO1xuICAgIGNvbnN0IGF1dGhlbnRpY2F0aW9uID0gbmV3IEF1dGhlbnRpY2F0aW9uKHRoaXMsIFwiQXV0aGVudGljYXRpb25cIik7XG4gICAgY29uc3QgbW9kZWxzID0gbmV3IE1vZGVscyh0aGlzLCBcIk1vZGVsc1wiLCB7XG4gICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcbiAgICAgIHNoYXJlZCxcbiAgICB9KTtcblxuICAgIGxldCByYWdFbmdpbmVzOiBSYWdFbmdpbmVzIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xuICAgIGlmIChwcm9wcy5jb25maWcucmFnLmVuYWJsZWQpIHtcbiAgICAgIHJhZ0VuZ2luZXMgPSBuZXcgUmFnRW5naW5lcyh0aGlzLCBcIlJhZ0VuZ2luZXNcIiwge1xuICAgICAgICBzaGFyZWQsXG4gICAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgY2hhdEJvdEFwaSA9IG5ldyBDaGF0Qm90QXBpKHRoaXMsIFwiQ2hhdEJvdEFwaVwiLCB7XG4gICAgICBzaGFyZWQsXG4gICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcbiAgICAgIHJhZ0VuZ2luZXM6IHJhZ0VuZ2luZXMsXG4gICAgICB1c2VyUG9vbDogYXV0aGVudGljYXRpb24udXNlclBvb2wsXG4gICAgICBtb2RlbHNQYXJhbWV0ZXI6IG1vZGVscy5tb2RlbHNQYXJhbWV0ZXIsXG4gICAgICBtb2RlbHM6IG1vZGVscy5tb2RlbHMsXG4gICAgfSk7XG5cbiAgICAvLyBMYW5nY2hhaW4gSW50ZXJmYWNlIENvbnN0cnVjdFxuICAgIC8vIFRoaXMgaXMgdGhlIG1vZGVsIGludGVyZmFjZSByZWNlaXZpbmcgbWVzc2FnZXMgZnJvbSB0aGUgd2Vic29ja2V0IGludGVyZmFjZSB2aWEgdGhlIG1lc3NhZ2UgdG9waWNcbiAgICAvLyBhbmQgaW50ZXJhY3Rpbmcgd2l0aCB0aGUgbW9kZWwgdmlhIExhbmdDaGFpbiBsaWJyYXJ5XG4gICAgY29uc3QgbGFuZ2NoYWluTW9kZWxzID0gbW9kZWxzLm1vZGVscy5maWx0ZXIoXG4gICAgICAobW9kZWwpID0+IG1vZGVsLmludGVyZmFjZSA9PT0gTW9kZWxJbnRlcmZhY2UuTGFuZ0NoYWluXG4gICAgKTtcblxuICAgIC8vIGNoZWNrIGlmIGFueSBkZXBsb3llZCBtb2RlbCByZXF1aXJlcyBsYW5nY2hhaW4gaW50ZXJmYWNlIG9yIGlmIGJlZHJvY2sgaXMgZW5hYmxlZCBmcm9tIGNvbmZpZ1xuICAgIGlmIChsYW5nY2hhaW5Nb2RlbHMubGVuZ3RoID4gMCB8fCBwcm9wcy5jb25maWcuYmVkcm9jaz8uZW5hYmxlZCkge1xuICAgICAgY29uc3QgbGFuZ2NoYWluSW50ZXJmYWNlID0gbmV3IExhbmdDaGFpbkludGVyZmFjZShcbiAgICAgICAgdGhpcyxcbiAgICAgICAgXCJMYW5nY2hhaW5JbnRlcmZhY2VcIixcbiAgICAgICAge1xuICAgICAgICAgIHNoYXJlZCxcbiAgICAgICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcbiAgICAgICAgICByYWdFbmdpbmVzLFxuICAgICAgICAgIG1lc3NhZ2VzVG9waWM6IGNoYXRCb3RBcGkubWVzc2FnZXNUb3BpYyxcbiAgICAgICAgICBzZXNzaW9uc1RhYmxlOiBjaGF0Qm90QXBpLnNlc3Npb25zVGFibGUsXG4gICAgICAgICAgcXVlc3Rpb25zVGFibGU6IGNoYXRCb3RBcGkucXVlc3Rpb25zVGFibGUsXG4gICAgICAgICAgYnlTZXNzaW9uSWRJbmRleDogY2hhdEJvdEFwaS5ieVNlc3Npb25JZEluZGV4LFxuICAgICAgICAgIGZpbGVzQnVja2V0OiBjaGF0Qm90QXBpLmZpbGVzQnVja2V0XG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIC8vIFJvdXRlIGFsbCBpbmNvbWluZyBtZXNzYWdlcyB0YXJnZXRlZCB0byBsYW5nY2hhaW4gdG8gdGhlIGxhbmdjaGFpbiBtb2RlbCBpbnRlcmZhY2UgcXVldWVcbiAgICAgIGNoYXRCb3RBcGkubWVzc2FnZXNUb3BpYy5hZGRTdWJzY3JpcHRpb24oXG4gICAgICAgIG5ldyBzdWJzY3JpcHRpb25zLlNxc1N1YnNjcmlwdGlvbihsYW5nY2hhaW5JbnRlcmZhY2UuaW5nZXN0aW9uUXVldWUsIHtcbiAgICAgICAgICBmaWx0ZXJQb2xpY3lXaXRoTWVzc2FnZUJvZHk6IHtcbiAgICAgICAgICAgIGRpcmVjdGlvbjogc25zLkZpbHRlck9yUG9saWN5LmZpbHRlcihcbiAgICAgICAgICAgICAgc25zLlN1YnNjcmlwdGlvbkZpbHRlci5zdHJpbmdGaWx0ZXIoe1xuICAgICAgICAgICAgICAgIGFsbG93bGlzdDogW0RpcmVjdGlvbi5Jbl0sXG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgbW9kZWxJbnRlcmZhY2U6IHNucy5GaWx0ZXJPclBvbGljeS5maWx0ZXIoXG4gICAgICAgICAgICAgIHNucy5TdWJzY3JpcHRpb25GaWx0ZXIuc3RyaW5nRmlsdGVyKHtcbiAgICAgICAgICAgICAgICBhbGxvd2xpc3Q6IFtNb2RlbEludGVyZmFjZS5MYW5nQ2hhaW5dLFxuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KVxuICAgICAgKTtcblxuICAgICAgZm9yIChjb25zdCBtb2RlbCBvZiBtb2RlbHMubW9kZWxzKSB7XG4gICAgICAgIGlmIChtb2RlbC5pbnRlcmZhY2UgPT09IE1vZGVsSW50ZXJmYWNlLkxhbmdDaGFpbikge1xuICAgICAgICAgIGxhbmdjaGFpbkludGVyZmFjZS5hZGRTYWdlTWFrZXJFbmRwb2ludChtb2RlbCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBJREVGSUNTIEludGVyZmFjZSBDb25zdHJ1Y3RcbiAgICAvLyBUaGlzIGlzIHRoZSBtb2RlbCBpbnRlcmZhY2UgcmVjZWl2aW5nIG1lc3NhZ2VzIGZyb20gdGhlIHdlYnNvY2tldCBpbnRlcmZhY2UgdmlhIHRoZSBtZXNzYWdlIHRvcGljXG4gICAgLy8gYW5kIGludGVyYWN0aW5nIHdpdGggSURFRklDUyB2aXN1YWwgbGFuZ3VhZ2UgbW9kZWxzXG4gICAgY29uc3QgaWRlZmljc01vZGVscyA9IG1vZGVscy5tb2RlbHMuZmlsdGVyKFxuICAgICAgKG1vZGVsKSA9PiBtb2RlbC5pbnRlcmZhY2UgPT09IE1vZGVsSW50ZXJmYWNlLk11bHRpTW9kYWxcbiAgICApO1xuXG4gICAgLy8gY2hlY2sgaWYgYW55IGRlcGxveWVkIG1vZGVsIHJlcXVpcmVzIGlkZWZpY3MgaW50ZXJmYWNlXG5cbiAgICBjb25zdCBpZGVmaWNzSW50ZXJmYWNlID0gbmV3IElkZWZpY3NJbnRlcmZhY2UodGhpcywgXCJJZGVmaWNzSW50ZXJmYWNlXCIsIHtcbiAgICAgIHNoYXJlZCxcbiAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgbWVzc2FnZXNUb3BpYzogY2hhdEJvdEFwaS5tZXNzYWdlc1RvcGljLFxuICAgICAgc2Vzc2lvbnNUYWJsZTogY2hhdEJvdEFwaS5zZXNzaW9uc1RhYmxlLCAgICBcbiAgICAgIHF1ZXN0aW9uc1RhYmxlOiBjaGF0Qm90QXBpLnF1ZXN0aW9uc1RhYmxlLFxuICAgICAgYnlTZXNzaW9uSWRJbmRleDogY2hhdEJvdEFwaS5ieVNlc3Npb25JZEluZGV4LFxuICAgICAgY2hhdGJvdEZpbGVzQnVja2V0OiBjaGF0Qm90QXBpLmZpbGVzQnVja2V0LFxuICAgIH0pO1xuXG4gICAgLy8gUm91dGUgYWxsIGluY29taW5nIG1lc3NhZ2VzIHRhcmdldGVkIHRvIGlkZWZpY3MgdG8gdGhlIGlkZWZpY3MgbW9kZWwgaW50ZXJmYWNlIHF1ZXVlXG4gICAgY2hhdEJvdEFwaS5tZXNzYWdlc1RvcGljLmFkZFN1YnNjcmlwdGlvbihcbiAgICAgIG5ldyBzdWJzY3JpcHRpb25zLlNxc1N1YnNjcmlwdGlvbihpZGVmaWNzSW50ZXJmYWNlLmluZ2VzdGlvblF1ZXVlLCB7XG4gICAgICAgIGZpbHRlclBvbGljeVdpdGhNZXNzYWdlQm9keToge1xuICAgICAgICAgIGRpcmVjdGlvbjogc25zLkZpbHRlck9yUG9saWN5LmZpbHRlcihcbiAgICAgICAgICAgIHNucy5TdWJzY3JpcHRpb25GaWx0ZXIuc3RyaW5nRmlsdGVyKHtcbiAgICAgICAgICAgICAgYWxsb3dsaXN0OiBbRGlyZWN0aW9uLkluXSxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKSxcbiAgICAgICAgICBtb2RlbEludGVyZmFjZTogc25zLkZpbHRlck9yUG9saWN5LmZpbHRlcihcbiAgICAgICAgICAgIHNucy5TdWJzY3JpcHRpb25GaWx0ZXIuc3RyaW5nRmlsdGVyKHtcbiAgICAgICAgICAgICAgYWxsb3dsaXN0OiBbTW9kZWxJbnRlcmZhY2UuTXVsdGlNb2RhbF0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICksXG4gICAgICAgIH0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICBmb3IgKGNvbnN0IG1vZGVsIG9mIG1vZGVscy5tb2RlbHMpIHtcbiAgICAgIC8vIGlmIG1vZGVsIG5hbWUgY29udGFpbnMgaWRlZmljcyB0aGVuIGFkZCB0byBpZGVmaWNzIGludGVyZmFjZVxuICAgICAgaWYgKG1vZGVsLmludGVyZmFjZSA9PT0gTW9kZWxJbnRlcmZhY2UuTXVsdGlNb2RhbCkge1xuICAgICAgICBpZGVmaWNzSW50ZXJmYWNlLmFkZFNhZ2VNYWtlckVuZHBvaW50KG1vZGVsKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBuZXcgVXNlckludGVyZmFjZSh0aGlzLCBcIlVzZXJJbnRlcmZhY2VcIiwge1xuICAgICAgc2hhcmVkLFxuICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcsXG4gICAgICB1c2VyUG9vbElkOiBhdXRoZW50aWNhdGlvbi51c2VyUG9vbC51c2VyUG9vbElkLFxuICAgICAgdXNlclBvb2xDbGllbnRJZDogYXV0aGVudGljYXRpb24udXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICAgIGlkZW50aXR5UG9vbDogYXV0aGVudGljYXRpb24uaWRlbnRpdHlQb29sLFxuICAgICAgYXBpOiBjaGF0Qm90QXBpLFxuICAgICAgY2hhdGJvdEZpbGVzQnVja2V0OiBjaGF0Qm90QXBpLmZpbGVzQnVja2V0LFxuICAgICAgY3Jvc3NFbmNvZGVyc0VuYWJsZWQ6XG4gICAgICAgIHR5cGVvZiByYWdFbmdpbmVzPy5zYWdlTWFrZXJSYWdNb2RlbHM/Lm1vZGVsICE9PSBcInVuZGVmaW5lZFwiLFxuICAgICAgc2FnZW1ha2VyRW1iZWRkaW5nc0VuYWJsZWQ6XG4gICAgICAgIHR5cGVvZiByYWdFbmdpbmVzPy5zYWdlTWFrZXJSYWdNb2RlbHM/Lm1vZGVsICE9PSBcInVuZGVmaW5lZFwiLFxuICAgIH0pO1xuXG4gICAgLyoqXG4gICAgICogQ0RLIE5BRyBzdXBwcmVzc2lvblxuICAgICAqL1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgICAgIHRoaXMsXG4gICAgICBbXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQ3VzdG9tOjpDREtCdWNrZXREZXBsb3ltZW50ODY5M0JCNjQ5Njg5NDRCNjlBQUZCMENDOUVCODc1NkMvUmVzb3VyY2VgLFxuICAgICAgXSxcbiAgICAgIFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1MMVwiLFxuICAgICAgICAgIHJlYXNvbjogXCJMYW1iZGEgZnVuY3Rpb24gY3JlYXRlZCBpbXBsaWNpdGx5IGJ5IENESy5cIixcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICApO1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgICAgIHRoaXMsXG4gICAgICBbXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQXV0aGVudGljYXRpb24vSWRlbnRpdHlQb29sL0F1dGhlbnRpY2F0ZWRSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0F1dGhlbnRpY2F0aW9uL1VzZXJQb29sL3Ntc1JvbGUvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0N1c3RvbTo6Q0RLQnVja2V0RGVwbG95bWVudDg2OTNCQjY0OTY4OTQ0QjY5QUFGQjBDQzlFQjg3NTZDL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0xvZ1JldGVudGlvbmFhZTBhYTNjNWI0ZDRmODdiMDJkODViMjAxZWZkZDhhL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9Mb2dSZXRlbnRpb25hYWUwYWEzYzViNGQ0Zjg3YjAyZDg1YjIwMWVmZGQ4YS9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9MYW5nY2hhaW5JbnRlcmZhY2UvUmVxdWVzdEhhbmRsZXIvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0xhbmdjaGFpbkludGVyZmFjZS9SZXF1ZXN0SGFuZGxlci9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9DdXN0b206OkNES0J1Y2tldERlcGxveW1lbnQ4NjkzQkI2NDk2ODk0NEI2OUFBRkIwQ0M5RUI4NzU2Qy9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQ2hhdEJvdEFwaS9DaGF0Ym90QXBpL3Byb3h5UmVzb2x2ZXJGdW5jdGlvbi9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9DaGF0Qm90QXBpL0NoYXRib3RBcGkvcmVhbHRpbWVSZXNvbHZlckZ1bmN0aW9uL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0NoYXRCb3RBcGkvUmVzdEFwaS9HcmFwaFFMQXBpSGFuZGxlci9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQ2hhdEJvdEFwaS9SZXN0QXBpL0dyYXBoUUxBcGlIYW5kbGVyL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0NoYXRCb3RBcGkvUmVhbHRpbWUvUmVzb2x2ZXJzL2xhbWJkYS1yZXNvbHZlci9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQ2hhdEJvdEFwaS9SZWFsdGltZS9SZXNvbHZlcnMvb3V0Z29pbmctbWVzc2FnZS1oYW5kbGVyL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9DaGF0Qm90QXBpL1JlYWx0aW1lL1Jlc29sdmVycy9vdXRnb2luZy1tZXNzYWdlLWhhbmRsZXIvU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vSWRlZmljc0ludGVyZmFjZS9JZGVmaWNzSW50ZXJmYWNlUmVxdWVzdEhhbmRsZXIvU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vSWRlZmljc0ludGVyZmFjZS9JZGVmaWNzSW50ZXJmYWNlUmVxdWVzdEhhbmRsZXIvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0lkZWZpY3NJbnRlcmZhY2UvQ2hhdGJvdEZpbGVzUHJpdmF0ZUFwaS9DbG91ZFdhdGNoUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vSWRlZmljc0ludGVyZmFjZS9TM0ludGVncmF0aW9uUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgIF0sXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgICAgIHJlYXNvbjogXCJJQU0gcm9sZSBpbXBsaWNpdGx5IGNyZWF0ZWQgYnkgQ0RLLlwiLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICByZWFzb246IFwiSUFNIHJvbGUgaW1wbGljaXRseSBjcmVhdGVkIGJ5IENESy5cIixcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICApO1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgICAgIHRoaXMsXG4gICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0lkZWZpY3NJbnRlcmZhY2UvQ2hhdGJvdEZpbGVzUHJpdmF0ZUFwaS9EZXBsb3ltZW50U3RhZ2UucHJvZC9SZXNvdXJjZWAsXG4gICAgICBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtQVBJRzNcIixcbiAgICAgICAgICByZWFzb246IFwiV0FGIG5vdCByZXF1aXJlZCBkdWUgdG8gY29uZmlndXJlZCBDb2duaXRvIGF1dGguXCIsXG4gICAgICAgIH0sXG4gICAgICBdXG4gICAgKTtcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnNCeVBhdGgoXG4gICAgICB0aGlzLFxuICAgICAgW1xuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L0lkZWZpY3NJbnRlcmZhY2UvQ2hhdGJvdEZpbGVzUHJpdmF0ZUFwaS9EZWZhdWx0L3tvYmplY3R9L0FOWS9SZXNvdXJjZWAsXG4gICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vSWRlZmljc0ludGVyZmFjZS9DaGF0Ym90RmlsZXNQcml2YXRlQXBpL0RlZmF1bHQve29iamVjdH0vQU5ZL1Jlc291cmNlYCxcbiAgICAgIF0sXG4gICAgICBbXG4gICAgICAgIHsgaWQ6IFwiQXdzU29sdXRpb25zLUFQSUc0XCIsIHJlYXNvbjogXCJQcml2YXRlIEFQSSB3aXRoaW4gYSBWUEMuXCIgfSxcbiAgICAgICAgeyBpZDogXCJBd3NTb2x1dGlvbnMtQ09HNFwiLCByZWFzb246IFwiUHJpdmF0ZSBBUEkgd2l0aGluIGEgVlBDLlwiIH0sXG4gICAgICBdXG4gICAgKTtcblxuICAgIC8vIFJBRyBjb25maWd1cmF0aW9uXG4gICAgaWYgKHByb3BzLmNvbmZpZy5yYWcuZW5hYmxlZCkge1xuICAgICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zQnlQYXRoKFxuICAgICAgICB0aGlzLFxuICAgICAgICBbXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvRmlsZUltcG9ydEJhdGNoSm9iL0ZpbGVJbXBvcnRKb2JSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9EYXRhSW1wb3J0L1dlYkNyYXdsZXJCYXRjaEpvYi9XZWJDcmF3bGVySm9iUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9GaWxlSW1wb3J0QmF0Y2hKb2IvRmlsZUltcG9ydENvbnRhaW5lci9FeGVjdXRpb25Sb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9EYXRhSW1wb3J0L1dlYkNyYXdsZXJCYXRjaEpvYi9XZWJDcmF3bGVyQ29udGFpbmVyL0V4ZWN1dGlvblJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvRmlsZUltcG9ydFdvcmtmbG93L0ZpbGVJbXBvcnRTdGF0ZU1hY2hpbmUvUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9XZWJzaXRlQ3Jhd2xpbmdXb3JrZmxvdy9XZWJzaXRlQ3Jhd2xpbmcvUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9VcGxvYWRIYW5kbGVyL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9VcGxvYWRIYW5kbGVyL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9Xb3Jrc3BhY2VzL0RlbGV0ZVdvcmtzcGFjZS9EZWxldGVXb3Jrc3BhY2VGdW5jdGlvbi9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL1dvcmtzcGFjZXMvRGVsZXRlV29ya3NwYWNlL0RlbGV0ZVdvcmtzcGFjZUZ1bmN0aW9uL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9Xb3Jrc3BhY2VzL0RlbGV0ZVdvcmtzcGFjZS9EZWxldGVXb3Jrc3BhY2UvUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9GaWxlSW1wb3J0QmF0Y2hKb2IvTWFuYWdlZEVjMkVjc0NvbXB1dGVFbnZpcm9ubWVudC9JbnN0YW5jZVByb2ZpbGVSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvRGF0YUltcG9ydC9XZWJDcmF3bGVyQmF0Y2hKb2IvV2ViQ3Jhd2xlck1hbmFnZWRFYzJFY3NDb21wdXRlRW52aXJvbm1lbnQvSW5zdGFuY2VQcm9maWxlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9CdWNrZXROb3RpZmljYXRpb25zSGFuZGxlcjA1MGEwNTg3Yjc1NDQ1NDdiZjMyNWYwOTRhM2RiODM0L1JvbGUvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vQnVja2V0Tm90aWZpY2F0aW9uc0hhbmRsZXIwNTBhMDU4N2I3NTQ0NTQ3YmYzMjVmMDk0YTNkYjgzNC9Sb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9EYXRhSW1wb3J0L1Jzc1N1YnNjcmlwdGlvbi9Sc3NJbmdlc3Rvci9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvUnNzU3Vic2NyaXB0aW9uL1Jzc0luZ2VzdG9yL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9EYXRhSW1wb3J0L1Jzc1N1YnNjcmlwdGlvbi90cmlnZ2VyUnNzSW5nZXN0b3JzRnVuY3Rpb24vU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9EYXRhSW1wb3J0L1Jzc1N1YnNjcmlwdGlvbi90cmlnZ2VyUnNzSW5nZXN0b3JzRnVuY3Rpb24vU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvUnNzU3Vic2NyaXB0aW9uL2NyYXdsUXVldWVkUnNzUG9zdHNGdW5jdGlvbi9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0RhdGFJbXBvcnQvUnNzU3Vic2NyaXB0aW9uL2NyYXdsUXVldWVkUnNzUG9zdHNGdW5jdGlvbi9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgXSxcbiAgICAgICAgW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU00XCIsXG4gICAgICAgICAgICByZWFzb246IFwiSUFNIHJvbGUgaW1wbGljaXRseSBjcmVhdGVkIGJ5IENESy5cIixcbiAgICAgICAgICB9LFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgICAgICByZWFzb246IFwiSUFNIHJvbGUgaW1wbGljaXRseSBjcmVhdGVkIGJ5IENESy5cIixcbiAgICAgICAgICB9LFxuICAgICAgICBdXG4gICAgICApO1xuXG4gICAgICBpZiAoXG4gICAgICAgIHByb3BzLmNvbmZpZy5yYWcuZW5naW5lcy5hdXJvcmEuZW5hYmxlZCB8fFxuICAgICAgICBwcm9wcy5jb25maWcucmFnLmVuZ2luZXMub3BlbnNlYXJjaC5lbmFibGVkXG4gICAgICApIHtcbiAgICAgICAgLy8gTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zQnlQYXRoKFxuICAgICAgICAvLyAgIHRoaXMsXG4gICAgICAgIC8vICAgW1xuICAgICAgICAvLyAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL1NhZ2VNYWtlci9Nb2RlbC9NdWx0aUFCMjRBL0NvZGVCdWlsZFJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgIC8vICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvU2FnZU1ha2VyL01vZGVsL011bHRpQUIyNEEvT25FdmVudEhhbmRsZXIvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAvLyAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL1NhZ2VNYWtlci9Nb2RlbC9NdWx0aUFCMjRBL0lzQ29tcGxldGVIYW5kbGVyL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgLy8gICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9TYWdlTWFrZXIvTW9kZWwvTXVsdGlBQjI0QS9Qcm92aWRlci9mcmFtZXdvcmstb25FdmVudC9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgIC8vICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvU2FnZU1ha2VyL01vZGVsL011bHRpQUIyNEEvUHJvdmlkZXIvZnJhbWV3b3JrLW9uRXZlbnQvU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgIC8vICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvU2FnZU1ha2VyL01vZGVsL011bHRpQUIyNEEvUHJvdmlkZXIvZnJhbWV3b3JrLWlzQ29tcGxldGUvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAvLyAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL1NhZ2VNYWtlci9Nb2RlbC9NdWx0aUFCMjRBL1Byb3ZpZGVyL2ZyYW1ld29yay1pc0NvbXBsZXRlL1NlcnZpY2VSb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAvLyAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL1NhZ2VNYWtlci9Nb2RlbC9NdWx0aUFCMjRBL1Byb3ZpZGVyL2ZyYW1ld29yay1vblRpbWVvdXQvU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAvLyAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL1NhZ2VNYWtlci9Nb2RlbC9NdWx0aUFCMjRBL1Byb3ZpZGVyL2ZyYW1ld29yay1vblRpbWVvdXQvU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgIC8vICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvU2FnZU1ha2VyL01vZGVsL011bHRpQUIyNEEvUHJvdmlkZXIvd2FpdGVyLXN0YXRlLW1hY2hpbmUvUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgLy8gICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9TYWdlTWFrZXIvTW9kZWwvTXVsdGlBQjI0QS9TYWdlTWFrZXJFeGVjdXRpb25Sb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAvLyAgIF0sXG4gICAgICAgIC8vICAgW1xuICAgICAgICAvLyAgICAge1xuICAgICAgICAvLyAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgICAvLyAgICAgICByZWFzb246IFwiSUFNIHJvbGUgaW1wbGljaXRseSBjcmVhdGVkIGJ5IENESy5cIixcbiAgICAgICAgLy8gICAgIH0sXG4gICAgICAgIC8vICAgICB7XG4gICAgICAgIC8vICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgIC8vICAgICAgIHJlYXNvbjogXCJJQU0gcm9sZSBpbXBsaWNpdGx5IGNyZWF0ZWQgYnkgQ0RLLlwiLFxuICAgICAgICAvLyAgICAgfSxcbiAgICAgICAgLy8gICBdXG4gICAgICAgIC8vICk7XG4gICAgICAgIGlmIChwcm9wcy5jb25maWcucmFnLmVuZ2luZXMuYXVyb3JhLmVuYWJsZWQpIHtcbiAgICAgICAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnNCeVBhdGgoXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0F1cm9yYVBnVmVjdG9yL0F1cm9yYURhdGFiYXNlL1NlY3JldC9SZXNvdXJjZWAsXG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtU01HNFwiLFxuICAgICAgICAgICAgICAgIHJlYXNvbjogXCJTZWNyZXQgY3JlYXRlZCBpbXBsaWNpdGx5IGJ5IENESy5cIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF1cbiAgICAgICAgICApO1xuICAgICAgICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9BdXJvcmFQZ1ZlY3Rvci9EYXRhYmFzZVNldHVwRnVuY3Rpb24vU2VydmljZVJvbGUvUmVzb3VyY2VgLFxuICAgICAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvQXVyb3JhUGdWZWN0b3IvRGF0YWJhc2VTZXR1cFByb3ZpZGVyL2ZyYW1ld29yay1vbkV2ZW50L1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0F1cm9yYVBnVmVjdG9yL0RhdGFiYXNlU2V0dXBQcm92aWRlci9mcmFtZXdvcmstb25FdmVudC9TZXJ2aWNlUm9sZS9EZWZhdWx0UG9saWN5L1Jlc291cmNlYCxcbiAgICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0F1cm9yYVBnVmVjdG9yL0NyZWF0ZUF1cm9yYVdvcmtzcGFjZS9DcmVhdGVBdXJvcmFXb3Jrc3BhY2VGdW5jdGlvbi9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9BdXJvcmFQZ1ZlY3Rvci9DcmVhdGVBdXJvcmFXb3Jrc3BhY2UvQ3JlYXRlQXVyb3JhV29ya3NwYWNlRnVuY3Rpb24vU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9BdXJvcmFQZ1ZlY3Rvci9DcmVhdGVBdXJvcmFXb3Jrc3BhY2UvQ3JlYXRlQXVyb3JhV29ya3NwYWNlL1JvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTRcIixcbiAgICAgICAgICAgICAgICByZWFzb246IFwiSUFNIHJvbGUgaW1wbGljaXRseSBjcmVhdGVkIGJ5IENESy5cIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgICAgICAgICAgcmVhc29uOiBcIklBTSByb2xlIGltcGxpY2l0bHkgY3JlYXRlZCBieSBDREsuXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAocHJvcHMuY29uZmlnLnJhZy5lbmdpbmVzLm9wZW5zZWFyY2guZW5hYmxlZCkge1xuICAgICAgICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9uc0J5UGF0aChcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBbXG4gICAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9PcGVuU2VhcmNoVmVjdG9yL0NyZWF0ZU9wZW5TZWFyY2hXb3Jrc3BhY2UvQ3JlYXRlT3BlblNlYXJjaFdvcmtzcGFjZUZ1bmN0aW9uL1NlcnZpY2VSb2xlL1Jlc291cmNlYCxcbiAgICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL09wZW5TZWFyY2hWZWN0b3IvQ3JlYXRlT3BlblNlYXJjaFdvcmtzcGFjZS9DcmVhdGVPcGVuU2VhcmNoV29ya3NwYWNlRnVuY3Rpb24vU2VydmljZVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgICAgIGAvJHt0aGlzLnN0YWNrTmFtZX0vUmFnRW5naW5lcy9PcGVuU2VhcmNoVmVjdG9yL0NyZWF0ZU9wZW5TZWFyY2hXb3Jrc3BhY2UvQ3JlYXRlT3BlblNlYXJjaFdvcmtzcGFjZS9Sb2xlL0RlZmF1bHRQb2xpY3kvUmVzb3VyY2VgLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU00XCIsXG4gICAgICAgICAgICAgICAgcmVhc29uOiBcIklBTSByb2xlIGltcGxpY2l0bHkgY3JlYXRlZCBieSBDREsuXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgICAgICAgICAgIHJlYXNvbjogXCJJQU0gcm9sZSBpbXBsaWNpdGx5IGNyZWF0ZWQgYnkgQ0RLLlwiLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChwcm9wcy5jb25maWcucmFnLmVuZ2luZXMua2VuZHJhLmVuYWJsZWQpIHtcbiAgICAgICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zQnlQYXRoKFxuICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgW1xuICAgICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9SYWdFbmdpbmVzL0tlbmRyYVJldHJpZXZhbC9DcmVhdGVBdXJvcmFXb3Jrc3BhY2UvQ3JlYXRlS2VuZHJhV29ya3NwYWNlL1JvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU00XCIsXG4gICAgICAgICAgICAgIHJlYXNvbjogXCJJQU0gcm9sZSBpbXBsaWNpdGx5IGNyZWF0ZWQgYnkgQ0RLLlwiLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICAgICAgcmVhc29uOiBcIklBTSByb2xlIGltcGxpY2l0bHkgY3JlYXRlZCBieSBDREsuXCIsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIF1cbiAgICAgICAgKTtcbiAgICAgICAgaWYgKHByb3BzLmNvbmZpZy5yYWcuZW5naW5lcy5rZW5kcmEuY3JlYXRlSW5kZXgpIHtcbiAgICAgICAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnNCeVBhdGgoXG4gICAgICAgICAgICB0aGlzLFxuICAgICAgICAgICAgW1xuICAgICAgICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1JhZ0VuZ2luZXMvS2VuZHJhUmV0cmlldmFsL0tlbmRyYVJvbGUvRGVmYXVsdFBvbGljeS9SZXNvdXJjZWAsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUlBTTVcIixcbiAgICAgICAgICAgICAgICByZWFzb246XG4gICAgICAgICAgICAgICAgICBcIkFjY2VzcyB0byBhbGwgbG9nIGdyb3VwcyByZXF1aXJlZCBmb3IgQ2xvdWRXYXRjaCBsb2cgZ3JvdXAgY3JlYXRpb24uXCIsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICAvLyBJbXBsaWNpdGx5IGNyZWF0ZWQgcmVzb3VyY2VzIHdpdGggY2hhbmdpbmcgcGF0aHNcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkU3RhY2tTdXBwcmVzc2lvbnModGhpcywgW1xuICAgICAge1xuICAgICAgICBpZDogXCJDZGtOYWdWYWxpZGF0aW9uRmFpbHVyZVwiLFxuICAgICAgICByZWFzb246IFwiSW50cmluc3RpYyBmdW5jdGlvbiByZWZlcmVuY2VzLlwiLFxuICAgICAgfSxcbiAgICBdKTtcbiAgICAvLyBMYW1iZGEgZnVuY3Rpb25zIHN0aWxsIHVzaW5nIFB5dGhvbiAzLjExIGV2ZW4gdGhvdWdoIGxhdGVzdCBydW50aW1lIGlzIDMuMTIuIENhbiBiZSByZW1vdmVkIGFmdGVyIHVwZ3JhZGUuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFN0YWNrU3VwcHJlc3Npb25zKHRoaXMsIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUwxXCIsXG4gICAgICAgIHJlYXNvbjogXCJOb3QgeWV0IHVwZ3JhZGVkIGZyb20gUHl0aG9uIDMuMTEgdG8gMy4xMi5cIixcbiAgICAgIH0sXG4gICAgXSk7XG5cbiAgICBpZiAocHJvcHMuY29uZmlnLnByaXZhdGVXZWJzaXRlKSB7XG4gICAgICBjb25zdCBwYXRocyA9IFtdO1xuICAgICAgZm9yIChcbiAgICAgICAgbGV0IGluZGV4ID0gMDtcbiAgICAgICAgaW5kZXggPCBzaGFyZWQudnBjLmF2YWlsYWJpbGl0eVpvbmVzLmxlbmd0aDtcbiAgICAgICAgaW5kZXgrK1xuICAgICAgKSB7XG4gICAgICAgIHBhdGhzLnB1c2goXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9Vc2VySW50ZXJmYWNlL1ByaXZhdGVXZWJzaXRlL0Rlc2NyaWJlTmV0d29ya0ludGVyZmFjZXMtJHtpbmRleH0vQ3VzdG9tUmVzb3VyY2VQb2xpY3kvUmVzb3VyY2VgXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgICBwYXRocy5wdXNoKFxuICAgICAgICBgLyR7dGhpcy5zdGFja05hbWV9L1VzZXJJbnRlcmZhY2UvUHJpdmF0ZVdlYnNpdGUvZGVzY3JpYmVWcGNFbmRwb2ludHMvQ3VzdG9tUmVzb3VyY2VQb2xpY3kvUmVzb3VyY2VgXG4gICAgICApO1xuICAgICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zQnlQYXRoKHRoaXMsIHBhdGhzLCBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNVwiLFxuICAgICAgICAgIHJlYXNvbjpcbiAgICAgICAgICAgIFwiQ3VzdG9tIFJlc291cmNlIHJlcXVpcmVzIHBlcm1pc3Npb25zIHRvIERlc2NyaWJlIFZQQyBFbmRwb2ludCBOZXR3b3JrIEludGVyZmFjZXNcIixcbiAgICAgICAgfSxcbiAgICAgIF0pO1xuICAgICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zQnlQYXRoKFxuICAgICAgICB0aGlzLFxuICAgICAgICBbXG4gICAgICAgICAgYC8ke3RoaXMuc3RhY2tOYW1lfS9BV1M2NzlmNTNmYWMwMDI0MzBjYjBkYTViNzk4MmJkMjI4Ny9TZXJ2aWNlUm9sZS9SZXNvdXJjZWAsXG4gICAgICAgIF0sXG4gICAgICAgIFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogXCJBd3NTb2x1dGlvbnMtSUFNNFwiLFxuICAgICAgICAgICAgcmVhc29uOiBcIklBTSByb2xlIGltcGxpY2l0bHkgY3JlYXRlZCBieSBDREsuXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgXVxuICAgICAgKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==