import { SageMakerModelEndpoint, SystemConfig } from "../shared/types";
import { Construct } from "constructs";
import { RagEngines } from "../rag-engines";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Shared } from "../shared";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as s3 from "aws-cdk-lib/aws-s3";
export interface ApiResolversProps {
    readonly shared: Shared;
    readonly config: SystemConfig;
    readonly ragEngines?: RagEngines;
    readonly userPool: cognito.UserPool;
    readonly sessionsTable: dynamodb.Table;
    readonly questionsTable: dynamodb.Table;
    readonly bySessionIdIndex: string;
    readonly userFeedbackBucket: s3.Bucket;
    readonly modelsParameter: ssm.StringParameter;
    readonly models: SageMakerModelEndpoint[];
    readonly api: appsync.GraphqlApi;
    readonly filesBucket: s3.Bucket;
}
export declare class ApiResolvers extends Construct {
    constructor(scope: Construct, id: string, props: ApiResolversProps);
}
