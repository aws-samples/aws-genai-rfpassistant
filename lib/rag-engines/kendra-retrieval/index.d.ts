import { Construct } from "constructs";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kendra from "aws-cdk-lib/aws-kendra";
export interface KendraRetrievalProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly ragDynamoDBTables: RagDynamoDBTables;
}
export declare class KendraRetrieval extends Construct {
    readonly createKendraWorkspaceWorkflow: sfn.StateMachine;
    readonly kendraIndex?: kendra.CfnIndex;
    readonly kendraS3DataSource?: kendra.CfnDataSource;
    readonly kendraS3DataSourceBucket?: s3.Bucket;
    constructor(scope: Construct, id: string, props: KendraRetrievalProps);
}
