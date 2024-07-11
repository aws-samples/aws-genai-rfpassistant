"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBotS3Buckets = void 0;
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const s3 = require("aws-cdk-lib/aws-s3");
const cdk_nag_1 = require("cdk-nag");
class ChatBotS3Buckets extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        const logsBucket = new s3.Bucket(this, "LogsBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const filesBucket = new s3.Bucket(this, "FilesBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            transferAcceleration: true,
            enforceSSL: true,
            serverAccessLogsBucket: logsBucket,
            cors: [
                {
                    allowedHeaders: ["*"],
                    allowedMethods: [
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.GET,
                        s3.HttpMethods.HEAD,
                    ],
                    allowedOrigins: ["*"],
                    exposedHeaders: ["ETag"],
                    maxAge: 3000,
                },
            ],
        });
        const userFeedbackBucket = new s3.Bucket(this, "UserFeedbackBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
            serverAccessLogsBucket: logsBucket,
        });
        this.filesBucket = filesBucket;
        this.userFeedbackBucket = userFeedbackBucket;
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(logsBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "Logging bucket does not require it's own access logs.",
            },
        ]);
    }
}
exports.ChatBotS3Buckets = ChatBotS3Buckets;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsMkNBQXVDO0FBQ3ZDLHlDQUF5QztBQUN6QyxxQ0FBMEM7QUFFMUMsTUFBYSxnQkFBaUIsU0FBUSxzQkFBUztJQUk3QyxZQUFZLEtBQWdCLEVBQUUsRUFBVTtRQUN0QyxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sVUFBVSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ25ELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixVQUFVLEVBQUUsSUFBSTtTQUNqQixDQUFDLENBQUM7UUFFSCxNQUFNLFdBQVcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyRCxpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsb0JBQW9CLEVBQUUsSUFBSTtZQUMxQixVQUFVLEVBQUUsSUFBSTtZQUNoQixzQkFBc0IsRUFBRSxVQUFVO1lBQ2xDLElBQUksRUFBRTtnQkFDSjtvQkFDRSxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLGNBQWMsRUFBRTt3QkFDZCxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUc7d0JBQ2xCLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSTt3QkFDbkIsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHO3dCQUNsQixFQUFFLENBQUMsV0FBVyxDQUFDLElBQUk7cUJBQ3BCO29CQUNELGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDckIsY0FBYyxFQUFFLENBQUMsTUFBTSxDQUFDO29CQUN4QixNQUFNLEVBQUUsSUFBSTtpQkFDYjthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ25FLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixVQUFVLEVBQUUsSUFBSTtZQUNoQixzQkFBc0IsRUFBRSxVQUFVO1NBQ25DLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQztRQUU3Qzs7V0FFRztRQUNILHlCQUFlLENBQUMsdUJBQXVCLENBQUMsVUFBVSxFQUFFO1lBQ2xEO2dCQUNFLEVBQUUsRUFBRSxpQkFBaUI7Z0JBQ3JCLE1BQU0sRUFBRSx1REFBdUQ7YUFDaEU7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUExREQsNENBMERDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XG5cbmV4cG9ydCBjbGFzcyBDaGF0Qm90UzNCdWNrZXRzIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IGZpbGVzQnVja2V0OiBzMy5CdWNrZXQ7XG4gIHB1YmxpYyByZWFkb25seSB1c2VyRmVlZGJhY2tCdWNrZXQ6IHMzLkJ1Y2tldDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGxvZ3NCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsIFwiTG9nc0J1Y2tldFwiLCB7XG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGZpbGVzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCBcIkZpbGVzQnVja2V0XCIsIHtcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICB0cmFuc2ZlckFjY2VsZXJhdGlvbjogdHJ1ZSxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBzZXJ2ZXJBY2Nlc3NMb2dzQnVja2V0OiBsb2dzQnVja2V0LFxuICAgICAgY29yczogW1xuICAgICAgICB7XG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFtcIipcIl0sXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLlBVVCxcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLlBPU1QsXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5HRVQsXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5IRUFELFxuICAgICAgICAgIF0sXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFtcIipcIl0sXG4gICAgICAgICAgZXhwb3NlZEhlYWRlcnM6IFtcIkVUYWdcIl0sXG4gICAgICAgICAgbWF4QWdlOiAzMDAwLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVzZXJGZWVkYmFja0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgXCJVc2VyRmVlZGJhY2tCdWNrZXRcIiwge1xuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICBzZXJ2ZXJBY2Nlc3NMb2dzQnVja2V0OiBsb2dzQnVja2V0LFxuICAgIH0pO1xuXG4gICAgdGhpcy5maWxlc0J1Y2tldCA9IGZpbGVzQnVja2V0O1xuICAgIHRoaXMudXNlckZlZWRiYWNrQnVja2V0ID0gdXNlckZlZWRiYWNrQnVja2V0O1xuXG4gICAgLyoqXG4gICAgICogQ0RLIE5BRyBzdXBwcmVzc2lvblxuICAgICAqL1xuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhsb2dzQnVja2V0LCBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1TMVwiLFxuICAgICAgICByZWFzb246IFwiTG9nZ2luZyBidWNrZXQgZG9lcyBub3QgcmVxdWlyZSBpdCdzIG93biBhY2Nlc3MgbG9ncy5cIixcbiAgICAgIH0sXG4gICAgXSk7XG4gIH1cbn1cbiJdfQ==