#!/usr/bin/env node
"use strict";
// Copyright 2021 Amazon.com.
// SPDX-License-Identifier: MIT
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const enquirer = require("enquirer");
const types_1 = require("../lib/shared/types");
const version_js_1 = require("./version.js");
const fs = require("fs");
const aws_cron_validator_1 = require("./aws-cron-validator");
const moment_timezone_1 = require("moment-timezone");
const country_list_1 = require("country-list");
function getTimeZonesWithCurrentTime() {
    const timeZones = moment_timezone_1.tz.names(); // Get a list of all timezones
    const timeZoneData = timeZones.map(zone => {
        // Get current time in each timezone
        const currentTime = moment_timezone_1.tz(zone).format('YYYY-MM-DD HH:mm');
        return { message: `${zone}: ${currentTime}`, name: zone };
    });
    return timeZoneData;
}
function getCountryCodesAndNames() {
    // Use country-list to get an array of countries with their codes and names
    const countries = country_list_1.getData();
    // Map the country data to match the desired output structure
    const countryInfo = countries.map(({ code, name }) => {
        return { message: `${name} (${code})`, name: code };
    });
    return countryInfo;
}
function isValidDate(dateString) {
    // Check the pattern YYYY/MM/DD
    const regex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
    if (!regex.test(dateString)) {
        return false;
    }
    // Parse the date parts to integers
    const parts = dateString.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);
    // Check the date validity
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return false;
    }
    // Check if the date is in the future compared to the current date at 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date <= today) {
        return false;
    }
    return true;
}
const timeZoneData = getTimeZonesWithCurrentTime();
const cfCountries = getCountryCodesAndNames();
const iamRoleRegExp = RegExp(/arn:aws:iam::\d+:role\/[\w-_]+/);
const kendraIdRegExp = RegExp(/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/);
const embeddingModels = [
    {
        provider: "bedrock",
        name: "amazon.titan-embed-text-v1",
        dimensions: 1536,
    },
    //Support for inputImage is not yet implemented for amazon.titan-embed-image-v1
    {
        provider: "bedrock",
        name: "amazon.titan-embed-image-v1",
        dimensions: 1024,
    },
    {
        provider: "bedrock",
        name: "cohere.embed-english-v3",
        dimensions: 1024,
    },
    {
        provider: "bedrock",
        name: "cohere.embed-multilingual-v3",
        dimensions: 1024,
    }
];
/**
 * Main entry point
 */
(async () => {
    let program = new commander_1.Command().description("Creates a new chatbot configuration");
    program.version(version_js_1.LIB_VERSION);
    program.option("-p, --prefix <prefix>", "The prefix for the stack");
    program.action(async (options) => {
        if (fs.existsSync("./bin/config.json")) {
            const config = JSON.parse(fs.readFileSync("./bin/config.json").toString("utf8"));
            options.prefix = config.prefix;
            options.vpcId = config.vpc?.vpcId;
            options.createVpcEndpoints = config.vpc?.createVpcEndpoints;
            options.privateWebsite = config.privateWebsite;
            options.certificate = config.certificate;
            options.domain = config.domain;
            options.cfGeoRestrictEnable = config.cfGeoRestrictEnable;
            options.cfGeoRestrictList = config.cfGeoRestrictList;
            options.bedrockEnable = config.bedrock?.enabled;
            options.bedrockRegion = config.bedrock?.region;
            options.bedrockRoleArn = config.bedrock?.roleArn;
            options.sagemakerModels = config.llms?.sagemaker ?? [];
            options.enableSagemakerModels = config.llms?.sagemaker
                ? config.llms?.sagemaker.length > 0
                : false;
            options.enableSagemakerModelsSchedule = config.llms?.sagemakerSchedule?.enabled;
            options.timezonePicker = config.llms?.sagemakerSchedule?.timezonePicker;
            options.enableCronFormat = config.llms?.sagemakerSchedule?.enableCronFormat;
            options.cronSagemakerModelsScheduleStart = config.llms?.sagemakerSchedule?.sagemakerCronStartSchedule;
            options.cronSagemakerModelsScheduleStop = config.llms?.sagemakerSchedule?.sagemakerCronStopSchedule;
            options.daysForSchedule = config.llms?.sagemakerSchedule?.daysForSchedule;
            options.scheduleStartTime = config.llms?.sagemakerSchedule?.scheduleStartTime;
            options.scheduleStopTime = config.llms?.sagemakerSchedule?.scheduleStopTime;
            options.enableScheduleEndDate = config.llms?.sagemakerSchedule?.enableScheduleEndDate;
            options.startScheduleEndDate = config.llms?.sagemakerSchedule?.startScheduleEndDate;
            options.enableRag = config.rag.enabled;
            options.ragsToEnable = Object.keys(config.rag.engines ?? {}).filter((v) => config.rag.engines[v].enabled);
            if (options.ragsToEnable.includes("kendra") &&
                !config.rag.engines.kendra.createIndex) {
                options.ragsToEnable.pop("kendra");
            }
            options.embeddings = config.rag.embeddingsModels.map((m) => m.name);
            options.defaultEmbedding = (config.rag.embeddingsModels ?? []).filter((m) => m.default)[0].name;
            options.kendraExternal = config.rag.engines.kendra.external;
            options.kendraEnterprise = config.rag.engines.kendra.enterprise;
        }
        try {
            await processCreateOptions(options);
        }
        catch (err) {
            console.error("Could not complete the operation.");
            console.error(err.message);
            process.exit(1);
        }
    });
    program.parse(process.argv);
})();
function createConfig(config) {
    fs.writeFileSync("./bin/config.json", JSON.stringify(config, undefined, 2));
    console.log("Configuration written to ./bin/config.json");
}
/**
 * Prompts the user for missing options
 *
 * @param options Options provided via the CLI
 * @returns The complete options
 */
