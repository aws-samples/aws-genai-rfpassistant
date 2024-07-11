import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { SystemConfig } from "./types";
import { SharedAssetBundler } from "./shared-asset-bundler";
export interface SharedProps {
    readonly config: SystemConfig;
}
export declare class Shared extends Construct {
    readonly vpc: ec2.Vpc;
    readonly defaultEnvironmentVariables: Record<string, string>;
    readonly configParameter: ssm.StringParameter;
    readonly companyParameter: ssm.StringParameter;
    readonly pythonRuntime: lambda.Runtime;
    readonly lambdaArchitecture: lambda.Architecture;
    readonly xOriginVerifySecret: secretsmanager.Secret;
    readonly apiKeysSecret: secretsmanager.Secret;
    readonly commonLayer: lambda.ILayerVersion;
    readonly powerToolsLayer: lambda.ILayerVersion;
    readonly sharedCode: SharedAssetBundler;
    readonly s3vpcEndpoint: ec2.InterfaceVpcEndpoint;
    constructor(scope: Construct, id: string, props: SharedProps);
}
