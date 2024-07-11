import * as cognitoIdentityPool from "@aws-cdk/aws-cognito-identitypool-alpha";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { Shared } from "../shared";
import { SystemConfig } from "../shared/types";
import { ChatBotApi } from "../chatbot-api";
export interface PrivateWebsiteProps {
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
export declare class PrivateWebsite extends Construct {
    constructor(scope: Construct, id: string, props: PrivateWebsiteProps);
}
