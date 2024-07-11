import * as iam from 'aws-cdk-lib/aws-iam';
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import { Construct } from 'constructs';
import { SystemConfig } from "../shared/types";
export declare function createStartSchedule(scope: Construct, id: string, sagemakerEndpoint: sagemaker.CfnEndpoint, role: iam.Role, config: SystemConfig): any;
export declare function createStopSchedule(scope: Construct, id: string, sagemakerEndpoint: sagemaker.CfnEndpoint, role: iam.Role, config: SystemConfig): any;
