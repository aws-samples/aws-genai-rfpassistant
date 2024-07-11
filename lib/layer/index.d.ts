import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
interface LayerProps {
    runtime: lambda.Runtime;
    architecture: lambda.Architecture;
    path: string;
    autoUpgrade?: boolean;
}
export declare class Layer extends Construct {
    layer: lambda.LayerVersion;
    constructor(scope: Construct, id: string, props: LayerProps);
}
export {};
