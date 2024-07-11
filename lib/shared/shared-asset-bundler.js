"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedAssetBundler = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const helpers_internal_1 = require("aws-cdk-lib/core/lib/helpers-internal");
const constructs_1 = require("constructs");
const path = require("path");
const fs = require("fs");
function calculateHash(paths) {
    return paths.reduce((mh, p) => {
        const dirs = fs.readdirSync(p);
        let hash = calculateHash(dirs
            .filter((d) => fs.statSync(path.join(p, d)).isDirectory())
            .map((v) => path.join(p, v)));
        return helpers_internal_1.md5hash(mh +
            dirs
                .filter((d) => fs.statSync(path.join(p, d)).isFile())
                .reduce((h, f) => {
                return helpers_internal_1.md5hash(h + fs.readFileSync(path.join(p, f)));
            }, hash));
    }, "");
}
class SharedAssetBundler extends constructs_1.Construct {
    /**
     * Instantiate a new SharedAssetBundler. You then invoke `bundleWithAsset(pathToAsset)` to
     * bundle your asset code with the common code.
     *
     * For Lambda function handler assets, you can use `bundleWithLambdaAsset(pathToAsset)` as
     * a drop-in replacement for `lambda.Code.fromAsset()`
     *
     * @param scope
     * @param id
     * @param commonFolders : array of common folders to bundle with your asset code
     */
    constructor(scope, id, sharedAssets) {
        super(scope, id);
        this.WORKING_PATH = "/asset-input/";
        this.sharedAssets = sharedAssets;
    }
    bundleWithAsset(assetPath) {
        console.log(`Bundling asset ${assetPath}`);
        const asset = new aws_cdk_lib_1.aws_s3_assets.Asset(this, helpers_internal_1.md5hash(assetPath).slice(0, 6), {
            path: assetPath,
            bundling: {
                image: aws_cdk_lib_1.DockerImage.fromBuild(path.posix.join(__dirname, "alpine-zip")),
                command: [
                    "zip",
                    "-r",
                    path.posix.join("/asset-output", "asset.zip"),
                    ".",
                ],
                volumes: this.sharedAssets.map((f) => ({
                    containerPath: path.posix.join(this.WORKING_PATH, path.basename(f)),
                    hostPath: f,
                })),
                workingDirectory: this.WORKING_PATH,
                outputType: aws_cdk_lib_1.BundlingOutput.ARCHIVED,
            },
            assetHash: calculateHash([assetPath, ...this.sharedAssets]),
            assetHashType: aws_cdk_lib_1.AssetHashType.CUSTOM,
        });
        return asset;
    }
    bundleWithLambdaAsset(assetPath) {
        const asset = this.bundleWithAsset(assetPath);
        return aws_lambda_1.Code.fromBucket(asset.bucket, asset.s3ObjectKey);
    }
}
exports.SharedAssetBundler = SharedAssetBundler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkLWFzc2V0LWJ1bmRsZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzaGFyZWQtYXNzZXQtYnVuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FLcUI7QUFDckIsdURBQXNEO0FBRXRELDRFQUFnRTtBQUNoRSwyQ0FBdUM7QUFDdkMsNkJBQTZCO0FBQzdCLHlCQUF5QjtBQUV6QixTQUFTLGFBQWEsQ0FBQyxLQUFlO0lBQ3BDLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM1QixNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLElBQUksSUFBSSxHQUFHLGFBQWEsQ0FDdEIsSUFBSTthQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO2FBQ3pELEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FDL0IsQ0FBQztRQUNGLE9BQU8sMEJBQU8sQ0FDWixFQUFFO1lBQ0EsSUFBSTtpQkFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztpQkFDcEQsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUNmLE9BQU8sMEJBQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkQsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUNiLENBQUM7SUFDSixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDVCxDQUFDO0FBRUQsTUFBYSxrQkFBbUIsU0FBUSxzQkFBUztJQUcvQzs7Ozs7Ozs7OztPQVVHO0lBQ0gsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxZQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBYkYsaUJBQVksR0FBRyxlQUFlLENBQUM7UUFjOUMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7SUFDbkMsQ0FBQztJQUVELGVBQWUsQ0FBQyxTQUFpQjtRQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sS0FBSyxHQUFHLElBQUksMkJBQWEsQ0FBQyxLQUFLLENBQ25DLElBQUksRUFDSiwwQkFBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzlCO1lBQ0UsSUFBSSxFQUFFLFNBQVM7WUFDZixRQUFRLEVBQUU7Z0JBQ1IsS0FBSyxFQUFFLHlCQUFXLENBQUMsU0FBUyxDQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQ3pDO2dCQUNELE9BQU8sRUFBRTtvQkFDUCxLQUFLO29CQUNMLElBQUk7b0JBQ0osSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLFdBQVcsQ0FBQztvQkFDN0MsR0FBRztpQkFDSjtnQkFDRCxPQUFPLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ3JDLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ25FLFFBQVEsRUFBRSxDQUFDO2lCQUNaLENBQUMsQ0FBQztnQkFDSCxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsWUFBWTtnQkFDbkMsVUFBVSxFQUFFLDRCQUFjLENBQUMsUUFBUTthQUNwQztZQUNELFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDM0QsYUFBYSxFQUFFLDJCQUFhLENBQUMsTUFBTTtTQUNwQyxDQUNGLENBQUM7UUFDRixPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxTQUFpQjtRQUNyQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLE9BQU8saUJBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDMUQsQ0FBQztDQUNGO0FBdERELGdEQXNEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIEFzc2V0SGFzaFR5cGUsXG4gIEJ1bmRsaW5nT3V0cHV0LFxuICBEb2NrZXJJbWFnZSxcbiAgYXdzX3MzX2Fzc2V0cyxcbn0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDb2RlLCBTM0NvZGUgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYVwiO1xuaW1wb3J0IHsgQXNzZXQgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzLWFzc2V0c1wiO1xuaW1wb3J0IHsgbWQ1aGFzaCB9IGZyb20gXCJhd3MtY2RrLWxpYi9jb3JlL2xpYi9oZWxwZXJzLWludGVybmFsXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0ICogYXMgZnMgZnJvbSBcImZzXCI7XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZUhhc2gocGF0aHM6IHN0cmluZ1tdKTogc3RyaW5nIHtcbiAgcmV0dXJuIHBhdGhzLnJlZHVjZSgobWgsIHApID0+IHtcbiAgICBjb25zdCBkaXJzID0gZnMucmVhZGRpclN5bmMocCk7XG4gICAgbGV0IGhhc2ggPSBjYWxjdWxhdGVIYXNoKFxuICAgICAgZGlyc1xuICAgICAgICAuZmlsdGVyKChkKSA9PiBmcy5zdGF0U3luYyhwYXRoLmpvaW4ocCwgZCkpLmlzRGlyZWN0b3J5KCkpXG4gICAgICAgIC5tYXAoKHYpID0+IHBhdGguam9pbihwLCB2KSlcbiAgICApO1xuICAgIHJldHVybiBtZDVoYXNoKFxuICAgICAgbWggK1xuICAgICAgICBkaXJzXG4gICAgICAgICAgLmZpbHRlcigoZCkgPT4gZnMuc3RhdFN5bmMocGF0aC5qb2luKHAsIGQpKS5pc0ZpbGUoKSlcbiAgICAgICAgICAucmVkdWNlKChoLCBmKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gbWQ1aGFzaChoICsgZnMucmVhZEZpbGVTeW5jKHBhdGguam9pbihwLCBmKSkpO1xuICAgICAgICAgIH0sIGhhc2gpXG4gICAgKTtcbiAgfSwgXCJcIik7XG59XG5cbmV4cG9ydCBjbGFzcyBTaGFyZWRBc3NldEJ1bmRsZXIgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwcml2YXRlIHJlYWRvbmx5IHNoYXJlZEFzc2V0czogc3RyaW5nW107XG4gIHByaXZhdGUgcmVhZG9ubHkgV09SS0lOR19QQVRIID0gXCIvYXNzZXQtaW5wdXQvXCI7XG4gIC8qKlxuICAgKiBJbnN0YW50aWF0ZSBhIG5ldyBTaGFyZWRBc3NldEJ1bmRsZXIuIFlvdSB0aGVuIGludm9rZSBgYnVuZGxlV2l0aEFzc2V0KHBhdGhUb0Fzc2V0KWAgdG9cbiAgICogYnVuZGxlIHlvdXIgYXNzZXQgY29kZSB3aXRoIHRoZSBjb21tb24gY29kZS5cbiAgICpcbiAgICogRm9yIExhbWJkYSBmdW5jdGlvbiBoYW5kbGVyIGFzc2V0cywgeW91IGNhbiB1c2UgYGJ1bmRsZVdpdGhMYW1iZGFBc3NldChwYXRoVG9Bc3NldClgIGFzXG4gICAqIGEgZHJvcC1pbiByZXBsYWNlbWVudCBmb3IgYGxhbWJkYS5Db2RlLmZyb21Bc3NldCgpYFxuICAgKlxuICAgKiBAcGFyYW0gc2NvcGVcbiAgICogQHBhcmFtIGlkXG4gICAqIEBwYXJhbSBjb21tb25Gb2xkZXJzIDogYXJyYXkgb2YgY29tbW9uIGZvbGRlcnMgdG8gYnVuZGxlIHdpdGggeW91ciBhc3NldCBjb2RlXG4gICAqL1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBzaGFyZWRBc3NldHM6IHN0cmluZ1tdKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcbiAgICB0aGlzLnNoYXJlZEFzc2V0cyA9IHNoYXJlZEFzc2V0cztcbiAgfVxuXG4gIGJ1bmRsZVdpdGhBc3NldChhc3NldFBhdGg6IHN0cmluZyk6IEFzc2V0IHtcbiAgICBjb25zb2xlLmxvZyhgQnVuZGxpbmcgYXNzZXQgJHthc3NldFBhdGh9YCk7XG4gICAgY29uc3QgYXNzZXQgPSBuZXcgYXdzX3MzX2Fzc2V0cy5Bc3NldChcbiAgICAgIHRoaXMsXG4gICAgICBtZDVoYXNoKGFzc2V0UGF0aCkuc2xpY2UoMCwgNiksXG4gICAgICB7XG4gICAgICAgIHBhdGg6IGFzc2V0UGF0aCxcbiAgICAgICAgYnVuZGxpbmc6IHtcbiAgICAgICAgICBpbWFnZTogRG9ja2VySW1hZ2UuZnJvbUJ1aWxkKFxuICAgICAgICAgICAgcGF0aC5wb3NpeC5qb2luKF9fZGlybmFtZSwgXCJhbHBpbmUtemlwXCIpXG4gICAgICAgICAgKSxcbiAgICAgICAgICBjb21tYW5kOiBbXG4gICAgICAgICAgICBcInppcFwiLFxuICAgICAgICAgICAgXCItclwiLFxuICAgICAgICAgICAgcGF0aC5wb3NpeC5qb2luKFwiL2Fzc2V0LW91dHB1dFwiLCBcImFzc2V0LnppcFwiKSxcbiAgICAgICAgICAgIFwiLlwiLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgdm9sdW1lczogdGhpcy5zaGFyZWRBc3NldHMubWFwKChmKSA9PiAoe1xuICAgICAgICAgICAgY29udGFpbmVyUGF0aDogcGF0aC5wb3NpeC5qb2luKHRoaXMuV09SS0lOR19QQVRILCBwYXRoLmJhc2VuYW1lKGYpKSxcbiAgICAgICAgICAgIGhvc3RQYXRoOiBmLFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgICB3b3JraW5nRGlyZWN0b3J5OiB0aGlzLldPUktJTkdfUEFUSCxcbiAgICAgICAgICBvdXRwdXRUeXBlOiBCdW5kbGluZ091dHB1dC5BUkNISVZFRCxcbiAgICAgICAgfSxcbiAgICAgICAgYXNzZXRIYXNoOiBjYWxjdWxhdGVIYXNoKFthc3NldFBhdGgsIC4uLnRoaXMuc2hhcmVkQXNzZXRzXSksXG4gICAgICAgIGFzc2V0SGFzaFR5cGU6IEFzc2V0SGFzaFR5cGUuQ1VTVE9NLFxuICAgICAgfVxuICAgICk7XG4gICAgcmV0dXJuIGFzc2V0O1xuICB9XG5cbiAgYnVuZGxlV2l0aExhbWJkYUFzc2V0KGFzc2V0UGF0aDogc3RyaW5nKTogUzNDb2RlIHtcbiAgICBjb25zdCBhc3NldCA9IHRoaXMuYnVuZGxlV2l0aEFzc2V0KGFzc2V0UGF0aCk7XG4gICAgcmV0dXJuIENvZGUuZnJvbUJ1Y2tldChhc3NldC5idWNrZXQsIGFzc2V0LnMzT2JqZWN0S2V5KTtcbiAgfVxufVxuIl19