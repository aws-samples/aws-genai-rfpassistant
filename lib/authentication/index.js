"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Authentication = void 0;
const cognitoIdentityPool = require("@aws-cdk/aws-cognito-identitypool-alpha");
const cdk = require("aws-cdk-lib");
const cognito = require("aws-cdk-lib/aws-cognito");
const constructs_1 = require("constructs");
const cdk_nag_1 = require("cdk-nag");
class Authentication extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        const userPool = new cognito.UserPool(this, "UserPool", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            selfSignUpEnabled: false,
            mfa: cognito.Mfa.OPTIONAL,
            advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
            autoVerify: { email: true, phone: true },
            signInAliases: {
                email: true,
            },
        });
        const userPoolClient = userPool.addClient("UserPoolClient", {
            generateSecret: false,
            authFlows: {
                adminUserPassword: true,
                userPassword: true,
                userSrp: true,
            },
        });
        const identityPool = new cognitoIdentityPool.IdentityPool(this, "IdentityPool", {
            authenticationProviders: {
                userPools: [
                    new cognitoIdentityPool.UserPoolAuthenticationProvider({
                        userPool,
                        userPoolClient,
                    }),
                ],
            },
        });
        this.userPool = userPool;
        this.userPoolClient = userPoolClient;
        this.identityPool = identityPool;
        new cdk.CfnOutput(this, "UserPoolId", {
            value: userPool.userPoolId,
        });
        new cdk.CfnOutput(this, "IdentityPoolId", {
            value: identityPool.identityPoolId,
        });
        new cdk.CfnOutput(this, "UserPoolWebClientId", {
            value: userPoolClient.userPoolClientId,
        });
        new cdk.CfnOutput(this, "UserPoolLink", {
            value: `https://${cdk.Stack.of(this).region}.console.aws.amazon.com/cognito/v2/idp/user-pools/${userPool.userPoolId}/users?region=${cdk.Stack.of(this).region}`,
        });
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(userPool, [
            {
                id: "AwsSolutions-COG1",
                reason: "Default password policy requires min length of 8, digits, lowercase characters, symbols and uppercase characters: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.PasswordPolicy.html",
            },
            { id: "AwsSolutions-COG2", reason: "MFA not required for user usage." },
        ]);
    }
}
exports.Authentication = Authentication;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSwrRUFBK0U7QUFDL0UsbUNBQW1DO0FBQ25DLG1EQUFtRDtBQUNuRCwyQ0FBdUM7QUFDdkMscUNBQTBDO0FBRTFDLE1BQWEsY0FBZSxTQUFRLHNCQUFTO0lBSzNDLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDdEQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxLQUFLO1lBQ3hCLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVE7WUFDekIsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDLFFBQVE7WUFDM0QsVUFBVSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFO1lBQ3hDLGFBQWEsRUFBRTtnQkFDYixLQUFLLEVBQUUsSUFBSTthQUNaO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRTtZQUMxRCxjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUU7Z0JBQ1QsaUJBQWlCLEVBQUUsSUFBSTtnQkFDdkIsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLE9BQU8sRUFBRSxJQUFJO2FBQ2Q7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksR0FBRyxJQUFJLG1CQUFtQixDQUFDLFlBQVksQ0FDdkQsSUFBSSxFQUNKLGNBQWMsRUFDZDtZQUNFLHVCQUF1QixFQUFFO2dCQUN2QixTQUFTLEVBQUU7b0JBQ1QsSUFBSSxtQkFBbUIsQ0FBQyw4QkFBOEIsQ0FBQzt3QkFDckQsUUFBUTt3QkFDUixjQUFjO3FCQUNmLENBQUM7aUJBQ0g7YUFDRjtTQUNGLENBQ0YsQ0FBQztRQUVGLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBRWpDLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVTtTQUMzQixDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ3hDLEtBQUssRUFBRSxZQUFZLENBQUMsY0FBYztTQUNuQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzdDLEtBQUssRUFBRSxjQUFjLENBQUMsZ0JBQWdCO1NBQ3ZDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3RDLEtBQUssRUFBRSxXQUNMLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQ3JCLHFEQUNFLFFBQVEsQ0FBQyxVQUNYLGlCQUFpQixHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUU7U0FDN0MsQ0FBQyxDQUFDO1FBRUg7O1dBRUc7UUFDSCx5QkFBZSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsRUFBRTtZQUNoRDtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQ0osMk1BQTJNO2FBQzlNO1lBQ0QsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLGtDQUFrQyxFQUFFO1NBQ3hFLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQS9FRCx3Q0ErRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjb2duaXRvSWRlbnRpdHlQb29sIGZyb20gXCJAYXdzLWNkay9hd3MtY29nbml0by1pZGVudGl0eXBvb2wtYWxwaGFcIjtcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2duaXRvXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcblxuZXhwb3J0IGNsYXNzIEF1dGhlbnRpY2F0aW9uIGV4dGVuZHMgQ29uc3RydWN0IHtcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2xDbGllbnQ6IGNvZ25pdG8uVXNlclBvb2xDbGllbnQ7XG4gIHB1YmxpYyByZWFkb25seSBpZGVudGl0eVBvb2w6IGNvZ25pdG9JZGVudGl0eVBvb2wuSWRlbnRpdHlQb29sO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgdXNlclBvb2wgPSBuZXcgY29nbml0by5Vc2VyUG9vbCh0aGlzLCBcIlVzZXJQb29sXCIsIHtcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZDogZmFsc2UsXG4gICAgICBtZmE6IGNvZ25pdG8uTWZhLk9QVElPTkFMLFxuICAgICAgYWR2YW5jZWRTZWN1cml0eU1vZGU6IGNvZ25pdG8uQWR2YW5jZWRTZWN1cml0eU1vZGUuRU5GT1JDRUQsXG4gICAgICBhdXRvVmVyaWZ5OiB7IGVtYWlsOiB0cnVlLCBwaG9uZTogdHJ1ZSB9LFxuICAgICAgc2lnbkluQWxpYXNlczoge1xuICAgICAgICBlbWFpbDogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IHVzZXJQb29sLmFkZENsaWVudChcIlVzZXJQb29sQ2xpZW50XCIsIHtcbiAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcbiAgICAgIGF1dGhGbG93czoge1xuICAgICAgICBhZG1pblVzZXJQYXNzd29yZDogdHJ1ZSxcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxuICAgICAgICB1c2VyU3JwOiB0cnVlLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGlkZW50aXR5UG9vbCA9IG5ldyBjb2duaXRvSWRlbnRpdHlQb29sLklkZW50aXR5UG9vbChcbiAgICAgIHRoaXMsXG4gICAgICBcIklkZW50aXR5UG9vbFwiLFxuICAgICAge1xuICAgICAgICBhdXRoZW50aWNhdGlvblByb3ZpZGVyczoge1xuICAgICAgICAgIHVzZXJQb29sczogW1xuICAgICAgICAgICAgbmV3IGNvZ25pdG9JZGVudGl0eVBvb2wuVXNlclBvb2xBdXRoZW50aWNhdGlvblByb3ZpZGVyKHtcbiAgICAgICAgICAgICAgdXNlclBvb2wsXG4gICAgICAgICAgICAgIHVzZXJQb29sQ2xpZW50LFxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApO1xuXG4gICAgdGhpcy51c2VyUG9vbCA9IHVzZXJQb29sO1xuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSB1c2VyUG9vbENsaWVudDtcbiAgICB0aGlzLmlkZW50aXR5UG9vbCA9IGlkZW50aXR5UG9vbDtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2xJZFwiLCB7XG4gICAgICB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiSWRlbnRpdHlQb29sSWRcIiwge1xuICAgICAgdmFsdWU6IGlkZW50aXR5UG9vbC5pZGVudGl0eVBvb2xJZCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2xXZWJDbGllbnRJZFwiLCB7XG4gICAgICB2YWx1ZTogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2xMaW5rXCIsIHtcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke1xuICAgICAgICBjZGsuU3RhY2sub2YodGhpcykucmVnaW9uXG4gICAgICB9LmNvbnNvbGUuYXdzLmFtYXpvbi5jb20vY29nbml0by92Mi9pZHAvdXNlci1wb29scy8ke1xuICAgICAgICB1c2VyUG9vbC51c2VyUG9vbElkXG4gICAgICB9L3VzZXJzP3JlZ2lvbj0ke2Nkay5TdGFjay5vZih0aGlzKS5yZWdpb259YCxcbiAgICB9KTtcblxuICAgIC8qKlxuICAgICAqIENESyBOQUcgc3VwcHJlc3Npb25cbiAgICAgKi9cbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnModXNlclBvb2wsIFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUNPRzFcIixcbiAgICAgICAgcmVhc29uOlxuICAgICAgICAgIFwiRGVmYXVsdCBwYXNzd29yZCBwb2xpY3kgcmVxdWlyZXMgbWluIGxlbmd0aCBvZiA4LCBkaWdpdHMsIGxvd2VyY2FzZSBjaGFyYWN0ZXJzLCBzeW1ib2xzIGFuZCB1cHBlcmNhc2UgY2hhcmFjdGVyczogaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL2Nkay9hcGkvdjIvZG9jcy9hd3MtY2RrLWxpYi5hd3NfY29nbml0by5QYXNzd29yZFBvbGljeS5odG1sXCIsXG4gICAgICB9LFxuICAgICAgeyBpZDogXCJBd3NTb2x1dGlvbnMtQ09HMlwiLCByZWFzb246IFwiTUZBIG5vdCByZXF1aXJlZCBmb3IgdXNlciB1c2FnZS5cIiB9LFxuICAgIF0pO1xuICB9XG59XG4iXX0=