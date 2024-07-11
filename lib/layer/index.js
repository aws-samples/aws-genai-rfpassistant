"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Layer = void 0;
const cdk = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const s3assets = require("aws-cdk-lib/aws-s3-assets");
const constructs_1 = require("constructs");
class Layer extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const { runtime, architecture, path, autoUpgrade } = props;
        const args = ["-t /asset-output/python"];
        if (autoUpgrade) {
            args.push("--upgrade");
        }
        const layerAsset = new s3assets.Asset(this, "LayerAsset", {
            path,
            bundling: {
                image: runtime.bundlingImage,
                platform: architecture.dockerPlatform,
                command: [
                    "bash",
                    "-c",
                    `pip install -r requirements.txt ${args.join(" ")}`,
                ],
                outputType: cdk.BundlingOutput.AUTO_DISCOVER,
                securityOpt: "no-new-privileges:true",
                network: "host",
            },
        });
        const layer = new lambda.LayerVersion(this, "Layer", {
            code: lambda.Code.fromBucket(layerAsset.bucket, layerAsset.s3ObjectKey),
            compatibleRuntimes: [runtime],
            compatibleArchitectures: [architecture],
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        this.layer = layer;
    }
}
exports.Layer = Layer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsaURBQWlEO0FBQ2pELHNEQUFzRDtBQUN0RCwyQ0FBdUM7QUFTdkMsTUFBYSxLQUFNLFNBQVEsc0JBQVM7SUFHbEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFpQjtRQUN6RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFM0QsTUFBTSxJQUFJLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ3pDLElBQUksV0FBVyxFQUFFO1lBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUN4QjtRQUVELE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3hELElBQUk7WUFDSixRQUFRLEVBQUU7Z0JBQ1IsS0FBSyxFQUFFLE9BQU8sQ0FBQyxhQUFhO2dCQUM1QixRQUFRLEVBQUUsWUFBWSxDQUFDLGNBQWM7Z0JBQ3JDLE9BQU8sRUFBRTtvQkFDUCxNQUFNO29CQUNOLElBQUk7b0JBQ0osbUNBQW1DLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7aUJBQ3BEO2dCQUNELFVBQVUsRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLGFBQWE7Z0JBQzVDLFdBQVcsRUFBRSx3QkFBd0I7Z0JBQ3JDLE9BQU8sRUFBRSxNQUFNO2FBQ2hCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxLQUFLLEdBQUcsSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7WUFDbkQsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN2RSxrQkFBa0IsRUFBRSxDQUFDLE9BQU8sQ0FBQztZQUM3Qix1QkFBdUIsRUFBRSxDQUFDLFlBQVksQ0FBQztZQUN2QyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3JCLENBQUM7Q0FDRjtBQXRDRCxzQkFzQ0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcbmltcG9ydCAqIGFzIHMzYXNzZXRzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczMtYXNzZXRzXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuXG5pbnRlcmZhY2UgTGF5ZXJQcm9wcyB7XG4gIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lO1xuICBhcmNoaXRlY3R1cmU6IGxhbWJkYS5BcmNoaXRlY3R1cmU7XG4gIHBhdGg6IHN0cmluZztcbiAgYXV0b1VwZ3JhZGU/OiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgTGF5ZXIgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgbGF5ZXI6IGxhbWJkYS5MYXllclZlcnNpb247XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExheWVyUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgeyBydW50aW1lLCBhcmNoaXRlY3R1cmUsIHBhdGgsIGF1dG9VcGdyYWRlIH0gPSBwcm9wcztcblxuICAgIGNvbnN0IGFyZ3MgPSBbXCItdCAvYXNzZXQtb3V0cHV0L3B5dGhvblwiXTtcbiAgICBpZiAoYXV0b1VwZ3JhZGUpIHtcbiAgICAgIGFyZ3MucHVzaChcIi0tdXBncmFkZVwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBsYXllckFzc2V0ID0gbmV3IHMzYXNzZXRzLkFzc2V0KHRoaXMsIFwiTGF5ZXJBc3NldFwiLCB7XG4gICAgICBwYXRoLFxuICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgaW1hZ2U6IHJ1bnRpbWUuYnVuZGxpbmdJbWFnZSxcbiAgICAgICAgcGxhdGZvcm06IGFyY2hpdGVjdHVyZS5kb2NrZXJQbGF0Zm9ybSxcbiAgICAgICAgY29tbWFuZDogW1xuICAgICAgICAgIFwiYmFzaFwiLFxuICAgICAgICAgIFwiLWNcIixcbiAgICAgICAgICBgcGlwIGluc3RhbGwgLXIgcmVxdWlyZW1lbnRzLnR4dCAke2FyZ3Muam9pbihcIiBcIil9YCxcbiAgICAgICAgXSxcbiAgICAgICAgb3V0cHV0VHlwZTogY2RrLkJ1bmRsaW5nT3V0cHV0LkFVVE9fRElTQ09WRVIsXG4gICAgICAgIHNlY3VyaXR5T3B0OiBcIm5vLW5ldy1wcml2aWxlZ2VzOnRydWVcIixcbiAgICAgICAgbmV0d29yazogXCJob3N0XCIsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgY29uc3QgbGF5ZXIgPSBuZXcgbGFtYmRhLkxheWVyVmVyc2lvbih0aGlzLCBcIkxheWVyXCIsIHtcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21CdWNrZXQobGF5ZXJBc3NldC5idWNrZXQsIGxheWVyQXNzZXQuczNPYmplY3RLZXkpLFxuICAgICAgY29tcGF0aWJsZVJ1bnRpbWVzOiBbcnVudGltZV0sXG4gICAgICBjb21wYXRpYmxlQXJjaGl0ZWN0dXJlczogW2FyY2hpdGVjdHVyZV0sXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgdGhpcy5sYXllciA9IGxheWVyO1xuICB9XG59XG4iXX0=