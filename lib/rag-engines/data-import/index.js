"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataImport = void 0;
const path = require("path");
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const file_import_batch_job_1 = require("./file-import-batch-job");
const file_import_workflow_1 = require("./file-import-workflow");
const website_crawling_workflow_1 = require("./website-crawling-workflow");
const rss_subscription_1 = require("./rss-subscription");
const s3 = require("aws-cdk-lib/aws-s3");
const sqs = require("aws-cdk-lib/aws-sqs");
const lambda = require("aws-cdk-lib/aws-lambda");
const logs = require("aws-cdk-lib/aws-logs");
const iam = require("aws-cdk-lib/aws-iam");
const s3Notifications = require("aws-cdk-lib/aws-s3-notifications");
const lambdaEventSources = require("aws-cdk-lib/aws-lambda-event-sources");
const cdk_nag_1 = require("cdk-nag");
const web_crawler_batch_job_1 = require("./web-crawler-batch-job");
class DataImport extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const ingestionDeadLetterQueue = new sqs.Queue(this, "IngestionDeadLetterQueue", {
            visibilityTimeout: cdk.Duration.seconds(900),
            enforceSSL: true,
        });
        const ingestionQueue = new sqs.Queue(this, "IngestionQueue", {
            visibilityTimeout: cdk.Duration.seconds(900),
            enforceSSL: true,
            deadLetterQueue: {
                queue: ingestionDeadLetterQueue,
                maxReceiveCount: 3,
            },
        });
        const uploadLogsBucket = new s3.Bucket(this, "UploadLogsBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const uploadBucket = new s3.Bucket(this, "UploadBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            transferAcceleration: true,
            enforceSSL: true,
            serverAccessLogsBucket: uploadLogsBucket,
            cors: [
                {
                    allowedHeaders: ["*"],
                    allowedMethods: [
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.GET,
                        s3.HttpMethods.HEAD,
                    ],
                    allowedOrigins: ["*"],
                    exposedHeaders: ["ETag"],
                    maxAge: 3000,
                },
            ],
        });
        const processingLogsBucket = new s3.Bucket(this, "ProcessingLogsBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const processingBucket = new s3.Bucket(this, "ProcessingBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
            serverAccessLogsBucket: processingLogsBucket,
        });
        uploadBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3Notifications.SqsDestination(ingestionQueue));
        uploadBucket.addEventNotification(s3.EventType.OBJECT_REMOVED, new s3Notifications.SqsDestination(ingestionQueue));
        const fileImportBatchJob = new file_import_batch_job_1.FileImportBatchJob(this, "FileImportBatchJob", {
            shared: props.shared,
            config: props.config,
            uploadBucket,
            processingBucket,
            auroraDatabase: props.auroraDatabase,
            ragDynamoDBTables: props.ragDynamoDBTables,
            sageMakerRagModelsEndpoint: props.sageMakerRagModels?.model.endpoint,
            openSearchVector: props.openSearchVector,
        });
        const fileImportWorkflow = new file_import_workflow_1.FileImportWorkflow(this, "FileImportWorkflow", {
            shared: props.shared,
            config: props.config,
            fileImportBatchJob,
            ragDynamoDBTables: props.ragDynamoDBTables,
        });
        const webCrawlerBatchJob = new web_crawler_batch_job_1.WebCrawlerBatchJob(this, "WebCrawlerBatchJob", {
            shared: props.shared,
            config: props.config,
            uploadBucket,
            processingBucket,
            auroraDatabase: props.auroraDatabase,
            ragDynamoDBTables: props.ragDynamoDBTables,
            sageMakerRagModelsEndpoint: props.sageMakerRagModels?.model.endpoint,
            openSearchVector: props.openSearchVector,
        });
        const websiteCrawlingWorkflow = new website_crawling_workflow_1.WebsiteCrawlingWorkflow(this, "WebsiteCrawlingWorkflow", {
            shared: props.shared,
            config: props.config,
            webCrawlerBatchJob,
            ragDynamoDBTables: props.ragDynamoDBTables,
        });
        const rssSubscription = new rss_subscription_1.RssSubscription(this, "RssSubscription", {
            shared: props.shared,
            config: props.config,
            processingBucket: processingBucket,
            ragDynamoDBTables: props.ragDynamoDBTables,
            websiteCrawlerStateMachine: websiteCrawlingWorkflow.stateMachine,
        });
        const uploadHandler = new lambda.Function(this, "UploadHandler", {
            code: props.shared.sharedCode.bundleWithLambdaAsset(path.join(__dirname, "./functions/upload-handler")),
            handler: "index.lambda_handler",
            runtime: props.shared.pythonRuntime,
            architecture: props.shared.lambdaArchitecture,
            timeout: cdk.Duration.minutes(15),
            memorySize: 512,
            tracing: lambda.Tracing.ACTIVE,
            logRetention: logs.RetentionDays.ONE_WEEK,
            layers: [props.shared.powerToolsLayer, props.shared.commonLayer],
            vpc: props.shared.vpc,
            vpcSubnets: props.shared.vpc.privateSubnets,
            environment: {
                ...props.shared.defaultEnvironmentVariables,
                CONFIG_PARAMETER_NAME: props.shared.configParameter.parameterName,
                API_KEYS_SECRETS_ARN: props.shared.apiKeysSecret.secretArn,
                PROCESSING_BUCKET_NAME: processingBucket.bucketName,
                UPLOAD_BUCKET_NAME: uploadBucket.bucketName,
                WORKSPACES_TABLE_NAME: props.workspacesTable?.tableName ?? "",
                WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME: props.workspacesByObjectTypeIndexName ?? "",
                DOCUMENTS_TABLE_NAME: props.documentsTable.tableName ?? "",
                DOCUMENTS_BY_COMPOUND_KEY_INDEX_NAME: props.documentsByCompoundKeyIndexName ?? "",
                SAGEMAKER_RAG_MODELS_ENDPOINT: props.sageMakerRagModels?.model.endpoint.attrEndpointName ?? "",
                FILE_IMPORT_WORKFLOW_ARN: fileImportWorkflow?.stateMachine.stateMachineArn ?? "",
                DEFAULT_KENDRA_S3_DATA_SOURCE_BUCKET_NAME: props.kendraRetrieval?.kendraS3DataSourceBucket?.bucketName ?? "",
            },
        });
        uploadBucket.grantReadWrite(uploadHandler);
        processingBucket.grantReadWrite(uploadHandler);
        props.shared.apiKeysSecret.grantRead(uploadHandler);
        props.shared.configParameter.grantRead(uploadHandler);
        props.workspacesTable.grantReadWriteData(uploadHandler);
        props.documentsTable.grantReadWriteData(uploadHandler);
        props.kendraRetrieval?.kendraS3DataSourceBucket?.grantReadWrite(uploadHandler);
        ingestionQueue.grantConsumeMessages(uploadHandler);
        fileImportWorkflow.stateMachine.grantStartExecution(uploadHandler);
        if (props.config.bedrock?.roleArn) {
            uploadHandler.addToRolePolicy(new iam.PolicyStatement({
                actions: ["sts:AssumeRole"],
                resources: [props.config.bedrock.roleArn],
            }));
        }
        uploadHandler.addEventSource(new lambdaEventSources.SqsEventSource(ingestionQueue));
        this.uploadBucket = uploadBucket;
        this.processingBucket = processingBucket;
        this.ingestionQueue = ingestionQueue;
        this.fileImportWorkflow = fileImportWorkflow.stateMachine;
        this.websiteCrawlingWorkflow = websiteCrawlingWorkflow.stateMachine;
        this.rssIngestorFunction = rssSubscription.rssIngestorFunction;
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions([uploadLogsBucket, processingLogsBucket], [
            {
                id: "AwsSolutions-S1",
                reason: "Logging bucket does not require it's own access logs.",
            },
        ]);
    }
}
exports.DataImport = DataImport;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2QkFBNkI7QUFDN0IsbUNBQW1DO0FBQ25DLDJDQUF1QztBQUd2QyxtRUFBNkQ7QUFFN0QsaUVBQTREO0FBQzVELDJFQUFzRTtBQUN0RSx5REFBcUQ7QUFJckQseUNBQXlDO0FBQ3pDLDJDQUEyQztBQUMzQyxpREFBaUQ7QUFDakQsNkNBQTZDO0FBRTdDLDJDQUEyQztBQUUzQyxvRUFBb0U7QUFDcEUsMkVBQTJFO0FBRzNFLHFDQUEwQztBQUMxQyxtRUFBNkQ7QUFnQjdELE1BQWEsVUFBVyxTQUFRLHNCQUFTO0lBT3ZDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLHdCQUF3QixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FDNUMsSUFBSSxFQUNKLDBCQUEwQixFQUMxQjtZQUNFLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUM1QyxVQUFVLEVBQUUsSUFBSTtTQUNqQixDQUNGLENBQUM7UUFFRixNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQzNELGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztZQUM1QyxVQUFVLEVBQUUsSUFBSTtZQUNoQixlQUFlLEVBQUU7Z0JBQ2YsS0FBSyxFQUFFLHdCQUF3QjtnQkFDL0IsZUFBZSxFQUFFLENBQUM7YUFDbkI7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLGdCQUFnQixHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0QsaUJBQWlCLEVBQUUsRUFBRSxDQUFD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LENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQzthQUMxQyxDQUFDLENBQ0gsQ0FBQztTQUNIO1FBRUQsYUFBYSxDQUFDLGNBQWMsQ0FDMUIsSUFBSSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQ3RELENBQUM7UUFFRixJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7UUFDekMsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDLFlBQVksQ0FBQztRQUMxRCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsdUJBQXVCLENBQUMsWUFBWSxDQUFDO1FBQ3BFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxlQUFlLENBQUMsbUJBQW1CLENBQUM7UUFFL0Q7O1dBRUc7UUFDSCx5QkFBZSxDQUFDLHVCQUF1QixDQUNyQyxDQUFDLGdCQUFnQixFQUFFLG9CQUFvQixDQUFDLEVBQ3hDO1lBQ0U7Z0JBQ0UsRUFBRSxFQUFFLGlCQUFpQjtnQkFDckIsTUFBTSxFQUFFLHVEQUF1RDthQUNoRTtTQUNGLENBQ0YsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQWhPRCxnQ0FnT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgU3lzdGVtQ29uZmlnIH0gZnJvbSBcIi4uLy4uL3NoYXJlZC90eXBlc1wiO1xuaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4uLy4uL3NoYXJlZFwiO1xuaW1wb3J0IHsgRmlsZUltcG9ydEJhdGNoSm9iIH0gZnJvbSBcIi4vZmlsZS1pbXBvcnQtYmF0Y2gtam9iXCI7XG5pbXBvcnQgeyBSYWdEeW5hbW9EQlRhYmxlcyB9IGZyb20gXCIuLi9yYWctZHluYW1vZGItdGFibGVzXCI7XG5pbXBvcnQgeyBGaWxlSW1wb3J0V29ya2Zsb3cgfSBmcm9tIFwiLi9maWxlLWltcG9ydC13b3JrZmxvd1wiO1xuaW1wb3J0IHsgV2Vic2l0ZUNyYXdsaW5nV29ya2Zsb3cgfSBmcm9tIFwiLi93ZWJzaXRlLWNyYXdsaW5nLXdvcmtmbG93XCI7XG5pbXBvcnQgeyBSc3NTdWJzY3JpcHRpb24gfSBmcm9tIFwiLi9yc3Mtc3Vic2NyaXB0aW9uXCI7XG5pbXBvcnQgeyBPcGVuU2VhcmNoVmVjdG9yIH0gZnJvbSBcIi4uL29wZW5zZWFyY2gtdmVjdG9yXCI7XG5pbXBvcnQgeyBLZW5kcmFSZXRyaWV2YWwgfSBmcm9tIFwiLi4va2VuZHJhLXJldHJpZXZhbFwiO1xuaW1wb3J0IHsgU2FnZU1ha2VyUmFnTW9kZWxzIH0gZnJvbSBcIi4uL3NhZ2VtYWtlci1yYWctbW9kZWxzXCI7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgKiBhcyBzcXMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zcXNcIjtcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYVwiO1xuaW1wb3J0ICogYXMgbG9ncyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxvZ3NcIjtcbmltcG9ydCAqIGFzIGVjMiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWVjMlwiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiXCI7XG5pbXBvcnQgKiBhcyBzM05vdGlmaWNhdGlvbnMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zMy1ub3RpZmljYXRpb25zXCI7XG5pbXBvcnQgKiBhcyBsYW1iZGFFdmVudFNvdXJjZXMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGEtZXZlbnQtc291cmNlc1wiO1xuaW1wb3J0ICogYXMgcmRzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtcmRzXCI7XG5pbXBvcnQgKiBhcyBzZm4gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zXCI7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuaW1wb3J0IHsgV2ViQ3Jhd2xlckJhdGNoSm9iIH0gZnJvbSBcIi4vd2ViLWNyYXdsZXItYmF0Y2gtam9iXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgRGF0YUltcG9ydFByb3BzIHtcbiAgcmVhZG9ubHkgY29uZmlnOiBTeXN0ZW1Db25maWc7XG4gIHJlYWRvbmx5IHNoYXJlZDogU2hhcmVkO1xuICByZWFkb25seSBhdXJvcmFEYXRhYmFzZT86IHJkcy5EYXRhYmFzZUNsdXN0ZXI7XG4gIHJlYWRvbmx5IHJhZ0R5bmFtb0RCVGFibGVzOiBSYWdEeW5hbW9EQlRhYmxlcztcbiAgcmVhZG9ubHkgb3BlblNlYXJjaFZlY3Rvcj86IE9wZW5TZWFyY2hWZWN0b3I7XG4gIHJlYWRvbmx5IGtlbmRyYVJldHJpZXZhbD86IEtlbmRyYVJldHJpZXZhbDtcbiAgcmVhZG9ubHkgc2FnZU1ha2VyUmFnTW9kZWxzPzogU2FnZU1ha2VyUmFnTW9kZWxzO1xuICByZWFkb25seSB3b3Jrc3BhY2VzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuICByZWFkb25seSBkb2N1bWVudHNUYWJsZTogZHluYW1vZGIuVGFibGU7XG4gIHJlYWRvbmx5IHdvcmtzcGFjZXNCeU9iamVjdFR5cGVJbmRleE5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgZG9jdW1lbnRzQnlDb21wb3VuZEtleUluZGV4TmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgY2xhc3MgRGF0YUltcG9ydCBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSB1cGxvYWRCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgcHVibGljIHJlYWRvbmx5IHByb2Nlc3NpbmdCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgcHVibGljIHJlYWRvbmx5IGluZ2VzdGlvblF1ZXVlOiBzcXMuUXVldWU7XG4gIHB1YmxpYyByZWFkb25seSBmaWxlSW1wb3J0V29ya2Zsb3c6IHNmbi5TdGF0ZU1hY2hpbmU7XG4gIHB1YmxpYyByZWFkb25seSB3ZWJzaXRlQ3Jhd2xpbmdXb3JrZmxvdzogc2ZuLlN0YXRlTWFjaGluZTtcbiAgcHVibGljIHJlYWRvbmx5IHJzc0luZ2VzdG9yRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IERhdGFJbXBvcnRQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBpbmdlc3Rpb25EZWFkTGV0dGVyUXVldWUgPSBuZXcgc3FzLlF1ZXVlKFxuICAgICAgdGhpcyxcbiAgICAgIFwiSW5nZXN0aW9uRGVhZExldHRlclF1ZXVlXCIsXG4gICAgICB7XG4gICAgICAgIHZpc2liaWxpdHlUaW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg5MDApLFxuICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCBpbmdlc3Rpb25RdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgXCJJbmdlc3Rpb25RdWV1ZVwiLCB7XG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoOTAwKSxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcbiAgICAgICAgcXVldWU6IGluZ2VzdGlvbkRlYWRMZXR0ZXJRdWV1ZSxcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVwbG9hZExvZ3NCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsIFwiVXBsb2FkTG9nc0J1Y2tldFwiLCB7XG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVwbG9hZEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgXCJVcGxvYWRCdWNrZXRcIiwge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIHRyYW5zZmVyQWNjZWxlcmF0aW9uOiB0cnVlLFxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgIHNlcnZlckFjY2Vzc0xvZ3NCdWNrZXQ6IHVwbG9hZExvZ3NCdWNrZXQsXG4gICAgICBjb3JzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBhbGxvd2VkSGVhZGVyczogW1wiKlwiXSxcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW1xuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUFVULFxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUE9TVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkdFVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkhFQUQsXG4gICAgICAgICAgXSxcbiAgICAgICAgICBhbGxvd2VkT3JpZ2luczogW1wiKlwiXSxcbiAgICAgICAgICBleHBvc2VkSGVhZGVyczogW1wiRVRhZ1wiXSxcbiAgICAgICAgICBtYXhBZ2U6IDMwMDAsXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuXG4gICAgY29uc3QgcHJvY2Vzc2luZ0xvZ3NCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsIFwiUHJvY2Vzc2luZ0xvZ3NCdWNrZXRcIiwge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBwcm9jZXNzaW5nQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCBcIlByb2Nlc3NpbmdCdWNrZXRcIiwge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBzZXJ2ZXJBY2Nlc3NMb2dzQnVja2V0OiBwcm9jZXNzaW5nTG9nc0J1Y2tldCxcbiAgICB9KTtcblxuICAgIHVwbG9hZEJ1Y2tldC5hZGRFdmVudE5vdGlmaWNhdGlvbihcbiAgICAgIHMzLkV2ZW50VHlwZS5PQkpFQ1RfQ1JFQVRFRCxcbiAgICAgIG5ldyBzM05vdGlmaWNhdGlvbnMuU3FzRGVzdGluYXRpb24oaW5nZXN0aW9uUXVldWUpXG4gICAgKTtcblxuICAgIHVwbG9hZEJ1Y2tldC5hZGRFdmVudE5vdGlmaWNhdGlvbihcbiAgICAgIHMzLkV2ZW50VHlwZS5PQkpFQ1RfUkVNT1ZFRCxcbiAgICAgIG5ldyBzM05vdGlmaWNhdGlvbnMuU3FzRGVzdGluYXRpb24oaW5nZXN0aW9uUXVldWUpXG4gICAgKTtcblxuICAgIGNvbnN0IGZpbGVJbXBvcnRCYXRjaEpvYiA9IG5ldyBGaWxlSW1wb3J0QmF0Y2hKb2IoXG4gICAgICB0aGlzLFxuICAgICAgXCJGaWxlSW1wb3J0QmF0Y2hKb2JcIixcbiAgICAgIHtcbiAgICAgICAgc2hhcmVkOiBwcm9wcy5zaGFyZWQsXG4gICAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgICB1cGxvYWRCdWNrZXQsXG4gICAgICAgIHByb2Nlc3NpbmdCdWNrZXQsXG4gICAgICAgIGF1cm9yYURhdGFiYXNlOiBwcm9wcy5hdXJvcmFEYXRhYmFzZSxcbiAgICAgICAgcmFnRHluYW1vREJUYWJsZXM6IHByb3BzLnJhZ0R5bmFtb0RCVGFibGVzLFxuICAgICAgICBzYWdlTWFrZXJSYWdNb2RlbHNFbmRwb2ludDogcHJvcHMuc2FnZU1ha2VyUmFnTW9kZWxzPy5tb2RlbC5lbmRwb2ludCxcbiAgICAgICAgb3BlblNlYXJjaFZlY3RvcjogcHJvcHMub3BlblNlYXJjaFZlY3RvcixcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3QgZmlsZUltcG9ydFdvcmtmbG93ID0gbmV3IEZpbGVJbXBvcnRXb3JrZmxvdyhcbiAgICAgIHRoaXMsXG4gICAgICBcIkZpbGVJbXBvcnRXb3JrZmxvd1wiLFxuICAgICAge1xuICAgICAgICBzaGFyZWQ6IHByb3BzLnNoYXJlZCxcbiAgICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcsXG4gICAgICAgIGZpbGVJbXBvcnRCYXRjaEpvYixcbiAgICAgICAgcmFnRHluYW1vREJUYWJsZXM6IHByb3BzLnJhZ0R5bmFtb0RCVGFibGVzLFxuICAgICAgfVxuICAgICk7XG5cbiAgICBjb25zdCB3ZWJDcmF3bGVyQmF0Y2hKb2IgPSBuZXcgV2ViQ3Jhd2xlckJhdGNoSm9iKFxuICAgICAgdGhpcyxcbiAgICAgIFwiV2ViQ3Jhd2xlckJhdGNoSm9iXCIsXG4gICAgICB7XG4gICAgICAgIHNoYXJlZDogcHJvcHMuc2hhcmVkLFxuICAgICAgICBjb25maWc6IHByb3BzLmNvbmZpZyxcbiAgICAgICAgdXBsb2FkQnVja2V0LFxuICAgICAgICBwcm9jZXNzaW5nQnVja2V0LFxuICAgICAgICBhdXJvcmFEYXRhYmFzZTogcHJvcHMuYXVyb3JhRGF0YWJhc2UsXG4gICAgICAgIHJhZ0R5bmFtb0RCVGFibGVzOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcyxcbiAgICAgICAgc2FnZU1ha2VyUmFnTW9kZWxzRW5kcG9pbnQ6IHByb3BzLnNhZ2VNYWtlclJhZ01vZGVscz8ubW9kZWwuZW5kcG9pbnQsXG4gICAgICAgIG9wZW5TZWFyY2hWZWN0b3I6IHByb3BzLm9wZW5TZWFyY2hWZWN0b3IsXG4gICAgICB9XG4gICAgKTtcblxuICAgIGNvbnN0IHdlYnNpdGVDcmF3bGluZ1dvcmtmbG93ID0gbmV3IFdlYnNpdGVDcmF3bGluZ1dvcmtmbG93KFxuICAgICAgdGhpcyxcbiAgICAgIFwiV2Vic2l0ZUNyYXdsaW5nV29ya2Zsb3dcIixcbiAgICAgIHtcbiAgICAgICAgc2hhcmVkOiBwcm9wcy5zaGFyZWQsXG4gICAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgICB3ZWJDcmF3bGVyQmF0Y2hKb2IsXG4gICAgICAgIHJhZ0R5bmFtb0RCVGFibGVzOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcyxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3QgcnNzU3Vic2NyaXB0aW9uID0gbmV3IFJzc1N1YnNjcmlwdGlvbih0aGlzLCBcIlJzc1N1YnNjcmlwdGlvblwiLCB7XG4gICAgICBzaGFyZWQ6IHByb3BzLnNoYXJlZCxcbiAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgcHJvY2Vzc2luZ0J1Y2tldDogcHJvY2Vzc2luZ0J1Y2tldCxcbiAgICAgIHJhZ0R5bmFtb0RCVGFibGVzOiBwcm9wcy5yYWdEeW5hbW9EQlRhYmxlcyxcbiAgICAgIHdlYnNpdGVDcmF3bGVyU3RhdGVNYWNoaW5lOiB3ZWJzaXRlQ3Jhd2xpbmdXb3JrZmxvdy5zdGF0ZU1hY2hpbmUsXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGxvYWRIYW5kbGVyID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBcIlVwbG9hZEhhbmRsZXJcIiwge1xuICAgICAgY29kZTogcHJvcHMuc2hhcmVkLnNoYXJlZENvZGUuYnVuZGxlV2l0aExhbWJkYUFzc2V0KFxuICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4vZnVuY3Rpb25zL3VwbG9hZC1oYW5kbGVyXCIpXG4gICAgICApLFxuICAgICAgaGFuZGxlcjogXCJpbmRleC5sYW1iZGFfaGFuZGxlclwiLFxuICAgICAgcnVudGltZTogcHJvcHMuc2hhcmVkLnB5dGhvblJ1bnRpbWUsXG4gICAgICBhcmNoaXRlY3R1cmU6IHByb3BzLnNoYXJlZC5sYW1iZGFBcmNoaXRlY3R1cmUsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxNSksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsXG4gICAgICBsb2dSZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcbiAgICAgIGxheWVyczogW3Byb3BzLnNoYXJlZC5wb3dlclRvb2xzTGF5ZXIsIHByb3BzLnNoYXJlZC5jb21tb25MYXllcl0sXG4gICAgICB2cGM6IHByb3BzLnNoYXJlZC52cGMsXG4gICAgICB2cGNTdWJuZXRzOiBwcm9wcy5zaGFyZWQudnBjLnByaXZhdGVTdWJuZXRzIGFzIGVjMi5TdWJuZXRTZWxlY3Rpb24sXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAuLi5wcm9wcy5zaGFyZWQuZGVmYXVsdEVudmlyb25tZW50VmFyaWFibGVzLFxuICAgICAgICBDT05GSUdfUEFSQU1FVEVSX05BTUU6IHByb3BzLnNoYXJlZC5jb25maWdQYXJhbWV0ZXIucGFyYW1ldGVyTmFtZSxcbiAgICAgICAgQVBJX0tFWVNfU0VDUkVUU19BUk46IHByb3BzLnNoYXJlZC5hcGlLZXlzU2VjcmV0LnNlY3JldEFybixcbiAgICAgICAgUFJPQ0VTU0lOR19CVUNLRVRfTkFNRTogcHJvY2Vzc2luZ0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICBVUExPQURfQlVDS0VUX05BTUU6IHVwbG9hZEJ1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICBXT1JLU1BBQ0VTX1RBQkxFX05BTUU6IHByb3BzLndvcmtzcGFjZXNUYWJsZT8udGFibGVOYW1lID8/IFwiXCIsXG4gICAgICAgIFdPUktTUEFDRVNfQllfT0JKRUNUX1RZUEVfSU5ERVhfTkFNRTpcbiAgICAgICAgICBwcm9wcy53b3Jrc3BhY2VzQnlPYmplY3RUeXBlSW5kZXhOYW1lID8/IFwiXCIsXG4gICAgICAgIERPQ1VNRU5UU19UQUJMRV9OQU1FOiBwcm9wcy5kb2N1bWVudHNUYWJsZS50YWJsZU5hbWUgPz8gXCJcIixcbiAgICAgICAgRE9DVU1FTlRTX0JZX0NPTVBPVU5EX0tFWV9JTkRFWF9OQU1FOlxuICAgICAgICAgIHByb3BzLmRvY3VtZW50c0J5Q29tcG91bmRLZXlJbmRleE5hbWUgPz8gXCJcIixcbiAgICAgICAgU0FHRU1BS0VSX1JBR19NT0RFTFNfRU5EUE9JTlQ6XG4gICAgICAgICAgcHJvcHMuc2FnZU1ha2VyUmFnTW9kZWxzPy5tb2RlbC5lbmRwb2ludC5hdHRyRW5kcG9pbnROYW1lID8/IFwiXCIsXG4gICAgICAgIEZJTEVfSU1QT1JUX1dPUktGTE9XX0FSTjpcbiAgICAgICAgICBmaWxlSW1wb3J0V29ya2Zsb3c/LnN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4gPz8gXCJcIixcbiAgICAgICAgREVGQVVMVF9LRU5EUkFfUzNfREFUQV9TT1VSQ0VfQlVDS0VUX05BTUU6XG4gICAgICAgICAgcHJvcHMua2VuZHJhUmV0cmlldmFsPy5rZW5kcmFTM0RhdGFTb3VyY2VCdWNrZXQ/LmJ1Y2tldE5hbWUgPz8gXCJcIixcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB1cGxvYWRCdWNrZXQuZ3JhbnRSZWFkV3JpdGUodXBsb2FkSGFuZGxlcik7XG4gICAgcHJvY2Vzc2luZ0J1Y2tldC5ncmFudFJlYWRXcml0ZSh1cGxvYWRIYW5kbGVyKTtcbiAgICBwcm9wcy5zaGFyZWQuYXBpS2V5c1NlY3JldC5ncmFudFJlYWQodXBsb2FkSGFuZGxlcik7XG4gICAgcHJvcHMuc2hhcmVkLmNvbmZpZ1BhcmFtZXRlci5ncmFudFJlYWQodXBsb2FkSGFuZGxlcik7XG4gICAgcHJvcHMud29ya3NwYWNlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGxvYWRIYW5kbGVyKTtcbiAgICBwcm9wcy5kb2N1bWVudHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBsb2FkSGFuZGxlcik7XG4gICAgcHJvcHMua2VuZHJhUmV0cmlldmFsPy5rZW5kcmFTM0RhdGFTb3VyY2VCdWNrZXQ/LmdyYW50UmVhZFdyaXRlKFxuICAgICAgdXBsb2FkSGFuZGxlclxuICAgICk7XG5cbiAgICBpbmdlc3Rpb25RdWV1ZS5ncmFudENvbnN1bWVNZXNzYWdlcyh1cGxvYWRIYW5kbGVyKTtcbiAgICBmaWxlSW1wb3J0V29ya2Zsb3cuc3RhdGVNYWNoaW5lLmdyYW50U3RhcnRFeGVjdXRpb24odXBsb2FkSGFuZGxlcik7XG5cbiAgICBpZiAocHJvcHMuY29uZmlnLmJlZHJvY2s/LnJvbGVBcm4pIHtcbiAgICAgIHVwbG9hZEhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgYWN0aW9uczogW1wic3RzOkFzc3VtZVJvbGVcIl0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuY29uZmlnLmJlZHJvY2sucm9sZUFybl0sXG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH1cblxuICAgIHVwbG9hZEhhbmRsZXIuYWRkRXZlbnRTb3VyY2UoXG4gICAgICBuZXcgbGFtYmRhRXZlbnRTb3VyY2VzLlNxc0V2ZW50U291cmNlKGluZ2VzdGlvblF1ZXVlKVxuICAgICk7XG5cbiAgICB0aGlzLnVwbG9hZEJ1Y2tldCA9IHVwbG9hZEJ1Y2tldDtcbiAgICB0aGlzLnByb2Nlc3NpbmdCdWNrZXQgPSBwcm9jZXNzaW5nQnVja2V0O1xuICAgIHRoaXMuaW5nZXN0aW9uUXVldWUgPSBpbmdlc3Rpb25RdWV1ZTtcbiAgICB0aGlzLmZpbGVJbXBvcnRXb3JrZmxvdyA9IGZpbGVJbXBvcnRXb3JrZmxvdy5zdGF0ZU1hY2hpbmU7XG4gICAgdGhpcy53ZWJzaXRlQ3Jhd2xpbmdXb3JrZmxvdyA9IHdlYnNpdGVDcmF3bGluZ1dvcmtmbG93LnN0YXRlTWFjaGluZTtcbiAgICB0aGlzLnJzc0luZ2VzdG9yRnVuY3Rpb24gPSByc3NTdWJzY3JpcHRpb24ucnNzSW5nZXN0b3JGdW5jdGlvbjtcblxuICAgIC8qKlxuICAgICAqIENESyBOQUcgc3VwcHJlc3Npb25cbiAgICAgKi9cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBbdXBsb2FkTG9nc0J1Y2tldCwgcHJvY2Vzc2luZ0xvZ3NCdWNrZXRdLFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLVMxXCIsXG4gICAgICAgICAgcmVhc29uOiBcIkxvZ2dpbmcgYnVja2V0IGRvZXMgbm90IHJlcXVpcmUgaXQncyBvd24gYWNjZXNzIGxvZ3MuXCIsXG4gICAgICAgIH0sXG4gICAgICBdXG4gICAgKTtcbiAgfVxufVxuIl19