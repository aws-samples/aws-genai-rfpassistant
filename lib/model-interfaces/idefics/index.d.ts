import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3 from "aws-cdk-lib/aws-s3";
import { CfnEndpoint } from "aws-cdk-lib/aws-sagemaker";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
interface IdeficsInterfaceProps {
    readonly shared: Shared;
    readonly config: SystemConfig;
    readonly messagesTopic: sns.Topic;
    readonly sessionsTable: dynamodb.Table;
    readonly questionsTable: dynamodb.Table;
    readonly bySessionIdIndex: string;
    readonly chatbotFilesBucket: s3.Bucket;
}
export declare class IdeficsInterface extends Construct {
    readonly ingestionQueue: sqs.Queue;
    readonly requestHandler: lambda.Function;
    constructor(scope: Construct, id: string, props: IdeficsInterfaceProps);
    addSageMakerEndpoint({ endpoint, name, }: {
        endpoint: CfnEndpoint;
        name: string;
    }): void;
}
export {};
