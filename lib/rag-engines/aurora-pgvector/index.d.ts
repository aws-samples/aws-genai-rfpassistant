import { Construct } from "constructs";
import { SystemConfig } from "../../shared/types";
import { Shared } from "../../shared";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import * as rds from "aws-cdk-lib/aws-rds";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
export interface AuroraPgVectorProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly ragDynamoDBTables: RagDynamoDBTables;
}
export declare class AuroraPgVector extends Construct {
    readonly database: rds.DatabaseCluster;
    readonly createAuroraWorkspaceWorkflow: sfn.StateMachine;
    constructor(scope: Construct, id: string, props: AuroraPgVectorProps);
}
