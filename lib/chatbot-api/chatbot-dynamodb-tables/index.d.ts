import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
export declare class ChatBotDynamoDBTables extends Construct {
    readonly sessionsTable: dynamodb.Table;
    readonly questionsTable: dynamodb.Table;
    readonly bySessionIdIndex: string;
    constructor(scope: Construct, id: string);
}
