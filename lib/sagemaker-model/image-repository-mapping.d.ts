import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
export interface ImageRepositoryMappingProps {
    region: string;
}
export declare class ImageRepositoryMapping extends Construct {
    readonly mapping: cdk.CfnMapping;
    readonly account: string;
    constructor(scope: Construct, id: string, props: ImageRepositoryMappingProps);
}
