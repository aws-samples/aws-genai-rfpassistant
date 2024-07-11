"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicWebsite = void 0;
const cdk = require("aws-cdk-lib");
const cf = require("aws-cdk-lib/aws-cloudfront");
const s3 = require("aws-cdk-lib/aws-s3");
const acm = require("aws-cdk-lib/aws-certificatemanager");
const constructs_1 = require("constructs");
const cdk_nag_1 = require("cdk-nag");
class PublicWebsite extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        /////////////////////////////////////
        ///// CLOUDFRONT IMPLEMENTATION /////
        /////////////////////////////////////
        const originAccessIdentity = new cf.OriginAccessIdentity(this, "S3OAI");
        props.websiteBucket.grantRead(originAccessIdentity);
        props.chatbotFilesBucket.grantRead(originAccessIdentity);
        const cfGeoRestrictEnable = props.config.cfGeoRestrictEnable;
        const cfGeoRestrictList = props.config.cfGeoRestrictList;
        const distributionLogsBucket = new s3.Bucket(this, "DistributionLogsBucket", {
            objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const distribution = new cf.CloudFrontWebDistribution(this, "Distribution", {
            // CUSTOM DOMAIN FOR PUBLIC WEBSITE
            // REQUIRES:
            // 1. ACM Certificate ARN in us-east-1 and Domain of website to be input during 'npm run config':
            //    "privateWebsite" : false,
            //    "certificate" : "arn:aws:acm:us-east-1:1234567890:certificate/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXX",
            //    "domain" : "sub.example.com"
            // 2. After the deployment, in your Route53 Hosted Zone, add an "A Record" that points to the Cloudfront Alias (https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html)
            ...(props.config.certificate && props.config.domain && {
                viewerCertificate: cf.ViewerCertificate.fromAcmCertificate(acm.Certificate.fromCertificateArn(this, 'CloudfrontAcm', props.config.certificate), {
                    aliases: [props.config.domain]
                })
            }),
            viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            priceClass: cf.PriceClass.PRICE_CLASS_ALL,
            httpVersion: cf.HttpVersion.HTTP2_AND_3,
            loggingConfig: {
                bucket: distributionLogsBucket,
            },
            originConfigs: [
                {
                    behaviors: [{ isDefaultBehavior: true }],
                    s3OriginSource: {
                        s3BucketSource: props.websiteBucket,
                        originAccessIdentity,
                    },
                },
                {
                    behaviors: [
                        {
                            pathPattern: "/chabot/files/*",
                            allowedMethods: cf.CloudFrontAllowedMethods.ALL,
                            viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                            defaultTtl: cdk.Duration.seconds(0),
                            forwardedValues: {
                                queryString: true,
                                headers: [
                                    "Referer",
                                    "Origin",
                                    "Authorization",
                                    "Content-Type",
                                    "x-forwarded-user",
                                    "Access-Control-Request-Headers",
                                    "Access-Control-Request-Method",
                                ],
                            },
                        },
                    ],
                    s3OriginSource: {
                        s3BucketSource: props.chatbotFilesBucket,
                        originAccessIdentity,
                    },
                },
            ],
            geoRestriction: cfGeoRestrictEnable ? cf.GeoRestriction.allowlist(...cfGeoRestrictList) : undefined,
            errorConfigurations: [
                {
                    errorCode: 404,
                    errorCachingMinTtl: 0,
                    responseCode: 200,
                    responsePagePath: "/index.html",
                },
            ],
        });
        this.distribution = distribution;
        // ###################################################
        // Outputs
        // ###################################################
        new cdk.CfnOutput(this, "UserInterfaceDomainName", {
            value: `https://${distribution.distributionDomainName}`,
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions(distributionLogsBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "Bucket is the server access logs bucket for websiteBucket.",
            },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(props.websiteBucket, [
            { id: "AwsSolutions-S5", reason: "OAI is configured for read." },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(distribution, [
            { id: "AwsSolutions-CFR1", reason: "No geo restrictions" },
            {
                id: "AwsSolutions-CFR2",
                reason: "WAF not required due to configured Cognito auth.",
            },
            { id: "AwsSolutions-CFR4", reason: "TLS 1.2 is the default." },
        ]);
    }
}
exports.PublicWebsite = PublicWebsite;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVibGljLXdlYnNpdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwdWJsaWMtd2Vic2l0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxtQ0FBbUM7QUFDbkMsaURBQWlEO0FBQ2pELHlDQUF5QztBQUN6QywwREFBMEQ7QUFDMUQsMkNBQXVDO0FBSXZDLHFDQUEwQztBQWdCMUMsTUFBYSxhQUFjLFNBQVEsc0JBQVM7SUFHMUMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLHFDQUFxQztRQUNyQyxxQ0FBcUM7UUFDckMscUNBQXFDO1FBRXJDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxFQUFFLENBQUMsb0JBQW9CLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3hFLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDcEQsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztRQUM3RCxNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUM7UUFHekQsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQzFDLElBQUksRUFDSix3QkFBd0IsRUFDeEI7WUFDRSxlQUFlLEVBQUUsRUFBRSxDQUFDLGVBQWUsQ0FBQyxhQUFhO1lBQ2pELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixVQUFVLEVBQUUsSUFBSTtTQUNqQixDQUNGLENBQUM7UUFFRixNQUFNLFlB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RUFBRSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLDZCQUE2QixFQUFFO1NBQ2pFLENBQUMsQ0FBQztRQUVILHlCQUFlLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFO1lBQ3BELEVBQUUsRUFBRSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRTtZQUMxRDtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQUUsa0RBQWtEO2FBQzNEO1lBQ0QsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixFQUFFO1NBQy9ELENBQUMsQ0FBQztJQUNILENBQUM7Q0FFRjtBQXJJSCxzQ0FxSUciLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjb2duaXRvSWRlbnRpdHlQb29sIGZyb20gXCJAYXdzLWNkay9hd3MtY29nbml0by1pZGVudGl0eXBvb2wtYWxwaGFcIjtcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIGNmIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udFwiO1xuaW1wb3J0ICogYXMgczMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xuaW1wb3J0ICogYXMgYWNtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4uL3NoYXJlZFwiO1xuaW1wb3J0IHsgU3lzdGVtQ29uZmlnIH0gZnJvbSBcIi4uL3NoYXJlZC90eXBlc1wiO1xuaW1wb3J0IHsgQ2hhdEJvdEFwaSB9IGZyb20gXCIuLi9jaGF0Ym90LWFwaVwiO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcblxuXG5leHBvcnQgaW50ZXJmYWNlIFB1YmxpY1dlYnNpdGVQcm9wcyB7XG4gIHJlYWRvbmx5IGNvbmZpZzogU3lzdGVtQ29uZmlnO1xuICByZWFkb25seSBzaGFyZWQ6IFNoYXJlZDtcbiAgcmVhZG9ubHkgdXNlclBvb2xJZDogc3RyaW5nO1xuICByZWFkb25seSB1c2VyUG9vbENsaWVudElkOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGlkZW50aXR5UG9vbDogY29nbml0b0lkZW50aXR5UG9vbC5JZGVudGl0eVBvb2w7XG4gIHJlYWRvbmx5IGFwaTogQ2hhdEJvdEFwaTtcbiAgcmVhZG9ubHkgY2hhdGJvdEZpbGVzQnVja2V0OiBzMy5CdWNrZXQ7XG4gIHJlYWRvbmx5IGNyb3NzRW5jb2RlcnNFbmFibGVkOiBib29sZWFuO1xuICByZWFkb25seSBzYWdlbWFrZXJFbWJlZGRpbmdzRW5hYmxlZDogYm9vbGVhbjtcbiAgcmVhZG9ubHkgd2Vic2l0ZUJ1Y2tldDogczMuQnVja2V0O1xufVxuXG5leHBvcnQgY2xhc3MgUHVibGljV2Vic2l0ZSBleHRlbmRzIENvbnN0cnVjdCB7XG4gICAgcmVhZG9ubHkgZGlzdHJpYnV0aW9uOiBjZi5DbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBQdWJsaWNXZWJzaXRlUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuICAgIC8vLy8vIENMT1VERlJPTlQgSU1QTEVNRU5UQVRJT04gLy8vLy9cbiAgICAvLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vXG5cbiAgICBjb25zdCBvcmlnaW5BY2Nlc3NJZGVudGl0eSA9IG5ldyBjZi5PcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCBcIlMzT0FJXCIpO1xuICAgIHByb3BzLndlYnNpdGVCdWNrZXQuZ3JhbnRSZWFkKG9yaWdpbkFjY2Vzc0lkZW50aXR5KTtcbiAgICBwcm9wcy5jaGF0Ym90RmlsZXNCdWNrZXQuZ3JhbnRSZWFkKG9yaWdpbkFjY2Vzc0lkZW50aXR5KTtcbiAgICBjb25zdCBjZkdlb1Jlc3RyaWN0RW5hYmxlID0gcHJvcHMuY29uZmlnLmNmR2VvUmVzdHJpY3RFbmFibGU7XG4gICAgY29uc3QgY2ZHZW9SZXN0cmljdExpc3QgPSBwcm9wcy5jb25maWcuY2ZHZW9SZXN0cmljdExpc3Q7XG5cblxuICAgIGNvbnN0IGRpc3RyaWJ1dGlvbkxvZ3NCdWNrZXQgPSBuZXcgczMuQnVja2V0KFxuICAgICAgdGhpcyxcbiAgICAgIFwiRGlzdHJpYnV0aW9uTG9nc0J1Y2tldFwiLFxuICAgICAge1xuICAgICAgICBvYmplY3RPd25lcnNoaXA6IHMzLk9iamVjdE93bmVyc2hpcC5PQkpFQ1RfV1JJVEVSLFxuICAgICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IGNmLkNsb3VkRnJvbnRXZWJEaXN0cmlidXRpb24oXG4gICAgICB0aGlzLFxuICAgICAgXCJEaXN0cmlidXRpb25cIixcbiAgICAgIHtcbiAgICAgICAgLy8gQ1VTVE9NIERPTUFJTiBGT1IgUFVCTElDIFdFQlNJVEVcbiAgICAgICAgLy8gUkVRVUlSRVM6XG4gICAgICAgIC8vIDEuIEFDTSBDZXJ0aWZpY2F0ZSBBUk4gaW4gdXMtZWFzdC0xIGFuZCBEb21haW4gb2Ygd2Vic2l0ZSB0byBiZSBpbnB1dCBkdXJpbmcgJ25wbSBydW4gY29uZmlnJzpcbiAgICAgICAgLy8gICAgXCJwcml2YXRlV2Vic2l0ZVwiIDogZmFsc2UsXG4gICAgICAgIC8vICAgIFwiY2VydGlmaWNhdGVcIiA6IFwiYXJuOmF3czphY206dXMtZWFzdC0xOjEyMzQ1Njc4OTA6Y2VydGlmaWNhdGUvWFhYWFhYWFgtWFhYWC1YWFhYLVhYWFgtWFhYWFhYWFhYWFhcIixcbiAgICAgICAgLy8gICAgXCJkb21haW5cIiA6IFwic3ViLmV4YW1wbGUuY29tXCJcbiAgICAgICAgLy8gMi4gQWZ0ZXIgdGhlIGRlcGxveW1lbnQsIGluIHlvdXIgUm91dGU1MyBIb3N0ZWQgWm9uZSwgYWRkIGFuIFwiQSBSZWNvcmRcIiB0aGF0IHBvaW50cyB0byB0aGUgQ2xvdWRmcm9udCBBbGlhcyAoaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL1JvdXRlNTMvbGF0ZXN0L0RldmVsb3Blckd1aWRlL3JvdXRpbmctdG8tY2xvdWRmcm9udC1kaXN0cmlidXRpb24uaHRtbClcbiAgICAgICAgLi4uKHByb3BzLmNvbmZpZy5jZXJ0aWZpY2F0ZSAmJiBwcm9wcy5jb25maWcuZG9tYWluICYmIHtcbiAgICAgICAgICB2aWV3ZXJDZXJ0aWZpY2F0ZTogY2YuVmlld2VyQ2VydGlmaWNhdGUuZnJvbUFjbUNlcnRpZmljYXRlKFxuICAgICAgICAgICAgYWNtLkNlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCdDbG91ZGZyb250QWNtJywgcHJvcHMuY29uZmlnLmNlcnRpZmljYXRlKSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgYWxpYXNlczogW3Byb3BzLmNvbmZpZy5kb21haW5dXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KSxcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNmLlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxuICAgICAgICBwcmljZUNsYXNzOiBjZi5QcmljZUNsYXNzLlBSSUNFX0NMQVNTX0FMTCxcbiAgICAgICAgaHR0cFZlcnNpb246IGNmLkh0dHBWZXJzaW9uLkhUVFAyX0FORF8zLFxuICAgICAgICBsb2dnaW5nQ29uZmlnOiB7XG4gICAgICAgICAgYnVja2V0OiBkaXN0cmlidXRpb25Mb2dzQnVja2V0LFxuICAgICAgICB9LFxuICAgICAgICBvcmlnaW5Db25maWdzOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgYmVoYXZpb3JzOiBbeyBpc0RlZmF1bHRCZWhhdmlvcjogdHJ1ZSB9XSxcbiAgICAgICAgICAgIHMzT3JpZ2luU291cmNlOiB7XG4gICAgICAgICAgICAgIHMzQnVja2V0U291cmNlOiBwcm9wcy53ZWJzaXRlQnVja2V0LFxuICAgICAgICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBiZWhhdmlvcnM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHBhdGhQYXR0ZXJuOiBcIi9jaGFib3QvZmlsZXMvKlwiLFxuICAgICAgICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBjZi5DbG91ZEZyb250QWxsb3dlZE1ldGhvZHMuQUxMLFxuICAgICAgICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjZi5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgICAgICAgICAgICBkZWZhdWx0VHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcbiAgICAgICAgICAgICAgICBmb3J3YXJkZWRWYWx1ZXM6IHtcbiAgICAgICAgICAgICAgICAgIHF1ZXJ5U3RyaW5nOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgaGVhZGVyczogW1xuICAgICAgICAgICAgICAgICAgICBcIlJlZmVyZXJcIixcbiAgICAgICAgICAgICAgICAgICAgXCJPcmlnaW5cIixcbiAgICAgICAgICAgICAgICAgICAgXCJBdXRob3JpemF0aW9uXCIsXG4gICAgICAgICAgICAgICAgICAgIFwiQ29udGVudC1UeXBlXCIsXG4gICAgICAgICAgICAgICAgICAgIFwieC1mb3J3YXJkZWQtdXNlclwiLFxuICAgICAgICAgICAgICAgICAgICBcIkFjY2Vzcy1Db250cm9sLVJlcXVlc3QtSGVhZGVyc1wiLFxuICAgICAgICAgICAgICAgICAgICBcIkFjY2Vzcy1Db250cm9sLVJlcXVlc3QtTWV0aG9kXCIsXG4gICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgczNPcmlnaW5Tb3VyY2U6IHtcbiAgICAgICAgICAgICAgczNCdWNrZXRTb3VyY2U6IHByb3BzLmNoYXRib3RGaWxlc0J1Y2tldCxcbiAgICAgICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHksXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICAgIGdlb1Jlc3RyaWN0aW9uOiBjZkdlb1Jlc3RyaWN0RW5hYmxlID8gY2YuR2VvUmVzdHJpY3Rpb24uYWxsb3dsaXN0KC4uLmNmR2VvUmVzdHJpY3RMaXN0KTogdW5kZWZpbmVkLFxuICAgICAgICBlcnJvckNvbmZpZ3VyYXRpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgZXJyb3JDb2RlOiA0MDQsXG4gICAgICAgICAgICBlcnJvckNhY2hpbmdNaW5UdGw6IDAsXG4gICAgICAgICAgICByZXNwb25zZUNvZGU6IDIwMCxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6IFwiL2luZGV4Lmh0bWxcIixcbiAgICAgICAgICB9LFxuICAgICAgICBdLFxuICAgICAgfVxuICAgICk7XG5cbiAgICB0aGlzLmRpc3RyaWJ1dGlvbiA9IGRpc3RyaWJ1dGlvbjtcblxuICAgIC8vICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICAgIC8vIE91dHB1dHNcbiAgICAvLyAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlVzZXJJbnRlcmZhY2VEb21haW5OYW1lXCIsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2Rpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lfWAsXG4gICAgfSk7XG5cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBkaXN0cmlidXRpb25Mb2dzQnVja2V0LFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLVMxXCIsXG4gICAgICAgICAgcmVhc29uOiBcIkJ1Y2tldCBpcyB0aGUgc2VydmVyIGFjY2VzcyBsb2dzIGJ1Y2tldCBmb3Igd2Vic2l0ZUJ1Y2tldC5cIixcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICApO1xuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKHByb3BzLndlYnNpdGVCdWNrZXQsIFtcbiAgICAgIHsgaWQ6IFwiQXdzU29sdXRpb25zLVM1XCIsIHJlYXNvbjogXCJPQUkgaXMgY29uZmlndXJlZCBmb3IgcmVhZC5cIiB9LFxuICAgIF0pO1xuXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKGRpc3RyaWJ1dGlvbiwgW1xuICAgICAgeyBpZDogXCJBd3NTb2x1dGlvbnMtQ0ZSMVwiLCByZWFzb246IFwiTm8gZ2VvIHJlc3RyaWN0aW9uc1wiIH0sXG4gICAgICB7XG4gICAgICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1DRlIyXCIsXG4gICAgICAgIHJlYXNvbjogXCJXQUYgbm90IHJlcXVpcmVkIGR1ZSB0byBjb25maWd1cmVkIENvZ25pdG8gYXV0aC5cIixcbiAgICAgIH0sXG4gICAgICB7IGlkOiBcIkF3c1NvbHV0aW9ucy1DRlI0XCIsIHJlYXNvbjogXCJUTFMgMS4yIGlzIHRoZSBkZWZhdWx0LlwiIH0sXG4gICAgXSk7XG4gICAgfVxuXG4gIH1cbiJdfQ==