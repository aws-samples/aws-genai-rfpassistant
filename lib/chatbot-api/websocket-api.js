"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeGraphqlApiBackend = void 0;
const cdk = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
const sns = require("aws-cdk-lib/aws-sns");
const subscriptions = require("aws-cdk-lib/aws-sns-subscriptions");
const sqs = require("aws-cdk-lib/aws-sqs");
const constructs_1 = require("constructs");
const types_1 = require("../shared/types");
const appsync_ws_1 = require("./appsync-ws");
const cdk_nag_1 = require("cdk-nag");
class RealtimeGraphqlApiBackend extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create the main Message Topic acting as a message bus
        const messagesTopic = new sns.Topic(this, "MessagesTopic");
        const deadLetterQueue = new sqs.Queue(this, "OutgoingMessagesDLQ", {
            enforceSSL: true,
        });
        const queue = new sqs.Queue(this, "OutgoingMessagesQueue", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            enforceSSL: true,
            deadLetterQueue: {
                queue: deadLetterQueue,
                maxReceiveCount: 3,
            },
        });
        // grant eventbridge permissions to send messages to the queue
        queue.addToResourcePolicy(new iam.PolicyStatement({
            actions: ["sqs:SendMessage"],
            resources: [queue.queueArn],
            principals: [
                new iam.ServicePrincipal("events.amazonaws.com"),
                new iam.ServicePrincipal("sqs.amazonaws.com"),
            ],
        }));
        const resolvers = new appsync_ws_1.RealtimeResolvers(this, "Resolvers", {
            queue: queue,
            topic: messagesTopic,
            userPool: props.userPool,
            shared: props.shared,
            api: props.api,
        });
        // Route all outgoing messages to the websocket interface queue
        messagesTopic.addSubscription(new subscriptions.SqsSubscription(queue, {
            filterPolicyWithMessageBody: {
                direction: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.stringFilter({
                    allowlist: [types_1.Direction.Out],
                })),
            },
        }));
        this.messagesTopic = messagesTopic;
        this.resolvers = resolvers;
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(messagesTopic, [
            { id: "AwsSolutions-SNS2", reason: "No sensitive data in topic." },
            { id: "AwsSolutions-SNS3", reason: "No sensitive data in topic." },
        ]);
    }
}
exports.RealtimeGraphqlApiBackend = RealtimeGraphqlApiBackend;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic29ja2V0LWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndlYnNvY2tldC1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLDJDQUEyQztBQUUzQywyQ0FBMkM7QUFDM0MsbUVBQW1FO0FBQ25FLDJDQUEyQztBQUMzQywyQ0FBdUM7QUFHdkMsMkNBQTRDO0FBQzVDLDZDQUFpRDtBQUdqRCxxQ0FBMEM7QUFRMUMsTUFBYSx5QkFBMEIsU0FBUSxzQkFBUztJQUl0RCxZQUNFLEtBQWdCLEVBQ2hCLEVBQVUsRUFDVixLQUFxQztRQUVyQyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pCLHdEQUF3RDtRQUN4RCxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRTNELE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDakUsVUFBVSxFQUFFLElBQUk7U0FDakIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUN6RCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGVBQWUsRUFBRTtnQkFDZixLQUFLLEVBQUUsZUFBZTtnQkFDdEIsZUFBZSxFQUFFLENBQUM7YUFDbkI7U0FDRixDQUFDLENBQUM7UUFFSCw4REFBOEQ7UUFDOUQsS0FBSyxDQUFDLG1CQUFtQixDQUN2QixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsT0FBTyxFQUFFLENBQUMsaUJBQWlCLENBQUM7WUFDNUIsU0FBUyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQztZQUMzQixVQUFVLEVBQUU7Z0JBQ1YsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hELElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDO2FBQzlDO1NBQ0YsQ0FBQyxDQUNILENBQUM7UUFFRixNQUFNLFNBQVMsR0FBRyxJQUFJLDhCQUFpQixDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDekQsS0FBSyxFQUFFLEtBQUs7WUFDWixLQUFLLEVBQUUsYUFBYTtZQUNwQixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7WUFDeEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3BCLEdBQUcsRUFBRSxLQUFLLENBQUMsR0FBRztTQUNmLENBQUMsQ0FBQztRQUVILCtEQUErRDtRQUMvRCxhQUFhLENBQUMsZUFBZSxDQUMzQixJQUFJLGFBQWEsQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFO1lBQ3ZDLDJCQUEyQixFQUFFO2dCQUMzQixTQUFTLEVBQUUsR0FBRyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQ2xDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZLENBQUM7b0JBQ2xDLFNBQVMsRUFBRSxDQUFDLGlCQUFTLENBQUMsR0FBRyxDQUFDO2lCQUMzQixDQUFDLENBQ0g7YUFDRjtTQUNGLENBQUMsQ0FDSCxDQUFDO1FBRUYsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7UUFDbkMsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUM7UUFFM0I7O1dBRUc7UUFDSCx5QkFBZSxDQUFDLHVCQUF1QixDQUFDLGFBQWEsRUFBRTtZQUNyRCxFQUFFLEVBQUUsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsNkJBQTZCLEVBQUU7WUFDbEUsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLDZCQUE2QixFQUFFO1NBQ25FLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXRFRCw4REFzRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcblxuaW1wb3J0ICogYXMgc25zIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc25zXCI7XG5pbXBvcnQgKiBhcyBzdWJzY3JpcHRpb25zIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc25zLXN1YnNjcmlwdGlvbnNcIjtcbmltcG9ydCAqIGFzIHNxcyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNxc1wiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4uL3NoYXJlZFwiO1xuaW1wb3J0IHsgRGlyZWN0aW9uIH0gZnJvbSBcIi4uL3NoYXJlZC90eXBlc1wiO1xuaW1wb3J0IHsgUmVhbHRpbWVSZXNvbHZlcnMgfSBmcm9tIFwiLi9hcHBzeW5jLXdzXCI7XG5pbXBvcnQgeyBVc2VyUG9vbCB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY29nbml0b1wiO1xuaW1wb3J0ICogYXMgYXBwc3luYyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWFwcHN5bmNcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmludGVyZmFjZSBSZWFsdGltZUdyYXBocWxBcGlCYWNrZW5kUHJvcHMge1xuICByZWFkb25seSBzaGFyZWQ6IFNoYXJlZDtcbiAgcmVhZG9ubHkgdXNlclBvb2w6IFVzZXJQb29sO1xuICByZWFkb25seSBhcGk6IGFwcHN5bmMuR3JhcGhxbEFwaTtcbn1cblxuZXhwb3J0IGNsYXNzIFJlYWx0aW1lR3JhcGhxbEFwaUJhY2tlbmQgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgbWVzc2FnZXNUb3BpYzogc25zLlRvcGljO1xuICBwdWJsaWMgcmVhZG9ubHkgcmVzb2x2ZXJzOiBSZWFsdGltZVJlc29sdmVycztcblxuICBjb25zdHJ1Y3RvcihcbiAgICBzY29wZTogQ29uc3RydWN0LFxuICAgIGlkOiBzdHJpbmcsXG4gICAgcHJvcHM6IFJlYWx0aW1lR3JhcGhxbEFwaUJhY2tlbmRQcm9wc1xuICApIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuICAgIC8vIENyZWF0ZSB0aGUgbWFpbiBNZXNzYWdlIFRvcGljIGFjdGluZyBhcyBhIG1lc3NhZ2UgYnVzXG4gICAgY29uc3QgbWVzc2FnZXNUb3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgXCJNZXNzYWdlc1RvcGljXCIpO1xuXG4gICAgY29uc3QgZGVhZExldHRlclF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCBcIk91dGdvaW5nTWVzc2FnZXNETFFcIiwge1xuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCBcIk91dGdvaW5nTWVzc2FnZXNRdWV1ZVwiLCB7XG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZToge1xuICAgICAgICBxdWV1ZTogZGVhZExldHRlclF1ZXVlLFxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gZ3JhbnQgZXZlbnRicmlkZ2UgcGVybWlzc2lvbnMgdG8gc2VuZCBtZXNzYWdlcyB0byB0aGUgcXVldWVcbiAgICBxdWV1ZS5hZGRUb1Jlc291cmNlUG9saWN5KFxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICBhY3Rpb25zOiBbXCJzcXM6U2VuZE1lc3NhZ2VcIl0sXG4gICAgICAgIHJlc291cmNlczogW3F1ZXVlLnF1ZXVlQXJuXSxcbiAgICAgICAgcHJpbmNpcGFsczogW1xuICAgICAgICAgIG5ldyBpYW0uU2VydmljZVByaW5jaXBhbChcImV2ZW50cy5hbWF6b25hd3MuY29tXCIpLFxuICAgICAgICAgIG5ldyBpYW0uU2VydmljZVByaW5jaXBhbChcInNxcy5hbWF6b25hd3MuY29tXCIpLFxuICAgICAgICBdLFxuICAgICAgfSlcbiAgICApO1xuXG4gICAgY29uc3QgcmVzb2x2ZXJzID0gbmV3IFJlYWx0aW1lUmVzb2x2ZXJzKHRoaXMsIFwiUmVzb2x2ZXJzXCIsIHtcbiAgICAgIHF1ZXVlOiBxdWV1ZSxcbiAgICAgIHRvcGljOiBtZXNzYWdlc1RvcGljLFxuICAgICAgdXNlclBvb2w6IHByb3BzLnVzZXJQb29sLFxuICAgICAgc2hhcmVkOiBwcm9wcy5zaGFyZWQsXG4gICAgICBhcGk6IHByb3BzLmFwaSxcbiAgICB9KTtcblxuICAgIC8vIFJvdXRlIGFsbCBvdXRnb2luZyBtZXNzYWdlcyB0byB0aGUgd2Vic29ja2V0IGludGVyZmFjZSBxdWV1ZVxuICAgIG1lc3NhZ2VzVG9waWMuYWRkU3Vic2NyaXB0aW9uKFxuICAgICAgbmV3IHN1YnNjcmlwdGlvbnMuU3FzU3Vic2NyaXB0aW9uKHF1ZXVlLCB7XG4gICAgICAgIGZpbHRlclBvbGljeVdpdGhNZXNzYWdlQm9keToge1xuICAgICAgICAgIGRpcmVjdGlvbjogc25zLkZpbHRlck9yUG9saWN5LmZpbHRlcihcbiAgICAgICAgICAgIHNucy5TdWJzY3JpcHRpb25GaWx0ZXIuc3RyaW5nRmlsdGVyKHtcbiAgICAgICAgICAgICAgYWxsb3dsaXN0OiBbRGlyZWN0aW9uLk91dF0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICksXG4gICAgICAgIH0sXG4gICAgICB9KVxuICAgICk7XG5cbiAgICB0aGlzLm1lc3NhZ2VzVG9waWMgPSBtZXNzYWdlc1RvcGljO1xuICAgIHRoaXMucmVzb2x2ZXJzID0gcmVzb2x2ZXJzO1xuXG4gICAgLyoqXG4gICAgICogQ0RLIE5BRyBzdXBwcmVzc2lvblxuICAgICAqL1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhtZXNzYWdlc1RvcGljLCBbXG4gICAgICB7IGlkOiBcIkF3c1NvbHV0aW9ucy1TTlMyXCIsIHJlYXNvbjogXCJObyBzZW5zaXRpdmUgZGF0YSBpbiB0b3BpYy5cIiB9LFxuICAgICAgeyBpZDogXCJBd3NTb2x1dGlvbnMtU05TM1wiLCByZWFzb246IFwiTm8gc2Vuc2l0aXZlIGRhdGEgaW4gdG9waWMuXCIgfSxcbiAgICBdKTtcbiAgfVxufVxuIl19