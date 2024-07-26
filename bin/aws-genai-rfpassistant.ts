#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { AwsGenaiRfpAssistantStack } from "../lib/aws-genai-rfpassistant-stack";
import { AwsSolutionsChecks } from "cdk-nag";
import { getConfig } from "./config";
import { Aspects } from "aws-cdk-lib";

const app = new cdk.App();

const config = getConfig();

new AwsGenaiRfpAssistantStack(app, `${config.prefix}GenaiRfpAssistantStack`, {
  config,
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
