import * as cognitoIdentityPool from "@aws-cdk/aws-cognito-identitypool-alpha";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";
export declare class Authentication extends Construct {
    readonly userPool: cognito.UserPool;
    readonly userPoolClient: cognito.UserPoolClient;
    readonly identityPool: cognitoIdentityPool.IdentityPool;
    constructor(scope: Construct, id: string);
}
