import * as cognitoIdentityPool from "@aws-cdk/aws-cognito-identitypool-alpha";
import * as cf from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { Shared } from "../shared";
import { SystemConfig } from "../shared/types";
import { ChatBotApi } from "../chatbot-api";
export interface PublicWebsiteProps {
    readonly config: SystemConfig;
    readonly shared: Shared;
    readonly userPoolId: string;
    readonly userPoolClientId: string;
    readonly identityPool: cognitoIdentityPool.IdentityPool;
    readonly api: ChatBotApi;
    readonly chatbotFilesBucket: s3.Bucket;
    readonly crossEncodersEnabled: boolean;
    readonly sagemakerEmbeddingsEnabled: boolean;
    readonly websiteBucket: s3.Bucket;
}
export declare class PublicWebsite extends Construct {
    readonly distribution: cf.CloudFrontWebDistribution;
    constructor(scope: Construct, id: string, props: PublicWebsiteProps);
}
