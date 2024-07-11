"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeResolvers = void 0;
const cdk = require("aws-cdk-lib");
const appsync = require("aws-cdk-lib/aws-appsync");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const constructs_1 = require("constructs");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const path = require("path");
class RealtimeResolvers extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const powertoolsLayerJS = aws_lambda_1.LayerVersion.fromLayerVersionArn(this, "PowertoolsLayerJS", `arn:aws:lambda:${cdk.Stack.of(this).region}:094274105915:layer:AWSLambdaPowertoolsTypeScript:22`);
        const resolverFunction = new aws_lambda_1.Function(this, "lambda-resolver", {
            code: aws_lambda_1.Code.fromAsset("./lib/chatbot-api/functions/resolvers/send-query-lambda-resolver"),
            handler: "index.handler",
            runtime: aws_lambda_1.Runtime.PYTHON_3_11,
            environment: {
                SNS_TOPIC_ARN: props.topic.topicArn,
            },
            layers: [props.shared.powerToolsLayer],
            vpc: props.shared.vpc
        });
        const outgoingMessageHandler = new aws_lambda_nodejs_1.NodejsFunction(this, "outgoing-message-handler", {
            entry: path.join(__dirname, "functions/outgoing-message-appsync/index.ts"),
            layers: [powertoolsLayerJS],
            handler: "index.handler",
            runtime: aws_lambda_1.Runtime.NODEJS_18_X,
            environment: {
                GRAPHQL_ENDPOINT: props.api.graphqlUrl,
            },
            vpc: props.shared.vpc
        });
        outgoingMessageHandler.addEventSource(new aws_lambda_event_sources_1.SqsEventSource(props.queue));
        props.topic.grantPublish(resolverFunction);
        const functionDataSource = props.api.addLambdaDataSource("realtimeResolverFunction", resolverFunction);
        const noneDataSource = props.api.addNoneDataSource("none", {
            name: "relay-source",
        });
        props.api.createResolver("send-message-resolver", {
            typeName: "Mutation",
            fieldName: "sendQuery",
            dataSource: functionDataSource,
        });
        props.api.createResolver("publish-response-resolver", {
            typeName: "Mutation",
            fieldName: "publishResponse",
            code: appsync.Code.fromAsset("./lib/chatbot-api/functions/resolvers/publish-response-resolver.js"),
            runtime: appsync.FunctionRuntime.JS_1_0_0,
            dataSource: noneDataSource,
        });
        props.api.createResolver("subscription-resolver", {
            typeName: "Subscription",
            fieldName: "receiveMessages",
            code: appsync.Code.fromAsset("./lib/chatbot-api/functions/resolvers/subscribe-resolver.js"),
            runtime: appsync.FunctionRuntime.JS_1_0_0,
            dataSource: noneDataSource,
        });
        this.outgoingMessageHandler = outgoingMessageHandler;
    }
}
exports.RealtimeResolvers = RealtimeResolvers;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwc3luYy13cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFwcHN5bmMtd3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLG1EQUFtRDtBQUNuRCx1REFBK0U7QUFDL0UsbUZBQXNFO0FBQ3RFLDJDQUF1QztBQUt2QyxxRUFBK0Q7QUFDL0QsNkJBQTZCO0FBVTdCLE1BQWEsaUJBQWtCLFNBQVEsc0JBQVM7SUFHOUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE2QjtRQUNyRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0saUJBQWlCLEdBQUcseUJBQVksQ0FBQyxtQkFBbUIsQ0FDeEQsSUFBSSxFQUNKLG1CQUFtQixFQUNuQixrQkFDRSxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUNyQixzREFBc0QsQ0FDdkQsQ0FBQztRQUVGLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxxQkFBUSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUM3RCxJQUFJLEVBQUUsaUJBQUksQ0FBQyxTQUFTLENBQ2xCLGtFQUFrRSxDQUNuRTtZQUNELE9BQU8sRUFBRSxlQUFlO1lBQ3hCLE9BQU8sRUFBRSxvQkFBTyxDQUFDLFdBQVc7WUFDNUIsV0FBVyxFQUFFO2dCQUNYLGFBQWEsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVE7YUFDcEM7WUFDRCxNQUFNLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQztZQUN0QyxHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHO1NBQ3RCLENBQUMsQ0FBQztRQUVILE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxrQ0FBYyxDQUMvQyxJQUFJLEVBQ0osMEJBQTBCLEVBQzFCO1lBQ0UsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQ2QsU0FBUyxFQUNULDZDQUE2QyxDQUM5QztZQUNELE1BQU0sRUFBRSxDQUFDLGlCQUFpQixDQUFDO1lBQzNCLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLE9BQU8sRUFBRSxvQkFBTyxDQUFDLFdBQVc7WUFDNUIsV0FBVyxFQUFFO2dCQUNYLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsVUFBVTthQUN2QztZQUNELEdBQUcsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUc7U0FDdEIsQ0FDRixDQUFDO1FBRUYsc0JBQXNCLENBQUMsY0FBYyxDQUFDLElBQUkseUNBQWMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUV2RSxLQUFLLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FDdEQsMEJBQTBCLEVBQzFCLGdCQUFnQixDQUNqQixDQUFDO1FBQ0YsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUU7WUFDekQsSUFBSSxFQUFFLGNBQWM7U0FDckIsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLEVBQUU7WUFDaEQsUUFBUSxFQUFFLFVBQVU7WUFDcEIsU0FBUyxFQUFFLFdBQVc7WUFDdEIsVUFBVSxFQUFFLGtCQUFrQjtTQUMvQixDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQywyQkFBMkIsRUFBRTtZQUNwRCxRQUFRLEVBQUUsVUFBVTtZQUNwQixTQUFTLEVBQUUsaUJBQWlCO1lBQzVCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FDMUIsb0VBQW9FLENBQ3JFO1lBQ0QsT0FBTyxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsUUFBUTtZQUN6QyxVQUFVLEVBQUUsY0FBYztTQUMzQixDQUFDLENBQUM7UUFFSCxLQUFLLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRTtZQUNoRCxRQUFRLEVBQUUsY0FBYztZQUN4QixTQUFTLEVBQUUsaUJBQWlCO1lBQzVCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FDMUIsNkRBQTZELENBQzlEO1lBQ0QsT0FBTyxFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUMsUUFBUTtZQUN6QyxVQUFVLEVBQUUsY0FBYztTQUMzQixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0JBQXNCLEdBQUcsc0JBQXNCLENBQUM7SUFDdkQsQ0FBQztDQUNGO0FBckZELDhDQXFGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIGFwcHN5bmMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1hcHBzeW5jXCI7XG5pbXBvcnQgeyBDb2RlLCBGdW5jdGlvbiwgTGF5ZXJWZXJzaW9uLCBSdW50aW1lIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGFcIjtcbmltcG9ydCB7IFNxc0V2ZW50U291cmNlIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGEtZXZlbnQtc291cmNlc1wiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCB7IFNoYXJlZCB9IGZyb20gXCIuLi9zaGFyZWRcIjtcbmltcG9ydCB7IElRdWV1ZSB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc3FzXCI7XG5pbXBvcnQgeyBJVG9waWMgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNuc1wiO1xuaW1wb3J0IHsgVXNlclBvb2wgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG9cIjtcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uIH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbmludGVyZmFjZSBSZWFsdGltZVJlc29sdmVyc1Byb3BzIHtcbiAgcmVhZG9ubHkgcXVldWU6IElRdWV1ZTtcbiAgcmVhZG9ubHkgdG9waWM6IElUb3BpYztcbiAgcmVhZG9ubHkgdXNlclBvb2w6IFVzZXJQb29sO1xuICByZWFkb25seSBzaGFyZWQ6IFNoYXJlZDtcbiAgcmVhZG9ubHkgYXBpOiBhcHBzeW5jLkdyYXBocWxBcGk7XG59XG5cbmV4cG9ydCBjbGFzcyBSZWFsdGltZVJlc29sdmVycyBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBvdXRnb2luZ01lc3NhZ2VIYW5kbGVyOiBGdW5jdGlvbjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUmVhbHRpbWVSZXNvbHZlcnNQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBwb3dlcnRvb2xzTGF5ZXJKUyA9IExheWVyVmVyc2lvbi5mcm9tTGF5ZXJWZXJzaW9uQXJuKFxuICAgICAgdGhpcyxcbiAgICAgIFwiUG93ZXJ0b29sc0xheWVySlNcIixcbiAgICAgIGBhcm46YXdzOmxhbWJkYToke1xuICAgICAgICBjZGsuU3RhY2sub2YodGhpcykucmVnaW9uXG4gICAgICB9OjA5NDI3NDEwNTkxNTpsYXllcjpBV1NMYW1iZGFQb3dlcnRvb2xzVHlwZVNjcmlwdDoyMmBcbiAgICApO1xuXG4gICAgY29uc3QgcmVzb2x2ZXJGdW5jdGlvbiA9IG5ldyBGdW5jdGlvbih0aGlzLCBcImxhbWJkYS1yZXNvbHZlclwiLCB7XG4gICAgICBjb2RlOiBDb2RlLmZyb21Bc3NldChcbiAgICAgICAgXCIuL2xpYi9jaGF0Ym90LWFwaS9mdW5jdGlvbnMvcmVzb2x2ZXJzL3NlbmQtcXVlcnktbGFtYmRhLXJlc29sdmVyXCJcbiAgICAgICksXG4gICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuUFlUSE9OXzNfMTEsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBTTlNfVE9QSUNfQVJOOiBwcm9wcy50b3BpYy50b3BpY0FybixcbiAgICAgIH0sXG4gICAgICBsYXllcnM6IFtwcm9wcy5zaGFyZWQucG93ZXJUb29sc0xheWVyXSxcbiAgICAgIHZwYzogcHJvcHMuc2hhcmVkLnZwY1xuICAgIH0pO1xuXG4gICAgY29uc3Qgb3V0Z29pbmdNZXNzYWdlSGFuZGxlciA9IG5ldyBOb2RlanNGdW5jdGlvbihcbiAgICAgIHRoaXMsXG4gICAgICBcIm91dGdvaW5nLW1lc3NhZ2UtaGFuZGxlclwiLFxuICAgICAge1xuICAgICAgICBlbnRyeTogcGF0aC5qb2luKFxuICAgICAgICAgIF9fZGlybmFtZSxcbiAgICAgICAgICBcImZ1bmN0aW9ucy9vdXRnb2luZy1tZXNzYWdlLWFwcHN5bmMvaW5kZXgudHNcIlxuICAgICAgICApLFxuICAgICAgICBsYXllcnM6IFtwb3dlcnRvb2xzTGF5ZXJKU10sXG4gICAgICAgIGhhbmRsZXI6IFwiaW5kZXguaGFuZGxlclwiLFxuICAgICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18xOF9YLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIEdSQVBIUUxfRU5EUE9JTlQ6IHByb3BzLmFwaS5ncmFwaHFsVXJsLFxuICAgICAgICB9LFxuICAgICAgICB2cGM6IHByb3BzLnNoYXJlZC52cGNcbiAgICAgIH1cbiAgICApO1xuXG4gICAgb3V0Z29pbmdNZXNzYWdlSGFuZGxlci5hZGRFdmVudFNvdXJjZShuZXcgU3FzRXZlbnRTb3VyY2UocHJvcHMucXVldWUpKTtcblxuICAgIHByb3BzLnRvcGljLmdyYW50UHVibGlzaChyZXNvbHZlckZ1bmN0aW9uKTtcblxuICAgIGNvbnN0IGZ1bmN0aW9uRGF0YVNvdXJjZSA9IHByb3BzLmFwaS5hZGRMYW1iZGFEYXRhU291cmNlKFxuICAgICAgXCJyZWFsdGltZVJlc29sdmVyRnVuY3Rpb25cIixcbiAgICAgIHJlc29sdmVyRnVuY3Rpb25cbiAgICApO1xuICAgIGNvbnN0IG5vbmVEYXRhU291cmNlID0gcHJvcHMuYXBpLmFkZE5vbmVEYXRhU291cmNlKFwibm9uZVwiLCB7XG4gICAgICBuYW1lOiBcInJlbGF5LXNvdXJjZVwiLFxuICAgIH0pO1xuXG4gICAgcHJvcHMuYXBpLmNyZWF0ZVJlc29sdmVyKFwic2VuZC1tZXNzYWdlLXJlc29sdmVyXCIsIHtcbiAgICAgIHR5cGVOYW1lOiBcIk11dGF0aW9uXCIsXG4gICAgICBmaWVsZE5hbWU6IFwic2VuZFF1ZXJ5XCIsXG4gICAgICBkYXRhU291cmNlOiBmdW5jdGlvbkRhdGFTb3VyY2UsXG4gICAgfSk7XG5cbiAgICBwcm9wcy5hcGkuY3JlYXRlUmVzb2x2ZXIoXCJwdWJsaXNoLXJlc3BvbnNlLXJlc29sdmVyXCIsIHtcbiAgICAgIHR5cGVOYW1lOiBcIk11dGF0aW9uXCIsXG4gICAgICBmaWVsZE5hbWU6IFwicHVibGlzaFJlc3BvbnNlXCIsXG4gICAgICBjb2RlOiBhcHBzeW5jLkNvZGUuZnJvbUFzc2V0KFxuICAgICAgICBcIi4vbGliL2NoYXRib3QtYXBpL2Z1bmN0aW9ucy9yZXNvbHZlcnMvcHVibGlzaC1yZXNwb25zZS1yZXNvbHZlci5qc1wiXG4gICAgICApLFxuICAgICAgcnVudGltZTogYXBwc3luYy5GdW5jdGlvblJ1bnRpbWUuSlNfMV8wXzAsXG4gICAgICBkYXRhU291cmNlOiBub25lRGF0YVNvdXJjZSxcbiAgICB9KTtcblxuICAgIHByb3BzLmFwaS5jcmVhdGVSZXNvbHZlcihcInN1YnNjcmlwdGlvbi1yZXNvbHZlclwiLCB7XG4gICAgICB0eXBlTmFtZTogXCJTdWJzY3JpcHRpb25cIixcbiAgICAgIGZpZWxkTmFtZTogXCJyZWNlaXZlTWVzc2FnZXNcIixcbiAgICAgIGNvZGU6IGFwcHN5bmMuQ29kZS5mcm9tQXNzZXQoXG4gICAgICAgIFwiLi9saWIvY2hhdGJvdC1hcGkvZnVuY3Rpb25zL3Jlc29sdmVycy9zdWJzY3JpYmUtcmVzb2x2ZXIuanNcIlxuICAgICAgKSxcbiAgICAgIHJ1bnRpbWU6IGFwcHN5bmMuRnVuY3Rpb25SdW50aW1lLkpTXzFfMF8wLFxuICAgICAgZGF0YVNvdXJjZTogbm9uZURhdGFTb3VyY2UsXG4gICAgfSk7XG5cbiAgICB0aGlzLm91dGdvaW5nTWVzc2FnZUhhbmRsZXIgPSBvdXRnb2luZ01lc3NhZ2VIYW5kbGVyO1xuICB9XG59XG4iXX0=