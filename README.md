# Deploying a RFP Assistant powered Amazon Bedrock Using AWS CDK on AWS

# Deploy

## Environment setup

To deploy the solution you can use 3 different methods:

1. [AWS Cloud9](#aws-cloud9) (Recommended)
2. [Github Codespaces](#github-codespaces)
3. [Local machine](#local-machine)

### AWS Cloud9

We recommend deploying with [AWS Cloud9](https://aws.amazon.com/cloud9/).

Use the [Cloud9 console](https://console.aws.amazon.com/cloud9control/home?#/create/) to create a new Cloud9 instance. Ensure you use the following values when creating the instance:

- Select `m5.large` or larger as Instance Type.
- Select `Ubuntu Server 22.04 LTS` as Platform.

The default EBS volume create with the Cloud9 instance is too small and you need to increase it to at least 100GB.
To do this, run the following command from the Cloud9 terminal:

```
./scripts/cloud9-resize.sh
```

See the documentation for more details on [environment resize](https://docs.aws.amazon.com/cloud9/latest/user-guide/move-environment.html#move-environment-resize).

You can now proceed with the [deployment](#deployement)

### Github Codespaces

To use [GitHub Codespaces](https://github.com/features/codespaces) to deploy the solution, you need the following before proceeding:

1. An [AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/)
2. An [IAM User](https://console.aws.amazon.com/iamv2/home?#/users/create) with **AdministratorAccess** policy granted (for production, we recommend restricting access as needed)

After creating the user, take note of `Access Key ID` and `Secret Access Key`.

Next, click on the button below to open your Codespaces environment.

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/aws-samples/aws-genai-rfpassistant)

Once in the Codespaces terminal, set up the AWS Credentials by running

```shell
aws configure
```

```shell
AWS Access Key ID [None]: <the access key from the IAM user generated above>
AWS Secret Access Key [None]: <the secret access key from the IAM user generated above>
Default region name: <the region you plan to deploy the solution to>
Default output format: json
```

You are all set for deployment; you can now jump to [step 3 of the deployment section below](#deployment-dependencies-installation).

### Local machine

If are using a local machine, verify that your environment satisfies the following prerequisites:

You have:

1. An [AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/)
2. An [IAM User](https://console.aws.amazon.com/iamv2/home?#/users/create) with **AdministratorAccess** policy granted (for production, we recommend restricting access as needed)
3. [NodeJS 18 or 20](https://nodejs.org/en/download/) installed

   - If you are using [`nvm`](https://github.com/nvm-sh/nvm) you can run the following before proceeding
     ```
     nvm install 18 && nvm use 18
     ```
     or
     ```
     nvm install 20 && nvm use 20
     ```

4. [AWS CLI](https://aws.amazon.com/cli/) installed and configured to use with your AWS account
5. [AWS CDK CLI](https://docs.aws.amazon.com/cdk/latest/guide/getting_started.html) installed
6. [Docker](https://docs.docker.com/get-docker/) installed
   - N.B. [`buildx`](https://github.com/docker/buildx) is also required. For Windows and macOS `buildx` [is included](https://github.com/docker/buildx#windows-and-macos) in [Docker Desktop](https://docs.docker.com/desktop/)
7. [Python 3+](https://www.python.org/downloads/) installed

## Deployment

**Step 1.** Clone the repository.

```bash
git clone https://github.com/aws-samples/aws-genai-rfpassistant
```

**Step 2.** Move into the cloned repository.

```bash
cd aws-genai-rfpassistant
```

**Step 3.** <a id="deployment-dependencies-installation"></a> Install the project dependencies and build the project.

```bash
npm install && npm run build
```

**Step 4.** Once done, run the configuration command to help you set up the solution with the features you need:

```bash
npm run config
```

You'll be prompted to configure the different aspects of the solution, such as:

- The LLMs or MLMs to enable (we support all models provided by Bedrock).

When done, answer `Y` to create or update your configuration.

![sample](./assets/magic-config-sample.gif "CLI sample")

Your configuration is now stored under `bin/config.json`. You can re-run the `npm run config` command as needed to update your `config.json`

**Step 5.** (Optional) Bootstrap AWS CDK on the target account and region

> **Note**: This is required if you have never used AWS CDK on this account and region combination. ([More information on CDK bootstrapping](https://docs.aws.amazon.com/cdk/latest/guide/cli.html#cli-bootstrap)).

```bash
npx cdk bootstrap aws://{targetAccountId}/{targetRegion}
```

You can now deploy by running:

```bash
npx cdk deploy
```

> **Note**: This step duration can vary greatly, depending on the Constructs you are deploying.

You can view the progress of your CDK deployment in the [CloudFormation console](https://console.aws.amazon.com/cloudformation/home) in the selected region.


```bash
...
Outputs:
GenAIChatBotStack.UserInterfaceUserInterfaceDomanNameXXXXXXXX = dxxxxxxxxxxxxx.cloudfront.net
GenAIChatBotStack.AuthenticationUserPoolLinkXXXXX = https://xxxxx.console.aws.amazon.com/cognito/v2/idp/user-pools/xxxxx_XXXXX/users?region=xxxxx
GenAIChatBotStack.ApiKeysSecretNameXXXX = ApiKeysSecretName-xxxxxx
...
```

**Step 7.** Open the generated **Cognito User Pool** Link from outputs above i.e. `https://xxxxx.console.aws.amazon.com/cognito/v2/idp/user-pools/xxxxx_XXXXX/users?region=xxxxx`

**Step 8.** Add a user that will be used to log into the web interface.

**Step 9.** Open the `User Interface` Url for the outputs above, i.e. `dxxxxxxxxxxxxx.cloudfront.net`.

**Step 10.** Login with the user created in **Step 8** and follow the instructions.

## Run user interface locally

To experiment with changes to the the user interface, you can run the interface locally. See the instructions in the README file of the [`lib/user-interface/react-app`](https://github.com/aws-samples/aws-genai-llm-chatbot/blob/main/lib/user-interface/react-app/README.md) folder.


**Important:** After you have done these changes it's essential to redeploy the solution:

```bash
npx cdk deploy
```

## Clean up

You can remove the stacks and all the associated resources created in your AWS account by running the following command:

```bash
npx cdk destroy
```

> **Note**: Depending on which resources have been deployed. Destroying the stack might take a while, up to 45m. If the deletion fails multiple times, please manually delete the remaining stack's ENIs; you can filter ENIs by VPC/Subnet/etc using the search bar [here](https://console.aws.amazon.com/ec2/home#NIC) in the AWS console) and re-attempt a stack deletion.


# Authors




# License

This library is licensed under the MIT-0 License. See the LICENSE file.

- [Changelog](CHANGELOG.md) of the project.
- [License](LICENSE) of the project.
- [Code of Conduct](CODE_OF_CONDUCT.md) of the project.
- [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

# Legal Disclaimer

You should consider doing your own independent assessment before using the content in this sample for production purposes. This may include (amongst other things) testing, securing, and optimizing the content provided in this sample, based on your specific quality control practices and standards.
