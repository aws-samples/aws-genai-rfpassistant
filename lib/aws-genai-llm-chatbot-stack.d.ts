import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SystemConfig } from "./shared/types";
export interface AwsGenAILLMChatbotStackProps extends cdk.StackProps {
    readonly config: SystemConfig;
}
export declare class AwsGenAILLMChatbotStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AwsGenAILLMChatbotStackProps);
}
