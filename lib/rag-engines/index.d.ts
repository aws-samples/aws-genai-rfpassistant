import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { Shared } from "../shared";
import { SystemConfig } from "../shared/types";
import { AuroraPgVector } from "./aurora-pgvector";
import { DataImport } from "./data-import";
import { KendraRetrieval } from "./kendra-retrieval";
import { OpenSearchVector } from "./opensearch-vector";
import { SageMakerRagModels } from "./sagemaker-rag-models";
export interface RagEnginesProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
}
export declare class RagEngines extends Construct {
    readonly auroraPgVector: AuroraPgVector | null;
    readonly openSearchVector: OpenSearchVector | null;
    readonly kendraRetrieval: KendraRetrieval | null;
    readonly sageMakerRagModels: SageMakerRagModels | null;
    readonly uploadBucket: s3.Bucket;
    readonly processingBucket: s3.Bucket;
    readonly documentsTable: dynamodb.Table;
    readonly workspacesTable: dynamodb.Table;
    readonly workspacesByObjectTypeIndexName: string;
    readonly documentsByCompountKeyIndexName: string;
    readonly documentsByStatusIndexName: string;
    readonly fileImportWorkflow?: sfn.StateMachine;
    readonly websiteCrawlingWorkflow?: sfn.StateMachine;
    readonly deleteWorkspaceWorkflow?: sfn.StateMachine;
    readonly dataImport: DataImport;
    constructor(scope: Construct, id: string, props: RagEnginesProps);
}
