import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { RagEngines } from "../rag-engines";
import { Shared } from "../shared";
import { SageMakerModelEndpoint, SystemConfig } from "../shared/types";
import * as appsync from "aws-cdk-lib/aws-appsync";
export interface ChatBotApiProps {
    readonly shared: Shared;
    readonly config: SystemConfig;
    readonly ragEngines?: RagEngines;
    readonly userPool: cognito.UserPool;
    readonly modelsParameter: ssm.StringParameter;
    readonly models: SageMakerModelEndpoint[];
}
export declare class ChatBotApi extends Construct {
    readonly messagesTopic: sns.Topic;
    readonly sessionsTable: dynamodb.Table;
    readonly questionsTable: dynamodb.Table;
    readonly bySessionIdIndex: string;
    readonly filesBucket: s3.Bucket;
    readonly userFeedbackBucket: s3.Bucket;
    readonly graphqlApi: appsync.GraphqlApi;
    constructor(scope: Construct, id: string, props: ChatBotApiProps);
}
