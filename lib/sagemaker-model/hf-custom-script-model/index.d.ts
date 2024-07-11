import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import { Construct } from "constructs";
export interface HuggingFaceCustomScriptModelProps {
    vpc: ec2.Vpc;
    region: string;
    instanceType: string;
    modelId: string | string[];
    container?: string;
    codeFolder?: string;
    codeBuildComputeType?: codebuild.ComputeType;
    env?: {
        [key: string]: string;
    };
    architecture?: lambda.Architecture;
    runtime?: lambda.Runtime;
}
export declare class HuggingFaceCustomScriptModel extends Construct {
    readonly model: sagemaker.CfnModel;
    readonly endpoint: sagemaker.CfnEndpoint;
    constructor(scope: Construct, id: string, props: HuggingFaceCustomScriptModelProps);
}
