import { Construct } from "constructs";
import { SageMakerModelProps, ModelContainerConfig } from "./types";
export declare function deployContainerModel(scope: Construct, props: SageMakerModelProps, modelConfig: ModelContainerConfig): {
    model: any;
    endpoint: any;
};
