import { Construct } from "constructs";
import { SageMakerModel } from "../../sagemaker-model";
import { Shared } from "../../shared";
import { SystemConfig } from "../../shared/types";
export interface SageMakerRagModelsProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
}
export declare class SageMakerRagModels extends Construct {
    readonly model: SageMakerModel;
    constructor(scope: Construct, id: string, props: SageMakerRagModelsProps);
}
