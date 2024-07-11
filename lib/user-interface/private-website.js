"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivateWebsite = void 0;
const cdk = require("aws-cdk-lib");
const iam = require("aws-cdk-lib/aws-iam");
const s3 = require("aws-cdk-lib/aws-s3");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
const ec2 = require("aws-cdk-lib/aws-ec2");
const custom_resources_1 = require("aws-cdk-lib/custom-resources");
const aws_elasticloadbalancingv2_targets_1 = require("aws-cdk-lib/aws-elasticloadbalancingv2-targets");
const constructs_1 = require("constructs");
const cdk_nag_1 = require("cdk-nag");
class PrivateWebsite extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // PRIVATE WEBSITE 
        // REQUIRES: 
        // 1. ACM Certificate ARN and Domain of website to be input during 'npm run config': 
        //    "privateWebsite" : true,
        //    "certificate" : "arn:aws:acm:ap-southeast-2:1234567890:certificate/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXX",
        //    "domain" : "sub.example.com"
        // 2. In Route 53 link the VPC to the Private Hosted Zone (PHZ) (https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-associate-vpcs.html)
        // 3. In the PHZ, add an "A Record" that points to the Application Load Balancer Alias (https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-elb-load-balancer.html)
        // Retrieving S3 Endpoint Ips for ALB Target
        const vpc = props.shared.vpc;
        // First, retrieve the VPC Endpoint
        const vpcEndpointsCall = {
            service: 'EC2',
            action: 'describeVpcEndpoints',
            parameters: {
                Filters: [
                    {
                        Name: "vpc-id",
                        Values: [vpc.vpcId]
                    },
                    {
                        Name: "vpc-endpoint-type",
                        Values: ["Interface"]
                    },
                    {
                        Name: "service-name",
                        Values: [ec2.InterfaceVpcEndpointAwsService.S3.name]
                    }
                ]
            },
            physicalResourceId: cdk.custom_resources.PhysicalResourceId.of('describeNetworkInterfaces'),
            outputPaths: ['VpcEndpoints.0']
        };
        const vpcEndpoints = new custom_resources_1.AwsCustomResource(this, 'describeVpcEndpoints', {
            onCreate: vpcEndpointsCall,
            onUpdate: vpcEndpointsCall,
            policy: {
                statements: [
                    new iam.PolicyStatement({
                        actions: ["ec2:DescribeVpcEndpoints"],
                        resources: ["*"]
                    })
                ]
            }
        });
        if (props.config.vpc?.createVpcEndpoints) {
            vpcEndpoints.node.addDependency(props.shared.s3vpcEndpoint);
        }
        // Then, retrieve the Private IP Addresses for each ENI of the VPC Endpoint
        let s3IPs = [];
        for (let index = 0; index < vpc.availabilityZones.length; index++) {
            const sdkCall = {
                service: 'EC2',
                action: 'describeNetworkInterfaces',
                outputPaths: [`NetworkInterfaces.0.PrivateIpAddress`],
                parameters: {
                    NetworkInterfaceIds: [vpcEndpoints.getResponseField(`VpcEndpoints.0.NetworkInterfaceIds.${index}`)],
                    Filters: [
                        { Name: "interface-type", Values: ["vpc_endpoint"] }
                    ],
                },
                physicalResourceId: cdk.custom_resources.PhysicalResourceId.of('describeNetworkInterfaces'), //PhysicalResourceId.of('describeNetworkInterfaces'),
            };
            const eni = new custom_resources_1.AwsCustomResource(this, `DescribeNetworkInterfaces-${index}`, {
                onCreate: sdkCall,
                onUpdate: sdkCall,
                policy: {
                    statements: [
                        new iam.PolicyStatement({
                            actions: ["ec2:DescribeNetworkInterfaces"],
                            resources: ["*"] //[`arn:aws:ec2:${process.env.CDK_DEFAULT_REGION }:${process.env.CDK_DEFAULT_ACCOUNT}:network-interface/${eniId}`]
                        }),
                    ],
                },
            });
            s3IPs.push(new aws_elasticloadbalancingv2_targets_1.IpTarget(cdk.Token.asString(eni.getResponseField(`NetworkInterfaces.0.PrivateIpAddress`)), 443));
        }
        // Website ALB 
        const albSecurityGroup = new ec2.SecurityGroup(this, 'WebsiteApplicationLoadBalancerSG', {
            vpc: props.shared.vpc,
            allowAllOutbound: false
        });
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
        albSecurityGroup.addEgressRule(ec2.Peer.ipv4(props.shared.vpc.vpcCidrBlock), ec2.Port.tcp(443));
        const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
            vpc: props.shared.vpc,
            internetFacing: false,
            securityGroup: albSecurityGroup,
            vpcSubnets: props.shared.vpc.selectSubnets({
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
            }),
        });
        const albLogBucket = new s3.Bucket(this, 'ALBLoggingBucket', {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        loadBalancer.logAccessLogs(albLogBucket);
        // Adding Listener
        // Using ACM certificate ARN passed in through props/config file 
        if (props.config.certificate) {
            const albListener = loadBalancer.addListener('ALBLHTTPS', {
                protocol: elbv2.ApplicationProtocol.HTTPS,
                port: 443,
                certificates: [elbv2.ListenerCertificate.fromArn(props.config.certificate)],
                sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS
            });
            // Add ALB targets
            albListener.addTargets('s3TargetGroup', {
                port: 443,
                protocol: elbv2.ApplicationProtocol.HTTPS,
                targets: s3IPs,
                healthCheck: {
                    protocol: elbv2.Protocol.HTTPS,
                    path: '/',
                    healthyHttpCodes: '307,405'
                }
            });
            // The Amazon S3 PrivateLink Endpoint is a REST API Endpoint, which means that trailing slash requests will return XML directory listings by default.
            // To work around this, you’ll create a redirect rule to point all requests ending in a trailing slash to index.html.
            albListener.addAction('privateLinkRedirectPath', {
                priority: 1,
                conditions: [
                    elbv2.ListenerCondition.pathPatterns(['/']),
                ],
                action: elbv2.ListenerAction.redirect({
                    port: '#{port}',
                    path: '/index.html', //'/#{path}index.html' //
                })
            });
        }
        // Allow access to website bucket from S3 Endpoints
        props.websiteBucket.policy?.document.addStatements(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject', "s3:List*"],
            principals: [new iam.AnyPrincipal()],
            resources: [props.websiteBucket.bucketArn, `${props.websiteBucket.bucketArn}/*`],
            conditions: {
                "StringEquals": { "aws:SourceVpce": vpcEndpoints.getResponseField(`VpcEndpoints.0.VpcEndpointId`) }
            }
        }));
        // ###################################################
        // Outputs
        // ###################################################
        new cdk.CfnOutput(this, "Domain", {
            value: `https://${props.config.domain}`,
        });
        new cdk.CfnOutput(this, "LoadBalancerDNS", {
            value: loadBalancer.loadBalancerDnsName,
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions(albSecurityGroup, [
            {
                id: "AwsSolutions-EC23",
                reason: "Website Application Load Balancer can be open to 0.0.0.0/0 on ports 80 & 443.",
            },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(props.websiteBucket, [
            {
                id: "AwsSolutions-S5",
                reason: "Bucket has conditions to only allow access from S3 VPC Endpoints.",
            },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(albLogBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "Bucket is the server access logs bucket for ALB.",
            },
        ]);
    }
}
exports.PrivateWebsite = PrivateWebsite;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJpdmF0ZS13ZWJzaXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJpdmF0ZS13ZWJzaXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1DQUFtQztBQUNuQywyQ0FBMkM7QUFDM0MseUNBQXlDO0FBQ3pDLGdFQUFnRTtBQUNoRSwyQ0FBMkM7QUFDM0MsbUVBQTZFO0FBQzdFLHVHQUEwRTtBQUMxRSwyQ0FBdUM7QUFJdkMscUNBQTBDO0FBZ0IxQyxNQUFhLGNBQWUsU0FBUSxzQkFBUztJQUMzQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsbUJBQW1CO1FBQ25CLGFBQWE7UUFDYixxRkFBcUY7UUFDckYsOEJBQThCO1FBQzlCLDhHQUE4RztRQUM5RyxrQ0FBa0M7UUFDbEMsbUtBQW1LO1FBQ25LLG9MQUFvTDtRQUVwTCw0Q0FBNEM7UUFDNUMsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUE7UUFFNUIsbUNBQW1DO1FBQ25DLE1BQU0sZ0JBQWdCLEdBQWU7WUFDakMsT0FBTyxFQUFFLEtBQUs7WUFDZCxNQUFNLEVBQUUsc0JBQXNCO1lBQzlCLFVBQVUsRUFBRTtnQkFDUixPQUFPLEVBQUU7b0JBQ1A7d0JBQ0UsSUFBSSxFQUFFLFFBQVE7d0JBQ2QsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztxQkFDcEI7b0JBQ0Q7d0JBQ0UsSUFBSSxFQUFFLG1CQUFtQjt3QkFDekIsTUFBTSxFQUFFLENBQUMsV0FBVyxDQUFDO3FCQUN0QjtvQkFDRDt3QkFDRSxJQUFJLEVBQUUsY0FBYzt3QkFDcEIsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLDhCQUE4QixDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7cUJBQ3JEO2lCQUNGO2FBQ0o7WUFDRCxrQkFBa0IsRUFBRSxHQUFHLENBQUMsZ0JBQWdC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aXRvSWRlbnRpdHlQb29sIGZyb20gXCJAYXdzLWNkay9hd3MtY29nbml0by1pZGVudGl0eXBvb2wtYWxwaGFcIjtcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIGlhbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xuaW1wb3J0ICogYXMgczMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xuaW1wb3J0ICogYXMgZWxidjIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyXCI7XG5pbXBvcnQgKiBhcyBlYzIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1lYzJcIjtcbmltcG9ydCB7IEF3c0N1c3RvbVJlc291cmNlLCBBd3NTZGtDYWxsIH0gZnJvbSBcImF3cy1jZGstbGliL2N1c3RvbS1yZXNvdXJjZXNcIjtcbmltcG9ydCB7IElwVGFyZ2V0IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyLXRhcmdldHNcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBTaGFyZWQgfSBmcm9tIFwiLi4vc2hhcmVkXCI7XG5pbXBvcnQgeyBTeXN0ZW1Db25maWcgfSBmcm9tIFwiLi4vc2hhcmVkL3R5cGVzXCI7XG5pbXBvcnQgeyBDaGF0Qm90QXBpIH0gZnJvbSBcIi4uL2NoYXRib3QtYXBpXCI7XG5pbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuXG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJpdmF0ZVdlYnNpdGVQcm9wcyB7XG4gIHJlYWRvbmx5IGNvbmZpZzogU3lzdGVtQ29uZmlnO1xuICByZWFkb25seSBzaGFyZWQ6IFNoYXJlZDtcbiAgcmVhZG9ubHkgdXNlclBvb2xJZDogc3RyaW5nO1xuICByZWFkb25seSB1c2VyUG9vbENsaWVudElkOiBzdHJpbmc7XG4gIHJlYWRvbmx5IGlkZW50aXR5UG9vbDogY29nbml0b0lkZW50aXR5UG9vbC5JZGVudGl0eVBvb2w7XG4gIHJlYWRvbmx5IGFwaTogQ2hhdEJvdEFwaTtcbiAgcmVhZG9ubHkgY2hhdGJvdEZpbGVzQnVja2V0OiBzMy5CdWNrZXQ7XG4gIHJlYWRvbmx5IGNyb3NzRW5jb2RlcnNFbmFibGVkOiBib29sZWFuO1xuICByZWFkb25seSBzYWdlbWFrZXJFbWJlZGRpbmdzRW5hYmxlZDogYm9vbGVhbjtcbiAgcmVhZG9ubHkgd2Vic2l0ZUJ1Y2tldDogczMuQnVja2V0O1xufVxuXG5leHBvcnQgY2xhc3MgUHJpdmF0ZVdlYnNpdGUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogUHJpdmF0ZVdlYnNpdGVQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICAvLyBQUklWQVRFIFdFQlNJVEUgXG4gICAgLy8gUkVRVUlSRVM6IFxuICAgIC8vIDEuIEFDTSBDZXJ0aWZpY2F0ZSBBUk4gYW5kIERvbWFpbiBvZiB3ZWJzaXRlIHRvIGJlIGlucHV0IGR1cmluZyAnbnBtIHJ1biBjb25maWcnOiBcbiAgICAvLyAgICBcInByaXZhdGVXZWJzaXRlXCIgOiB0cnVlLFxuICAgIC8vICAgIFwiY2VydGlmaWNhdGVcIiA6IFwiYXJuOmF3czphY206YXAtc291dGhlYXN0LTI6MTIzNDU2Nzg5MDpjZXJ0aWZpY2F0ZS9YWFhYWFhYWC1YWFhYLVhYWFgtWFhYWC1YWFhYWFhYWFhYWFwiLFxuICAgIC8vICAgIFwiZG9tYWluXCIgOiBcInN1Yi5leGFtcGxlLmNvbVwiXG4gICAgLy8gMi4gSW4gUm91dGUgNTMgbGluayB0aGUgVlBDIHRvIHRoZSBQcml2YXRlIEhvc3RlZCBab25lIChQSFopIChodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vUm91dGU1My9sYXRlc3QvRGV2ZWxvcGVyR3VpZGUvaG9zdGVkLXpvbmUtcHJpdmF0ZS1hc3NvY2lhdGUtdnBjcy5odG1sKVxuICAgIC8vIDMuIEluIHRoZSBQSFosIGFkZCBhbiBcIkEgUmVjb3JkXCIgdGhhdCBwb2ludHMgdG8gdGhlIEFwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXIgQWxpYXMgKGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9Sb3V0ZTUzL2xhdGVzdC9EZXZlbG9wZXJHdWlkZS9yb3V0aW5nLXRvLWVsYi1sb2FkLWJhbGFuY2VyLmh0bWwpXG5cbiAgICAvLyBSZXRyaWV2aW5nIFMzIEVuZHBvaW50IElwcyBmb3IgQUxCIFRhcmdldFxuICAgIGNvbnN0IHZwYyA9IHByb3BzLnNoYXJlZC52cGNcblxuICAgIC8vIEZpcnN0LCByZXRyaWV2ZSB0aGUgVlBDIEVuZHBvaW50XG4gICAgY29uc3QgdnBjRW5kcG9pbnRzQ2FsbDogQXdzU2RrQ2FsbCA9IHtcbiAgICAgICAgc2VydmljZTogJ0VDMicsXG4gICAgICAgIGFjdGlvbjogJ2Rlc2NyaWJlVnBjRW5kcG9pbnRzJyxcbiAgICAgICAgcGFyYW1ldGVyczoge1xuICAgICAgICAgICAgRmlsdGVyczogW1xuICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgTmFtZTogXCJ2cGMtaWRcIixcbiAgICAgICAgICAgICAgICBWYWx1ZXM6IFt2cGMudnBjSWRdXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBOYW1lOiBcInZwYy1lbmRwb2ludC10eXBlXCIsXG4gICAgICAgICAgICAgICAgVmFsdWVzOiBbXCJJbnRlcmZhY2VcIl1cbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIE5hbWU6IFwic2VydmljZS1uYW1lXCIsXG4gICAgICAgICAgICAgICAgVmFsdWVzOiBbZWMyLkludGVyZmFjZVZwY0VuZHBvaW50QXdzU2VydmljZS5TMy5uYW1lXVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIHBoeXNpY2FsUmVzb3VyY2VJZDogY2RrLmN1c3RvbV9yZXNvdXJjZXMuUGh5c2ljYWxSZXNvdXJjZUlkLm9mKCdkZXNjcmliZU5ldHdvcmtJbnRlcmZhY2VzJyksIC8vUGh5c2ljYWxSZXNvdXJjZUlkLm9mKCdkZXNjcmliZVZwY0VuZHBvaW50cycpLCBcbiAgICAgICAgb3V0cHV0UGF0aHM6IFsnVnBjRW5kcG9pbnRzLjAnXVxuICAgIH1cblxuICAgIGNvbnN0IHZwY0VuZHBvaW50cyA9IG5ldyBBd3NDdXN0b21SZXNvdXJjZShcbiAgICAgICAgdGhpcywgJ2Rlc2NyaWJlVnBjRW5kcG9pbnRzJywge1xuICAgICAgICBvbkNyZWF0ZTogdnBjRW5kcG9pbnRzQ2FsbCxcbiAgICAgICAgb25VcGRhdGU6IHZwY0VuZHBvaW50c0NhbGwsXG4gICAgICAgIHBvbGljeToge1xuICAgICAgICAgICAgc3RhdGVtZW50czogW1xuICAgICAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHsgXG4gICAgICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcImVjMjpEZXNjcmliZVZwY0VuZHBvaW50c1wiXSxcbiAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdXG4gICAgICAgICAgICAgICAgfSldXG4gICAgICAgIH1cbiAgICB9KVxuXG4gICAgaWYgKHByb3BzLmNvbmZpZy52cGM/LmNyZWF0ZVZwY0VuZHBvaW50cykge1xuICAgICAgICB2cGNFbmRwb2ludHMubm9kZS5hZGREZXBlbmRlbmN5KHByb3BzLnNoYXJlZC5zM3ZwY0VuZHBvaW50KVxuICAgIH1cblxuICAgIC8vIFRoZW4sIHJldHJpZXZlIHRoZSBQcml2YXRlIElQIEFkZHJlc3NlcyBmb3IgZWFjaCBFTkkgb2YgdGhlIFZQQyBFbmRwb2ludFxuICAgIGxldCBzM0lQczogSXBUYXJnZXRbXSA9IFtdO1xuICAgIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCB2cGMuYXZhaWxhYmlsaXR5Wm9uZXMubGVuZ3RoOyBpbmRleCsrKSB7XG5cbiAgICAgICAgY29uc3Qgc2RrQ2FsbDogQXdzU2RrQ2FsbCA9IHtcbiAgICAgICAgICAgIHNlcnZpY2U6ICdFQzInLFxuICAgICAgICAgICAgYWN0aW9uOiAnZGVzY3JpYmVOZXR3b3JrSW50ZXJmYWNlcycsXG4gICAgICAgICAgICBvdXRwdXRQYXRoczogW2BOZXR3b3JrSW50ZXJmYWNlcy4wLlByaXZhdGVJcEFkZHJlc3NgXSxcbiAgICAgICAgICAgIHBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICAgICBOZXR3b3JrSW50ZXJmYWNlSWRzOiBbdnBjRW5kcG9pbnRzLmdldFJlc3BvbnNlRmllbGQoYFZwY0VuZHBvaW50cy4wLk5ldHdvcmtJbnRlcmZhY2VJZHMuJHtpbmRleH1gKV0sXG4gICAgICAgICAgICAgICAgRmlsdGVyczogW1xuICAgICAgICAgICAgICAgICAgICB7IE5hbWU6IFwiaW50ZXJmYWNlLXR5cGVcIiwgVmFsdWVzOiBbXCJ2cGNfZW5kcG9pbnRcIl0gfVxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcGh5c2ljYWxSZXNvdXJjZUlkOiBjZGsuY3VzdG9tX3Jlc291cmNlcy5QaHlzaWNhbFJlc291cmNlSWQub2YoJ2Rlc2NyaWJlTmV0d29ya0ludGVyZmFjZXMnKSwgLy9QaHlzaWNhbFJlc291cmNlSWQub2YoJ2Rlc2NyaWJlTmV0d29ya0ludGVyZmFjZXMnKSxcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGVuaSA9IG5ldyBBd3NDdXN0b21SZXNvdXJjZShcbiAgICAgICAgICAgIHRoaXMsXG4gICAgICAgICAgICBgRGVzY3JpYmVOZXR3b3JrSW50ZXJmYWNlcy0ke2luZGV4fWAsXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgb25DcmVhdGU6IHNka0NhbGwsXG4gICAgICAgICAgICAgICAgb25VcGRhdGU6IHNka0NhbGwsXG4gICAgICAgICAgICAgICAgcG9saWN5OiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXRlbWVudHM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHsgXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYWN0aW9uczogW1wiZWMyOkRlc2NyaWJlTmV0d29ya0ludGVyZmFjZXNcIl0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdIC8vW2Bhcm46YXdzOmVjMjoke3Byb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiB9OiR7cHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVH06bmV0d29yay1pbnRlcmZhY2UvJHtlbmlJZH1gXVxuICAgICAgICAgICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBzM0lQcy5wdXNoKG5ldyBJcFRhcmdldChjZGsuVG9rZW4uYXNTdHJpbmcoZW5pLmdldFJlc3BvbnNlRmllbGQoYE5ldHdvcmtJbnRlcmZhY2VzLjAuUHJpdmF0ZUlwQWRkcmVzc2ApKSwgNDQzKSlcbiAgICB9XG5cblxuICAgIC8vIFdlYnNpdGUgQUxCIFxuICAgIGNvbnN0IGFsYlNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ1dlYnNpdGVBcHBsaWNhdGlvbkxvYWRCYWxhbmNlclNHJywge1xuICAgICAgICAgICAgdnBjOiBwcm9wcy5zaGFyZWQudnBjLFxuICAgICAgICAgICAgYWxsb3dBbGxPdXRib3VuZDogZmFsc2VcbiAgICAgICAgfSk7XG5cbiAgICBhbGJTZWN1cml0eUdyb3VwLmFkZEluZ3Jlc3NSdWxlKFxuICAgICAgICBlYzIuUGVlci5hbnlJcHY0KCksXG4gICAgICAgIGVjMi5Qb3J0LnRjcCg0NDMpXG4gICAgKTtcblxuICAgIGFsYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoXG4gICAgICAgIGVjMi5QZWVyLmFueUlwdjQoKSxcbiAgICAgICAgZWMyLlBvcnQudGNwKDgwKVxuICAgICk7XG5cbiAgICBhbGJTZWN1cml0eUdyb3VwLmFkZEVncmVzc1J1bGUoXG4gICAgICAgIGVjMi5QZWVyLmlwdjQocHJvcHMuc2hhcmVkLnZwYy52cGNDaWRyQmxvY2spLFxuICAgICAgICBlYzIuUG9ydC50Y3AoNDQzKVxuICAgICk7XG5cbiAgICBjb25zdCBsb2FkQmFsYW5jZXIgPSBuZXcgZWxidjIuQXBwbGljYXRpb25Mb2FkQmFsYW5jZXIodGhpcywgJ0FMQicsIHtcbiAgICAgICAgdnBjOiBwcm9wcy5zaGFyZWQudnBjLFxuICAgICAgICBpbnRlcm5ldEZhY2luZzogZmFsc2UsXG4gICAgICAgIHNlY3VyaXR5R3JvdXA6IGFsYlNlY3VyaXR5R3JvdXAsXG4gICAgICAgIHZwY1N1Ym5ldHM6IHByb3BzLnNoYXJlZC52cGMuc2VsZWN0U3VibmV0cyh7XG4gICAgICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX1dJVEhfRUdSRVNTXG4gICAgICAgICAgfSksXG4gICAgfSk7XG5cbiAgICBjb25zdCBhbGJMb2dCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdBTEJMb2dnaW5nQnVja2V0Jywge1xuXG4gICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXG4gICAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxuXG4gICAgfSk7XG4gICAgbG9hZEJhbGFuY2VyLmxvZ0FjY2Vzc0xvZ3MoYWxiTG9nQnVja2V0KVxuXG4gICAgLy8gQWRkaW5nIExpc3RlbmVyXG4gICAgLy8gVXNpbmcgQUNNIGNlcnRpZmljYXRlIEFSTiBwYXNzZWQgaW4gdGhyb3VnaCBwcm9wcy9jb25maWcgZmlsZSBcbiAgICBpZiAocHJvcHMuY29uZmlnLmNlcnRpZmljYXRlKSB7XG4gICAgICAgIGNvbnN0IGFsYkxpc3RlbmVyID0gbG9hZEJhbGFuY2VyLmFkZExpc3RlbmVyKCdBTEJMSFRUUFMnLFxuICAgICAgICB7XG4gICAgICAgICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQUyxcbiAgICAgICAgICAgIHBvcnQ6IDQ0MyxcbiAgICAgICAgICAgIGNlcnRpZmljYXRlczogW2VsYnYyLkxpc3RlbmVyQ2VydGlmaWNhdGUuZnJvbUFybihwcm9wcy5jb25maWcuY2VydGlmaWNhdGUpXSxcbiAgICAgICAgICAgIHNzbFBvbGljeTogZWxidjIuU3NsUG9saWN5LlJFQ09NTUVOREVEX1RMU1xuICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgLy8gQWRkIEFMQiB0YXJnZXRzXG4gICAgICAgIGFsYkxpc3RlbmVyLmFkZFRhcmdldHMoJ3MzVGFyZ2V0R3JvdXAnLFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHBvcnQ6IDQ0MyxcbiAgICAgICAgICAgICAgICBwcm90b2NvbDogZWxidjIuQXBwbGljYXRpb25Qcm90b2NvbC5IVFRQUyxcbiAgICAgICAgICAgICAgICB0YXJnZXRzOiBzM0lQcyxcbiAgICAgICAgICAgICAgICBoZWFsdGhDaGVjazoge1xuICAgICAgICAgICAgICAgICAgICBwcm90b2NvbDogZWxidjIuUHJvdG9jb2wuSFRUUFMsXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6ICcvJyxcbiAgICAgICAgICAgICAgICAgICAgaGVhbHRoeUh0dHBDb2RlczogJzMwNyw0MDUnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBcbiAgICAgICAgLy8gVGhlIEFtYXpvbiBTMyBQcml2YXRlTGluayBFbmRwb2ludCBpcyBhIFJFU1QgQVBJIEVuZHBvaW50LCB3aGljaCBtZWFucyB0aGF0IHRyYWlsaW5nIHNsYXNoIHJlcXVlc3RzIHdpbGwgcmV0dXJuIFhNTCBkaXJlY3RvcnkgbGlzdGluZ3MgYnkgZGVmYXVsdC5cbiAgICAgICAgLy8gVG8gd29yayBhcm91bmQgdGhpcywgeW914oCZbGwgY3JlYXRlIGEgcmVkaXJlY3QgcnVsZSB0byBwb2ludCBhbGwgcmVxdWVzdHMgZW5kaW5nIGluIGEgdHJhaWxpbmcgc2xhc2ggdG8gaW5kZXguaHRtbC5cbiAgICAgICAgYWxiTGlzdGVuZXIuYWRkQWN0aW9uKCdwcml2YXRlTGlua1JlZGlyZWN0UGF0aCcsIHtcbiAgICAgICAgICAgIHByaW9yaXR5OiAxLFxuICAgICAgICAgICAgY29uZGl0aW9uczogW1xuICAgICAgICAgICAgICBlbGJ2Mi5MaXN0ZW5lckNvbmRpdGlvbi5wYXRoUGF0dGVybnMoWycvJ10pLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGFjdGlvbjogZWxidjIuTGlzdGVuZXJBY3Rpb24ucmVkaXJlY3Qoe1xuICAgICAgICAgICAgICBwb3J0OiAnI3twb3J0fScsXG4gICAgICAgICAgICAgIHBhdGg6ICcvaW5kZXguaHRtbCcsIC8vJy8je3BhdGh9aW5kZXguaHRtbCcgLy9cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEFsbG93IGFjY2VzcyB0byB3ZWJzaXRlIGJ1Y2tldCBmcm9tIFMzIEVuZHBvaW50c1xuICAgIHByb3BzLndlYnNpdGVCdWNrZXQucG9saWN5Py5kb2N1bWVudC5hZGRTdGF0ZW1lbnRzKFxuICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCcsIFwiczM6TGlzdCpcIl0sXG4gICAgICAgICAgICBwcmluY2lwYWxzOiBbbmV3IGlhbS5BbnlQcmluY2lwYWwoKV0sXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtwcm9wcy53ZWJzaXRlQnVja2V0LmJ1Y2tldEFybiwgYCR7cHJvcHMud2Vic2l0ZUJ1Y2tldC5idWNrZXRBcm59LypgXSxcbiAgICAgICAgICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgICAgICAgICAgICBcIlN0cmluZ0VxdWFsc1wiOiB7IFwiYXdzOlNvdXJjZVZwY2VcIjogdnBjRW5kcG9pbnRzLmdldFJlc3BvbnNlRmllbGQoYFZwY0VuZHBvaW50cy4wLlZwY0VuZHBvaW50SWRgKSB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgKTtcblxuICAgIC8vICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICAgIC8vIE91dHB1dHNcbiAgICAvLyAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkRvbWFpblwiLCB7XG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHtwcm9wcy5jb25maWcuZG9tYWlufWAsXG4gICAgfSk7XG4gICAgXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJMb2FkQmFsYW5jZXJETlNcIiwge1xuICAgICAgdmFsdWU6IGxvYWRCYWxhbmNlci5sb2FkQmFsYW5jZXJEbnNOYW1lLFxuICAgIH0pO1xuICAgIFxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIGFsYlNlY3VyaXR5R3JvdXAsIFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUVDMjNcIixcbiAgICAgICAgICByZWFzb246IFwiV2Vic2l0ZSBBcHBsaWNhdGlvbiBMb2FkIEJhbGFuY2VyIGNhbiBiZSBvcGVuIHRvIDAuMC4wLjAvMCBvbiBwb3J0cyA4MCAmIDQ0My5cIixcbiAgICAgICAgfSxcbiAgICAgIF1cbiAgICApO1xuICAgIFxuICAgIE5hZ1N1cHByZXNzaW9ucy5hZGRSZXNvdXJjZVN1cHByZXNzaW9ucyhcbiAgICAgIHByb3BzLndlYnNpdGVCdWNrZXQsIFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLVM1XCIsXG4gICAgICAgICAgcmVhc29uOiBcIkJ1Y2tldCBoYXMgY29uZGl0aW9ucyB0byBvbmx5IGFsbG93IGFjY2VzcyBmcm9tIFMzIFZQQyBFbmRwb2ludHMuXCIsXG4gICAgICAgIH0sXG4gICAgICBdXG4gICAgKTtcbiAgICBcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoXG4gICAgICBhbGJMb2dCdWNrZXQsIFxuICAgICAgW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLVMxXCIsXG4gICAgICAgICAgcmVhc29uOiBcIkJ1Y2tldCBpcyB0aGUgc2VydmVyIGFjY2VzcyBsb2dzIGJ1Y2tldCBmb3IgQUxCLlwiLFxuICAgICAgICB9LFxuICAgICAgXVxuICAgICk7XG4gICAgXG4gICAgXG4gICAgXG4gIH1cbn0iXX0=