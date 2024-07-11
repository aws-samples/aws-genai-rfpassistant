export * from "./container-images";
export * from "./types";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import { Construct } from "constructs";
import { SageMakerModelProps } from "./types";
export declare class SageMakerModel extends Construct {
    readonly endpoint: sagemaker.CfnEndpoint;
    readonly modelId: string | string[];
    constructor(scope: Construct, id: string, props: SageMakerModelProps);
}
