import { Construct } from "constructs";
import { SystemConfig } from "../../shared/types";
import { Shared } from "../../shared";
import { FileImportBatchJob } from "./file-import-batch-job";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
export interface FileImportWorkflowProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly fileImportBatchJob: FileImportBatchJob;
    readonly ragDynamoDBTables: RagDynamoDBTables;
}
export declare class FileImportWorkflow extends Construct {
    readonly stateMachine: sfn.StateMachine;
    constructor(scope: Construct, id: string, props: FileImportWorkflowProps);
}
