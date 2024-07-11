import { Construct } from "constructs";
import { SystemConfig } from "../../shared/types";
import { Shared } from "../../shared";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
export interface CreateKendraWorkspaceProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly ragDynamoDBTables: RagDynamoDBTables;
}
export declare class CreateKendraWorkspace extends Construct {
    readonly stateMachine: sfn.StateMachine;
    constructor(scope: Construct, id: string, props: CreateKendraWorkspaceProps);
}
