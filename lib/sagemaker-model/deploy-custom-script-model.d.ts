import { Construct } from "constructs";
import { SageMakerModelProps, ModelCustomScriptConfig } from "./types";
export declare function deployCustomScriptModel(scope: Construct, props: SageMakerModelProps, modelConfig: ModelCustomScriptConfig): {
    model: any;
    endpoint: any;
};
