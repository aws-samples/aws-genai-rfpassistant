import * as iam from "aws-cdk-lib/aws-iam";
import * as oss from "aws-cdk-lib/aws-opensearchserverless";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
export interface CreateOpenSearchWorkspaceProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly ragDynamoDBTables: RagDynamoDBTables;
    readonly openSearchCollectionName: string;
    readonly openSearchCollection: oss.CfnCollection;
    readonly collectionEndpoint: string;
}
export declare class CreateOpenSearchWorkspace extends Construct {
    readonly stateMachine: sfn.StateMachine;
    readonly createWorkspaceRole?: iam.IRole;
    constructor(scope: Construct, id: string, props: CreateOpenSearchWorkspaceProps);
}