async function processCreateOptions(options) {
    let questions = [
        {
            type: "input",
            name: "prefix",
            message: "Prefix to differentiate this deployment",
            initial: options.prefix,
            askAnswered: false,
        },
        {
            type: "confirm",
            name: "existingVpc",
            message: "Do you want to use existing vpc? (selecting false will create a new vpc)",
            initial: options.vpcId ? true : false,
        },
        {
            type: "input",
            name: "vpcId",
            message: "Specify existing VpcId (vpc-xxxxxxxxxxxxxxxxx)",
            initial: options.vpcId,
            validate(vpcId) {
                return (this.skipped || RegExp(/^vpc-[0-9a-f]{8,17}$/i).test(vpcId)) ?
                    true : 'Enter a valid VpcId in vpc-xxxxxxxxxxx format';
            },
            skip() {
                return !this.state.answers.existingVpc;
            },
        },
        {
            type: "confirm",
            name: "createVpcEndpoints",
            message: "Do you want create VPC Endpoints?",
            initial: options.createVpcEndpoints || false,
            skip() {
                return !this.state.answers.existingVpc;
            },
        },
        {
            type: "confirm",
            name: "privateWebsite",
            message: "Do you want to deploy a private website? I.e only accessible in VPC",
            initial: options.privateWebsite || false,
        },
        {
            type: "confirm",
            name: "customPublicDomain",
            message: "Do you want to provide a custom domain name and corresponding certificate arn for the public website ?",
            initial: options.customPublicDomain || false,
            skip() {
                return this.state.answers.privateWebsite;
            },
        },
        {
            type: "input",
            name: "certificate",
            message() {
                if (this.state.answers.customPublicDomain) {
                    return "ACM certificate ARN with custom domain for public website. Note that the certificate must resides in us-east-1";
                }
                return "ACM certificate ARN";
            },
            initial: options.certificate,
            skip() {
                return !this.state.answers.privateWebsite && !this.state.answers.customPublicDomain;
            },
        },
        {
            type: "input",
            name: "domain",
            message() {
                if (this.state.answers.customPublicDomain) {
                    return "Custom Domain for public website";
                }
                return "Domain for private website";
            },
            initial: options.domain,
            skip() {
                return !this.state.answers.privateWebsite && !this.state.answers.customPublicDomain;
            },
        },
        {
            type: "confirm",
            name: "cfGeoRestrictEnable",
            message: "Do want to restrict access to the website (CF Distribution) to only a country or countries?",
            initial: false,
        },
        {
            type: "multiselect",
            name: "cfGeoRestrictList",
            hint: "SPACE to select, ENTER to confirm selection",
            message: "Which countries do you wish to ALLOW access?",
            choices: cfCountries,
            validate(choices) {
                return this.skipped || choices.length > 0
                    ? true
                    : "You need to select at least one country";
            },
            skip() {
                this.state._choices = this.state.choices;
                return !this.state.answers.cfGeoRestrictEnable;
            },
            initial: options.cfGeoRestrictList || [],
        },
        {
            type: "confirm",
            name: "bedrockEnable",
            message: "Do you have access to Bedrock and want to enable it",
            initial: true,
        },
        {
            type: "select",
            name: "bedrockRegion",
            message: "Region where Bedrock is available",
            choices: Object.values(types_1.SupportedBedrockRegion),
            initial: options.bedrockRegion ?? "us-east-1",
            skip() {
                return !this.state.answers.bedrockEnable;
            },
        },
        {
            type: "input",
            name: "bedrockRoleArn",
            message: "Cross account role arn to invoke Bedrock - leave empty if Bedrock is in same account",
            validate: (v) => {
                const valid = iamRoleRegExp.test(v);
                return v.length === 0 || valid;
            },
            initial: options.bedrockRoleArn || "",
        },
        {
            type: "confirm",
            name: "enableSagemakerModels",
            message: "Do you want to use any Sagemaker Models",
            initial: options.enableSagemakerModels || false,
        },
        {
            type: "multiselect",
            name: "sagemakerModels",
            hint: "SPACE to select, ENTER to confirm selection [denotes instance size to host model]",
            message: "Which SageMaker Models do you want to enable",
            choices: Object.values(types_1.SupportedSageMakerModels),
            initial: (options.sagemakerModels ?? []).filter((m) => Object.values(types_1.SupportedSageMakerModels)
                .map((x) => x.toString())
                .includes(m)) || [],
            validate(choices) {
                //Trap for new players, validate always runs even if skipped is true
                // So need to handle validate bail out if skipped is true
                return this.skipped || choices.length > 0
                    ? true
                    : "You need to select at least one model";
            },
            skip() {
                this.state._choices = this.state.choices;
                return !this.state.answers.enableSagemakerModels;
            },
        },
        {
            type: "confirm",
            name: "enableSagemakerModelsSchedule",
            message: "Do you want to enable a start/stop schedule for sagemaker models?",
            initial() {
                return (options.enableSagemakerModelsSchedule && this.state.answers.enableSagemakerModels) || false;
            },
            skip() {
                return !this.state.answers.enableSagemakerModels;
            },
        },
        {
            type: "AutoComplete",
            name: "timezonePicker",
            hint: "start typing to auto complete, ENTER to confirm selection",
            message: "Which TimeZone do you want to run the schedule in?",
            choices: timeZoneData,
            validate(choices) {
                return this.skipped || choices.length > 0
                    ? true
                    : "You need to select at least one time zone";
            },
            skip() {
                return !this.state.answers.enableSagemakerModelsSchedule;
            },
            initial: options.timezonePicker || [],
        },
        {
            type: "select",
            name: "enableCronFormat",
            choices: [
                { message: "Simple - Wizard lead", name: "simple" },
                { message: "Advanced - Provide cron expression", name: "cron" },
            ],
            message: "How do you want to set the schedule?",
            initial: options.enableCronFormat || "",
            skip() {
                this.state._choices = this.state.choices;
                return !this.state.answers.enableSagemakerModelsSchedule;
            },
        },
        {
            type: "input",
            name: "sagemakerCronStartSchedule",
            hint: "This cron format is using AWS eventbridge cron syntax see docs for more information",
            message: "Start schedule for Sagmaker models expressed in UTC AWS cron format",
            skip() {
                return !this.state.answers.enableCronFormat.includes("cron");
            },
            validate(v) {
                if (this.skipped) {
                    return true;
                }
                try {
                    aws_cron_validator_1.AWSCronValidator.validate(v);
                    return true;
                }
                catch (error) {
                    if (error instanceof Error) {
                        return error.message;
                    }
                    return false;
                }
            },
            initial: options.cronSagemakerModelsScheduleStart,
        },
        {
            type: "input",
            name: "sagemakerCronStopSchedule",
            hint: "This cron format is using AWS eventbridge cron syntax see docs for more information",
            message: "Stop schedule for Sagmaker models expressed in AWS cron format",
            skip() {
                return !this.state.answers.enableCronFormat.includes("cron");
            },
            validate(v) {
                if (this.skipped) {
                    return true;
                }
                try {
                    aws_cron_validator_1.AWSCronValidator.validate(v);
                    return true;
                }
                catch (error) {
                    if (error instanceof Error) {
                        return error.message;
                    }
                    return false;
                }
            },
            initial: options.cronSagemakerModelsScheduleStop,
        },
        {
            type: "multiselect",
            name: "daysForSchedule",
            hint: "SPACE to select, ENTER to confirm selection",
            message: "Which days of the week would you like to run the schedule on?",
            choices: [
                { message: "Sunday", name: "SUN" },
                { message: "Monday", name: "MON" },
                { message: "Tuesday", name: "TUE" },
                { message: "Wednesday", name: "WED" },
                { message: "Thursday", name: "THU" },
                { message: "Friday", name: "FRI" },
                { message: "Saturday", name: "SAT" },
            ],
            validate(choices) {
                return this.skipped || choices.length > 0
                    ? true
                    : "You need to select at least one day";
            },
            skip() {
                this.state._choices = this.state.choices;
                if (!this.state.answers.enableSagemakerModelsSchedule) {
                    return true;
                }
                return !this.state.answers.enableCronFormat.includes("simple");
            },
            initial: options.daysForSchedule || [],
        },
        {
            type: "input",
            name: "scheduleStartTime",
            message: "What time of day do you wish to run the start schedule? enter in HH:MM format",
            validate(v) {
                if (this.skipped) {
                    return true;
                }
                // Regular expression to match HH:MM format
                const regex = /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9])$/;
                return regex.test(v) || 'Time must be in HH:MM format!';
            },
            skip() {
                if (!this.state.answers.enableSagemakerModelsSchedule) {
                    return true;
                }
                return !this.state.answers.enableCronFormat.includes("simple");
            },
            initial: options.scheduleStartTime,
        },
        {
            type: "input",
            name: "scheduleStopTime",
            message: "What time of day do you wish to run the stop schedule? enter in HH:MM format",
            validate(v) {
                if (this.skipped) {
                    return true;
                }
                // Regular expression to match HH:MM format
                const regex = /^([0-1]?[0-9]|2[0-3]):([0-5]?[0-9])$/;
                return regex.test(v) || 'Time must be in HH:MM format!';
            },
            skip() {
                if (!this.state.answers.enableSagemakerModelsSchedule) {
                    return true;
                }
                return !this.state.answers.enableCronFormat.includes("simple");
            },
            initial: options.scheduleStopTime,
        },
        {
            type: "confirm",
            name: "enableScheduleEndDate",
            message: "Would you like to set an end data for the start schedule? (after this date the models would no longer start)",
            initial: options.enableScheduleEndDate || false,
            skip() {
                return !this.state.answers.enableSagemakerModelsSchedule;
            },
        },
        {
            type: "input",
            name: "startScheduleEndDate",
            message: "After this date the models will no longer start",
            hint: "YYYY-MM-DD",
            validate(v) {
                if (this.skipped) {
                    return true;
                }
                return isValidDate(v) || 'The date must be in format YYYY/MM/DD and be in the future';
            },
            skip() {
                return !this.state.answers.enableScheduleEndDate;
            },
            initial: options.startScheduleEndDate || false,
        },
        {
            type: "confirm",
            name: "enableRag",
            message: "Do you want to enable RAG",
            initial: options.enableRag || false,
        },
        {
            type: "multiselect",
            name: "ragsToEnable",
            hint: "SPACE to select, ENTER to confirm selection",
            message: "Which datastores do you want to enable for RAG",
            choices: [
                { message: "Aurora", name: "aurora" },
                { message: "OpenSearch", name: "opensearch" },
                { message: "Kendra (managed)", name: "kendra" },
            ],
            validate(choices) {
                return this.skipped || choices.length > 0
                    ? true
                    : "You need to select at least one engine";
            },
            skip() {
                // workaround for https://github.com/enquirer/enquirer/issues/298
                this.state._choices = this.state.choices;
                return !this.state.answers.enableRag;
            },
            initial: options.ragsToEnable || [],
        },
        {
            type: "confirm",
            name: "kendraEnterprise",
            message: "Do you want to enable Kendra Enterprise Edition?",
            initial: options.kendraEnterprise || false,
            skip() {
                return !this.state.answers.ragsToEnable.includes("kendra");
            },
        },
        {
            type: "confirm",
            name: "kendra",
            message: "Do you want to add existing Kendra indexes",
            initial: (options.kendraExternal !== undefined &&
                options.kendraExternal.length > 0) ||
                false,
            skip() {
                return !this.state.answers.enableRag;
            },
        },
    ];
    const answers = await enquirer.prompt(questions);
    const kendraExternal = [];
    let newKendra = answers.enableRag && answers.kendra;
    const existingKendraIndices = Array.from(options.kendraExternal || []);
    while (newKendra === true) {
        let existingIndex = existingKendraIndices.pop();
        const kendraQ = [
            {
                type: "input",
                name: "name",
                message: "Kendra source name",
                validate(v) {
                    return RegExp(/^\w[\w-_]*\w$/).test(v);
                },
                initial: existingIndex?.name,
            },
            {
                type: "autocomplete",
                limit: 8,
                name: "region",
                choices: Object.values(types_1.SupportedRegion),
                message: `Region of the Kendra index${existingIndex?.region ? " (" + existingIndex?.region + ")" : ""}`,
                initial: Object.values(types_1.SupportedRegion).indexOf(existingIndex?.region),
            },
            {
                type: "input",
                name: "roleArn",
                message: "Cross account role Arn to assume to call Kendra, leave empty if not needed",
                validate: (v) => {
                    const valid = iamRoleRegExp.test(v);
                    return v.length === 0 || valid;
                },
                initial: existingIndex?.roleArn ?? "",
            },
            {
                type: "input",
                name: "kendraId",
                message: "Kendra ID",
                validate(v) {
                    return kendraIdRegExp.test(v);
                },
                initial: existingIndex?.kendraId,
            },
            {
                type: "confirm",
                name: "enabled",
                message: "Enable this index",
                initial: existingIndex?.enabled ?? true,
            },
            {
                type: "confirm",
                name: "newKendra",
                message: "Do you want to add another Kendra source",
                initial: false,
            },
        ];
        const kendraInstance = await enquirer.prompt(kendraQ);
        const ext = (({ enabled, name, roleArn, kendraId, region }) => ({
            enabled,
            name,
            roleArn,
            kendraId,
            region,
        }))(kendraInstance);
        if (ext.roleArn === "")
            ext.roleArn = undefined;
        kendraExternal.push({
            ...ext,
        });
        newKendra = kendraInstance.newKendra;
    }
    const modelsPrompts = [
        {
            type: "select",
            name: "defaultEmbedding",
            message: "Select a default embedding model",
            choices: embeddingModels.map(m => ({ name: m.name, value: m })),
            initial: options.defaultEmbedding,
            validate(value) {
                if (this.state.answers.enableRag) {
                    return value ? true : 'Select a default embedding model';
                }
                return true;
            },
            skip() {
                return !answers.enableRag || !(answers.ragsToEnable.includes("aurora") || answers.ragsToEnable.includes("opensearch"));
            }
        }
    ];
    const models = await enquirer.prompt(modelsPrompts);
    // Convert simple time into cron format for schedule
    if (answers.enableSagemakerModelsSchedule && answers.enableCronFormat == "simple") {
        const daysToRunSchedule = answers.daysForSchedule.join(",");
        const startMinutes = answers.scheduleStartTime.split(":")[1];
        const startHour = answers.scheduleStartTime.split(":")[0];
        answers.sagemakerCronStartSchedule = `${startMinutes} ${startHour} ? * ${daysToRunSchedule} *`;
        aws_cron_validator_1.AWSCronValidator.validate(answers.sagemakerCronStartSchedule);
        const stopMinutes = answers.scheduleStopTime.split(":")[1];
        const stopHour = answers.scheduleStopTime.split(":")[0];
        answers.sagemakerCronStopSchedule = `${stopMinutes} ${stopHour} ? * ${daysToRunSchedule} *`;
        aws_cron_validator_1.AWSCronValidator.validate(answers.sagemakerCronStopSchedule);
    }
    // Create the config object
    const config = {
        prefix: answers.prefix,
        vpc: answers.existingVpc
            ? {
                vpcId: answers.vpcId.toLowerCase(),
                createVpcEndpoints: answers.createVpcEndpoints,
            }
            : undefined,
        privateWebsite: answers.privateWebsite,
        certificate: answers.certificate,
        domain: answers.domain,
        cfGeoRestrictEnable: answers.cfGeoRestrictEnable,
        cfGeoRestrictList: answers.cfGeoRestrictList,
        bedrock: answers.bedrockEnable
            ? {
                enabled: answers.bedrockEnable,
                region: answers.bedrockRegion,
                roleArn: answers.bedrockRoleArn === "" ? undefined : answers.bedrockRoleArn,
            }
            : undefined,
        llms: {
            sagemaker: answers.sagemakerModels,
            sagemakerSchedule: answers.enableSagemakerModelsSchedule
                ? {
                    enabled: answers.enableSagemakerModelsSchedule,
                    timezonePicker: answers.timezonePicker,
                    enableCronFormat: answers.enableCronFormat,
                    sagemakerCronStartSchedule: answers.sagemakerCronStartSchedule,
                    sagemakerCronStopSchedule: answers.sagemakerCronStopSchedule,
                    daysForSchedule: answers.daysForSchedule,
                    scheduleStartTime: answers.scheduleStartTime,
                    scheduleStopTime: answers.scheduleStopTime,
                    enableScheduleEndDate: answers.enableScheduleEndDate,
                    startScheduleEndDate: answers.startScheduleEndDate,
                }
                : undefined,
        },
        rag: {
            enabled: answers.enableRag,
            engines: {
                aurora: {
                    enabled: answers.ragsToEnable.includes("aurora"),
                },
                opensearch: {
                    enabled: answers.ragsToEnable.includes("opensearch"),
                },
                kendra: {
                    enabled: false,
                    createIndex: false,
                    external: [{}],
                    enterprise: false,
                },
            },
            embeddingsModels: [{}],
            crossEncoderModels: [{}],
        },
    };
    // If we have not enabled rag the default embedding is set to the first model
    if (!answers.enableRag) {
        models.defaultEmbedding = embeddingModels[0].name;
    }
    config.rag.crossEncoderModels[0] = {
        provider: "sagemaker",
        name: "cross-encoder/ms-marco-MiniLM-L-12-v2",
        default: true,
    };
    config.rag.embeddingsModels = embeddingModels;
    config.rag.embeddingsModels.forEach((m) => {
        if (m.name === models.defaultEmbedding) {
            m.default = true;
        }
    });
    config.rag.engines.kendra.createIndex =
        answers.ragsToEnable.includes("kendra");
    config.rag.engines.kendra.enabled =
        config.rag.engines.kendra.createIndex || kendraExternal.length > 0;
    config.rag.engines.kendra.external = [...kendraExternal];
    config.rag.engines.kendra.enterprise = answers.kendraEnterprise;
    console.log("\n✨ This is the chosen configuration:\n");
    console.log(JSON.stringify(config, undefined, 2));
    (await enquirer.prompt([
        {
            type: "confirm",
            name: "create",
            message: "Do you want to create/update the configuration based on the above settings",
            initial: true,
        },
    ])).create
        ? createConfig(config)
        : console.log("Skipping");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFnaWMtY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFnaWMtY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBRUEsNkJBQTZCO0FBQzdCLCtCQUErQjs7QUFFL0IseUNBQW9DO0FBQ3BDLHFDQUFxQztBQUNyQywrQ0FLNkI7QUFDN0IsNkNBQTJDO0FBQzNDLHlCQUF5QjtBQUN6Qiw2REFBdUQ7QUFDdkQscURBQXFDO0FBQ3JDLCtDQUF1QztBQUV2QyxTQUFTLDJCQUEyQjtJQUNoQyxNQUFNLFNBQVMsR0FBRyxvQkFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsOEJBQThCO0lBQzVELE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDdEMsb0NBQW9DO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLG9CQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksS0FBSyxXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDOUQsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFlBQVksQ0FBQztBQUN4QixDQUFDO0FBRUQsU0FBUyx1QkFBdUI7SUFDNUIsMkVBQTJFO0lBQzNFLE1BQU0sU0FBUyxHQUFHLHNCQUFPLEVBQUUsQ0FBQztJQUU1Qiw2REFBNkQ7SUFDN0QsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUU7UUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksS0FBSyxJQUFJLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDeEQsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFdBQVcsQ0FBQztBQUN2QixDQUFDO0FBRUQsU0FBUyxXQUFX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QUFDO0lBQ3JFLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxDQUFDO0lBQ3pELE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRWhFLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLENBQUMsQ0FBQztJQUN2RCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRWhELENBQUMsTUFBTSxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQ3JCO1lBQ0UsSUFBSSxFQUFFLFNBQVM7WUFDZixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSw0RUFBNEU7WUFDckYsT0FBTyxFQUFFLElBQUk7U0FDZDtLQUNGLENBQUMsQ0FDSCxDQUFDLE1BQU07UUFDTixDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUN0QixDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUM5QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuXG4vLyBDb3B5cmlnaHQgMjAyMSBBbWF6b24uY29tLlxuLy8gU1BEWC1MaWNlbnNlLUlkZW50aWZpZXI6IE1JVFxuXG5pbXBvcnQgeyBDb21tYW5kIH0gZnJvbSBcImNvbW1hbmRlclwiO1xuaW1wb3J0ICogYXMgZW5xdWlyZXIgZnJvbSBcImVucXVpcmVyXCI7XG5pbXBvcnQge1xuICBTdXBwb3J0ZWRSZWdpb24sXG4gIFN1cHBvcnRlZFNhZ2VNYWtlck1vZGVscyxcbiAgU3lzdGVtQ29uZmlnLFxuICBTdXBwb3J0ZWRCZWRyb2NrUmVnaW9uLFxufSBmcm9tIFwiLi4vbGliL3NoYXJlZC90eXBlc1wiO1xuaW1wb3J0IHsgTElCX1ZFUlNJT04gfSBmcm9tIFwiLi92ZXJzaW9uLmpzXCI7XG5pbXBvcnQgKiBhcyBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCB7IEFXU0Nyb25WYWxpZGF0b3IgfSBmcm9tIFwiLi9hd3MtY3Jvbi12YWxpZGF0b3JcIlxuaW1wb3J0IHsgdHogfSBmcm9tICdtb21lbnQtdGltZXpvbmUnO1xuaW1wb3J0IHsgZ2V0RGF0YSB9IGZyb20gJ2NvdW50cnktbGlzdCc7XG5cbmZ1bmN0aW9uIGdldFRpbWVab25lc1dpdGhDdXJyZW50VGltZSgpOiB7IG1lc3NhZ2U6IHN0cmluZzsgbmFtZTogc3RyaW5nIH1bXSB7XG4gICAgY29uc3QgdGltZVpvbmVzID0gdHoubmFtZXMoKTsgLy8gR2V0IGEgbGlzdCBvZiBhbGwgdGltZXpvbmVzXG4gICAgY29uc3QgdGltZVpvbmVEYXRhID0gdGltZVpvbmVzLm1hcCh6b25lID0+IHtcbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdGltZSBpbiBlYWNoIHRpbWV6b25lXG4gICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gdHooem9uZSkuZm9ybWF0KCdZWVlZLU1NLUREIEhIOm1tJyk7XG4gICAgICAgIHJldHVybiB7IG1lc3NhZ2U6IGAke3pvbmV9OiAke2N1cnJlbnRUaW1lfWAsIG5hbWU6IHpvbmUgfTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGltZVpvbmVEYXRhO1xufVxuXG5mdW5jdGlvbiBnZXRDb3VudHJ5Q29kZXNBbmROYW1lcygpOiB7IG1lc3NhZ2U6IHN0cmluZzsgbmFtZTogc3RyaW5nIH1bXSB7XG4gICAgLy8gVXNlIGNvdW50cnktbGlzdCB0byBnZXQgYW4gYXJyYXkgb2YgY291bnRyaWVzIHdpdGggdGhlaXIgY29kZXMgYW5kIG5hbWVzXG4gICAgY29uc3QgY291bnRyaWVzID0gZ2V0RGF0YSgpO1xuXG4gICAgLy8gTWFwIHRoZSBjb3VudHJ5IGRhdGEgdG8gbWF0Y2ggdGhlIGRlc2lyZWQgb3V0cHV0IHN0cnVjdHVyZVxuICAgIGNvbnN0IGNvdW50cnlJbmZvID0gY291bnRyaWVzLm1hcCgoeyBjb2RlLCBuYW1lIH0pID0+IHtcbiAgICAgICAgcmV0dXJuIHsgbWVzc2FnZTogYCR7bmFtZX0gKCR7Y29kZX0pYCwgbmFtZTogY29kZSB9O1xuICAgIH0pO1xuICAgIHJldHVybiBjb3VudHJ5SW5mbztcbn1cblxuZnVuY3Rpb24gaXNWYWxpZERhdGUoZGF0ZVN0cmluZzogc3RyaW5nKTogYm9vbGVhbiB7XG4gIC8vIENoZWNrIHRoZSBwYXR0ZXJuIFlZWVkvTU0vRERcbiAgY29uc3QgcmVnZXggPSAvXlxcZHs0fS0oMFsxLTldfDFbMC0yXSktKDBbMS05XXxbMTJdWzAtOV18M1swMV0pJC87XG4gIGlmICghcmVnZXgudGVzdChkYXRlU3RyaW5nKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFBhcnNlIHRoZSBkYXRlIHBhcnRzIHRvIGludGVnZXJzXG4gIGNvbnN0IHBhcnRzID0gZGF0ZVN0cmluZy5zcGxpdChcIi1cIik7XG4gIGNvbnN0IHllYXIgPSBwYXJzZUludChwYXJ0c1swXSwgMTApO1xuICBjb25zdCBtb250aCA9IHBhcnNlSW50KHBhcnRzWzFdLCAxMCkgLSAxOyAvLyBNb250aCBpcyAwLWluZGV4ZWRcbiAgY29uc3QgZGF5ID0gcGFyc2VJbnQocGFydHNbMl0sIDEwKTtcblxuICAvLyBDaGVjayB0aGUgZGF0ZSB2YWxpZGl0eVxuICBjb25zdCBkYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGgsIGRheSk7XG4gIGlmIChkYXRlLmdldEZ1bGxZZWFyKCkgIT09IHllYXIgfHwgZGF0ZS5nZXRNb250aCgpICE9PSBtb250aCB8fCBkYXRlLmdldERhdGUoKSAhPT0gZGF5KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIFxuICAvLyBDaGVjayBpZiB0aGUgZGF0ZSBpcyBpbiB0aGUgZnV0dXJlIGNvbXBhcmVkIHRvIHRoZSBjdXJyZW50IGRhdGUgYXQgMDA6MDA6MDBcbiAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xuICB0b2RheS5zZXRIb3VycygwLCAwLCAwLCAwKTtcbiAgaWYgKGRhdGUgPD0gdG9kYXkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuY29uc3QgdGltZVpvbmVEYXRhID0gZ2V0VGltZVpvbmVzV2l0aEN1cnJlbnRUaW1lKCk7XG5jb25zdCBjZkNvdW50cmllcyA9IGdldENvdW50cnlDb2Rlc0FuZE5hbWVzKCk7XG5cbmNvbnN0IGlhbVJvbGVSZWdFeHAgPSBSZWdFeHAoL2Fybjphd3M6aWFtOjpcXGQrOnJvbGVcXC9bXFx3LV9dKy8pO1xuY29uc3Qga2VuZHJhSWRSZWdFeHAgPSBSZWdFeHAoL15cXHd7OH0tXFx3ezR9LVxcd3s0fS1cXHd7NH0tXFx3ezEyfSQvKTtcblxuY29uc3QgZW1iZWRkaW5nTW9kZWxzID0gWyAgXG4gIHtcbiAgICBwcm92aWRlcjogXCJiZWRyb2NrXCIsXG4gICAgbmFtZTogXCJhbWF6b24udGl0YW4tZW1iZWQtdGV4dC12MVwiLFxuICAgIGRpbWVuc2lvbnM6IDE1MzYsXG4gIH0sXG4gIC8vU3VwcG9ydCBmb3IgaW5wdXRJbWFnZSBpcyBub3QgeWV0IGltcGxlbWVudGVkIGZvciBhbWF6b24udGl0YW4tZW1iZWQtaW1hZ2UtdjFcbiAge1xuICAgIHByb3ZpZGVyOiBcImJlZHJvY2tcIixcbiAgICBuYW1lOiBcImFtYXpvbi50aXRhbi1lbWJlZC1pbWFnZS12MVwiLFxuICAgIGRpbWVuc2lvbnM6IDEwMjQsXG4gIH0sXG4gIHtcbiAgICBwcm92aWRlcjogXCJiZWRyb2NrXCIsXG4gICAgbmFtZTogXCJjb2hlcmUuZW1iZWQtZW5nbGlzaC12M1wiLFxuICAgIGRpbWVuc2lvbnM6IDEwMjQsXG4gIH0sXG4gIHtcbiAgICBwcm92aWRlcjogXCJiZWRyb2NrXCIsXG4gICAgbmFtZTogXCJjb2hlcmUuZW1iZWQtbXVsdGlsaW5ndWFsLXYzXCIsXG4gICAgZGltZW5zaW9uczogMTAyNCxcbiAgfVxuXTtcblxuLyoqXG4gKiBNYWluIGVudHJ5IHBvaW50XG4gKi9cblxuKGFzeW5jICgpID0+IHtcbiAgbGV0IHByb2dyYW0gPSBuZXcgQ29tbWFuZCgpLmRlc2NyaXB0aW9uKFxuICAgIFwiQ3JlYXRlcyBhIG5ldyBjaGF0Ym90IGNvbmZpZ3VyYXRpb25cIlxuICApO1xuICBwcm9ncmFtLnZlcnNpb24oTElCX1ZFUlNJT04pO1xuXG4gIHByb2dyYW0ub3B0aW9uKFwiLXAsIC0tcHJlZml4IDxwcmVmaXg+XCIsIFwiVGhlIHByZWZpeCBmb3IgdGhlIHN0YWNrXCIpO1xuXG4gIHByb2dyYW0uYWN0aW9uKGFzeW5jIChvcHRpb25zKSA9PiB7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoXCIuL2Jpbi9jb25maWcuanNvblwiKSkge1xuICAgICAgY29uc3QgY29uZmlnOiBTeXN0ZW1Db25maWcgPSBKU09OLnBhcnNlKFxuICAgICAgICBmcy5yZWFkRmlsZVN5bmMoXCIuL2Jpbi9jb25maWcuanNvblwiKS50b1N0cmluZyhcInV0ZjhcIilcbiAgICAgICk7XG4gICAgICBvcHRpb25zLnByZWZpeCA9IGNvbmZpZy5wcmVmaXg7XG4gICAgICBvcHRpb25zLnZwY0lkID0gY29uZmlnLnZwYz8udnBjSWQ7XG4gICAgICBvcHRpb25zLmNyZWF0ZVZwY0VuZHBvaW50cyA9IGNvbmZpZy52cGM/LmNyZWF0ZVZwY0VuZHBvaW50cztcbiAgICAgIG9wdGlvbnMucHJpdmF0ZVdlYnNpdGUgPSBjb25maWcucHJpdmF0ZVdlYnNpdGU7XG4gICAgICBvcHRpb25zLmNlcnRpZmljYXRlID0gY29uZmlnLmNlcnRpZmljYXRlO1xuICAgICAgb3B0aW9ucy5kb21haW4gPSBjb25maWcuZG9tYWluO1xuICAgICAgb3B0aW9ucy5jZkdlb1Jlc3RyaWN0RW5hYmxlID0gY29uZmlnLmNmR2VvUmVzdHJpY3RFbmFibGU7XG4gICAgICBvcHRpb25zLmNmR2VvUmVzdHJpY3RMaXN0ID0gY29uZmlnLmNmR2VvUmVzdHJpY3RMaXN0O1xuICAgICAgb3B0aW9ucy5iZWRyb2NrRW5hYmxlID0gY29uZmlnLmJlZHJvY2s/LmVuYWJsZWQ7XG4gICAgICBvcHRpb25zLmJlZHJvY2tSZWdpb24gPSBjb25maWcuYmVkcm9jaz8ucmVnaW9uO1xuICAgICAgb3B0aW9ucy5iZWRyb2NrUm9sZUFybiA9IGNvbmZpZy5iZWRyb2NrPy5yb2xlQXJuO1xuICAgICAgb3B0aW9ucy5zYWdlbWFrZXJNb2RlbHMgPSBjb25maWcubGxtcz8uc2FnZW1ha2VyID8/IFtdO1xuICAgICAgb3B0aW9ucy5lbmFibGVTYWdlbWFrZXJNb2RlbHMgPSBjb25maWcubGxtcz8uc2FnZW1ha2VyXG4gICAgICAgID8gY29uZmlnLmxsbXM/LnNhZ2VtYWtlci5sZW5ndGggPiAwXG4gICAgICAgIDogZmFsc2U7XG4gICAgICBvcHRpb25zLmVuYWJsZVNhZ2VtYWtlck1vZGVsc1NjaGVkdWxlID0gY29uZmlnLmxsbXM/LnNhZ2VtYWtlclNjaGVkdWxlPy5lbmFibGVkO1xuICAgICAgb3B0aW9ucy50aW1lem9uZVBpY2tlciA9IGNvbmZpZy5sbG1zPy5zYWdlbWFrZXJTY2hlZHVsZT8udGltZXpvbmVQaWNrZXI7XG4gICAgICBvcHRpb25zLmVuYWJsZUNyb25Gb3JtYXQgPSBjb25maWcubGxtcz8uc2FnZW1ha2VyU2NoZWR1bGU/LmVuYWJsZUNyb25Gb3JtYXQ7XG4gICAgICBvcHRpb25zLmNyb25TYWdlbWFrZXJNb2RlbHNTY2hlZHVsZVN0YXJ0ID0gY29uZmlnLmxsbXM/LnNhZ2VtYWtlclNjaGVkdWxlPy5zYWdlbWFrZXJDcm9uU3RhcnRTY2hlZHVsZTtcbiAgICAgIG9wdGlvbnMuY3JvblNhZ2VtYWtlck1vZGVsc1NjaGVkdWxlU3RvcCA9IGNvbmZpZy5sbG1zPy5zYWdlbWFrZXJTY2hlZHVsZT8uc2FnZW1ha2VyQ3JvblN0b3BTY2hlZHVsZTtcbiAgICAgIG9wdGlvbnMuZGF5c0ZvclNjaGVkdWxlID0gY29uZmlnLmxsbXM/LnNhZ2VtYWtlclNjaGVkdWxlPy5kYXlzRm9yU2NoZWR1bGU7XG4gICAgICBvcHRpb25zLnNjaGVkdWxlU3RhcnRUaW1lID0gY29uZmlnLmxsbXM/LnNhZ2VtYWtlclNjaGVkdWxlPy5zY2hlZHVsZVN0YXJ0VGltZTtcbiAgICAgIG9wdGlvbnMuc2NoZWR1bGVTdG9wVGltZSA9IGNvbmZpZy5sbG1zPy5zYWdlbWFrZXJTY2hlZHVsZT8uc2NoZWR1bGVTdG9wVGltZTtcbiAgICAgIG9wdGlvbnMuZW5hYmxlU2NoZWR1bGVFbmREYXRlID0gY29uZmlnLmxsbXM/LnNhZ2VtYWtlclNjaGVkdWxlPy5lbmFibGVTY2hlZHVsZUVuZERhdGU7XG4gICAgICBvcHRpb25zLnN0YXJ0U2NoZWR1bGVFbmREYXRlID0gY29uZmlnLmxsbXM/LnNhZ2VtYWtlclNjaGVkdWxlPy5zdGFydFNjaGVkdWxlRW5kRGF0ZTtcbiAgICAgIG9wdGlvbnMuZW5hYmxlUmFnID0gY29uZmlnLnJhZy5lbmFibGVkO1xuICAgICAgb3B0aW9ucy5yYWdzVG9FbmFibGUgPSBPYmplY3Qua2V5cyhjb25maWcucmFnLmVuZ2luZXMgPz8ge30pLmZpbHRlcihcbiAgICAgICAgKHY6IHN0cmluZykgPT4gKGNvbmZpZy5yYWcuZW5naW5lcyBhcyBhbnkpW3ZdLmVuYWJsZWRcbiAgICAgICk7XG4gICAgICBpZiAoXG4gICAgICAgIG9wdGlvbnMucmFnc1RvRW5hYmxlLmluY2x1ZGVzKFwia2VuZHJhXCIpICYmXG4gICAgICAgICFjb25maWcucmFnLmVuZ2luZXMua2VuZHJhLmNyZWF0ZUluZGV4XG4gICAgICApIHtcbiAgICAgICAgb3B0aW9ucy5yYWdzVG9FbmFibGUucG9wKFwia2VuZHJhXCIpO1xuICAgICAgfVxuICAgICAgb3B0aW9ucy5lbWJlZGRpbmdzID0gY29uZmlnLnJhZy5lbWJlZGRpbmdzTW9kZWxzLm1hcCgobTogYW55KSA9PiBtLm5hbWUpO1xuICAgICAgb3B0aW9ucy5kZWZhdWx0RW1iZWRkaW5nID0gKGNvbmZpZy5yYWcuZW1iZWRkaW5nc01vZGVscyA/PyBbXSkuZmlsdGVyKFxuICAgICAgICAobTogYW55KSA9PiBtLmRlZmF1bHRcbiAgICAgIClbMF0ubmFtZTtcbiAgICAgIG9wdGlvbnMua2VuZHJhRXh0ZXJuYWwgPSBjb25maWcucmFnLmVuZ2luZXMua2VuZHJhLmV4dGVybmFsO1xuICAgICAgb3B0aW9ucy5rZW5kcmFFbnRlcnByaXNlID0gY29uZmlnLnJhZy5lbmdpbmVzLmtlbmRyYS5lbnRlcnByaXNlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgYXdhaXQgcHJvY2Vzc0NyZWF0ZU9wdGlvbnMob3B0aW9ucyk7XG4gICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJDb3VsZCBub3QgY29tcGxldGUgdGhlIG9wZXJhdGlvbi5cIik7XG4gICAgICBjb25zb2xlLmVycm9yKGVyci5tZXNzYWdlKTtcbiAgICAgIHByb2Nlc3MuZXhpdCgxKTtcbiAgICB9XG4gIH0pO1xuXG4gIHByb2dyYW0ucGFyc2UocHJvY2Vzcy5hcmd2KTtcbn0pKCk7XG5cbmZ1bmN0aW9uIGNyZWF0ZUNvbmZpZyhjb25maWc6IGFueSk6IHZvaWQge1xuICBmcy53cml0ZUZpbGVTeW5jKFwiLi9iaW4vY29uZmlnLmpzb25cIiwgSlNPTi5zdHJpbmdpZnkoY29uZmlnLCB1bmRlZmluZWQsIDIpKTtcbiAgY29uc29sZS5sb2coXCJDb25maWd1cmF0aW9uIHdyaXR0ZW4gdG8gLi9iaW4vY29uZmlnLmpzb25cIik7XG59XG5cbi8qKlxuICogUHJvbXB0cyB0aGUgdXNlciBmb3IgbWlzc2luZyBvcHRpb25zXG4gKlxuICogQHBhcmFtIG9wdGlvbnMgT3B0aW9ucyBwcm92aWRlZCB2aWEgdGhlIENMSVxuICogQHJldHVybnMgVGhlIGNvbXBsZXRlIG9wdGlvbnNcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0NyZWF0ZU9wdGlvbnMob3B0aW9uczogYW55KTogUHJvbWlzZTx2b2lkPiB7XG4gIGxldCBxdWVzdGlvbnMgPSBbXG4gICAge1xuICAgICAgdHlwZTogXCJpbnB1dFwiLFxuICAgICAgbmFtZTogXCJwcmVmaXhcIixcbiAgICAgIG1lc3NhZ2U6IFwiUHJlZml4IHRvIGRpZmZlcmVudGlhdGUgdGhpcyBkZXBsb3ltZW50XCIsXG4gICAgICBpbml0aWFsOiBvcHRpb25zLnByZWZpeCxcbiAgICAgIGFza0Fuc3dlcmVkOiBmYWxzZSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwiY29uZmlybVwiLFxuICAgICAgbmFtZTogXCJleGlzdGluZ1ZwY1wiLFxuICAgICAgbWVzc2FnZTogXCJEbyB5b3Ugd2FudCB0byB1c2UgZXhpc3RpbmcgdnBjPyAoc2VsZWN0aW5nIGZhbHNlIHdpbGwgY3JlYXRlIGEgbmV3IHZwYylcIixcbiAgICAgIGluaXRpYWw6IG9wdGlvbnMudnBjSWQgPyB0cnVlIDogZmFsc2UsXG4gICAgfSxcbiAgICB7XG4gICAgICB0eXBlOiBcImlucHV0XCIsXG4gICAgICBuYW1lOiBcInZwY0lkXCIsXG4gICAgICBtZXNzYWdlOiBcIlNwZWNpZnkgZXhpc3RpbmcgVnBjSWQgKHZwYy14eHh4eHh4eHh4eHh4eHh4eClcIixcbiAgICAgIGluaXRpYWw6IG9wdGlvbnMudnBjSWQsXG4gICAgICB2YWxpZGF0ZSh2cGNJZDogc3RyaW5nKSB7XG4gICAgICAgIHJldHVybiAoKHRoaXMgYXMgYW55KS5za2lwcGVkIHx8IFJlZ0V4cCgvXnZwYy1bMC05YS1mXXs4LDE3fSQvaSkudGVzdCh2cGNJZCkpID9cbiAgICAgICAgICB0cnVlIDogJ0VudGVyIGEgdmFsaWQgVnBjSWQgaW4gdnBjLXh4eHh4eHh4eHh4IGZvcm1hdCdcbiAgICAgIH0sXG4gICAgICBza2lwKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5leGlzdGluZ1ZwYztcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICB0eXBlOiBcImNvbmZpcm1cIixcbiAgICAgIG5hbWU6IFwiY3JlYXRlVnBjRW5kcG9pbnRzXCIsXG4gICAgICBtZXNzYWdlOiBcIkRvIHlvdSB3YW50IGNyZWF0ZSBWUEMgRW5kcG9pbnRzP1wiLFxuICAgICAgaW5pdGlhbDogb3B0aW9ucy5jcmVhdGVWcGNFbmRwb2ludHMgfHwgZmFsc2UsXG4gICAgICBza2lwKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5leGlzdGluZ1ZwYztcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICB0eXBlOiBcImNvbmZpcm1cIixcbiAgICAgIG5hbWU6IFwicHJpdmF0ZVdlYnNpdGVcIixcbiAgICAgIG1lc3NhZ2U6XG4gICAgICAgIFwiRG8geW91IHdhbnQgdG8gZGVwbG95IGEgcHJpdmF0ZSB3ZWJzaXRlPyBJLmUgb25seSBhY2Nlc3NpYmxlIGluIFZQQ1wiLFxuICAgICAgaW5pdGlhbDogb3B0aW9ucy5wcml2YXRlV2Vic2l0ZSB8fCBmYWxzZSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwiY29uZmlybVwiLFxuICAgICAgbmFtZTogXCJjdXN0b21QdWJsaWNEb21haW5cIixcbiAgICAgIG1lc3NhZ2U6XG4gICAgICAgIFwiRG8geW91IHdhbnQgdG8gcHJvdmlkZSBhIGN1c3RvbSBkb21haW4gbmFtZSBhbmQgY29ycmVzcG9uZGluZyBjZXJ0aWZpY2F0ZSBhcm4gZm9yIHRoZSBwdWJsaWMgd2Vic2l0ZSA/XCIsXG4gICAgICBpbml0aWFsOiBvcHRpb25zLmN1c3RvbVB1YmxpY0RvbWFpbiB8fCBmYWxzZSxcbiAgICAgIHNraXAoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMucHJpdmF0ZVdlYnNpdGUgO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwiaW5wdXRcIixcbiAgICAgIG5hbWU6IFwiY2VydGlmaWNhdGVcIixcbiAgICAgIG1lc3NhZ2UoKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKCh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5jdXN0b21QdWJsaWNEb21haW4pIHtcbiAgICAgICAgICByZXR1cm4gXCJBQ00gY2VydGlmaWNhdGUgQVJOIHdpdGggY3VzdG9tIGRvbWFpbiBmb3IgcHVibGljIHdlYnNpdGUuIE5vdGUgdGhhdCB0aGUgY2VydGlmaWNhdGUgbXVzdCByZXNpZGVzIGluIHVzLWVhc3QtMVwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcIkFDTSBjZXJ0aWZpY2F0ZSBBUk5cIjtcbiAgICAgIH0sXG4gICAgICBpbml0aWFsOiBvcHRpb25zLmNlcnRpZmljYXRlLFxuICAgICAgc2tpcCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMucHJpdmF0ZVdlYnNpdGUgJiYgISh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5jdXN0b21QdWJsaWNEb21haW47XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogXCJpbnB1dFwiLFxuICAgICAgbmFtZTogXCJkb21haW5cIixcbiAgICAgIG1lc3NhZ2UoKTogc3RyaW5nIHtcbiAgICAgICAgaWYgKCh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5jdXN0b21QdWJsaWNEb21haW4pIHtcbiAgICAgICAgICByZXR1cm4gXCJDdXN0b20gRG9tYWluIGZvciBwdWJsaWMgd2Vic2l0ZVwiO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBcIkRvbWFpbiBmb3IgcHJpdmF0ZSB3ZWJzaXRlXCI7XG4gICAgICB9LFxuICAgICAgaW5pdGlhbDogb3B0aW9ucy5kb21haW4sXG4gICAgICBza2lwKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5wcml2YXRlV2Vic2l0ZSAmJiAhKHRoaXMgYXMgYW55KS5zdGF0ZS5hbnN3ZXJzLmN1c3RvbVB1YmxpY0RvbWFpbjtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICB0eXBlOiBcImNvbmZpcm1cIixcbiAgICAgIG5hbWU6IFwiY2ZHZW9SZXN0cmljdEVuYWJsZVwiLFxuICAgICAgbWVzc2FnZTogXCJEbyB3YW50IHRvIHJlc3RyaWN0IGFjY2VzcyB0byB0aGUgd2Vic2l0ZSAoQ0YgRGlzdHJpYnV0aW9uKSB0byBvbmx5IGEgY291bnRyeSBvciBjb3VudHJpZXM/XCIsXG4gICAgICBpbml0aWFsOiBmYWxzZSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwibXVsdGlzZWxlY3RcIixcbiAgICAgIG5hbWU6IFwiY2ZHZW9SZXN0cmljdExpc3RcIixcbiAgICAgIGhpbnQ6IFwiU1BBQ0UgdG8gc2VsZWN0LCBFTlRFUiB0byBjb25maXJtIHNlbGVjdGlvblwiLFxuICAgICAgbWVzc2FnZTogXCJXaGljaCBjb3VudHJpZXMgZG8geW91IHdpc2ggdG8gQUxMT1cgYWNjZXNzP1wiLFxuICAgICAgY2hvaWNlczogY2ZDb3VudHJpZXMsXG4gICAgICB2YWxpZGF0ZShjaG9pY2VzOiBhbnkpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGFzIGFueSkuc2tpcHBlZCB8fCBjaG9pY2VzLmxlbmd0aCA+IDBcbiAgICAgICAgICA/IHRydWVcbiAgICAgICAgICA6IFwiWW91IG5lZWQgdG8gc2VsZWN0IGF0IGxlYXN0IG9uZSBjb3VudHJ5XCI7XG4gICAgICB9LFxuICAgICAgc2tpcCgpOiBib29sZWFuIHtcbiAgICAgICAgKHRoaXMgYXMgYW55KS5zdGF0ZS5fY2hvaWNlcyA9ICh0aGlzIGFzIGFueSkuc3RhdGUuY2hvaWNlcztcbiAgICAgICAgcmV0dXJuICEodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMuY2ZHZW9SZXN0cmljdEVuYWJsZTtcbiAgICAgIH0sXG4gICAgICBpbml0aWFsOiBvcHRpb25zLmNmR2VvUmVzdHJpY3RMaXN0IHx8IFtdLFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogXCJjb25maXJtXCIsXG4gICAgICBuYW1lOiBcImJlZHJvY2tFbmFibGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiRG8geW91IGhhdmUgYWNjZXNzIHRvIEJlZHJvY2sgYW5kIHdhbnQgdG8gZW5hYmxlIGl0XCIsXG4gICAgICBpbml0aWFsOiB0cnVlLFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogXCJzZWxlY3RcIixcbiAgICAgIG5hbWU6IFwiYmVkcm9ja1JlZ2lvblwiLFxuICAgICAgbWVzc2FnZTogXCJSZWdpb24gd2hlcmUgQmVkcm9jayBpcyBhdmFpbGFibGVcIixcbiAgICAgIGNob2ljZXM6IE9iamVjdC52YWx1ZXMoU3VwcG9ydGVkQmVkcm9ja1JlZ2lvbiksXG4gICAgICBpbml0aWFsOiBvcHRpb25zLmJlZHJvY2tSZWdpb24gPz8gXCJ1cy1lYXN0LTFcIixcbiAgICAgIHNraXAoKSB7XG4gICAgICAgIHJldHVybiAhKHRoaXMgYXMgYW55KS5zdGF0ZS5hbnN3ZXJzLmJlZHJvY2tFbmFibGU7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogXCJpbnB1dFwiLFxuICAgICAgbmFtZTogXCJiZWRyb2NrUm9sZUFyblwiLFxuICAgICAgbWVzc2FnZTpcbiAgICAgICAgXCJDcm9zcyBhY2NvdW50IHJvbGUgYXJuIHRvIGludm9rZSBCZWRyb2NrIC0gbGVhdmUgZW1wdHkgaWYgQmVkcm9jayBpcyBpbiBzYW1lIGFjY291bnRcIixcbiAgICAgIHZhbGlkYXRlOiAodjogc3RyaW5nKSA9PiB7XG4gICAgICAgIGNvbnN0IHZhbGlkID0gaWFtUm9sZVJlZ0V4cC50ZXN0KHYpO1xuICAgICAgICByZXR1cm4gdi5sZW5ndGggPT09IDAgfHwgdmFsaWQ7XG4gICAgICB9LFxuICAgICAgaW5pdGlhbDogb3B0aW9ucy5iZWRyb2NrUm9sZUFybiB8fCBcIlwiLFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogXCJjb25maXJtXCIsXG4gICAgICBuYW1lOiBcImVuYWJsZVNhZ2VtYWtlck1vZGVsc1wiLFxuICAgICAgbWVzc2FnZTogXCJEbyB5b3Ugd2FudCB0byB1c2UgYW55IFNhZ2VtYWtlciBNb2RlbHNcIixcbiAgICAgIGluaXRpYWw6IG9wdGlvbnMuZW5hYmxlU2FnZW1ha2VyTW9kZWxzIHx8IGZhbHNlLFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogXCJtdWx0aXNlbGVjdFwiLFxuICAgICAgbmFtZTogXCJzYWdlbWFrZXJNb2RlbHNcIixcbiAgICAgIGhpbnQ6IFwiU1BBQ0UgdG8gc2VsZWN0LCBFTlRFUiB0byBjb25maXJtIHNlbGVjdGlvbiBbZGVub3RlcyBpbnN0YW5jZSBzaXplIHRvIGhvc3QgbW9kZWxdXCIsXG4gICAgICBtZXNzYWdlOiBcIldoaWNoIFNhZ2VNYWtlciBNb2RlbHMgZG8geW91IHdhbnQgdG8gZW5hYmxlXCIsXG4gICAgICBjaG9pY2VzOiBPYmplY3QudmFsdWVzKFN1cHBvcnRlZFNhZ2VNYWtlck1vZGVscyksXG4gICAgICBpbml0aWFsOlxuICAgICAgICAob3B0aW9ucy5zYWdlbWFrZXJNb2RlbHMgPz8gW10pLmZpbHRlcigobTogc3RyaW5nKSA9PlxuICAgICAgICAgIE9iamVjdC52YWx1ZXMoU3VwcG9ydGVkU2FnZU1ha2VyTW9kZWxzKVxuICAgICAgICAgICAgLm1hcCgoeCkgPT4geC50b1N0cmluZygpKVxuICAgICAgICAgICAgLmluY2x1ZGVzKG0pXG4gICAgICAgICkgfHwgW10sXG4gICAgICB2YWxpZGF0ZShjaG9pY2VzOiBhbnkpIHtcbiAgICAgICAgLy9UcmFwIGZvciBuZXcgcGxheWVycywgdmFsaWRhdGUgYWx3YXlzIHJ1bnMgZXZlbiBpZiBza2lwcGVkIGlzIHRydWVcbiAgICAgICAgLy8gU28gbmVlZCB0byBoYW5kbGUgdmFsaWRhdGUgYmFpbCBvdXQgaWYgc2tpcHBlZCBpcyB0cnVlXG4gICAgICAgIHJldHVybiAodGhpcyBhcyBhbnkpLnNraXBwZWQgfHwgY2hvaWNlcy5sZW5ndGggPiAwXG4gICAgICAgICAgPyB0cnVlXG4gICAgICAgICAgOiBcIllvdSBuZWVkIHRvIHNlbGVjdCBhdCBsZWFzdCBvbmUgbW9kZWxcIjtcbiAgICAgIH0sXG4gICAgICBza2lwKCk6IGJvb2xlYW4ge1xuICAgICAgICAodGhpcyBhcyBhbnkpLnN0YXRlLl9jaG9pY2VzID0gKHRoaXMgYXMgYW55KS5zdGF0ZS5jaG9pY2VzO1xuICAgICAgICByZXR1cm4gISh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5lbmFibGVTYWdlbWFrZXJNb2RlbHM7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogXCJjb25maXJtXCIsXG4gICAgICBuYW1lOiBcImVuYWJsZVNhZ2VtYWtlck1vZGVsc1NjaGVkdWxlXCIsXG4gICAgICBtZXNzYWdlOiBcIkRvIHlvdSB3YW50IHRvIGVuYWJsZSBhIHN0YXJ0L3N0b3Agc2NoZWR1bGUgZm9yIHNhZ2VtYWtlciBtb2RlbHM/XCIsXG4gICAgICBpbml0aWFsKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gKG9wdGlvbnMuZW5hYmxlU2FnZW1ha2VyTW9kZWxzU2NoZWR1bGUgJiYgKHRoaXMgYXMgYW55KS5zdGF0ZS5hbnN3ZXJzLmVuYWJsZVNhZ2VtYWtlck1vZGVscykgfHwgZmFsc2U7XG4gICAgICB9LFxuICAgICAgc2tpcCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMuZW5hYmxlU2FnZW1ha2VyTW9kZWxzO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwiQXV0b0NvbXBsZXRlXCIsXG4gICAgICBuYW1lOiBcInRpbWV6b25lUGlja2VyXCIsXG4gICAgICBoaW50OiBcInN0YXJ0IHR5cGluZyB0byBhdXRvIGNvbXBsZXRlLCBFTlRFUiB0byBjb25maXJtIHNlbGVjdGlvblwiLFxuICAgICAgbWVzc2FnZTogXCJXaGljaCBUaW1lWm9uZSBkbyB5b3Ugd2FudCB0byBydW4gdGhlIHNjaGVkdWxlIGluP1wiLFxuICAgICAgY2hvaWNlczogdGltZVpvbmVEYXRhLFxuICAgICAgdmFsaWRhdGUoY2hvaWNlczogYW55KSB7XG4gICAgICAgIHJldHVybiAodGhpcyBhcyBhbnkpLnNraXBwZWQgfHwgY2hvaWNlcy5sZW5ndGggPiAwXG4gICAgICAgICAgPyB0cnVlXG4gICAgICAgICAgOiBcIllvdSBuZWVkIHRvIHNlbGVjdCBhdCBsZWFzdCBvbmUgdGltZSB6b25lXCI7XG4gICAgICB9LFxuICAgICAgc2tpcCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMuZW5hYmxlU2FnZW1ha2VyTW9kZWxzU2NoZWR1bGU7XG4gICAgICB9LFxuICAgICAgaW5pdGlhbDogb3B0aW9ucy50aW1lem9uZVBpY2tlciB8fCBbXSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwic2VsZWN0XCIsXG4gICAgICBuYW1lOiBcImVuYWJsZUNyb25Gb3JtYXRcIixcbiAgICAgIGNob2ljZXM6IFtcbiAgICAgICAgeyBtZXNzYWdlOiBcIlNpbXBsZSAtIFdpemFyZCBsZWFkXCIsIG5hbWU6IFwic2ltcGxlXCIgfSxcbiAgICAgICAgeyBtZXNzYWdlOiBcIkFkdmFuY2VkIC0gUHJvdmlkZSBjcm9uIGV4cHJlc3Npb25cIiwgbmFtZTogXCJjcm9uXCIgfSxcbiAgICAgIF0sXG4gICAgICBtZXNzYWdlOiBcIkhvdyBkbyB5b3Ugd2FudCB0byBzZXQgdGhlIHNjaGVkdWxlP1wiLFxuICAgICAgaW5pdGlhbDogb3B0aW9ucy5lbmFibGVDcm9uRm9ybWF0IHx8IFwiXCIsXG4gICAgICBza2lwKCk6IGJvb2xlYW4ge1xuICAgICAgICAodGhpcyBhcyBhbnkpLnN0YXRlLl9jaG9pY2VzID0gKHRoaXMgYXMgYW55KS5zdGF0ZS5jaG9pY2VzO1xuICAgICAgICByZXR1cm4gISh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5lbmFibGVTYWdlbWFrZXJNb2RlbHNTY2hlZHVsZTtcbiAgICAgIH0sXG4gICAgfSxcbiAgICB7XG4gICAgICB0eXBlOiBcImlucHV0XCIsXG4gICAgICBuYW1lOiBcInNhZ2VtYWtlckNyb25TdGFydFNjaGVkdWxlXCIsXG4gICAgICBoaW50OiBcIlRoaXMgY3JvbiBmb3JtYXQgaXMgdXNpbmcgQVdTIGV2ZW50YnJpZGdlIGNyb24gc3ludGF4IHNlZSBkb2NzIGZvciBtb3JlIGluZm9ybWF0aW9uXCIsXG4gICAgICBtZXNzYWdlOiBcIlN0YXJ0IHNjaGVkdWxlIGZvciBTYWdtYWtlciBtb2RlbHMgZXhwcmVzc2VkIGluIFVUQyBBV1MgY3JvbiBmb3JtYXRcIixcbiAgICAgIHNraXAoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhKHRoaXMgYXMgYW55KS5zdGF0ZS5hbnN3ZXJzLmVuYWJsZUNyb25Gb3JtYXQuaW5jbHVkZXMoXCJjcm9uXCIpO1xuICAgICAgfSxcbiAgICAgIHZhbGlkYXRlKHY6IHN0cmluZykge1xuICAgICAgICBpZiAoKHRoaXMgYXMgYW55KS5za2lwcGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgIEFXU0Nyb25WYWxpZGF0b3IudmFsaWRhdGUodilcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKXtcbiAgICAgICAgICAgIHJldHVybiBlcnJvci5tZXNzYWdlXG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBmYWxzZVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgaW5pdGlhbDogb3B0aW9ucy5jcm9uU2FnZW1ha2VyTW9kZWxzU2NoZWR1bGVTdGFydCxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwiaW5wdXRcIixcbiAgICAgIG5hbWU6IFwic2FnZW1ha2VyQ3JvblN0b3BTY2hlZHVsZVwiLFxuICAgICAgaGludDogXCJUaGlzIGNyb24gZm9ybWF0IGlzIHVzaW5nIEFXUyBldmVudGJyaWRnZSBjcm9uIHN5bnRheCBzZWUgZG9jcyBmb3IgbW9yZSBpbmZvcm1hdGlvblwiLFxuICAgICAgbWVzc2FnZTogXCJTdG9wIHNjaGVkdWxlIGZvciBTYWdtYWtlciBtb2RlbHMgZXhwcmVzc2VkIGluIEFXUyBjcm9uIGZvcm1hdFwiLFxuICAgICAgc2tpcCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMuZW5hYmxlQ3JvbkZvcm1hdC5pbmNsdWRlcyhcImNyb25cIik7XG4gICAgICB9LFxuICAgICAgdmFsaWRhdGUodjogc3RyaW5nKSB7XG4gICAgICAgIGlmICgodGhpcyBhcyBhbnkpLnNraXBwZWQpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgQVdTQ3JvblZhbGlkYXRvci52YWxpZGF0ZSh2KVxuICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3Ipe1xuICAgICAgICAgICAgcmV0dXJuIGVycm9yLm1lc3NhZ2VcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBpbml0aWFsOiBvcHRpb25zLmNyb25TYWdlbWFrZXJNb2RlbHNTY2hlZHVsZVN0b3AsXG4gICAgfSxcbiAgICB7XG4gICAgICB0eXBlOiBcIm11bHRpc2VsZWN0XCIsXG4gICAgICBuYW1lOiBcImRheXNGb3JTY2hlZHVsZVwiLFxuICAgICAgaGludDogXCJTUEFDRSB0byBzZWxlY3QsIEVOVEVSIHRvIGNvbmZpcm0gc2VsZWN0aW9uXCIsXG4gICAgICBtZXNzYWdlOiBcIldoaWNoIGRheXMgb2YgdGhlIHdlZWsgd291bGQgeW91IGxpa2UgdG8gcnVuIHRoZSBzY2hlZHVsZSBvbj9cIixcbiAgICAgIGNob2ljZXM6IFtcbiAgICAgICAgeyBtZXNzYWdlOiBcIlN1bmRheVwiLCBuYW1lOiBcIlNVTlwiIH0sXG4gICAgICAgIHsgbWVzc2FnZTogXCJNb25kYXlcIiwgbmFtZTogXCJNT05cIiB9LFxuICAgICAgICB7IG1lc3NhZ2U6IFwiVHVlc2RheVwiLCBuYW1lOiBcIlRVRVwiIH0sXG4gICAgICAgIHsgbWVzc2FnZTogXCJXZWRuZXNkYXlcIiwgbmFtZTogXCJXRURcIiB9LFxuICAgICAgICB7IG1lc3NhZ2U6IFwiVGh1cnNkYXlcIiwgbmFtZTogXCJUSFVcIiB9LFxuICAgICAgICB7IG1lc3NhZ2U6IFwiRnJpZGF5XCIsIG5hbWU6IFwiRlJJXCIgfSxcbiAgICAgICAgeyBtZXNzYWdlOiBcIlNhdHVyZGF5XCIsIG5hbWU6IFwiU0FUXCIgfSxcbiAgICAgIF0sXG4gICAgICB2YWxpZGF0ZShjaG9pY2VzOiBhbnkpIHtcbiAgICAgICAgcmV0dXJuICh0aGlzIGFzIGFueSkuc2tpcHBlZCB8fCBjaG9pY2VzLmxlbmd0aCA+IDBcbiAgICAgICAgICA/IHRydWVcbiAgICAgICAgICA6IFwiWW91IG5lZWQgdG8gc2VsZWN0IGF0IGxlYXN0IG9uZSBkYXlcIjtcbiAgICAgIH0sXG4gICAgICBza2lwKCk6IGJvb2xlYW4ge1xuICAgICAgICAodGhpcyBhcyBhbnkpLnN0YXRlLl9jaG9pY2VzID0gKHRoaXMgYXMgYW55KS5zdGF0ZS5jaG9pY2VzO1xuICAgICAgICBpZiAoISh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5lbmFibGVTYWdlbWFrZXJNb2RlbHNTY2hlZHVsZSl7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICEodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMuZW5hYmxlQ3JvbkZvcm1hdC5pbmNsdWRlcyhcInNpbXBsZVwiKTtcbiAgICAgIH0sXG4gICAgICBpbml0aWFsOiBvcHRpb25zLmRheXNGb3JTY2hlZHVsZSB8fCBbXSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwiaW5wdXRcIixcbiAgICAgIG5hbWU6IFwic2NoZWR1bGVTdGFydFRpbWVcIixcbiAgICAgIG1lc3NhZ2U6IFwiV2hhdCB0aW1lIG9mIGRheSBkbyB5b3Ugd2lzaCB0byBydW4gdGhlIHN0YXJ0IHNjaGVkdWxlPyBlbnRlciBpbiBISDpNTSBmb3JtYXRcIixcbiAgICAgIHZhbGlkYXRlKHY6IHN0cmluZykge1xuICAgICAgICBpZiAoKHRoaXMgYXMgYW55KS5za2lwcGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWVcbiAgICAgICAgfVxuICAgICAgICAvLyBSZWd1bGFyIGV4cHJlc3Npb24gdG8gbWF0Y2ggSEg6TU0gZm9ybWF0XG4gICAgICAgIGNvbnN0IHJlZ2V4ID0gL14oWzAtMV0/WzAtOV18MlswLTNdKTooWzAtNV0/WzAtOV0pJC87XG4gICAgICAgIHJldHVybiByZWdleC50ZXN0KHYpIHx8ICdUaW1lIG11c3QgYmUgaW4gSEg6TU0gZm9ybWF0ISc7XG4gICAgICB9LFxuICAgICAgc2tpcCgpOiBib29sZWFuIHtcbiAgICAgICAgaWYgKCEodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMuZW5hYmxlU2FnZW1ha2VyTW9kZWxzU2NoZWR1bGUpe1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAhKHRoaXMgYXMgYW55KS5zdGF0ZS5hbnN3ZXJzLmVuYWJsZUNyb25Gb3JtYXQuaW5jbHVkZXMoXCJzaW1wbGVcIik7XG4gICAgICB9LFxuICAgICAgaW5pdGlhbDogb3B0aW9ucy5zY2hlZHVsZVN0YXJ0VGltZSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwiaW5wdXRcIixcbiAgICAgIG5hbWU6IFwic2NoZWR1bGVTdG9wVGltZVwiLFxuICAgICAgbWVzc2FnZTogXCJXaGF0IHRpbWUgb2YgZGF5IGRvIHlvdSB3aXNoIHRvIHJ1biB0aGUgc3RvcCBzY2hlZHVsZT8gZW50ZXIgaW4gSEg6TU0gZm9ybWF0XCIsXG4gICAgICB2YWxpZGF0ZSh2OiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKCh0aGlzIGFzIGFueSkuc2tpcHBlZCkge1xuICAgICAgICAgIHJldHVybiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAgLy8gUmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoIEhIOk1NIGZvcm1hdFxuICAgICAgICBjb25zdCByZWdleCA9IC9eKFswLTFdP1swLTldfDJbMC0zXSk6KFswLTVdP1swLTldKSQvO1xuICAgICAgICByZXR1cm4gcmVnZXgudGVzdCh2KSB8fCAnVGltZSBtdXN0IGJlIGluIEhIOk1NIGZvcm1hdCEnO1xuICAgICAgfSxcbiAgICAgIHNraXAoKTogYm9vbGVhbiB7XG4gICAgICAgIGlmICghKHRoaXMgYXMgYW55KS5zdGF0ZS5hbnN3ZXJzLmVuYWJsZVNhZ2VtYWtlck1vZGVsc1NjaGVkdWxlKXtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gISh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5lbmFibGVDcm9uRm9ybWF0LmluY2x1ZGVzKFwic2ltcGxlXCIpO1xuICAgICAgfSxcbiAgICAgIGluaXRpYWw6IG9wdGlvbnMuc2NoZWR1bGVTdG9wVGltZSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwiY29uZmlybVwiLFxuICAgICAgbmFtZTogXCJlbmFibGVTY2hlZHVsZUVuZERhdGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiV291bGQgeW91IGxpa2UgdG8gc2V0IGFuIGVuZCBkYXRhIGZvciB0aGUgc3RhcnQgc2NoZWR1bGU/IChhZnRlciB0aGlzIGRhdGUgdGhlIG1vZGVscyB3b3VsZCBubyBsb25nZXIgc3RhcnQpXCIsXG4gICAgICBpbml0aWFsOiBvcHRpb25zLmVuYWJsZVNjaGVkdWxlRW5kRGF0ZSB8fCBmYWxzZSxcbiAgICAgIHNraXAoKTogYm9vbGVhbiB7XG4gICAgICAgIHJldHVybiAhKHRoaXMgYXMgYW55KS5zdGF0ZS5hbnN3ZXJzLmVuYWJsZVNhZ2VtYWtlck1vZGVsc1NjaGVkdWxlO1xuICAgICAgfSxcbiAgICB9LFxuICAgIHtcbiAgICAgIHR5cGU6IFwiaW5wdXRcIixcbiAgICAgIG5hbWU6IFwic3RhcnRTY2hlZHVsZUVuZERhdGVcIixcbiAgICAgIG1lc3NhZ2U6IFwiQWZ0ZXIgdGhpcyBkYXRlIHRoZSBtb2RlbHMgd2lsbCBubyBsb25nZXIgc3RhcnRcIixcbiAgICAgIGhpbnQ6IFwiWVlZWS1NTS1ERFwiLFxuICAgICAgdmFsaWRhdGUodjogc3RyaW5nKSB7XG4gICAgICAgIGlmICgodGhpcyBhcyBhbnkpLnNraXBwZWQpIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpc1ZhbGlkRGF0ZSh2KSB8fCAnVGhlIGRhdGUgbXVzdCBiZSBpbiBmb3JtYXQgWVlZWS9NTS9ERCBhbmQgYmUgaW4gdGhlIGZ1dHVyZSc7XG4gICAgICB9LFxuICAgICAgc2tpcCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMuZW5hYmxlU2NoZWR1bGVFbmREYXRlO1xuICAgICAgfSxcbiAgICAgIGluaXRpYWw6IG9wdGlvbnMuc3RhcnRTY2hlZHVsZUVuZERhdGUgfHwgZmFsc2UsXG4gICAgfSxcbiAgICB7XG4gICAgICB0eXBlOiBcImNvbmZpcm1cIixcbiAgICAgIG5hbWU6IFwiZW5hYmxlUmFnXCIsXG4gICAgICBtZXNzYWdlOiBcIkRvIHlvdSB3YW50IHRvIGVuYWJsZSBSQUdcIixcbiAgICAgIGluaXRpYWw6IG9wdGlvbnMuZW5hYmxlUmFnIHx8IGZhbHNlLFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogXCJtdWx0aXNlbGVjdFwiLFxuICAgICAgbmFtZTogXCJyYWdzVG9FbmFibGVcIixcbiAgICAgIGhpbnQ6IFwiU1BBQ0UgdG8gc2VsZWN0LCBFTlRFUiB0byBjb25maXJtIHNlbGVjdGlvblwiLFxuICAgICAgbWVzc2FnZTogXCJXaGljaCBkYXRhc3RvcmVzIGRvIHlvdSB3YW50IHRvIGVuYWJsZSBmb3IgUkFHXCIsXG4gICAgICBjaG9pY2VzOiBbXG4gICAgICAgIHsgbWVzc2FnZTogXCJBdXJvcmFcIiwgbmFtZTogXCJhdXJvcmFcIiB9LFxuICAgICAgICB7IG1lc3NhZ2U6IFwiT3BlblNlYXJjaFwiLCBuYW1lOiBcIm9wZW5zZWFyY2hcIiB9LFxuICAgICAgICB7IG1lc3NhZ2U6IFwiS2VuZHJhIChtYW5hZ2VkKVwiLCBuYW1lOiBcImtlbmRyYVwiIH0sXG4gICAgICBdLFxuICAgICAgdmFsaWRhdGUoY2hvaWNlczogYW55KSB7XG4gICAgICAgIHJldHVybiAodGhpcyBhcyBhbnkpLnNraXBwZWQgfHwgY2hvaWNlcy5sZW5ndGggPiAwXG4gICAgICAgICAgPyB0cnVlXG4gICAgICAgICAgOiBcIllvdSBuZWVkIHRvIHNlbGVjdCBhdCBsZWFzdCBvbmUgZW5naW5lXCI7XG4gICAgICB9LFxuICAgICAgc2tpcCgpOiBib29sZWFuIHtcbiAgICAgICAgLy8gd29ya2Fyb3VuZCBmb3IgaHR0cHM6Ly9naXRodWIuY29tL2VucXVpcmVyL2VucXVpcmVyL2lzc3Vlcy8yOThcbiAgICAgICAgKHRoaXMgYXMgYW55KS5zdGF0ZS5fY2hvaWNlcyA9ICh0aGlzIGFzIGFueSkuc3RhdGUuY2hvaWNlcztcbiAgICAgICAgcmV0dXJuICEodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMuZW5hYmxlUmFnO1xuICAgICAgfSxcbiAgICAgIGluaXRpYWw6IG9wdGlvbnMucmFnc1RvRW5hYmxlIHx8IFtdLFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogXCJjb25maXJtXCIsXG4gICAgICBuYW1lOiBcImtlbmRyYUVudGVycHJpc2VcIixcbiAgICAgIG1lc3NhZ2U6IFwiRG8geW91IHdhbnQgdG8gZW5hYmxlIEtlbmRyYSBFbnRlcnByaXNlIEVkaXRpb24/XCIsXG4gICAgICBpbml0aWFsOiBvcHRpb25zLmtlbmRyYUVudGVycHJpc2UgfHwgZmFsc2UsXG4gICAgICBza2lwKCk6IGJvb2xlYW4ge1xuICAgICAgICByZXR1cm4gISh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5yYWdzVG9FbmFibGUuaW5jbHVkZXMoXCJrZW5kcmFcIik7XG4gICAgICB9LFxuICAgIH0sXG4gICAge1xuICAgICAgdHlwZTogXCJjb25maXJtXCIsXG4gICAgICBuYW1lOiBcImtlbmRyYVwiLFxuICAgICAgbWVzc2FnZTogXCJEbyB5b3Ugd2FudCB0byBhZGQgZXhpc3RpbmcgS2VuZHJhIGluZGV4ZXNcIixcbiAgICAgIGluaXRpYWw6XG4gICAgICAgIChvcHRpb25zLmtlbmRyYUV4dGVybmFsICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgICBvcHRpb25zLmtlbmRyYUV4dGVybmFsLmxlbmd0aCA+IDApIHx8XG4gICAgICAgIGZhbHNlLFxuICAgICAgc2tpcCgpOiBib29sZWFuIHtcbiAgICAgICAgcmV0dXJuICEodGhpcyBhcyBhbnkpLnN0YXRlLmFuc3dlcnMuZW5hYmxlUmFnO1xuICAgICAgfSxcbiAgICB9LFxuICBdO1xuICBjb25zdCBhbnN3ZXJzOiBhbnkgPSBhd2FpdCBlbnF1aXJlci5wcm9tcHQocXVlc3Rpb25zKTtcbiAgY29uc3Qga2VuZHJhRXh0ZXJuYWw6IGFueVtdID0gW107XG4gIGxldCBuZXdLZW5kcmEgPSBhbnN3ZXJzLmVuYWJsZVJhZyAmJiBhbnN3ZXJzLmtlbmRyYTtcbiAgY29uc3QgZXhpc3RpbmdLZW5kcmFJbmRpY2VzID0gQXJyYXkuZnJvbShvcHRpb25zLmtlbmRyYUV4dGVybmFsIHx8IFtdKTtcbiAgd2hpbGUgKG5ld0tlbmRyYSA9PT0gdHJ1ZSkge1xuICAgIGxldCBleGlzdGluZ0luZGV4OiBhbnkgPSBleGlzdGluZ0tlbmRyYUluZGljZXMucG9wKCk7XG4gICAgY29uc3Qga2VuZHJhUSA9IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogXCJpbnB1dFwiLFxuICAgICAgICBuYW1lOiBcIm5hbWVcIixcbiAgICAgICAgbWVzc2FnZTogXCJLZW5kcmEgc291cmNlIG5hbWVcIixcbiAgICAgICAgdmFsaWRhdGUodjogc3RyaW5nKSB7XG4gICAgICAgICAgcmV0dXJuIFJlZ0V4cCgvXlxcd1tcXHctX10qXFx3JC8pLnRlc3Qodik7XG4gICAgICAgIH0sXG4gICAgICAgIGluaXRpYWw6IGV4aXN0aW5nSW5kZXg/Lm5hbWUsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBcImF1dG9jb21wbGV0ZVwiLFxuICAgICAgICBsaW1pdDogOCxcbiAgICAgICAgbmFtZTogXCJyZWdpb25cIixcbiAgICAgICAgY2hvaWNlczogT2JqZWN0LnZhbHVlcyhTdXBwb3J0ZWRSZWdpb24pLFxuICAgICAgICBtZXNzYWdlOiBgUmVnaW9uIG9mIHRoZSBLZW5kcmEgaW5kZXgke1xuICAgICAgICAgIGV4aXN0aW5nSW5kZXg/LnJlZ2lvbiA/IFwiIChcIiArIGV4aXN0aW5nSW5kZXg/LnJlZ2lvbiArIFwiKVwiIDogXCJcIlxuICAgICAgICB9YCxcbiAgICAgICAgaW5pdGlhbDogT2JqZWN0LnZhbHVlcyhTdXBwb3J0ZWRSZWdpb24pLmluZGV4T2YoZXhpc3RpbmdJbmRleD8ucmVnaW9uKSxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6IFwiaW5wdXRcIixcbiAgICAgICAgbmFtZTogXCJyb2xlQXJuXCIsXG4gICAgICAgIG1lc3NhZ2U6XG4gICAgICAgICAgXCJDcm9zcyBhY2NvdW50IHJvbGUgQXJuIHRvIGFzc3VtZSB0byBjYWxsIEtlbmRyYSwgbGVhdmUgZW1wdHkgaWYgbm90IG5lZWRlZFwiLFxuICAgICAgICB2YWxpZGF0ZTogKHY6IHN0cmluZykgPT4ge1xuICAgICAgICAgIGNvbnN0IHZhbGlkID0gaWFtUm9sZVJlZ0V4cC50ZXN0KHYpO1xuICAgICAgICAgIHJldHVybiB2Lmxlbmd0aCA9PT0gMCB8fCB2YWxpZDtcbiAgICAgICAgfSxcbiAgICAgICAgaW5pdGlhbDogZXhpc3RpbmdJbmRleD8ucm9sZUFybiA/PyBcIlwiLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgdHlwZTogXCJpbnB1dFwiLFxuICAgICAgICBuYW1lOiBcImtlbmRyYUlkXCIsXG4gICAgICAgIG1lc3NhZ2U6IFwiS2VuZHJhIElEXCIsXG4gICAgICAgIHZhbGlkYXRlKHY6IHN0cmluZykge1xuICAgICAgICAgIHJldHVybiBrZW5kcmFJZFJlZ0V4cC50ZXN0KHYpO1xuICAgICAgICB9LFxuICAgICAgICBpbml0aWFsOiBleGlzdGluZ0luZGV4Py5rZW5kcmFJZCxcbiAgICAgIH0sXG4gICAgICB7XG4gICAgICAgIHR5cGU6IFwiY29uZmlybVwiLFxuICAgICAgICBuYW1lOiBcImVuYWJsZWRcIixcbiAgICAgICAgbWVzc2FnZTogXCJFbmFibGUgdGhpcyBpbmRleFwiLFxuICAgICAgICBpbml0aWFsOiBleGlzdGluZ0luZGV4Py5lbmFibGVkID8/IHRydWUsXG4gICAgICB9LFxuICAgICAge1xuICAgICAgICB0eXBlOiBcImNvbmZpcm1cIixcbiAgICAgICAgbmFtZTogXCJuZXdLZW5kcmFcIixcbiAgICAgICAgbWVzc2FnZTogXCJEbyB5b3Ugd2FudCB0byBhZGQgYW5vdGhlciBLZW5kcmEgc291cmNlXCIsXG4gICAgICAgIGluaXRpYWw6IGZhbHNlLFxuICAgICAgfSxcbiAgICBdO1xuICAgIGNvbnN0IGtlbmRyYUluc3RhbmNlOiBhbnkgPSBhd2FpdCBlbnF1aXJlci5wcm9tcHQoa2VuZHJhUSk7XG4gICAgY29uc3QgZXh0ID0gKCh7IGVuYWJsZWQsIG5hbWUsIHJvbGVBcm4sIGtlbmRyYUlkLCByZWdpb24gfSkgPT4gKHtcbiAgICAgIGVuYWJsZWQsXG4gICAgICBuYW1lLFxuICAgICAgcm9sZUFybixcbiAgICAgIGtlbmRyYUlkLFxuICAgICAgcmVnaW9uLFxuICAgIH0pKShrZW5kcmFJbnN0YW5jZSk7XG4gICAgaWYgKGV4dC5yb2xlQXJuID09PSBcIlwiKSBleHQucm9sZUFybiA9IHVuZGVmaW5lZDtcbiAgICBrZW5kcmFFeHRlcm5hbC5wdXNoKHtcbiAgICAgIC4uLmV4dCxcbiAgICB9KTtcbiAgICBuZXdLZW5kcmEgPSBrZW5kcmFJbnN0YW5jZS5uZXdLZW5kcmE7XG4gIH1cbiAgY29uc3QgbW9kZWxzUHJvbXB0cyA9IFtcbiAgICB7XG4gICAgICB0eXBlOiBcInNlbGVjdFwiLCBcbiAgICAgIG5hbWU6IFwiZGVmYXVsdEVtYmVkZGluZ1wiLFxuICAgICAgbWVzc2FnZTogXCJTZWxlY3QgYSBkZWZhdWx0IGVtYmVkZGluZyBtb2RlbFwiLFxuICAgICAgY2hvaWNlczogZW1iZWRkaW5nTW9kZWxzLm1hcChtID0+ICh7bmFtZTogbS5uYW1lLCB2YWx1ZTogbX0pKSxcbiAgICAgIGluaXRpYWw6IG9wdGlvbnMuZGVmYXVsdEVtYmVkZGluZyxcbiAgICAgIHZhbGlkYXRlKHZhbHVlOiBzdHJpbmcpIHtcbiAgICAgICAgaWYgKCh0aGlzIGFzIGFueSkuc3RhdGUuYW5zd2Vycy5lbmFibGVSYWcpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWUgPyB0cnVlIDogJ1NlbGVjdCBhIGRlZmF1bHQgZW1iZWRkaW5nIG1vZGVsJzsgXG4gICAgICAgIH1cbiAgICAgIFxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0sXG4gICAgICBza2lwKCkge1xuICAgICAgICByZXR1cm4gIWFuc3dlcnMuZW5hYmxlUmFnIHx8ICEoYW5zd2Vycy5yYWdzVG9FbmFibGUuaW5jbHVkZXMoXCJhdXJvcmFcIikgfHwgYW5zd2Vycy5yYWdzVG9FbmFibGUuaW5jbHVkZXMoXCJvcGVuc2VhcmNoXCIpKTtcbiAgICAgIH1cbiAgICB9XG4gIF07XG4gIGNvbnN0IG1vZGVsczogYW55ID0gYXdhaXQgZW5xdWlyZXIucHJvbXB0KG1vZGVsc1Byb21wdHMpO1xuXG4gIC8vIENvbnZlcnQgc2ltcGxlIHRpbWUgaW50byBjcm9uIGZvcm1hdCBmb3Igc2NoZWR1bGVcbiAgaWYgKGFuc3dlcnMuZW5hYmxlU2FnZW1ha2VyTW9kZWxzU2NoZWR1bGUgJiYgYW5zd2Vycy5lbmFibGVDcm9uRm9ybWF0ID09IFwic2ltcGxlXCIpXG4gIHtcbiAgICBjb25zdCBkYXlzVG9SdW5TY2hlZHVsZSA9IGFuc3dlcnMuZGF5c0ZvclNjaGVkdWxlLmpvaW4oXCIsXCIpO1xuICAgIGNvbnN0IHN0YXJ0TWludXRlcyA9IGFuc3dlcnMuc2NoZWR1bGVTdGFydFRpbWUuc3BsaXQoXCI6XCIpWzFdO1xuICAgIGNvbnN0IHN0YXJ0SG91ciA9IGFuc3dlcnMuc2NoZWR1bGVTdGFydFRpbWUuc3BsaXQoXCI6XCIpWzBdO1xuICAgIGFuc3dlcnMuc2FnZW1ha2VyQ3JvblN0YXJ0U2NoZWR1bGUgPSBgJHtzdGFydE1pbnV0ZXN9ICR7c3RhcnRIb3VyfSA/ICogJHtkYXlzVG9SdW5TY2hlZHVsZX0gKmA7XG4gICAgQVdTQ3JvblZhbGlkYXRvci52YWxpZGF0ZShhbnN3ZXJzLnNhZ2VtYWtlckNyb25TdGFydFNjaGVkdWxlKVxuXG4gICAgXG4gICAgY29uc3Qgc3RvcE1pbnV0ZXMgPSBhbnN3ZXJzLnNjaGVkdWxlU3RvcFRpbWUuc3BsaXQoXCI6XCIpWzFdO1xuICAgIGNvbnN0IHN0b3BIb3VyID0gYW5zd2Vycy5zY2hlZHVsZVN0b3BUaW1lLnNwbGl0KFwiOlwiKVswXTtcbiAgICBhbnN3ZXJzLnNhZ2VtYWtlckNyb25TdG9wU2NoZWR1bGUgPSBgJHtzdG9wTWludXRlc30gJHtzdG9wSG91cn0gPyAqICR7ZGF5c1RvUnVuU2NoZWR1bGV9ICpgO1xuICAgIEFXU0Nyb25WYWxpZGF0b3IudmFsaWRhdGUoYW5zd2Vycy5zYWdlbWFrZXJDcm9uU3RvcFNjaGVkdWxlKVxuICB9XG4gIFxuICAvLyBDcmVhdGUgdGhlIGNvbmZpZyBvYmplY3RcbiAgY29uc3QgY29uZmlnID0ge1xuICAgIHByZWZpeDogYW5zd2Vycy5wcmVmaXgsXG4gICAgdnBjOiBhbnN3ZXJzLmV4aXN0aW5nVnBjXG4gICAgICA/IHtcbiAgICAgICAgICB2cGNJZDogYW5zd2Vycy52cGNJZC50b0xvd2VyQ2FzZSgpLFxuICAgICAgICAgIGNyZWF0ZVZwY0VuZHBvaW50czogYW5zd2Vycy5jcmVhdGVWcGNFbmRwb2ludHMsXG4gICAgICB9XG4gICAgICA6IHVuZGVmaW5lZCxcbiAgICBwcml2YXRlV2Vic2l0ZTogYW5zd2Vycy5wcml2YXRlV2Vic2l0ZSxcbiAgICBjZXJ0aWZpY2F0ZTogYW5zd2Vycy5jZXJ0aWZpY2F0ZSxcbiAgICBkb21haW46IGFuc3dlcnMuZG9tYWluLFxuICAgIGNmR2VvUmVzdHJpY3RFbmFibGU6IGFuc3dlcnMuY2ZHZW9SZXN0cmljdEVuYWJsZSxcbiAgICBjZkdlb1Jlc3RyaWN0TGlzdDogYW5zd2Vycy5jZkdlb1Jlc3RyaWN0TGlzdCxcbiAgICBiZWRyb2NrOiBhbnN3ZXJzLmJlZHJvY2tFbmFibGVcbiAgICAgID8ge1xuICAgICAgICAgIGVuYWJsZWQ6IGFuc3dlcnMuYmVkcm9ja0VuYWJsZSxcbiAgICAgICAgICByZWdpb246IGFuc3dlcnMuYmVkcm9ja1JlZ2lvbixcbiAgICAgICAgICByb2xlQXJuOlxuICAgICAgICAgICAgYW5zd2Vycy5iZWRyb2NrUm9sZUFybiA9PT0gXCJcIiA/IHVuZGVmaW5lZCA6IGFuc3dlcnMuYmVkcm9ja1JvbGVBcm4sXG4gICAgICAgIH1cbiAgICAgIDogdW5kZWZpbmVkLFxuICAgIGxsbXM6IHtcbiAgICAgIHNhZ2VtYWtlcjogYW5zd2Vycy5zYWdlbWFrZXJNb2RlbHMsXG4gICAgICBzYWdlbWFrZXJTY2hlZHVsZTogYW5zd2Vycy5lbmFibGVTYWdlbWFrZXJNb2RlbHNTY2hlZHVsZVxuICAgICAgICA/IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IGFuc3dlcnMuZW5hYmxlU2FnZW1ha2VyTW9kZWxzU2NoZWR1bGUsXG4gICAgICAgICAgICB0aW1lem9uZVBpY2tlcjogYW5zd2Vycy50aW1lem9uZVBpY2tlcixcbiAgICAgICAgICAgIGVuYWJsZUNyb25Gb3JtYXQ6IGFuc3dlcnMuZW5hYmxlQ3JvbkZvcm1hdCxcbiAgICAgICAgICAgIHNhZ2VtYWtlckNyb25TdGFydFNjaGVkdWxlOiBhbnN3ZXJzLnNhZ2VtYWtlckNyb25TdGFydFNjaGVkdWxlLFxuICAgICAgICAgICAgc2FnZW1ha2VyQ3JvblN0b3BTY2hlZHVsZTogYW5zd2Vycy5zYWdlbWFrZXJDcm9uU3RvcFNjaGVkdWxlLFxuICAgICAgICAgICAgZGF5c0ZvclNjaGVkdWxlOiBhbnN3ZXJzLmRheXNGb3JTY2hlZHVsZSxcbiAgICAgICAgICAgIHNjaGVkdWxlU3RhcnRUaW1lOiBhbnN3ZXJzLnNjaGVkdWxlU3RhcnRUaW1lLFxuICAgICAgICAgICAgc2NoZWR1bGVTdG9wVGltZTogYW5zd2Vycy5zY2hlZHVsZVN0b3BUaW1lLFxuICAgICAgICAgICAgZW5hYmxlU2NoZWR1bGVFbmREYXRlOiBhbnN3ZXJzLmVuYWJsZVNjaGVkdWxlRW5kRGF0ZSxcbiAgICAgICAgICAgIHN0YXJ0U2NoZWR1bGVFbmREYXRlOiBhbnN3ZXJzLnN0YXJ0U2NoZWR1bGVFbmREYXRlLFxuICAgICAgICAgIH1cbiAgICAgICAgOiB1bmRlZmluZWQsXG4gICAgfSxcbiAgICByYWc6IHtcbiAgICAgIGVuYWJsZWQ6IGFuc3dlcnMuZW5hYmxlUmFnLFxuICAgICAgZW5naW5lczoge1xuICAgICAgICBhdXJvcmE6IHtcbiAgICAgICAgICBlbmFibGVkOiBhbnN3ZXJzLnJhZ3NUb0VuYWJsZS5pbmNsdWRlcyhcImF1cm9yYVwiKSxcbiAgICAgICAgfSxcbiAgICAgICAgb3BlbnNlYXJjaDoge1xuICAgICAgICAgIGVuYWJsZWQ6IGFuc3dlcnMucmFnc1RvRW5hYmxlLmluY2x1ZGVzKFwib3BlbnNlYXJjaFwiKSxcbiAgICAgICAgfSxcbiAgICAgICAga2VuZHJhOiB7XG4gICAgICAgICAgZW5hYmxlZDogZmFsc2UsXG4gICAgICAgICAgY3JlYXRlSW5kZXg6IGZhbHNlLFxuICAgICAgICAgIGV4dGVybmFsOiBbe31dLFxuICAgICAgICAgIGVudGVycHJpc2U6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGVtYmVkZGluZ3NNb2RlbHM6IFt7fV0sXG4gICAgICBjcm9zc0VuY29kZXJNb2RlbHM6IFt7fV0sXG4gICAgfSxcbiAgfTtcblxuICAvLyBJZiB3ZSBoYXZlIG5vdCBlbmFibGVkIHJhZyB0aGUgZGVmYXVsdCBlbWJlZGRpbmcgaXMgc2V0IHRvIHRoZSBmaXJzdCBtb2RlbFxuICBpZiAoIWFuc3dlcnMuZW5hYmxlUmFnKSB7XG4gICAgbW9kZWxzLmRlZmF1bHRFbWJlZGRpbmcgPSBlbWJlZGRpbmdNb2RlbHNbMF0ubmFtZTtcbiAgfVxuXG4gIGNvbmZpZy5yYWcuY3Jvc3NFbmNvZGVyTW9kZWxzWzBdID0ge1xuICAgIHByb3ZpZGVyOiBcInNhZ2VtYWtlclwiLFxuICAgIG5hbWU6IFwiY3Jvc3MtZW5jb2Rlci9tcy1tYXJjby1NaW5pTE0tTC0xMi12MlwiLFxuICAgIGRlZmF1bHQ6IHRydWUsXG4gIH07XG4gIGNvbmZpZy5yYWcuZW1iZWRkaW5nc01vZGVscyA9IGVtYmVkZGluZ01vZGVscztcbiAgY29uZmlnLnJhZy5lbWJlZGRpbmdzTW9kZWxzLmZvckVhY2goKG06IGFueSkgPT4ge1xuICAgIGlmIChtLm5hbWUgPT09IG1vZGVscy5kZWZhdWx0RW1iZWRkaW5nKSB7XG4gICAgICBtLmRlZmF1bHQgPSB0cnVlO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uZmlnLnJhZy5lbmdpbmVzLmtlbmRyYS5jcmVhdGVJbmRleCA9XG4gICAgYW5zd2Vycy5yYWdzVG9FbmFibGUuaW5jbHVkZXMoXCJrZW5kcmFcIik7XG4gIGNvbmZpZy5yYWcuZW5naW5lcy5rZW5kcmEuZW5hYmxlZCA9XG4gICAgY29uZmlnLnJhZy5lbmdpbmVzLmtlbmRyYS5jcmVhdGVJbmRleCB8fCBrZW5kcmFFeHRlcm5hbC5sZW5ndGggPiAwO1xuICBjb25maWcucmFnLmVuZ2luZXMua2VuZHJhLmV4dGVybmFsID0gWy4uLmtlbmRyYUV4dGVybmFsXTtcbiAgY29uZmlnLnJhZy5lbmdpbmVzLmtlbmRyYS5lbnRlcnByaXNlID0gYW5zd2Vycy5rZW5kcmFFbnRlcnByaXNlO1xuXG4gIGNvbnNvbGUubG9nKFwiXFxu4pyoIFRoaXMgaXMgdGhlIGNob3NlbiBjb25maWd1cmF0aW9uOlxcblwiKTtcbiAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkoY29uZmlnLCB1bmRlZmluZWQsIDIpKTtcbiAgKFxuICAgIChhd2FpdCBlbnF1aXJlci5wcm9tcHQoW1xuICAgICAge1xuICAgICAgICB0eXBlOiBcImNvbmZpcm1cIixcbiAgICAgICAgbmFtZTogXCJjcmVhdGVcIixcbiAgICAgICAgbWVzc2FnZTogXCJEbyB5b3Ugd2FudCB0byBjcmVhdGUvdXBkYXRlIHRoZSBjb25maWd1cmF0aW9uIGJhc2VkIG9uIHRoZSBhYm92ZSBzZXR0aW5nc1wiLFxuICAgICAgICBpbml0aWFsOiB0cnVlLFxuICAgICAgfSxcbiAgICBdKSkgYXMgYW55XG4gICkuY3JlYXRlXG4gICAgPyBjcmVhdGVDb25maWcoY29uZmlnKVxuICAgIDogY29uc29sZS5sb2coXCJTa2lwcGluZ1wiKTtcbn1cbiJdfQ==