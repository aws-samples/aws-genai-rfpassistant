"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserInterface = void 0;
const cdk = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
const s3 = require("aws-cdk-lib/aws-s3");
const s3deploy = require("aws-cdk-lib/aws-s3-deployment");
const constructs_1 = require("constructs");
const node_child_process_1 = require("node:child_process");
const path = require("node:path");
const utils_1 = require("../shared/utils");
const private_website_1 = require("./private-website");
const public_website_1 = require("./public-website");
const cdk_nag_1 = require("cdk-nag");
class UserInterface extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const appPath = path.join(__dirname, "react-app");
        const buildPath = path.join(appPath, "dist");
        const uploadLogsBucket = new s3.Bucket(this, "WebsiteLogsBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            autoDeleteObjects: true,
            bucketName: props.config.privateWebsite ? props.config.domain : undefined,
            websiteIndexDocument: "index.html",
            websiteErrorDocument: "index.html",
            enforceSSL: true,
            serverAccessLogsBucket: uploadLogsBucket,
        });
        // Deploy either Private (only accessible within VPC) or Public facing website
        let apiEndpoint;
        let websocketEndpoint;
        let distribution;
        if (props.config.privateWebsite) {
            const privateWebsite = new private_website_1.PrivateWebsite(this, "PrivateWebsite", { ...props, websiteBucket: websiteBucket });
        }
        else {
            const publicWebsite = new public_website_1.PublicWebsite(this, "PublicWebsite", { ...props, websiteBucket: websiteBucket });
            distribution = publicWebsite.distribution;
        }
        const exportsAsset = s3deploy.Source.jsonData("aws-exports.json", {
            aws_project_region: cdk.Aws.REGION,
            aws_cognito_region: cdk.Aws.REGION,
            aws_user_pools_id: props.userPoolId,
            aws_user_pools_web_client_id: props.userPoolClientId,
            aws_cognito_identity_pool_id: props.identityPool.identityPoolId,
            Auth: {
                region: cdk.Aws.REGION,
                userPoolId: props.userPoolId,
                userPoolWebClientId: props.userPoolClientId,
                identityPoolId: props.identityPool.identityPoolId,
            },
            aws_appsync_graphqlEndpoint: props.api.graphqlApi.graphqlUrl,
            aws_appsync_region: cdk.Aws.REGION,
            aws_appsync_authenticationType: "AMAZON_COGNITO_USER_POOLS",
            aws_appsync_apiKey: props.api.graphqlApi?.apiKey,
            Storage: {
                AWSS3: {
                    bucket: props.chatbotFilesBucket.bucketName,
                    region: cdk.Aws.REGION,
                },
            },
            config: {
                rag_enabled: props.config.rag.enabled,
                cross_encoders_enabled: props.crossEncodersEnabled,
                sagemaker_embeddings_enabled: props.sagemakerEmbeddingsEnabled,
                default_embeddings_model: utils_1.Utils.getDefaultEmbeddingsModel(props.config),
                default_cross_encoder_model: utils_1.Utils.getDefaultCrossEncoderModel(props.config),
                privateWebsite: props.config.privateWebsite ? true : false,
            },
        });
        // Allow authenticated web users to read upload data to the attachments bucket for their chat files
        // ref: https://docs.amplify.aws/lib/storage/getting-started/q/platform/js/#using-amazon-s3
        props.identityPool.authenticatedRole.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
            resources: [
                `${props.chatbotFilesBucket.bucketArn}/public/*`,
                `${props.chatbotFilesBucket.bucketArn}/protected/\${cognito-identity.amazonaws.com:sub}/*`,
                `${props.chatbotFilesBucket.bucketArn}/private/\${cognito-identity.amazonaws.com:sub}/*`,
            ],
        }));
        props.identityPool.authenticatedRole.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ["s3:ListBucket"],
            resources: [`${props.chatbotFilesBucket.bucketArn}`],
            conditions: {
                StringLike: {
                    "s3:prefix": [
                        "public/",
                        "public/*",
                        "protected/",
                        "protected/*",
                        "private/${cognito-identity.amazonaws.com:sub}/",
                        "private/${cognito-identity.amazonaws.com:sub}/*",
                    ],
                },
            },
        }));
        // Enable CORS for the attachments bucket to allow uploads from the user interface
        // ref: https://docs.amplify.aws/lib/storage/getting-started/q/platform/js/#amazon-s3-bucket-cors-policy-setup
        props.chatbotFilesBucket.addCorsRule({
            allowedMethods: [
                s3.HttpMethods.GET,
                s3.HttpMethods.PUT,
                s3.HttpMethods.POST,
                s3.HttpMethods.DELETE,
            ],
            allowedOrigins: ["*"],
            allowedHeaders: ["*"],
            exposedHeaders: [
                "x-amz-server-side-encryption",
                "x-amz-request-id",
                "x-amz-id-2",
                "ETag",
            ],
            maxAge: 3000,
        });
        const asset = s3deploy.Source.asset(appPath, {
            bundling: {
                image: cdk.DockerImage.fromRegistry("public.ecr.aws/sam/build-nodejs18.x:latest"),
                command: [
                    "sh",
                    "-c",
                    [
                        "npm --cache /tmp/.npm install",
                        `npm --cache /tmp/.npm run build`,
                        "cp -aur /asset-input/dist/* /asset-output/",
                    ].join(" && "),
                ],
                local: {
                    tryBundle(outputDir) {
                        try {
                            const options = {
                                stdio: "inherit",
                                env: {
                                    ...process.env,
                                },
                            };
                            node_child_process_1.execSync(`npm --silent --prefix "${appPath}" ci`, options);
                            node_child_process_1.execSync(`npm --silent --prefix "${appPath}" run build`, options);
                            utils_1.Utils.copyDirRecursive(buildPath, outputDir);
                        }
                        catch (e) {
                            console.error(e);
                            return false;
                        }
                        return true;
                    },
                },
            },
        });
        new s3deploy.BucketDeployment(this, "UserInterfaceDeployment", {
            prune: false,
            sources: [asset, exportsAsset],
            destinationBucket: websiteBucket,
            distribution: props.config.privateWebsite ? undefined : distribution
        });
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(uploadLogsBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "Bucket is the server access logs bucket for websiteBucket.",
            },
        ]);
    }
}
exports.UserInterface = UserInterface;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxtQ0FBbUM7QUFFbkMsMkNBQTJDO0FBQzNDLHlDQUF5QztBQUN6QywwREFBMEQ7QUFDMUQsMkNBQXVDO0FBQ3ZDLDJEQUc0QjtBQUM1QixrQ0FBa0M7QUFHbEMsMkNBQXdDO0FBRXhDLHVEQUFrRDtBQUNsRCxxREFBZ0Q7QUFDaEQscUNBQTBDO0FBYzFDLE1BQWEsYUFBYyxTQUFRLHNCQUFTO0lBQzFDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBeUI7UUFDakUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNsRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU3QyxNQUFNLGdCQUFnQixHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDaEUsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLFVBQVUsRUFBRSxJQUFJO1NBQ2pCLENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FB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QUMsS0FBSyxFQUFFLFlBQVksQ0FBQztZQUM5QixpQkFBaUIsRUFBRSxhQUFhO1lBQ2hDLFlBQVksRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxZQUFZO1NBQ3JFLENBQUMsQ0FBQztRQUdIOztXQUVHO1FBQ0gseUJBQWUsQ0FBQyx1QkFBdUIsQ0FDckMsZ0JBQWdCLEVBQ2hCO1lBQ0U7Z0JBQ0UsRUFBRSxFQUFFLGlCQUFpQjtnQkFDckIsTUFBTSxFQUFFLDREQUE0RDthQUNyRTtTQUNGLENBQ0YsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXpMRCxzQ0F5TEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjb2duaXRvSWRlbnRpdHlQb29sIGZyb20gXCJAYXdzLWNkay9hd3MtY29nbml0by1pZGVudGl0eXBvb2wtYWxwaGFcIjtcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIGNmIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udFwiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnRcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQge1xuICBFeGVjU3luY09wdGlvbnNXaXRoQnVmZmVyRW5jb2RpbmcsXG4gIGV4ZWNTeW5jLFxufSBmcm9tIFwibm9kZTpjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJub2RlOnBhdGhcIjtcbmltcG9ydCB7IFNoYXJlZCB9IGZyb20gXCIuLi9zaGFyZWRcIjtcbmltcG9ydCB7IFN5c3RlbUNvbmZpZyB9IGZyb20gXCIuLi9zaGFyZWQvdHlwZXNcIjtcbmltcG9ydCB7IFV0aWxzIH0gZnJvbSBcIi4uL3NoYXJlZC91dGlsc1wiO1xuaW1wb3J0IHsgQ2hhdEJvdEFwaSB9IGZyb20gXCIuLi9jaGF0Ym90LWFwaVwiO1xuaW1wb3J0IHsgUHJpdmF0ZVdlYnNpdGUgfSBmcm9tIFwiLi9wcml2YXRlLXdlYnNpdGVcIlxuaW1wb3J0IHsgUHVibGljV2Vic2l0ZSB9IGZyb20gXCIuL3B1YmxpYy13ZWJzaXRlXCJcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVXNlckludGVyZmFjZVByb3BzIHtcbiAgcmVhZG9ubHkgY29uZmlnOiBTeXN0ZW1Db25maWc7XG4gIHJlYWRvbmx5IHNoYXJlZDogU2hhcmVkO1xuICByZWFkb25seSB1c2VyUG9vbElkOiBzdHJpbmc7XG4gIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50SWQ6IHN0cmluZztcbiAgcmVhZG9ubHkgaWRlbnRpdHlQb29sOiBjb2duaXRvSWRlbnRpdHlQb29sLklkZW50aXR5UG9vbDtcbiAgcmVhZG9ubHkgYXBpOiBDaGF0Qm90QXBpO1xuICByZWFkb25seSBjaGF0Ym90RmlsZXNCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgcmVhZG9ubHkgY3Jvc3NFbmNvZGVyc0VuYWJsZWQ6IGJvb2xlYW47XG4gIHJlYWRvbmx5IHNhZ2VtYWtlckVtYmVkZGluZ3NFbmFibGVkOiBib29sZWFuO1xufVxuXG5leHBvcnQgY2xhc3MgVXNlckludGVyZmFjZSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBVc2VySW50ZXJmYWNlUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgYXBwUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsIFwicmVhY3QtYXBwXCIpO1xuICAgIGNvbnN0IGJ1aWxkUGF0aCA9IHBhdGguam9pbihhcHBQYXRoLCBcImRpc3RcIik7XG5cbiAgICBjb25zdCB1cGxvYWRMb2dzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCBcIldlYnNpdGVMb2dzQnVja2V0XCIsIHtcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgY29uc3Qgd2Vic2l0ZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgXCJXZWJzaXRlQnVja2V0XCIsIHtcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICBidWNrZXROYW1lOiBwcm9wcy5jb25maWcucHJpdmF0ZVdlYnNpdGUgPyBwcm9wcy5jb25maWcuZG9tYWluIDogdW5kZWZpbmVkLCBcbiAgICAgIHdlYnNpdGVJbmRleERvY3VtZW50OiBcImluZGV4Lmh0bWxcIixcbiAgICAgIHdlYnNpdGVFcnJvckRvY3VtZW50OiBcImluZGV4Lmh0bWxcIixcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBzZXJ2ZXJBY2Nlc3NMb2dzQnVja2V0OiB1cGxvYWRMb2dzQnVja2V0LFxuICAgIH0pO1xuICAgIFxuICAgIC8vIERlcGxveSBlaXRoZXIgUHJpdmF0ZSAob25seSBhY2Nlc3NpYmxlIHdpdGhpbiBWUEMpIG9yIFB1YmxpYyBmYWNpbmcgd2Vic2l0ZVxuICAgIGxldCBhcGlFbmRwb2ludDogc3RyaW5nO1xuICAgIGxldCB3ZWJzb2NrZXRFbmRwb2ludDogc3RyaW5nO1xuICAgIGxldCBkaXN0cmlidXRpb247XG4gICAgXG4gICAgaWYgKHByb3BzLmNvbmZpZy5wcml2YXRlV2Vic2l0ZSkge1xuICAgICAgY29uc3QgcHJpdmF0ZVdlYnNpdGUgPSBuZXcgUHJpdmF0ZVdlYnNpdGUodGhpcywgXCJQcml2YXRlV2Vic2l0ZVwiLCB7Li4ucHJvcHMsIHdlYnNpdGVCdWNrZXQ6IHdlYnNpdGVCdWNrZXQgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHB1YmxpY1dlYnNpdGUgPSBuZXcgUHVibGljV2Vic2l0ZSh0aGlzLCBcIlB1YmxpY1dlYnNpdGVcIiwgey4uLnByb3BzLCB3ZWJzaXRlQnVja2V0OiB3ZWJzaXRlQnVja2V0IH0pO1xuICAgICAgZGlzdHJpYnV0aW9uID0gcHVibGljV2Vic2l0ZS5kaXN0cmlidXRpb25cbiAgICB9XG5cbiAgICAgIFxuXG4gICAgY29uc3QgZXhwb3J0c0Fzc2V0ID0gczNkZXBsb3kuU291cmNlLmpzb25EYXRhKFwiYXdzLWV4cG9ydHMuanNvblwiLCB7XG4gICAgICBhd3NfcHJvamVjdF9yZWdpb246IGNkay5Bd3MuUkVHSU9OLFxuICAgICAgYXdzX2NvZ25pdG9fcmVnaW9uOiBjZGsuQXdzLlJFR0lPTixcbiAgICAgIGF3c191c2VyX3Bvb2xzX2lkOiBwcm9wcy51c2VyUG9vbElkLFxuICAgICAgYXdzX3VzZXJfcG9vbHNfd2ViX2NsaWVudF9pZDogcHJvcHMudXNlclBvb2xDbGllbnRJZCxcbiAgICAgIGF3c19jb2duaXRvX2lkZW50aXR5X3Bvb2xfaWQ6IHByb3BzLmlkZW50aXR5UG9vbC5pZGVudGl0eVBvb2xJZCxcbiAgICAgIEF1dGg6IHtcbiAgICAgICAgcmVnaW9uOiBjZGsuQXdzLlJFR0lPTixcbiAgICAgICAgdXNlclBvb2xJZDogcHJvcHMudXNlclBvb2xJZCxcbiAgICAgICAgdXNlclBvb2xXZWJDbGllbnRJZDogcHJvcHMudXNlclBvb2xDbGllbnRJZCxcbiAgICAgICAgaWRlbnRpdHlQb29sSWQ6IHByb3BzLmlkZW50aXR5UG9vbC5pZGVudGl0eVBvb2xJZCxcbiAgICAgIH0sXG4gICAgICBhd3NfYXBwc3luY19ncmFwaHFsRW5kcG9pbnQ6IHByb3BzLmFwaS5ncmFwaHFsQXBpLmdyYXBocWxVcmwsXG4gICAgICBhd3NfYXBwc3luY19yZWdpb246IGNkay5Bd3MuUkVHSU9OLFxuICAgICAgYXdzX2FwcHN5bmNfYXV0aGVudGljYXRpb25UeXBlOiBcIkFNQVpPTl9DT0dOSVRPX1VTRVJfUE9PTFNcIixcbiAgICAgIGF3c19hcHBzeW5jX2FwaUtleTogcHJvcHMuYXBpLmdyYXBocWxBcGk/LmFwaUtleSxcbiAgICAgIFN0b3JhZ2U6IHtcbiAgICAgICAgQVdTUzM6IHtcbiAgICAgICAgICBidWNrZXQ6IHByb3BzLmNoYXRib3RGaWxlc0J1Y2tldC5idWNrZXROYW1lLFxuICAgICAgICAgIHJlZ2lvbjogY2RrLkF3cy5SRUdJT04sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgY29uZmlnOiB7XG4gICAgICAgIHJhZ19lbmFibGVkOiBwcm9wcy5jb25maWcucmFnLmVuYWJsZWQsXG4gICAgICAgIGNyb3NzX2VuY29kZXJzX2VuYWJsZWQ6IHByb3BzLmNyb3NzRW5jb2RlcnNFbmFibGVkLFxuICAgICAgICBzYWdlbWFrZXJfZW1iZWRkaW5nc19lbmFibGVkOiBwcm9wcy5zYWdlbWFrZXJFbWJlZGRpbmdzRW5hYmxlZCxcbiAgICAgICAgZGVmYXVsdF9lbWJlZGRpbmdzX21vZGVsOiBVdGlscy5nZXREZWZhdWx0RW1iZWRkaW5nc01vZGVsKHByb3BzLmNvbmZpZyksXG4gICAgICAgIGRlZmF1bHRfY3Jvc3NfZW5jb2Rlcl9tb2RlbDogVXRpbHMuZ2V0RGVmYXVsdENyb3NzRW5jb2Rlck1vZGVsKFxuICAgICAgICAgIHByb3BzLmNvbmZpZ1xuICAgICAgICApLFxuICAgICAgICBwcml2YXRlV2Vic2l0ZTogcHJvcHMuY29uZmlnLnByaXZhdGVXZWJzaXRlID8gdHJ1ZSA6IGZhbHNlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEFsbG93IGF1dGhlbnRpY2F0ZWQgd2ViIHVzZXJzIHRvIHJlYWQgdXBsb2FkIGRhdGEgdG8gdGhlIGF0dGFjaG1lbnRzIGJ1Y2tldCBmb3IgdGhlaXIgY2hhdCBmaWxlc1xuICAgIC8vIHJlZjogaHR0cHM6Ly9kb2NzLmFtcGxpZnkuYXdzL2xpYi9zdG9yYWdlL2dldHRpbmctc3RhcnRlZC9xL3BsYXRmb3JtL2pzLyN1c2luZy1hbWF6b24tczNcbiAgICBwcm9wcy5pZGVudGl0eVBvb2wuYXV0aGVudGljYXRlZFJvbGUuYWRkVG9QcmluY2lwYWxQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1wiczM6R2V0T2JqZWN0XCIsIFwiczM6UHV0T2JqZWN0XCIsIFwiczM6RGVsZXRlT2JqZWN0XCJdLFxuICAgICAgICByZXNvdXJjZXM6IFtcbiAgICAgICAgICBgJHtwcm9wcy5jaGF0Ym90RmlsZXNCdWNrZXQuYnVja2V0QXJufS9wdWJsaWMvKmAsXG4gICAgICAgICAgYCR7cHJvcHMuY2hhdGJvdEZpbGVzQnVja2V0LmJ1Y2tldEFybn0vcHJvdGVjdGVkL1xcJHtjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206c3VifS8qYCxcbiAgICAgICAgICBgJHtwcm9wcy5jaGF0Ym90RmlsZXNCdWNrZXQuYnVja2V0QXJufS9wcml2YXRlL1xcJHtjb2duaXRvLWlkZW50aXR5LmFtYXpvbmF3cy5jb206c3VifS8qYCxcbiAgICAgICAgXSxcbiAgICAgIH0pXG4gICAgKTtcbiAgICBwcm9wcy5pZGVudGl0eVBvb2wuYXV0aGVudGljYXRlZFJvbGUuYWRkVG9QcmluY2lwYWxQb2xpY3koXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgYWN0aW9uczogW1wiczM6TGlzdEJ1Y2tldFwiXSxcbiAgICAgICAgcmVzb3VyY2VzOiBbYCR7cHJvcHMuY2hhdGJvdEZpbGVzQnVja2V0LmJ1Y2tldEFybn1gXSxcbiAgICAgICAgY29uZGl0aW9uczoge1xuICAgICAgICAgIFN0cmluZ0xpa2U6IHtcbiAgICAgICAgICAgIFwiczM6cHJlZml4XCI6IFtcbiAgICAgICAgICAgICAgXCJwdWJsaWMvXCIsXG4gICAgICAgICAgICAgIFwicHVibGljLypcIixcbiAgICAgICAgICAgICAgXCJwcm90ZWN0ZWQvXCIsXG4gICAgICAgICAgICAgIFwicHJvdGVjdGVkLypcIixcbiAgICAgICAgICAgICAgXCJwcml2YXRlLyR7Y29nbml0by1pZGVudGl0eS5hbWF6b25hd3MuY29tOnN1Yn0vXCIsXG4gICAgICAgICAgICAgIFwicHJpdmF0ZS8ke2NvZ25pdG8taWRlbnRpdHkuYW1hem9uYXdzLmNvbTpzdWJ9LypcIixcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vIEVuYWJsZSBDT1JTIGZvciB0aGUgYXR0YWNobWVudHMgYnVja2V0IHRvIGFsbG93IHVwbG9hZHMgZnJvbSB0aGUgdXNlciBpbnRlcmZhY2VcbiAgICAvLyByZWY6IGh0dHBzOi8vZG9jcy5hbXBsaWZ5LmF3cy9saWIvc3RvcmFnZS9nZXR0aW5nLXN0YXJ0ZWQvcS9wbGF0Zm9ybS9qcy8jYW1hem9uLXMzLWJ1Y2tldC1jb3JzLXBvbGljeS1zZXR1cFxuICAgIHByb3BzLmNoYXRib3RGaWxlc0J1Y2tldC5hZGRDb3JzUnVsZSh7XG4gICAgICBhbGxvd2VkTWV0aG9kczogW1xuICAgICAgICBzMy5IdHRwTWV0aG9kcy5HRVQsXG4gICAgICAgIHMzLkh0dHBNZXRob2RzLlBVVCxcbiAgICAgICAgczMuSHR0cE1ldGhvZHMuUE9TVCxcbiAgICAgICAgczMuSHR0cE1ldGhvZHMuREVMRVRFLFxuICAgICAgXSxcbiAgICAgIGFsbG93ZWRPcmlnaW5zOiBbXCIqXCJdLFxuICAgICAgYWxsb3dlZEhlYWRlcnM6IFtcIipcIl0sXG4gICAgICBleHBvc2VkSGVhZGVyczogW1xuICAgICAgICBcIngtYW16LXNlcnZlci1zaWRlLWVuY3J5cHRpb25cIixcbiAgICAgICAgXCJ4LWFtei1yZXF1ZXN0LWlkXCIsXG4gICAgICAgIFwieC1hbXotaWQtMlwiLFxuICAgICAgICBcIkVUYWdcIixcbiAgICAgIF0sXG4gICAgICBtYXhBZ2U6IDMwMDAsXG4gICAgfSk7XG5cbiAgICBjb25zdCBhc3NldCA9IHMzZGVwbG95LlNvdXJjZS5hc3NldChhcHBQYXRoLCB7XG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBpbWFnZTogY2RrLkRvY2tlckltYWdlLmZyb21SZWdpc3RyeShcbiAgICAgICAgICBcInB1YmxpYy5lY3IuYXdzL3NhbS9idWlsZC1ub2RlanMxOC54OmxhdGVzdFwiXG4gICAgICAgICksXG4gICAgICAgIGNvbW1hbmQ6IFtcbiAgICAgICAgICBcInNoXCIsXG4gICAgICAgICAgXCItY1wiLFxuICAgICAgICAgIFtcbiAgICAgICAgICAgIFwibnBtIC0tY2FjaGUgL3RtcC8ubnBtIGluc3RhbGxcIixcbiAgICAgICAgICAgIGBucG0gLS1jYWNoZSAvdG1wLy5ucG0gcnVuIGJ1aWxkYCxcbiAgICAgICAgICAgIFwiY3AgLWF1ciAvYXNzZXQtaW5wdXQvZGlzdC8qIC9hc3NldC1vdXRwdXQvXCIsXG4gICAgICAgICAgXS5qb2luKFwiICYmIFwiKSxcbiAgICAgICAgXSxcbiAgICAgICAgbG9jYWw6IHtcbiAgICAgICAgICB0cnlCdW5kbGUob3V0cHV0RGlyOiBzdHJpbmcpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGNvbnN0IG9wdGlvbnM6IEV4ZWNTeW5jT3B0aW9uc1dpdGhCdWZmZXJFbmNvZGluZyA9IHtcbiAgICAgICAgICAgICAgICBzdGRpbzogXCJpbmhlcml0XCIsXG4gICAgICAgICAgICAgICAgZW52OiB7XG4gICAgICAgICAgICAgICAgICAuLi5wcm9jZXNzLmVudixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAgIGV4ZWNTeW5jKGBucG0gLS1zaWxlbnQgLS1wcmVmaXggXCIke2FwcFBhdGh9XCIgY2lgLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgZXhlY1N5bmMoYG5wbSAtLXNpbGVudCAtLXByZWZpeCBcIiR7YXBwUGF0aH1cIiBydW4gYnVpbGRgLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgVXRpbHMuY29weURpclJlY3Vyc2l2ZShidWlsZFBhdGgsIG91dHB1dERpcik7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZSk7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCBcIlVzZXJJbnRlcmZhY2VEZXBsb3ltZW50XCIsIHtcbiAgICAgIHBydW5lOiBmYWxzZSxcbiAgICAgIHNvdXJjZXM6IFthc3NldCwgZXhwb3J0c0Fzc2V0XSxcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiB3ZWJzaXRlQnVja2V0LFxuICAgICAgZGlzdHJpYnV0aW9uOiBwcm9wcy5jb25maWcucHJpdmF0ZVdlYnNpdGUgPyB1bmRlZmluZWQgOiBkaXN0cmlidXRpb25cbiAgICB9KTtcblxuICAgXG4gICAgLyoqXG4gICAgICogQ0RLIE5BRyBzdXBwcmVzc2lvblxuICAgICAqL1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIHVwbG9hZExvZ3NCdWNrZXQsIFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLVMxXCIsXG4gICAgICAgICAgcmVhc29uOiBcIkJ1Y2tldCBpcyB0aGUgc2VydmVyIGFjY2VzcyBsb2dzIGJ1Y2tldCBmb3Igd2Vic2l0ZUJ1Y2tldC5cIixcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICApO1xuICB9XG59XG4iXX0=