import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

export class ChatBotDynamoDBTables extends Construct {
  public readonly sessionsTable: dynamodb.Table;
  public readonly questionsTable: dynamodb.Table;  
  public readonly bySessionIdIndex: string = "bySessionId";

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const sessionsTable = new dynamodb.Table(this, "SessionsTable", {
      partitionKey: {
        name: "UserId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SessionType",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    sessionsTable.addGlobalSecondaryIndex({
      indexName: this.bySessionIdIndex,
      partitionKey: { name: "SessionId", type: dynamodb.AttributeType.STRING },
    });

    this.sessionsTable = sessionsTable;

    const questionsTable = new dynamodb.Table(this, "QuestionsTable", {
      partitionKey: {
        name: "QuestionId",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SessionId",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    questionsTable.addGlobalSecondaryIndex({
      indexName: this.bySessionIdIndex,
      partitionKey: { name: "SessionId", type: dynamodb.AttributeType.STRING },
    });

    this.questionsTable = questionsTable;

  }
}
