"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SageMakerModel = void 0;
__exportStar(require("./container-images"), exports);
__exportStar(require("./types"), exports);
const constructs_1 = require("constructs");
const deploy_container_model_1 = require("./deploy-container-model");
const deploy_custom_script_model_1 = require("./deploy-custom-script-model");
const deploy_package_model_1 = require("./deploy-package-model");
const types_1 = require("./types");
class SageMakerModel extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { model } = props;
        this.modelId = model.modelId;
        if (model.type == types_1.DeploymentType.Container) {
            const { endpoint } = deploy_container_model_1.deployContainerModel(this, props, model);
            this.endpoint = endpoint;
        }
        else if (model.type == types_1.DeploymentType.ModelPackage) {
            const { endpoint } = deploy_package_model_1.deployPackageModel(this, props, model);
            this.endpoint = endpoint;
        }
        else if (model.type == types_1.DeploymentType.CustomInferenceScript) {
            const { endpoint } = deploy_custom_script_model_1.deployCustomScriptModel(this, props, model);
            this.endpoint = endpoint;
        }
    }
}
exports.SageMakerModel = SageMakerModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQUEscURBQW1DO0FBQ25DLDBDQUF3QjtBQUV4QiwyQ0FBdUM7QUFDdkMscUVBQWdFO0FBQ2hFLDZFQUF1RTtBQUN2RSxpRUFBNEQ7QUFDNUQsbUNBQThEO0FBRTlELE1BQWEsY0FBZSxTQUFRLHNCQUFTO0lBSTNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMEI7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUU3QixJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksc0JBQWMsQ0FBQyxTQUFTLEVBQUU7WUFDMUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLDZDQUFvQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDOUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7U0FDMUI7YUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksc0JBQWMsQ0FBQyxZQUFZLEVBQUU7WUFDcEQsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLHlDQUFrQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7U0FDMUI7YUFBTSxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksc0JBQWMsQ0FBQyxxQkFBcUIsRUFBRTtZQUM3RCxNQUFNLEVBQUUsUUFBUSxFQUFFLEdBQUcsb0RBQXVCLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNqRSxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztTQUMxQjtJQUNILENBQUM7Q0FDRjtBQXJCRCx3Q0FxQkMiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgKiBmcm9tIFwiLi9jb250YWluZXItaW1hZ2VzXCI7XG5leHBvcnQgKiBmcm9tIFwiLi90eXBlc1wiO1xuaW1wb3J0ICogYXMgc2FnZW1ha2VyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc2FnZW1ha2VyXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgZGVwbG95Q29udGFpbmVyTW9kZWwgfSBmcm9tIFwiLi9kZXBsb3ktY29udGFpbmVyLW1vZGVsXCI7XG5pbXBvcnQgeyBkZXBsb3lDdXN0b21TY3JpcHRNb2RlbCB9IGZyb20gXCIuL2RlcGxveS1jdXN0b20tc2NyaXB0LW1vZGVsXCI7XG5pbXBvcnQgeyBkZXBsb3lQYWNrYWdlTW9kZWwgfSBmcm9tIFwiLi9kZXBsb3ktcGFja2FnZS1tb2RlbFwiO1xuaW1wb3J0IHsgRGVwbG95bWVudFR5cGUsIFNhZ2VNYWtlck1vZGVsUHJvcHMgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY2xhc3MgU2FnZU1ha2VyTW9kZWwgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgZW5kcG9pbnQ6IHNhZ2VtYWtlci5DZm5FbmRwb2ludDtcbiAgcHVibGljIHJlYWRvbmx5IG1vZGVsSWQ6IHN0cmluZyB8IHN0cmluZ1tdO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBTYWdlTWFrZXJNb2RlbFByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IHsgbW9kZWwgfSA9IHByb3BzO1xuICAgIHRoaXMubW9kZWxJZCA9IG1vZGVsLm1vZGVsSWQ7XG5cbiAgICBpZiAobW9kZWwudHlwZSA9PSBEZXBsb3ltZW50VHlwZS5Db250YWluZXIpIHtcbiAgICAgIGNvbnN0IHsgZW5kcG9pbnQgfSA9IGRlcGxveUNvbnRhaW5lck1vZGVsKHRoaXMsIHByb3BzLCBtb2RlbCk7XG4gICAgICB0aGlzLmVuZHBvaW50ID0gZW5kcG9pbnQ7XG4gICAgfSBlbHNlIGlmIChtb2RlbC50eXBlID09IERlcGxveW1lbnRUeXBlLk1vZGVsUGFja2FnZSkge1xuICAgICAgY29uc3QgeyBlbmRwb2ludCB9ID0gZGVwbG95UGFja2FnZU1vZGVsKHRoaXMsIHByb3BzLCBtb2RlbCk7XG4gICAgICB0aGlzLmVuZHBvaW50ID0gZW5kcG9pbnQ7XG4gICAgfSBlbHNlIGlmIChtb2RlbC50eXBlID09IERlcGxveW1lbnRUeXBlLkN1c3RvbUluZmVyZW5jZVNjcmlwdCkge1xuICAgICAgY29uc3QgeyBlbmRwb2ludCB9ID0gZGVwbG95Q3VzdG9tU2NyaXB0TW9kZWwodGhpcywgcHJvcHMsIG1vZGVsKTtcbiAgICAgIHRoaXMuZW5kcG9pbnQgPSBlbmRwb2ludDtcbiAgICB9XG4gIH1cbn1cbiJdfQ==