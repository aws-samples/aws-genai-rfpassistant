import * as oss from "aws-cdk-lib/aws-opensearchserverless";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import { Construct } from "constructs";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
export interface OpenSearchVectorProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly ragDynamoDBTables: RagDynamoDBTables;
}
export declare class OpenSearchVector extends Construct {
    readonly openSearchCollectionName: string;
    readonly openSearchCollectionEndpoint: string;
    readonly openSearchCollection: oss.CfnCollection;
    readonly createOpenSearchWorkspaceWorkflow: sfn.StateMachine;
    addToAccessPolicy: (name: string, principal: (string | undefined)[], permission: string[]) => void;
    constructor(scope: Construct, id: string, props: OpenSearchVectorProps);
    private addToAccessPolicyIntl;
}
