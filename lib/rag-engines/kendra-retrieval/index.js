"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KendraRetrieval = void 0;
const cdk = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const create_kendra_workspace_1 = require("./create-kendra-workspace");
const utils_1 = require("../../shared/utils");
const s3 = require("aws-cdk-lib/aws-s3");
const iam = require("aws-cdk-lib/aws-iam");
const kendra = require("aws-cdk-lib/aws-kendra");
class KendraRetrieval extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const createWorkflow = new create_kendra_workspace_1.CreateKendraWorkspace(this, "CreateAuroraWorkspace", {
            config: props.config,
            shared: props.shared,
            ragDynamoDBTables: props.ragDynamoDBTables,
        });
        if (props.config.rag.engines.kendra.createIndex) {
            const indexName = utils_1.Utils.getName(props.config, "genaichatbot-workspaces");
            const logsBucket = new s3.Bucket(this, "LogsBucket", {
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                autoDeleteObjects: true,
                enforceSSL: true,
            });
            const dataBucket = new s3.Bucket(this, "KendraDataBucket", {
                blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                autoDeleteObjects: true,
                enforceSSL: true,
                serverAccessLogsBucket: logsBucket,
            });
            const kendraRole = new iam.Role(this, "KendraRole", {
                assumedBy: new iam.ServicePrincipal("kendra.amazonaws.com"),
            });
            kendraRole.addToPolicy(new iam.PolicyStatement({
                actions: ["logs:*", "cloudwatch:*"],
                resources: ["*"],
            }));
            dataBucket.grantRead(kendraRole);
            const kendraIndex = new kendra.CfnIndex(this, "Index", {
                edition: props.config.rag?.engines.kendra?.enterprise
                    ? "ENTERPRISE_EDITION"
                    : "DEVELOPER_EDITION",
                name: indexName,
                roleArn: kendraRole.roleArn,
                documentMetadataConfigurations: [
                    {
                        name: "workspace_id",
                        type: "STRING_VALUE",
                        search: {
                            displayable: true,
                            facetable: true,
                            searchable: true,
                        },
                    },
                    {
                        name: "document_type",
                        type: "STRING_VALUE",
                        search: {
                            displayable: true,
                            facetable: true,
                            searchable: true,
                        },
                    },
                ],
            });
            const s3DataSource = new kendra.CfnDataSource(this, "KendraS3DataSource", {
                type: "S3",
                name: "KendraS3DataSource",
                indexId: kendraIndex.ref,
                description: "S3 Data Source for Kendra Index",
                dataSourceConfiguration: {
                    s3Configuration: {
                        bucketName: dataBucket.bucketName,
                        inclusionPrefixes: ["documents"],
                        documentsMetadataConfiguration: {
                            s3Prefix: "metadata",
                        },
                    },
                },
                roleArn: kendraRole.roleArn,
            });
            kendraRole.addToPolicy(new iam.PolicyStatement({
                actions: ["kendra:BatchDeleteDocument"],
                resources: [kendraIndex.attrArn, s3DataSource.attrArn],
            }));
            this.kendraIndex = kendraIndex;
            this.kendraS3DataSource = s3DataSource;
            this.kendraS3DataSourceBucket = dataBucket;
        }
        this.createKendraWorkspaceWorkflow = createWorkflow.stateMachine;
    }
}
exports.KendraRetrieval = KendraRetrieval;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsMkNBQXVDO0FBSXZDLHVFQUFrRTtBQUNsRSw4Q0FBMkM7QUFFM0MseUNBQXlDO0FBQ3pDLDJDQUEyQztBQUMzQyxpREFBaUQ7QUFRakQsTUFBYSxlQUFnQixTQUFRLHNCQUFTO0lBTTVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLGNBQWMsR0FBRyxJQUFJLCtDQUFxQixDQUM5QyxJQUFJLEVBQ0osdUJBQXVCLEVBQ3ZCO1lBQ0UsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3BCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTTtZQUNwQixpQkFBaUIsRUFBRSxLQUFLLENBQUMsaUJBQWlCO1NBQzNDLENBQ0YsQ0FBQztRQUVGLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUU7WUFDL0MsTUFBTSxTQUFTLEdBQUcsYUFBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLHlCQUF5QixDQUFDLENBQUM7WUFFekUsTUFBTSxVQUFVLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7Z0JBQ25ELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO2dCQUNqRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO2dCQUN4QyxpQkFBaUIsRUFBRSxJQUFJO2dCQUN2QixVQUFVLEVBQUUsSUFBSTthQUNqQixDQUFDLENBQUM7WUFFSCxNQUFNLFVBQVUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO2dC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InNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBTaGFyZWQgfSBmcm9tIFwiLi4vLi4vc2hhcmVkXCI7XG5pbXBvcnQgeyBTeXN0ZW1Db25maWcgfSBmcm9tIFwiLi4vLi4vc2hhcmVkL3R5cGVzXCI7XG5pbXBvcnQgeyBSYWdEeW5hbW9EQlRhYmxlcyB9IGZyb20gXCIuLi9yYWctZHluYW1vZGItdGFibGVzXCI7XG5pbXBvcnQgeyBDcmVhdGVLZW5kcmFXb3Jrc3BhY2UgfSBmcm9tIFwiLi9jcmVhdGUta2VuZHJhLXdvcmtzcGFjZVwiO1xuaW1wb3J0IHsgVXRpbHMgfSBmcm9tIFwiLi4vLi4vc2hhcmVkL3V0aWxzXCI7XG5pbXBvcnQgKiBhcyBzZm4gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zXCI7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcbmltcG9ydCAqIGFzIGtlbmRyYSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWtlbmRyYVwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEtlbmRyYVJldHJpZXZhbFByb3BzIHtcbiAgcmVhZG9ubHkgY29uZmlnOiBTeXN0ZW1Db25maWc7XG4gIHJlYWRvbmx5IHNoYXJlZDogU2hhcmVkO1xuICByZWFkb25seSByYWdEeW5hbW9EQlRhYmxlczogUmFnRHluYW1vREJUYWJsZXM7XG59XG5cbmV4cG9ydCBjbGFzcyBLZW5kcmFSZXRyaWV2YWwgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xuICBwdWJsaWMgcmVhZG9ubHkgY3JlYXRlS2VuZHJhV29ya3NwYWNlV29ya2Zsb3c6IHNmbi5TdGF0ZU1hY2hpbmU7XG4gIHB1YmxpYyByZWFkb25seSBrZW5kcmFJbmRleD86IGtlbmRyYS5DZm5JbmRleDtcbiAgcHVibGljIHJlYWRvbmx5IGtlbmRyYVMzRGF0YVNvdXJjZT86IGtlbmRyYS5DZm5EYXRhU291cmNlO1xuICBwdWJsaWMgcmVhZG9ubHkga2VuZHJhUzNEYXRhU291cmNlQnVja2V0PzogczMuQnVja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBLZW5kcmFSZXRyaWV2YWxQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCk7XG5cbiAgICBjb25zdCBjcmVhdGVXb3JrZmxvdyA9IG5ldyBDcmVhdGVLZW5kcmFXb3Jrc3BhY2UoXG4gICAgICB0aGlzLFxuICAgICAgXCJDcmVhdGVBdXJvcmFXb3Jrc3BhY2VcIixcbiAgICAgIHtcbiAgICAgICAgY29uZmlnOiBwcm9wcy5jb25maWcsXG4gICAgICAgIHNoYXJlZDogcHJvcHMuc2hhcmVkLFxuICAgICAgICByYWdEeW5hbW9EQlRhYmxlczogcHJvcHMucmFnRHluYW1vREJUYWJsZXMsXG4gICAgICB9XG4gICAgKTtcblxuICAgIGlmIChwcm9wcy5jb25maWcucmFnLmVuZ2luZXMua2VuZHJhLmNyZWF0ZUluZGV4KSB7XG4gICAgICBjb25zdCBpbmRleE5hbWUgPSBVdGlscy5nZXROYW1lKHByb3BzLmNvbmZpZywgXCJnZW5haWNoYXRib3Qtd29ya3NwYWNlc1wiKTtcblxuICAgICAgY29uc3QgbG9nc0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgXCJMb2dzQnVja2V0XCIsIHtcbiAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgZGF0YUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgXCJLZW5kcmFEYXRhQnVja2V0XCIsIHtcbiAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICAgIGVuZm9yY2VTU0w6IHRydWUsXG4gICAgICAgIHNlcnZlckFjY2Vzc0xvZ3NCdWNrZXQ6IGxvZ3NCdWNrZXQsXG4gICAgICB9KTtcblxuICAgICAgY29uc3Qga2VuZHJhUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCBcIktlbmRyYVJvbGVcIiwge1xuICAgICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbChcImtlbmRyYS5hbWF6b25hd3MuY29tXCIpLFxuICAgICAgfSk7XG5cbiAgICAgIGtlbmRyYVJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBhY3Rpb25zOiBbXCJsb2dzOipcIiwgXCJjbG91ZHdhdGNoOipcIl0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxuICAgICAgICB9KVxuICAgICAgKTtcblxuICAgICAgZGF0YUJ1Y2tldC5ncmFudFJlYWQoa2VuZHJhUm9sZSk7XG5cbiAgICAgIGNvbnN0IGtlbmRyYUluZGV4ID0gbmV3IGtlbmRyYS5DZm5JbmRleCh0aGlzLCBcIkluZGV4XCIsIHtcbiAgICAgICAgZWRpdGlvbjogcHJvcHMuY29uZmlnLnJhZz8uZW5naW5lcy5rZW5kcmE/LmVudGVycHJpc2VcbiAgICAgICAgICA/IFwiRU5URVJQUklTRV9FRElUSU9OXCJcbiAgICAgICAgICA6IFwiREVWRUxPUEVSX0VESVRJT05cIixcbiAgICAgICAgbmFtZTogaW5kZXhOYW1lLFxuICAgICAgICByb2xlQXJuOiBrZW5kcmFSb2xlLnJvbGVBcm4sXG4gICAgICAgIGRvY3VtZW50TWV0YWRhdGFDb25maWd1cmF0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIG5hbWU6IFwid29ya3NwYWNlX2lkXCIsXG4gICAgICAgICAgICB0eXBlOiBcIlNUUklOR19WQUxVRVwiLFxuICAgICAgICAgICAgc2VhcmNoOiB7XG4gICAgICAgICAgICAgIGRpc3BsYXlhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICBmYWNldGFibGU6IHRydWUsXG4gICAgICAgICAgICAgIHNlYXJjaGFibGU6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgbmFtZTogXCJkb2N1bWVudF90eXBlXCIsXG4gICAgICAgICAgICB0eXBlOiBcIlNUUklOR19WQUxVRVwiLFxuICAgICAgICAgICAgc2VhcmNoOiB7XG4gICAgICAgICAgICAgIGRpc3BsYXlhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICBmYWNldGFibGU6IHRydWUsXG4gICAgICAgICAgICAgIHNlYXJjaGFibGU6IHRydWUsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KTtcblxuICAgICAgY29uc3QgczNEYXRhU291cmNlID0gbmV3IGtlbmRyYS5DZm5EYXRhU291cmNlKFxuICAgICAgICB0aGlzLFxuICAgICAgICBcIktlbmRyYVMzRGF0YVNvdXJjZVwiLFxuICAgICAgICB7XG4gICAgICAgICAgdHlwZTogXCJTM1wiLFxuICAgICAgICAgIG5hbWU6IFwiS2VuZHJhUzNEYXRhU291cmNlXCIsXG4gICAgICAgICAgaW5kZXhJZDoga2VuZHJhSW5kZXgucmVmLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlMzIERhdGEgU291cmNlIGZvciBLZW5kcmEgSW5kZXhcIixcbiAgICAgICAgICBkYXRhU291cmNlQ29uZmlndXJhdGlvbjoge1xuICAgICAgICAgICAgczNDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICAgIGJ1Y2tldE5hbWU6IGRhdGFCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgICAgICAgICAgaW5jbHVzaW9uUHJlZml4ZXM6IFtcImRvY3VtZW50c1wiXSxcbiAgICAgICAgICAgICAgZG9jdW1lbnRzTWV0YWRhdGFDb25maWd1cmF0aW9uOiB7XG4gICAgICAgICAgICAgICAgczNQcmVmaXg6IFwibWV0YWRhdGFcIixcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgICByb2xlQXJuOiBrZW5kcmFSb2xlLnJvbGVBcm4sXG4gICAgICAgIH1cbiAgICAgICk7XG5cbiAgICAgIGtlbmRyYVJvbGUuYWRkVG9Qb2xpY3koXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBhY3Rpb25zOiBbXCJrZW5kcmE6QmF0Y2hEZWxldGVEb2N1bWVudFwiXSxcbiAgICAgICAgICByZXNvdXJjZXM6IFtrZW5kcmFJbmRleC5hdHRyQXJuLCBzM0RhdGFTb3VyY2UuYXR0ckFybl0sXG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgICB0aGlzLmtlbmRyYUluZGV4ID0ga2VuZHJhSW5kZXg7XG4gICAgICB0aGlzLmtlbmRyYVMzRGF0YVNvdXJjZSA9IHMzRGF0YVNvdXJjZTtcbiAgICAgIHRoaXMua2VuZHJhUzNEYXRhU291cmNlQnVja2V0ID0gZGF0YUJ1Y2tldDtcbiAgICB9XG5cbiAgICB0aGlzLmNyZWF0ZUtlbmRyYVdvcmtzcGFjZVdvcmtmbG93ID0gY3JlYXRlV29ya2Zsb3cuc3RhdGVNYWNoaW5lO1xuICB9XG59XG4iXX0=