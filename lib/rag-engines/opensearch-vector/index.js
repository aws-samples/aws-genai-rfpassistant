"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenSearchVector = void 0;
const ec2 = require("aws-cdk-lib/aws-ec2");
const oss = require("aws-cdk-lib/aws-opensearchserverless");
const constructs_1 = require("constructs");
const utils_1 = require("../../shared/utils");
const create_opensearch_workspace_1 = require("./create-opensearch-workspace");
class OpenSearchVector extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const collectionName = utils_1.Utils.getName(props.config, "genaichatbot-workspaces");
        const sg = new ec2.SecurityGroup(this, "SecurityGroup", {
            vpc: props.shared.vpc,
        });
        sg.addIngressRule(ec2.Peer.ipv4(props.shared.vpc.vpcCidrBlock), ec2.Port.tcp(443));
        const cfnVpcEndpoint = new oss.CfnVpcEndpoint(this, "VpcEndpoint", {
            name: utils_1.Utils.getName(props.config, "genaichatbot-vpce"),
            // Make sure the subnets are not in the same availability zone.
            subnetIds: props.shared.vpc.selectSubnets({
                onePerAz: true,
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
            }).subnetIds,
            vpcId: props.shared.vpc.vpcId,
            securityGroupIds: [sg.securityGroupId],
        });
        const cfnNetworkSecurityPolicy = new oss.CfnSecurityPolicy(this, "NetworkSecurityPolicy", {
            name: utils_1.Utils.getName(props.config, "genaichatbot-network-policy"),
            type: "network",
            policy: JSON.stringify([
                {
                    Rules: [
                        {
                            ResourceType: "collection",
                            Resource: [`collection/${collectionName}`],
                        },
                    ],
                    AllowFromPublic: false,
                    SourceVPCEs: [cfnVpcEndpoint.attrId],
                },
            ]).replace(/(\r\n|\n|\r)/gm, ""),
        });
        cfnNetworkSecurityPolicy.node.addDependency(cfnVpcEndpoint);
        const cfnEncryptionSecurityPolicy = new oss.CfnSecurityPolicy(this, "EncryptionSecurityPolicy", {
            name: utils_1.Utils.getName(props.config, "genaichatbot-encryption-policy", 32),
            type: "encryption",
            policy: JSON.stringify({
                Rules: [
                    {
                        ResourceType: "collection",
                        Resource: [`collection/${collectionName}`],
                    },
                ],
                AWSOwnedKey: true,
            }).replace(/(\r\n|\n|\r)/gm, ""),
        });
        cfnEncryptionSecurityPolicy.node.addDependency(cfnNetworkSecurityPolicy);
        const cfnCollection = new oss.CfnCollection(this, "OpenSearchCollection", {
            name: collectionName,
            type: "VECTORSEARCH",
        });
        const createWorkflow = new create_opensearch_workspace_1.CreateOpenSearchWorkspace(this, "CreateOpenSearchWorkspace", {
            config: props.config,
            shared: props.shared,
            ragDynamoDBTables: props.ragDynamoDBTables,
            openSearchCollectionName: collectionName,
            openSearchCollection: cfnCollection,
            collectionEndpoint: cfnCollection.attrCollectionEndpoint,
        });
        cfnCollection.node.addDependency(cfnNetworkSecurityPolicy);
        cfnCollection.node.addDependency(cfnEncryptionSecurityPolicy);
        this.addToAccessPolicyIntl(props.config, collectionName, "create-workflow", [createWorkflow.createWorkspaceRole?.roleArn], [
            "aoss:CreateIndex",
            "aoss:DeleteIndex",
            "aoss:UpdateIndex",
            "aoss:DescribeIndex",
        ]);
        this.addToAccessPolicy = (name, principal, permission) => {
            this.addToAccessPolicyIntl(props.config, collectionName, name, principal, permission);
        };
        this.createOpenSearchWorkspaceWorkflow = createWorkflow.stateMachine;
        this.openSearchCollectionEndpoint = cfnCollection.attrCollectionEndpoint;
        this.openSearchCollection = cfnCollection;
    }
    addToAccessPolicyIntl(config, collectionName, name, principal, permission) {
        new oss.CfnAccessPolicy(this, `AccessPolicy-${name}`, {
            name: utils_1.Utils.getName(config, `access-policy-${name}`, 32),
            type: "data",
            policy: JSON.stringify([
                {
                    Rules: [
                        {
                            ResourceType: "index",
                            Resource: [`index/${collectionName}/*`],
                            Permission: permission,
                        },
                    ],
                    Principal: principal,
                },
            ]).replace(/(\r\n|\n|\r)/gm, ""),
        });
    }
}
exports.OpenSearchVector = OpenSearchVector;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwyQ0FBMkM7QUFDM0MsNERBQTREO0FBRzVELDJDQUF1QztBQUd2Qyw4Q0FBMkM7QUFFM0MsK0VBQTBFO0FBUTFFLE1BQWEsZ0JBQWlCLFNBQVEsc0JBQVM7SUFXN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE0QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sY0FBYyxHQUFHLGFBQUssQ0FBQyxPQUFPLENBQ2xDLEtBQUssQ0FBQyxNQUFNLEVBQ1oseUJBQXlCLENBQzFCLENBQUM7UUFFRixNQUFNLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN0RCxHQUFHLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHO1NBQ3RCLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxjQUFjLENBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEVBQzVDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUNsQixDQUFDO1FBRUYsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDakUsSUFBSSxFQUFFLGFBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxtQkFBbUIsQ0FBQztZQUN0RCwrREFBK0Q7WUFDL0QsU0FBUyxFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQztnQkFDeEMsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsVUFBVSxFQUFFLEdBQUcsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCO2FBQzVDLENBQUMs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Q0FBQyxxQkFBcUIsQ0FDeEIsS0FBSyxDQUFDLE1BQU0sRUFDWixjQUFjLEVBQ2QsSUFBSSxFQUNKLFNBQVMsRUFDVCxVQUFVLENBQ1gsQ0FBQztRQUNKLENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxpQ0FBaUMsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDO1FBQ3JFLElBQUksQ0FBQyw0QkFBNEIsR0FBRyxhQUFhLENBQUMsc0JBQXNCLENBQUM7UUFDekUsSUFBSSxDQUFDLG9CQUFvQixHQUFHLGFBQWEsQ0FBQztJQUM1QyxDQUFDO0lBRU8scUJBQXFCLENBQzNCLE1BQW9CLEVBQ3BCLGNBQXNCLEVBQ3RCLElBQVksRUFDWixTQUFpQyxFQUNqQyxVQUFvQjtRQUVwQixJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLGdCQUFnQixJQUFJLEVBQUUsRUFBRTtZQUNwRCxJQUFJLEVBQUUsYUFBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN4RCxJQUFJLEVBQUUsTUFBTTtZQUNaLE1BQU0sRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNyQjtvQkFDRSxLQUFLLEVBQUU7d0JBQ0w7NEJBQ0UsWUFBWSxFQUFFLE9BQU87NEJBQ3JCLFFBQVEsRUFBRSxDQUFDLFNBQVMsY0FBYyxJQUFJLENBQUM7NEJBQ3ZDLFVBQVUsRUFBRSxVQUFVO3lCQUN2QjtxQkFDRjtvQkFDRCxTQUFTLEVBQUUsU0FBUztpQkFDckI7YUFDRixDQUFDLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsQ0FBQztTQUNqQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEvSkQsNENBK0pDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZWMyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZWMyXCI7XG5pbXBvcnQgKiBhcyBvc3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1vcGVuc2VhcmNoc2VydmVybGVzc1wiO1xuaW1wb3J0ICogYXMgc2ZuIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9uc1wiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4uLy4uL3NoYXJlZFwiO1xuaW1wb3J0IHsgU3lzdGVtQ29uZmlnIH0gZnJvbSBcIi4uLy4uL3NoYXJlZC90eXBlc1wiO1xuaW1wb3J0IHsgVXRpbHMgfSBmcm9tIFwiLi4vLi4vc2hhcmVkL3V0aWxzXCI7XG5pbXBvcnQgeyBSYWdEeW5hbW9EQlRhYmxlcyB9IGZyb20gXCIuLi9yYWctZHluYW1vZGItdGFibGVzXCI7XG5pbXBvcnQgeyBDcmVhdGVPcGVuU2VhcmNoV29ya3NwYWNlIH0gZnJvbSBcIi4vY3JlYXRlLW9wZW5zZWFyY2gtd29ya3NwYWNlXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3BlblNlYXJjaFZlY3RvclByb3BzIHtcbiAgcmVhZG9ubHkgY29uZmlnOiBTeXN0ZW1Db25maWc7XG4gIHJlYWRvbmx5IHNoYXJlZDogU2hhcmVkO1xuICByZWFkb25seSByYWdEeW5hbW9EQlRhYmxlczogUmFnRHluYW1vREJUYWJsZXM7XG59XG5cbmV4cG9ydCBjbGFzcyBPcGVuU2VhcmNoVmVjdG9yIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IG9wZW5TZWFyY2hDb2xsZWN0aW9uTmFtZTogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgb3BlblNlYXJjaENvbGxlY3Rpb25FbmRwb2ludDogc3RyaW5nO1xuICBwdWJsaWMgcmVhZG9ubHkgb3BlblNlYXJjaENvbGxlY3Rpb246IG9zcy5DZm5Db2xsZWN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgY3JlYXRlT3BlblNlYXJjaFdvcmtzcGFjZVdvcmtmbG93OiBzZm4uU3RhdGVNYWNoaW5lO1xuICBwdWJsaWMgYWRkVG9BY2Nlc3NQb2xpY3k6IChcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgcHJpbmNpcGFsOiAoc3RyaW5nIHwgdW5kZWZpbmVkKVtdLFxuICAgIHBlcm1pc3Npb246IHN0cmluZ1tdXG4gICkgPT4gdm9pZDtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogT3BlblNlYXJjaFZlY3RvclByb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcblxuICAgIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gVXRpbHMuZ2V0TmFtZShcbiAgICAgIHByb3BzLmNvbmZpZyxcbiAgICAgIFwiZ2VuYWljaGF0Ym90LXdvcmtzcGFjZXNcIlxuICAgICk7XG5cbiAgICBjb25zdCBzZyA9IG5ldyBlYzIuU2VjdXJpdHlHcm91cCh0aGlzLCBcIlNlY3VyaXR5R3JvdXBcIiwge1xuICAgICAgdnBjOiBwcm9wcy5zaGFyZWQudnBjLFxuICAgIH0pO1xuXG4gICAgc2cuYWRkSW5ncmVzc1J1bGUoXG4gICAgICBlYzIuUGVlci5pcHY0KHByb3BzLnNoYXJlZC52cGMudnBjQ2lkckJsb2NrKSxcbiAgICAgIGVjMi5Qb3J0LnRjcCg0NDMpXG4gICAgKTtcblxuICAgIGNvbnN0IGNmblZwY0VuZHBvaW50ID0gbmV3IG9zcy5DZm5WcGNFbmRwb2ludCh0aGlzLCBcIlZwY0VuZHBvaW50XCIsIHtcbiAgICAgIG5hbWU6IFV0aWxzLmdldE5hbWUocHJvcHMuY29uZmlnLCBcImdlbmFpY2hhdGJvdC12cGNlXCIpLFxuICAgICAgLy8gTWFrZSBzdXJlIHRoZSBzdWJuZXRzIGFyZSBub3QgaW4gdGhlIHNhbWUgYXZhaWxhYmlsaXR5IHpvbmUuXG4gICAgICBzdWJuZXRJZHM6IHByb3BzLnNoYXJlZC52cGMuc2VsZWN0U3VibmV0cyh7XG4gICAgICAgIG9uZVBlckF6OiB0cnVlLFxuICAgICAgICBzdWJuZXRUeXBlOiBlYzIuU3VibmV0VHlwZS5QUklWQVRFX0lTT0xBVEVELFxuICAgICAgfSkuc3VibmV0SWRzLFxuICAgICAgdnBjSWQ6IHByb3BzLnNoYXJlZC52cGMudnBjSWQsXG4gICAgICBzZWN1cml0eUdyb3VwSWRzOiBbc2cuc2VjdXJpdHlHcm91cElkXSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGNmbk5ldHdvcmtTZWN1cml0eVBvbGljeSA9IG5ldyBvc3MuQ2ZuU2VjdXJpdHlQb2xpY3koXG4gICAgICB0aGlzLFxuICAgICAgXCJOZXR3b3JrU2VjdXJpdHlQb2xpY3lcIixcbiAgICAgIHtcbiAgICAgICAgbmFtZTogVXRpbHMuZ2V0TmFtZShwcm9wcy5jb25maWcsIFwiZ2VuYWljaGF0Ym90LW5ldHdvcmstcG9saWN5XCIpLFxuICAgICAgICB0eXBlOiBcIm5ldHdvcmtcIixcbiAgICAgICAgcG9saWN5OiBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgICAge1xuICAgICAgICAgICAgUnVsZXM6IFtcbiAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIFJlc291cmNlVHlwZTogXCJjb2xsZWN0aW9uXCIsXG4gICAgICAgICAgICAgICAgUmVzb3VyY2U6IFtgY29sbGVjdGlvbi8ke2NvbGxlY3Rpb25OYW1lfWBdLFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIEFsbG93RnJvbVB1YmxpYzogZmFsc2UsXG4gICAgICAgICAgICBTb3VyY2VWUENFczogW2NmblZwY0VuZHBvaW50LmF0dHJJZF0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSkucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyKS9nbSwgXCJcIiksXG4gICAgICB9XG4gICAgKTtcblxuICAgIGNmbk5ldHdvcmtTZWN1cml0eVBvbGljeS5ub2RlLmFkZERlcGVuZGVuY3koY2ZuVnBjRW5kcG9pbnQpO1xuXG4gICAgY29uc3QgY2ZuRW5jcnlwdGlvblNlY3VyaXR5UG9saWN5ID0gbmV3IG9zcy5DZm5TZWN1cml0eVBvbGljeShcbiAgICAgIHRoaXMsXG4gICAgICBcIkVuY3J5cHRpb25TZWN1cml0eVBvbGljeVwiLFxuICAgICAge1xuICAgICAgICBuYW1lOiBVdGlscy5nZXROYW1lKHByb3BzLmNvbmZpZywgXCJnZW5haWNoYXRib3QtZW5jcnlwdGlvbi1wb2xpY3lcIiwgMzIpLFxuICAgICAgICB0eXBlOiBcImVuY3J5cHRpb25cIixcbiAgICAgICAgcG9saWN5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgUnVsZXM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgUmVzb3VyY2VUeXBlOiBcImNvbGxlY3Rpb25cIixcbiAgICAgICAgICAgICAgUmVzb3VyY2U6IFtgY29sbGVjdGlvbi8ke2NvbGxlY3Rpb25OYW1lfWBdLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIEFXU093bmVkS2V5OiB0cnVlLFxuICAgICAgICB9KS5yZXBsYWNlKC8oXFxyXFxufFxcbnxcXHIpL2dtLCBcIlwiKSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgY2ZuRW5jcnlwdGlvblNlY3VyaXR5UG9saWN5Lm5vZGUuYWRkRGVwZW5kZW5jeShjZm5OZXR3b3JrU2VjdXJpdHlQb2xpY3kpO1xuXG4gICAgY29uc3QgY2ZuQ29sbGVjdGlvbiA9IG5ldyBvc3MuQ2ZuQ29sbGVjdGlvbih0aGlzLCBcIk9wZW5TZWFyY2hDb2xsZWN0aW9uXCIsIHtcbiAgICAgIG5hbWU6IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgdHlwZTogXCJWRUNUT1JTRUFSQ0hcIixcbiAgICB9KTtcblxuICAgIGNvbnN0IGNyZWF0ZVdvcmtmbG93ID0gbmV3IENyZWF0ZU9wZW5TZWFyY2hXb3Jrc3BhY2UoXG4gICAgICB0aGlzLFxuICAgICAgXCJDcmVhdGVPcGVuU2VhcmNoV29ya3NwYWNlXCIsXG4gICAgICB7XG4gICAgICAgIGNvbmZpZzogcHJvcHMuY29uZmlnLFxuICAgICAgICBzaGFyZWQ6IHByb3BzLnNoYXJlZCxcbiAgICAgICAgcmFnRHluYW1vREJUYWJsZXM6IHByb3BzLnJhZ0R5bmFtb0RCVGFibGVzLFxuICAgICAgICBvcGVuU2VhcmNoQ29sbGVjdGlvbk5hbWU6IGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBvcGVuU2VhcmNoQ29sbGVjdGlvbjogY2ZuQ29sbGVjdGlvbixcbiAgICAgICAgY29sbGVjdGlvbkVuZHBvaW50OiBjZm5Db2xsZWN0aW9uLmF0dHJDb2xsZWN0aW9uRW5kcG9pbnQsXG4gICAgICB9XG4gICAgKTtcblxuICAgIGNmbkNvbGxlY3Rpb24ubm9kZS5hZGREZXBlbmRlbmN5KGNmbk5ldHdvcmtTZWN1cml0eVBvbGljeSk7XG4gICAgY2ZuQ29sbGVjdGlvbi5ub2RlLmFkZERlcGVuZGVuY3koY2ZuRW5jcnlwdGlvblNlY3VyaXR5UG9saWN5KTtcblxuICAgIHRoaXMuYWRkVG9BY2Nlc3NQb2xpY3lJbnRsKFxuICAgICAgcHJvcHMuY29uZmlnLFxuICAgICAgY29sbGVjdGlvbk5hbWUsXG4gICAgICBcImNyZWF0ZS13b3JrZmxvd1wiLFxuICAgICAgW2NyZWF0ZVdvcmtmbG93LmNyZWF0ZVdvcmtzcGFjZVJvbGU/LnJvbGVBcm5dLFxuICAgICAgW1xuICAgICAgICBcImFvc3M6Q3JlYXRlSW5kZXhcIixcbiAgICAgICAgXCJhb3NzOkRlbGV0ZUluZGV4XCIsXG4gICAgICAgIFwiYW9zczpVcGRhdGVJbmRleFwiLFxuICAgICAgICBcImFvc3M6RGVzY3JpYmVJbmRleFwiLFxuICAgICAgXVxuICAgICk7XG5cbiAgICB0aGlzLmFkZFRvQWNjZXNzUG9saWN5ID0gKFxuICAgICAgbmFtZTogc3RyaW5nLFxuICAgICAgcHJpbmNpcGFsOiAoc3RyaW5nIHwgdW5kZWZpbmVkKVtdLFxuICAgICAgcGVybWlzc2lvbjogc3RyaW5nW11cbiAgICApID0+IHtcbiAgICAgIHRoaXMuYWRkVG9BY2Nlc3NQb2xpY3lJbnRsKFxuICAgICAgICBwcm9wcy5jb25maWcsXG4gICAgICAgIGNvbGxlY3Rpb25OYW1lLFxuICAgICAgICBuYW1lLFxuICAgICAgICBwcmluY2lwYWwsXG4gICAgICAgIHBlcm1pc3Npb25cbiAgICAgICk7XG4gICAgfTtcblxuICAgIHRoaXMuY3JlYXRlT3BlblNlYXJjaFdvcmtzcGFjZVdvcmtmbG93ID0gY3JlYXRlV29ya2Zsb3cuc3RhdGVNYWNoaW5lO1xuICAgIHRoaXMub3BlblNlYXJjaENvbGxlY3Rpb25FbmRwb2ludCA9IGNmbkNvbGxlY3Rpb24uYXR0ckNvbGxlY3Rpb25FbmRwb2ludDtcbiAgICB0aGlzLm9wZW5TZWFyY2hDb2xsZWN0aW9uID0gY2ZuQ29sbGVjdGlvbjtcbiAgfVxuXG4gIHByaXZhdGUgYWRkVG9BY2Nlc3NQb2xpY3lJbnRsKFxuICAgIGNvbmZpZzogU3lzdGVtQ29uZmlnLFxuICAgIGNvbGxlY3Rpb25OYW1lOiBzdHJpbmcsXG4gICAgbmFtZTogc3RyaW5nLFxuICAgIHByaW5jaXBhbDogKHN0cmluZyB8IHVuZGVmaW5lZClbXSxcbiAgICBwZXJtaXNzaW9uOiBzdHJpbmdbXVxuICApIHtcbiAgICBuZXcgb3NzLkNmbkFjY2Vzc1BvbGljeSh0aGlzLCBgQWNjZXNzUG9saWN5LSR7bmFtZX1gLCB7XG4gICAgICBuYW1lOiBVdGlscy5nZXROYW1lKGNvbmZpZywgYGFjY2Vzcy1wb2xpY3ktJHtuYW1lfWAsIDMyKSxcbiAgICAgIHR5cGU6IFwiZGF0YVwiLFxuICAgICAgcG9saWN5OiBKU09OLnN0cmluZ2lmeShbXG4gICAgICAgIHtcbiAgICAgICAgICBSdWxlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBSZXNvdXJjZVR5cGU6IFwiaW5kZXhcIixcbiAgICAgICAgICAgICAgUmVzb3VyY2U6IFtgaW5kZXgvJHtjb2xsZWN0aW9uTmFtZX0vKmBdLFxuICAgICAgICAgICAgICBQZXJtaXNzaW9uOiBwZXJtaXNzaW9uLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICAgIFByaW5jaXBhbDogcHJpbmNpcGFsLFxuICAgICAgICB9LFxuICAgICAgXSkucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyKS9nbSwgXCJcIiksXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==