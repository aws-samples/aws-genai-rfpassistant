import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
import { AuroraPgVector } from "../aurora-pgvector";
import { DataImport } from "../data-import";
import { KendraRetrieval } from "../kendra-retrieval";
import { OpenSearchVector } from "../opensearch-vector";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
export interface WorkkspacesProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly dataImport: DataImport;
    readonly ragDynamoDBTables: RagDynamoDBTables;
    readonly auroraPgVector?: AuroraPgVector;
    readonly openSearchVector?: OpenSearchVector;
    readonly kendraRetrieval?: KendraRetrieval;
}
export declare class Workspaces extends Construct {
    readonly deleteWorkspaceWorkflow?: sfn.StateMachine;
    constructor(scope: Construct, id: string, props: WorkkspacesProps);
}
