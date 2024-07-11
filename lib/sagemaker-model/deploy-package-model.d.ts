import { Construct } from "constructs";
import { SageMakerModelProps, ModelPackageConfig } from "./types";
export declare function deployPackageModel(scope: Construct, props: SageMakerModelProps, modelConfig: ModelPackageConfig): {
    model: any;
    endpoint: any;
};
