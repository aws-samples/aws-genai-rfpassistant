"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployCustomScriptModel = void 0;
const hf_custom_script_model_1 = require("./hf-custom-script-model");
const crypto_1 = require("crypto");
function deployCustomScriptModel(scope, props, modelConfig) {
    const { vpc, region } = props;
    const { modelId, instanceType, codeFolder, container, env } = modelConfig;
    const endpointName = (Array.isArray(modelId)
        ? `Multi${crypto_1.createHash("md5")
            .update(modelId.join(","))
            .digest("hex")
            .toUpperCase()
            .slice(-5)}`
        : modelId)
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(-10);
    const llmModel = new hf_custom_script_model_1.HuggingFaceCustomScriptModel(scope, endpointName, {
        vpc,
        region,
        modelId,
        instanceType,
        codeFolder,
        container,
        env,
    });
    return { model: llmModel.model, endpoint: llmModel.endpoint };
}
exports.deployCustomScriptModel = deployCustomScriptModel;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95LWN1c3RvbS1zY3JpcHQtbW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkZXBsb3ktY3VzdG9tLXNjcmlwdC1tb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxxRUFBd0U7QUFFeEUsbUNBQW9DO0FBRXBDLFNBQWdCLHVCQUF1QixDQUNyQyxLQUFnQixFQUNoQixLQUEwQixFQUMxQixXQUFvQztJQUVwQyxNQUFNLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQztJQUM5QixNQUFNLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxHQUFHLFdBQVcsQ0FBQztJQUUxRSxNQUFNLFlBQVksR0FBRyxDQUNuQixLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztRQUNwQixDQUFDLENBQUMsUUFBUSxtQkFBVSxDQUFDLEtBQUssQ0FBQzthQUN0QixNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUN6QixNQUFNLENBQUMsS0FBSyxDQUFDO2FBQ2IsV0FBVyxFQUFFO2FBQ2IsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDaEIsQ0FBQyxDQUFDLE9BQU8sQ0FDWjtTQUNFLE9BQU8sQ0FBQyxlQUFlLEVBQUUsRUFBRSxDQUFDO1NBQzVCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2QsTUFBTSxRQUFRLEdBQUcsSUFBSSxxREFBNEIsQ0FBQyxLQUFLLEVBQUUsWUFBWSxFQUFFO1FBQ3JFLEdBQUc7UUFDSCxNQUFNO1FBQ04sT0FBTztRQUNQLFlBQVk7UUFDWixVQUFVO1FBQ1YsU0FBUztRQUNULEdBQUc7S0FDSixDQUFDLENBQUM7SUFFSCxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNoRSxDQUFDO0FBOUJELDBEQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5cbmltcG9ydCB7IEh1Z2dpbmdGYWNlQ3VzdG9tU2NyaXB0TW9kZWwgfSBmcm9tIFwiLi9oZi1jdXN0b20tc2NyaXB0LW1vZGVsXCI7XG5pbXBvcnQgeyBTYWdlTWFrZXJNb2RlbFByb3BzLCBNb2RlbEN1c3RvbVNjcmlwdENvbmZpZyB9IGZyb20gXCIuL3R5cGVzXCI7XG5pbXBvcnQgeyBjcmVhdGVIYXNoIH0gZnJvbSBcImNyeXB0b1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gZGVwbG95Q3VzdG9tU2NyaXB0TW9kZWwoXG4gIHNjb3BlOiBDb25zdHJ1Y3QsXG4gIHByb3BzOiBTYWdlTWFrZXJNb2RlbFByb3BzLFxuICBtb2RlbENvbmZpZzogTW9kZWxDdXN0b21TY3JpcHRDb25maWdcbikge1xuICBjb25zdCB7IHZwYywgcmVnaW9uIH0gPSBwcm9wcztcbiAgY29uc3QgeyBtb2RlbElkLCBpbnN0YW5jZVR5cGUsIGNvZGVGb2xkZXIsIGNvbnRhaW5lciwgZW52IH0gPSBtb2RlbENvbmZpZztcblxuICBjb25zdCBlbmRwb2ludE5hbWUgPSAoXG4gICAgQXJyYXkuaXNBcnJheShtb2RlbElkKVxuICAgICAgPyBgTXVsdGkke2NyZWF0ZUhhc2goXCJtZDVcIilcbiAgICAgICAgICAudXBkYXRlKG1vZGVsSWQuam9pbihcIixcIikpXG4gICAgICAgICAgLmRpZ2VzdChcImhleFwiKVxuICAgICAgICAgIC50b1VwcGVyQ2FzZSgpXG4gICAgICAgICAgLnNsaWNlKC01KX1gXG4gICAgICA6IG1vZGVsSWRcbiAgKVxuICAgIC5yZXBsYWNlKC9bXmEtekEtWjAtOV0vZywgXCJcIilcbiAgICAuc2xpY2UoLTEwKTtcbiAgY29uc3QgbGxtTW9kZWwgPSBuZXcgSHVnZ2luZ0ZhY2VDdXN0b21TY3JpcHRNb2RlbChzY29wZSwgZW5kcG9pbnROYW1lLCB7XG4gICAgdnBjLFxuICAgIHJlZ2lvbixcbiAgICBtb2RlbElkLFxuICAgIGluc3RhbmNlVHlwZSxcbiAgICBjb2RlRm9sZGVyLFxuICAgIGNvbnRhaW5lcixcbiAgICBlbnYsXG4gIH0pO1xuXG4gIHJldHVybiB7IG1vZGVsOiBsbG1Nb2RlbC5tb2RlbCwgZW5kcG9pbnQ6IGxsbU1vZGVsLmVuZHBvaW50IH07XG59XG4iXX0=