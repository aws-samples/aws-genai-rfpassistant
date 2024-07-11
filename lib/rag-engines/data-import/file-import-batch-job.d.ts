import { Construct } from "constructs";
import { SystemConfig } from "../../shared/types";
import { Shared } from "../../shared";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import { OpenSearchVector } from "../opensearch-vector";
import * as batch from "aws-cdk-lib/aws-batch";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as rds from "aws-cdk-lib/aws-rds";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
export interface FileImportBatchJobProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly uploadBucket: s3.Bucket;
    readonly processingBucket: s3.Bucket;
    readonly ragDynamoDBTables: RagDynamoDBTables;
    readonly auroraDatabase?: rds.DatabaseCluster;
    readonly sageMakerRagModelsEndpoint?: sagemaker.CfnEndpoint;
    readonly openSearchVector?: OpenSearchVector;
}
export declare class FileImportBatchJob extends Construct {
    readonly jobQueue: batch.JobQueue;
    readonly fileImportJob: batch.EcsJobDefinition;
    constructor(scope: Construct, id: string, props: FileImportBatchJobProps);
}
