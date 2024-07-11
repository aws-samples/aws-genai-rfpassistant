import { Construct } from "constructs";
import { SystemConfig } from "../../shared/types";
import { Shared } from "../../shared";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import { OpenSearchVector } from "../opensearch-vector";
import { KendraRetrieval } from "../kendra-retrieval";
import { SageMakerRagModels } from "../sagemaker-rag-models";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as rds from "aws-cdk-lib/aws-rds";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
export interface DataImportProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly auroraDatabase?: rds.DatabaseCluster;
    readonly ragDynamoDBTables: RagDynamoDBTables;
    readonly openSearchVector?: OpenSearchVector;
    readonly kendraRetrieval?: KendraRetrieval;
    readonly sageMakerRagModels?: SageMakerRagModels;
    readonly workspacesTable: dynamodb.Table;
    readonly documentsTable: dynamodb.Table;
    readonly workspacesByObjectTypeIndexName: string;
    readonly documentsByCompoundKeyIndexName: string;
}
export declare class DataImport extends Construct {
    readonly uploadBucket: s3.Bucket;
    readonly processingBucket: s3.Bucket;
    readonly ingestionQueue: sqs.Queue;
    readonly fileImportWorkflow: sfn.StateMachine;
    readonly websiteCrawlingWorkflow: sfn.StateMachine;
    readonly rssIngestorFunction: lambda.Function;
    constructor(scope: Construct, id: string, props: DataImportProps);
}
