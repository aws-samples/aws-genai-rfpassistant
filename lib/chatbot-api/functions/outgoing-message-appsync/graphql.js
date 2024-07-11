"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.graphQlQuery = void 0;
const crypto = require("@aws-crypto/sha256-js");
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
const signature_v4_1 = require("@aws-sdk/signature-v4");
const protocol_http_1 = require("@aws-sdk/protocol-http");
const { Sha256 } = crypto;
const AWS_REGION = process.env.AWS_REGION || "eu-west-1";
const endpoint = new URL(process.env.GRAPHQL_ENDPOINT ?? "");
const graphQlQuery = async (query) => {
    const signer = new signature_v4_1.SignatureV4({
        credentials: credential_provider_node_1.defaultProvider(),
        region: AWS_REGION,
        service: "appsync",
        sha256: Sha256,
    });
    const requestToBeSigned = new protocol_http_1.HttpRequest({
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            host: endpoint.host,
        },
        hostname: endpoint.host,
        body: JSON.stringify({ query }),
        path: endpoint.pathname,
    });
    const signed = await signer.sign(requestToBeSigned);
    const request = new Request(endpoint, signed);
    let body;
    try {
        const response = await fetch(request);
        body = await response.json();
    }
    catch (error) {
        throw error;
    }
    return body;
};
exports.graphQlQuery = graphQlQuery;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGhxbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdyYXBocWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0RBQWdEO0FBQ2hELGdGQUFvRTtBQUNwRSx3REFBb0Q7QUFDcEQsMERBQXFEO0FBRXJELE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUM7QUFDMUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDO0FBRXpELE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksRUFBRSxDQUFDLENBQUM7QUFFdEQsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLEtBQWEsRUFBRSxFQUFFO0lBQ2xELE1BQU0sTUFBTSxHQUFHLElBQUksMEJBQVcsQ0FBQztRQUM3QixXQUFXLEVBQUUsMENBQWUsRUFBRTtRQUM5QixNQUFNLEVBQUUsVUFBVTtRQUNsQixPQUFPLEVBQUUsU0FBUztRQUNsQixNQUFNLEVBQUUsTUFBTTtLQUNmLENBQUMsQ0FBQztJQUVILE1BQU0saUJBQWlCLEdBQUcsSUFBSSwyQkFBVyxDQUFDO1FBQ3hDLE1BQU0sRUFBRSxNQUFNO1FBQ2QsT0FBTyxFQUFFO1lBQ1AsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7U0FDcEI7UUFDRCxRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUk7UUFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUMvQixJQUFJLEVBQUUsUUFBUSxDQUFDLFFBQVE7S0FDeEIsQ0FBQyxDQUFDO0lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDcEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBRTlDLElBQUksSUFBSSxDQUFDO0lBRVQsSUFBSTtRQUNGLE1BQU0sUUFBUSxHQUFHLE1BQU0sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RDLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztLQUM5QjtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ2QsTUFBTSxLQUFLLENBQUM7S0FDYjtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyxDQUFDO0FBL0JXLFFBQUEsWUFBWSxnQkErQnZCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gXCJAYXdzLWNyeXB0by9zaGEyNTYtanNcIjtcbmltcG9ydCB7IGRlZmF1bHRQcm92aWRlciB9IGZyb20gXCJAYXdzLXNkay9jcmVkZW50aWFsLXByb3ZpZGVyLW5vZGVcIjtcbmltcG9ydCB7IFNpZ25hdHVyZVY0IH0gZnJvbSBcIkBhd3Mtc2RrL3NpZ25hdHVyZS12NFwiO1xuaW1wb3J0IHsgSHR0cFJlcXVlc3QgfSBmcm9tIFwiQGF3cy1zZGsvcHJvdG9jb2wtaHR0cFwiO1xuXG5jb25zdCB7IFNoYTI1NiB9ID0gY3J5cHRvO1xuY29uc3QgQVdTX1JFR0lPTiA9IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgXCJldS13ZXN0LTFcIjtcblxuY29uc3QgZW5kcG9pbnQgPSBuZXcgVVJMKHByb2Nlc3MuZW52LkdSQVBIUUxfRU5EUE9JTlQgPz8gXCJcIik7XG5cbmV4cG9ydCBjb25zdCBncmFwaFFsUXVlcnkgPSBhc3luYyAocXVlcnk6IHN0cmluZykgPT4ge1xuICBjb25zdCBzaWduZXIgPSBuZXcgU2lnbmF0dXJlVjQoe1xuICAgIGNyZWRlbnRpYWxzOiBkZWZhdWx0UHJvdmlkZXIoKSxcbiAgICByZWdpb246IEFXU19SRUdJT04sXG4gICAgc2VydmljZTogXCJhcHBzeW5jXCIsXG4gICAgc2hhMjU2OiBTaGEyNTYsXG4gIH0pO1xuXG4gIGNvbnN0IHJlcXVlc3RUb0JlU2lnbmVkID0gbmV3IEh0dHBSZXF1ZXN0KHtcbiAgICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgIGhlYWRlcnM6IHtcbiAgICAgIFwiQ29udGVudC1UeXBlXCI6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgaG9zdDogZW5kcG9pbnQuaG9zdCxcbiAgICB9LFxuICAgIGhvc3RuYW1lOiBlbmRwb2ludC5ob3N0LFxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgcXVlcnkgfSksXG4gICAgcGF0aDogZW5kcG9pbnQucGF0aG5hbWUsXG4gIH0pO1xuXG4gIGNvbnN0IHNpZ25lZCA9IGF3YWl0IHNpZ25lci5zaWduKHJlcXVlc3RUb0JlU2lnbmVkKTtcbiAgY29uc3QgcmVxdWVzdCA9IG5ldyBSZXF1ZXN0KGVuZHBvaW50LCBzaWduZWQpO1xuXG4gIGxldCBib2R5O1xuXG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChyZXF1ZXN0KTtcbiAgICBib2R5ID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHRocm93IGVycm9yO1xuICB9XG4gIHJldHVybiBib2R5O1xufTtcbiJdfQ==