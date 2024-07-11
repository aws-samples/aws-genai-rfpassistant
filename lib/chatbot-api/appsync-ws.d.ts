import * as appsync from "aws-cdk-lib/aws-appsync";
import { Function } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { Shared } from "../shared";
import { IQueue } from "aws-cdk-lib/aws-sqs";
import { ITopic } from "aws-cdk-lib/aws-sns";
import { UserPool } from "aws-cdk-lib/aws-cognito";
interface RealtimeResolversProps {
    readonly queue: IQueue;
    readonly topic: ITopic;
    readonly userPool: UserPool;
    readonly shared: Shared;
    readonly api: appsync.GraphqlApi;
}
export declare class RealtimeResolvers extends Construct {
    readonly outgoingMessageHandler: Function;
    constructor(scope: Construct, id: string, props: RealtimeResolversProps);
}
export {};
