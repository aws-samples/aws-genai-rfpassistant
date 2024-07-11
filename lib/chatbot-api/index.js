"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBotApi = void 0;
const iam = require("aws-cdk-lib/aws-iam");
const cdk = require("aws-cdk-lib");
const path = require("path");
const constructs_1 = require("constructs");
const chatbot_dynamodb_tables_1 = require("./chatbot-dynamodb-tables");
const chatbot_s3_buckets_1 = require("./chatbot-s3-buckets");
const rest_api_1 = require("./rest-api");
const websocket_api_1 = require("./websocket-api");
const appsync = require("aws-cdk-lib/aws-appsync");
const aws_logs_1 = require("aws-cdk-lib/aws-logs");
const cdk_nag_1 = require("cdk-nag");
class ChatBotApi extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const chatTables = new chatbot_dynamodb_tables_1.ChatBotDynamoDBTables(this, "ChatDynamoDBTables");
        const chatBuckets = new chatbot_s3_buckets_1.ChatBotS3Buckets(this, "ChatBuckets");
        const loggingRole = new iam.Role(this, "apiLoggingRole", {
            assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
            inlinePolicies: {
                loggingPolicy: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ["logs:*"],
                            resources: ["*"],
                        }),
                    ],
                }),
            },
        });
        const api = new appsync.GraphqlApi(this, "ChatbotApi", {
            name: "ChatbotGraphqlApi",
            definition: appsync.Definition.fromFile(path.join(__dirname, "schema/schema.graphql")),
            authorizationConfig: {
                additionalAuthorizationModes: [
                    {
                        authorizationType: appsync.AuthorizationType.IAM,
                    },
                    {
                        authorizationType: appsync.AuthorizationType.USER_POOL,
                        userPoolConfig: {
                            userPool: props.userPool,
                        },
                    },
                ],
            },
            logConfig: {
                fieldLogLevel: appsync.FieldLogLevel.ALL,
                retention: aws_logs_1.RetentionDays.ONE_WEEK,
                role: loggingRole,
            },
            xrayEnabled: true,
            visibility: props.config.privateWebsite ? appsync.Visibility.PRIVATE : appsync.Visibility.GLOBAL
        });
        new rest_api_1.ApiResolvers(this, "RestApi", {
            ...props,
            sessionsTable: chatTables.sessionsTable,
            questionsTable: chatTables.questionsTable,
            bySessionIdIndex: chatTables.bySessionIdIndex,
            api,
            userFeedbackBucket: chatBuckets.userFeedbackBucket,
            filesBucket: chatBuckets.filesBucket,
        });
        const realtimeBackend = new websocket_api_1.RealtimeGraphqlApiBackend(this, "Realtime", {
            ...props,
            api,
        });
        realtimeBackend.resolvers.outgoingMessageHandler.addEnvironment("GRAPHQL_ENDPOINT", api.graphqlUrl);
        api.grantMutation(realtimeBackend.resolvers.outgoingMessageHandler);
        // Prints out URL
        new cdk.CfnOutput(this, "GraphqlAPIURL", {
            value: api.graphqlUrl,
        });
        // Prints out the AppSync GraphQL API key to the terminal
        new cdk.CfnOutput(this, "Graphql-apiId", {
            value: api.apiId || "",
        });
        this.messagesTopic = realtimeBackend.messagesTopic;
        this.sessionsTable = chatTables.sessionsTable;
        this.questionsTable = chatTables.questionsTable;
        this.bySessionIdIndex = chatTables.bySessionIdIndex;
        this.userFeedbackBucket = chatBuckets.userFeedbackBucket;
        this.filesBucket = chatBuckets.filesBucket;
        this.graphqlApi = api;
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(loggingRole, [
            {
                id: "AwsSolutions-IAM5",
                reason: "Access to all log groups required for CloudWatch log group creation.",
            },
        ]);
    }
}
exports.ChatBotApi = ChatBotApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFLQSwyQ0FBMkM7QUFDM0MsbUNBQW1DO0FBQ25DLDZCQUE2QjtBQUM3QiwyQ0FBdUM7QUFJdkMsdUVBQWtFO0FBQ2xFLDZEQUF3RDtBQUN4RCx5Q0FBMEM7QUFDMUMsbURBQTREO0FBQzVELG1EQUFtRDtBQUNuRCxtREFBcUQ7QUFDckQscUNBQTBDO0FBVzFDLE1BQWEsVUFBVyxTQUFRLHNCQUFTO0lBU3ZDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLFVBQVUsR0FBRyxJQUFJLCtDQUFxQixDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pFLE1BQU0sV0FBVyxHQUFHLElBQUkscUNBQWdCLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRTlELE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDdkQsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHVCQUF1QixDQUFDO1lBQzVELGNBQWMsRUFBRTtnQkFDZCxhQUFhLEVBQUUsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDO29CQUNwQyxVQUFVLEVBQUU7d0JBQ1YsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDOzRCQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLOzRCQUN4QixPQUFPLEVBQUUsQ0FBQyxRQUFRLENBQUM7NEJBQ25CLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQzt5QkFDakIsQ0FBQztxQkFDSDtpQkFDRixDQUFDO2FBQ0g7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMs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Q0FBQztDQUNGO0FBNUdELGdDQTRHQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2duaXRvXCI7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiXCI7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zbnNcIjtcbmltcG9ydCAqIGFzIHNzbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNzbVwiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgUmFnRW5naW5lcyB9IGZyb20gXCIuLi9yYWctZW5naW5lc1wiO1xuaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4uL3NoYXJlZFwiO1xuaW1wb3J0IHsgU2FnZU1ha2VyTW9kZWxFbmRwb2ludCwgU3lzdGVtQ29uZmlnIH0gZnJvbSBcIi4uL3NoYXJlZC90eXBlc1wiO1xuaW1wb3J0IHsgQ2hhdEJvdER5bmFtb0RCVGFibGVzIH0gZnJvbSBcIi4vY2hhdGJvdC1keW5hbW9kYi10YWJsZXNcIjtcbmltcG9ydCB7IENoYXRCb3RTM0J1Y2tldHMgfSBmcm9tIFwiLi9jaGF0Ym90LXMzLWJ1Y2tldHNcIjtcbmltcG9ydCB7IEFwaVJlc29sdmVycyB9IGZyb20gXCIuL3Jlc3QtYXBpXCI7XG5pbXBvcnQgeyBSZWFsdGltZUdyYXBocWxBcGlCYWNrZW5kIH0gZnJvbSBcIi4vd2Vic29ja2V0LWFwaVwiO1xuaW1wb3J0ICogYXMgYXBwc3luYyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWFwcHN5bmNcIjtcbmltcG9ydCB7IFJldGVudGlvbkRheXMgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxvZ3NcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hhdEJvdEFwaVByb3BzIHtcbiAgcmVhZG9ubHkgc2hhcmVkOiBTaGFyZWQ7XG4gIHJlYWRvbmx5IGNvbmZpZzogU3lzdGVtQ29uZmlnO1xuICByZWFkb25seSByYWdFbmdpbmVzPzogUmFnRW5naW5lcztcbiAgcmVhZG9ubHkgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XG4gIHJlYWRvbmx5IG1vZGVsc1BhcmFtZXRlcjogc3NtLlN0cmluZ1BhcmFtZXRlcjtcbiAgcmVhZG9ubHkgbW9kZWxzOiBTYWdlTWFrZXJNb2RlbEVuZHBvaW50W107XG59XG5cbmV4cG9ydCBjbGFzcyBDaGF0Qm90QXBpIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IG1lc3NhZ2VzVG9waWM6IHNucy5Ub3BpYztcbiAgcHVibGljIHJlYWRvbmx5IHNlc3Npb25zVGFibGU6IGR5bmFtb2RiLlRhYmxlOyBcbiAgcHVibGljIHJlYWRvbmx5IHF1ZXN0aW9uc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcbiAgcHVibGljIHJlYWRvbmx5IGJ5U2Vzc2lvbklkSW5kZXg6IHN0cmluZztcbiAgcHVibGljIHJlYWRvbmx5IGZpbGVzQnVja2V0OiBzMy5CdWNrZXQ7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyRmVlZGJhY2tCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgcHVibGljIHJlYWRvbmx5IGdyYXBocWxBcGk6IGFwcHN5bmMuR3JhcGhxbEFwaTtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ2hhdEJvdEFwaVByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGNoYXRUYWJsZXMgPSBuZXcgQ2hhdEJvdER5bmFtb0RCVGFibGVzKHRoaXMsIFwiQ2hhdER5bmFtb0RCVGFibGVzXCIpO1xuICAgIGNvbnN0IGNoYXRCdWNrZXRzID0gbmV3IENoYXRCb3RTM0J1Y2tldHModGhpcywgXCJDaGF0QnVja2V0c1wiKTtcblxuICAgIGNvbnN0IGxvZ2dpbmdSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsIFwiYXBpTG9nZ2luZ1JvbGVcIiwge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoXCJhcHBzeW5jLmFtYXpvbmF3cy5jb21cIiksXG4gICAgICBpbmxpbmVQb2xpY2llczoge1xuICAgICAgICBsb2dnaW5nUG9saWN5OiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogW1wibG9nczoqXCJdLFxuICAgICAgICAgICAgICByZXNvdXJjZXM6IFtcIipcIl0sXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICBdLFxuICAgICAgICB9KSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCBhcGkgPSBuZXcgYXBwc3luYy5HcmFwaHFsQXBpKHRoaXMsIFwiQ2hhdGJvdEFwaVwiLCB7XG4gICAgICBuYW1lOiBcIkNoYXRib3RHcmFwaHFsQXBpXCIsXG4gICAgICBkZWZpbml0aW9uOiBhcHBzeW5jLkRlZmluaXRpb24uZnJvbUZpbGUoXG4gICAgICAgIHBhdGguam9pbihfX2Rpcm5hbWUsIFwic2NoZW1hL3NjaGVtYS5ncmFwaHFsXCIpXG4gICAgICApLFxuICAgICAgYXV0aG9yaXphdGlvbkNvbmZpZzoge1xuICAgICAgICBhZGRpdGlvbmFsQXV0aG9yaXphdGlvbk1vZGVzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuSUFNLFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgYXV0aG9yaXphdGlvblR5cGU6IGFwcHN5bmMuQXV0aG9yaXphdGlvblR5cGUuVVNFUl9QT09MLFxuICAgICAgICAgICAgdXNlclBvb2xDb25maWc6IHtcbiAgICAgICAgICAgICAgdXNlclBvb2w6IHByb3BzLnVzZXJQb29sLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfSxcbiAgICAgIGxvZ0NvbmZpZzoge1xuICAgICAgICBmaWVsZExvZ0xldmVsOiBhcHBzeW5jLkZpZWxkTG9nTGV2ZWwuQUxMLFxuICAgICAgICByZXRlbnRpb246IFJldGVudGlvbkRheXMuT05FX1dFRUssXG4gICAgICAgIHJvbGU6IGxvZ2dpbmdSb2xlLFxuICAgICAgfSxcbiAgICAgIHhyYXlFbmFibGVkOiB0cnVlLFxuICAgICAgdmlzaWJpbGl0eTogcHJvcHMuY29uZmlnLnByaXZhdGVXZWJzaXRlID8gYXBwc3luYy5WaXNpYmlsaXR5LlBSSVZBVEUgOiBhcHBzeW5jLlZpc2liaWxpdHkuR0xPQkFMXG4gICAgfSk7XG5cbiAgICBuZXcgQXBpUmVzb2x2ZXJzKHRoaXMsIFwiUmVzdEFwaVwiLCB7XG4gICAgICAuLi5wcm9wcyxcbiAgICAgIHNlc3Npb25zVGFibGU6IGNoYXRUYWJsZXMuc2Vzc2lvbnNUYWJsZSxcbiAgICAgIHF1ZXN0aW9uc1RhYmxlOiBjaGF0VGFibGVzLnF1ZXN0aW9uc1RhYmxlLFxuICAgICAgYnlTZXNzaW9uSWRJbmRleDogY2hhdFRhYmxlcy5ieVNlc3Npb25JZEluZGV4LFxuICAgICAgYXBpLFxuICAgICAgdXNlckZlZWRiYWNrQnVja2V0OiBjaGF0QnVja2V0cy51c2VyRmVlZGJhY2tCdWNrZXQsXG4gICAgICBmaWxlc0J1Y2tldDogY2hhdEJ1Y2tldHMuZmlsZXNCdWNrZXQsXG4gICAgfSk7XG5cbiAgICBjb25zdCByZWFsdGltZUJhY2tlbmQgPSBuZXcgUmVhbHRpbWVHcmFwaHFsQXBpQmFja2VuZCh0aGlzLCBcIlJlYWx0aW1lXCIsIHtcbiAgICAgIC4uLnByb3BzLFxuICAgICAgYXBpLFxuICAgIH0pO1xuXG4gICAgcmVhbHRpbWVCYWNrZW5kLnJlc29sdmVycy5vdXRnb2luZ01lc3NhZ2VIYW5kbGVyLmFkZEVudmlyb25tZW50KFxuICAgICAgXCJHUkFQSFFMX0VORFBPSU5UXCIsXG4gICAgICBhcGkuZ3JhcGhxbFVybFxuICAgICk7XG5cbiAgICBhcGkuZ3JhbnRNdXRhdGlvbihyZWFsdGltZUJhY2tlbmQucmVzb2x2ZXJzLm91dGdvaW5nTWVzc2FnZUhhbmRsZXIpO1xuXG4gICAgLy8gUHJpbnRzIG91dCBVUkxcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkdyYXBocWxBUElVUkxcIiwge1xuICAgICAgdmFsdWU6IGFwaS5ncmFwaHFsVXJsLFxuICAgIH0pO1xuXG4gICAgLy8gUHJpbnRzIG91dCB0aGUgQXBwU3luYyBHcmFwaFFMIEFQSSBrZXkgdG8gdGhlIHRlcm1pbmFsXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJHcmFwaHFsLWFwaUlkXCIsIHtcbiAgICAgIHZhbHVlOiBhcGkuYXBpSWQgfHwgXCJcIixcbiAgICB9KTtcblxuICAgIHRoaXMubWVzc2FnZXNUb3BpYyA9IHJlYWx0aW1lQmFja2VuZC5tZXNzYWdlc1RvcGljO1xuICAgIHRoaXMuc2Vzc2lvbnNUYWJsZSA9IGNoYXRUYWJsZXMuc2Vzc2lvbnNUYWJsZTsgICAgXG4gICAgdGhpcy5xdWVzdGlvbnNUYWJsZSA9IGNoYXRUYWJsZXMucXVlc3Rpb25zVGFibGU7XG4gICAgdGhpcy5ieVNlc3Npb25JZEluZGV4ID0gY2hhdFRhYmxlcy5ieVNlc3Npb25JZEluZGV4O1xuICAgIHRoaXMudXNlckZlZWRiYWNrQnVja2V0ID0gY2hhdEJ1Y2tldHMudXNlckZlZWRiYWNrQnVja2V0O1xuICAgIHRoaXMuZmlsZXNCdWNrZXQgPSBjaGF0QnVja2V0cy5maWxlc0J1Y2tldDtcbiAgICB0aGlzLmdyYXBocWxBcGkgPSBhcGk7XG5cbiAgICAvKipcbiAgICAgKiBDREsgTkFHIHN1cHByZXNzaW9uXG4gICAgICovXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKGxvZ2dpbmdSb2xlLCBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgICAgIHJlYXNvbjpcbiAgICAgICAgICBcIkFjY2VzcyB0byBhbGwgbG9nIGdyb3VwcyByZXF1aXJlZCBmb3IgQ2xvdWRXYXRjaCBsb2cgZ3JvdXAgY3JlYXRpb24uXCIsXG4gICAgICB9LFxuICAgIF0pO1xuICB9XG59XG4iXX0=