import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
export declare class ChatBotS3Buckets extends Construct {
    readonly filesBucket: s3.Bucket;
    readonly userFeedbackBucket: s3.Bucket;
    constructor(scope: Construct, id: string);
}
