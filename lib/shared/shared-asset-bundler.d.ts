import { S3Code } from "aws-cdk-lib/aws-lambda";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Construct } from "constructs";
export declare class SharedAssetBundler extends Construct {
    private readonly sharedAssets;
    private readonly WORKING_PATH;
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
    constructor(scope: Construct, id: string, sharedAssets: string[]);
    bundleWithAsset(assetPath: string): Asset;
    bundleWithLambdaAsset(assetPath: string): S3Code;
}
