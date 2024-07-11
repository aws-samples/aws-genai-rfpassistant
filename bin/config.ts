import { SupportedRegion, SystemConfig } from "../lib/shared/types";
import { existsSync, readFileSync } from "fs";

export function getConfig(): SystemConfig {
  if (existsSync("./bin/config.json")) {
    return JSON.parse(readFileSync("./bin/config.json").toString("utf8"));
  }
  // Default config
  return {
    prefix: "",
    /* vpc: {
       vpcId: "vpc-00000000000000000",
       createVpcEndpoints: true,
    },*/
    privateWebsite: false,
    companyName: "AnyCompany",
    certificate : "",
    cfGeoRestrictEnable: false,
    cfGeoRestrictList: [],
    bedrock: {
      enabled: true,
      region: SupportedRegion.US_EAST_1,
    },
    llms: {
      // sagemaker: [SupportedSageMakerModels.FalconLite]
      sagemaker: [],
    },
    rag: {
      enabled: true,
      engines: {
        aurora: {
          enabled: false,
        },
        opensearch: {
          enabled: true,
        },
        kendra: {
          enabled: false,
          createIndex: false,
          enterprise: false
        },
      },
      embeddingsModels: [        
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
          default: true,
        }
      ],
      crossEncoderModels: [
        {
          provider: "sagemaker",
          name: "cross-encoder/ms-marco-MiniLM-L-12-v2",
          default: true,
        },
      ],
    },
  };
}

export const config: SystemConfig = getConfig();