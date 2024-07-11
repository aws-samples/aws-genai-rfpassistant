import { Construct } from "constructs";
import { SystemConfig } from "../../shared/types";
import { Shared } from "../../shared";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as s3 from "aws-cdk-lib/aws-s3";
export interface RssSubscriptionProperties {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly processingBucket: s3.Bucket;
    readonly ragDynamoDBTables: RagDynamoDBTables;
    readonly websiteCrawlerStateMachine: sfn.StateMachine;
}
export declare class RssSubscription extends Construct {
    readonly rssIngestorFunction: lambda.Function;
    constructor(scope: Construct, id: string, props: RssSubscriptionProperties);
}
