import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { Shared } from "../shared";
import { SageMakerModelEndpoint, SystemConfig } from "../shared/types";
export interface ModelsProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
}
export declare class Models extends Construct {
    readonly models: SageMakerModelEndpoint[];
    readonly modelsParameter: ssm.StringParameter;
    constructor(scope: Construct, id: string, props: ModelsProps);
    private suppressCdkNagWarningForEndpointRole;
}
