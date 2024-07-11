import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
export declare class RagDynamoDBTables extends Construct {
    readonly workspacesTable: dynamodb.Table;
    readonly documentsTable: dynamodb.Table;
    readonly workspacesByObjectTypeIndexName: string;
    readonly documentsByCompoundKeyIndexName: string;
    readonly documentsByStatusIndexName: string;
    constructor(scope: Construct, id: string);
}
