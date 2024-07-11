import { Construct } from "constructs";
import { SystemConfig } from "../../shared/types";
import { Shared } from "../../shared";
import { WebCrawlerBatchJob } from "./web-crawler-batch-job";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
export interface WebsiteCrawlingWorkflowProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly webCrawlerBatchJob: WebCrawlerBatchJob;
    readonly ragDynamoDBTables: RagDynamoDBTables;
}
export declare class WebsiteCrawlingWorkflow extends Construct {
    readonly stateMachine: sfn.StateMachine;
    constructor(scope: Construct, id: string, props: WebsiteCrawlingWorkflowProps);
}
