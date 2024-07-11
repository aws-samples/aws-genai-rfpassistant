import * as sns from "aws-cdk-lib/aws-sns";
import { Construct } from "constructs";
import { Shared } from "../shared";
import { RealtimeResolvers } from "./appsync-ws";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import * as appsync from "aws-cdk-lib/aws-appsync";
interface RealtimeGraphqlApiBackendProps {
    readonly shared: Shared;
    readonly userPool: UserPool;
    readonly api: appsync.GraphqlApi;
}
export declare class RealtimeGraphqlApiBackend extends Construct {
    readonly messagesTopic: sns.Topic;
    readonly resolvers: RealtimeResolvers;
    constructor(scope: Construct, id: string, props: RealtimeGraphqlApiBackendProps);
}
export {};
