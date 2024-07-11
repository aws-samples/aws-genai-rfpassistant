"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SageMakerRagModels = void 0;
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const path = require("path");
const sagemaker_model_1 = require("../../sagemaker-model");
class SageMakerRagModels extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const sageMakerEmbeddingsModelIds = props.config.rag.embeddingsModels
            .filter((c) => c.provider === "sagemaker")
            .map((c) => c.name);
        const sageMakerCrossEncoderModelIds = props.config.rag.crossEncoderModels
            .filter((c) => c.provider === "sagemaker")
            .map((c) => c.name);
        const model = new sagemaker_model_1.SageMakerModel(this, "Model", {
            vpc: props.shared.vpc,
            region: cdk.Aws.REGION,
            model: {
                type: sagemaker_model_1.DeploymentType.CustomInferenceScript,
                modelId: [
                    ...sageMakerEmbeddingsModelIds,
                    ...sageMakerCrossEncoderModelIds,
                ],
                codeFolder: path.join(__dirname, "./model"),
                instanceType: "ml.g4dn.xlarge",
            },
        });
        this.model = model;
    }
}
exports.SageMakerRagModels = SageMakerRagModels;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsMkNBQXVDO0FBQ3ZDLDZCQUE2QjtBQUM3QiwyREFBdUU7QUFVdkUsTUFBYSxrQkFBbUIsU0FBUSxzQkFBUztJQUcvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQThCO1FBQ3RFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSwyQkFBMkIsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0I7YUFDbEUsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLFdBQVcsQ0FBQzthQUN6QyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV0QixNQUFNLDZCQUE2QixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGtCQUFrQjthQUN0RSxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssV0FBVyxDQUFDO2FBQ3pDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXRCLE1BQU0sS0FBSyxHQUFHLElBQUksZ0NBQWMsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQzlDLEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUc7WUFDckIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTTtZQUN0QixLQUFLLEVBQUU7Z0JBQ0wsSUFBSSxFQUFFLGdDQUFjLENBQUMscUJBQXFCO2dCQUMxQyxPQUFPLEVBQUU7b0JBQ1AsR0FBRywyQkFBMkI7b0JBQzlCLEdBQUcsNkJBQTZCO2lCQUNqQztnQkFDRCxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO2dCQUMzQyxZQUFZLEVBQUUsZ0JBQWdCO2FBQy9CO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztDQUNGO0FBOUJELGdEQThCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBEZXBsb3ltZW50VHlwZSwgU2FnZU1ha2VyTW9kZWwgfSBmcm9tIFwiLi4vLi4vc2FnZW1ha2VyLW1vZGVsXCI7XG5pbXBvcnQgeyBTaGFyZWQgfSBmcm9tIFwiLi4vLi4vc2hhcmVkXCI7XG5pbXBvcnQgeyBTeXN0ZW1Db25maWcgfSBmcm9tIFwiLi4vLi4vc2hhcmVkL3R5cGVzXCI7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNhZ2VNYWtlclJhZ01vZGVsc1Byb3BzIHtcbiAgcmVhZG9ubHkgY29uZmlnOiBTeXN0ZW1Db25maWc7XG4gIHJlYWRvbmx5IHNoYXJlZDogU2hhcmVkO1xufVxuXG5leHBvcnQgY2xhc3MgU2FnZU1ha2VyUmFnTW9kZWxzIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcmVhZG9ubHkgbW9kZWw6IFNhZ2VNYWtlck1vZGVsO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBTYWdlTWFrZXJSYWdNb2RlbHNQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBzYWdlTWFrZXJFbWJlZGRpbmdzTW9kZWxJZHMgPSBwcm9wcy5jb25maWcucmFnLmVtYmVkZGluZ3NNb2RlbHNcbiAgICAgIC5maWx0ZXIoKGMpID0+IGMucHJvdmlkZXIgPT09IFwic2FnZW1ha2VyXCIpXG4gICAgICAubWFwKChjKSA9PiBjLm5hbWUpO1xuXG4gICAgY29uc3Qgc2FnZU1ha2VyQ3Jvc3NFbmNvZGVyTW9kZWxJZHMgPSBwcm9wcy5jb25maWcucmFnLmNyb3NzRW5jb2Rlck1vZGVsc1xuICAgICAgLmZpbHRlcigoYykgPT4gYy5wcm92aWRlciA9PT0gXCJzYWdlbWFrZXJcIilcbiAgICAgIC5tYXAoKGMpID0+IGMubmFtZSk7XG5cbiAgICBjb25zdCBtb2RlbCA9IG5ldyBTYWdlTWFrZXJNb2RlbCh0aGlzLCBcIk1vZGVsXCIsIHtcbiAgICAgIHZwYzogcHJvcHMuc2hhcmVkLnZwYyxcbiAgICAgIHJlZ2lvbjogY2RrLkF3cy5SRUdJT04sXG4gICAgICBtb2RlbDoge1xuICAgICAgICB0eXBlOiBEZXBsb3ltZW50VHlwZS5DdXN0b21JbmZlcmVuY2VTY3JpcHQsXG4gICAgICAgIG1vZGVsSWQ6IFtcbiAgICAgICAgICAuLi5zYWdlTWFrZXJFbWJlZGRpbmdzTW9kZWxJZHMsXG4gICAgICAgICAgLi4uc2FnZU1ha2VyQ3Jvc3NFbmNvZGVyTW9kZWxJZHMsXG4gICAgICAgIF0sXG4gICAgICAgIGNvZGVGb2xkZXI6IHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi9tb2RlbFwiKSxcbiAgICAgICAgaW5zdGFuY2VUeXBlOiBcIm1sLmc0ZG4ueGxhcmdlXCIsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgdGhpcy5tb2RlbCA9IG1vZGVsO1xuICB9XG59XG4iXX0=