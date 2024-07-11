"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.getConfig = void 0;
const types_1 = require("../lib/shared/types");
const fs_1 = require("fs");
function getConfig() {
    if (fs_1.existsSync("./bin/config.json")) {
        return JSON.parse(fs_1.readFileSync("./bin/config.json").toString("utf8"));
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
        certificate: "",
        cfGeoRestrictEnable: false,
        cfGeoRestrictList: [],
        bedrock: {
            enabled: true,
            region: types_1.SupportedRegion.US_EAST_1,
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
exports.getConfig = getConfig;
exports.config = getConfig();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLCtDQUFvRTtBQUNwRSwyQkFBOEM7QUFFOUMsU0FBZ0IsU0FBUztJQUN2QixJQUFJLGVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFO1FBQ25DLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBWSxDQUFDLG1CQUFtQixDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7S0FDdkU7SUFDRCxpQkFBaUI7SUFDakIsT0FBTztRQUNMLE1BQU0sRUFBRSxFQUFFO1FBQ1Y7OztZQUdJO1FBQ0osY0FBYyxFQUFFLEtBQUs7UUFDckIsV0FBVyxFQUFFLFlBQVk7UUFDekIsV0FBVyxFQUFHLEVBQUU7UUFDaEIsbUJBQW1CLEVBQUUsS0FBSztRQUMxQixpQkFBaUIsRUFBRSxFQUFFO1FBQ3JCLE9BQU8sRUFBRTtZQUNQLE9BQU8sRUFBRSxJQUFJO1lBQ2IsTUFBTSxFQUFFLHVCQUFlLENBQUMsU0FBUztTQUNsQztRQUNELElBQUksRUFBRTtZQUNKLG1EQUFtRDtZQUNuRCxTQUFTLEVBQUUsRUFBRTtTQUNkO1FBQ0QsR0FBRyxFQUFFO1lBQ0gsT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFO29CQUNOLE9BQU8sRUFBRSxLQUFLO2lCQUNmO2dCQUNELFVBQVUsRUFBRTtvQkFDVixPQUFPLEVBQUUsSUFBSTtpQkFDZDtnQkFDRCxNQUFNLEVBQUU7b0JBQ04sT0FBTyxFQUFFLEtBQUs7b0JBQ2QsV0FBVyxFQUFFLEtBQUs7b0JBQ2xCLFVBQVUsRUFBRSxLQUFLO2lCQUNsQjthQUNGO1lBQ0QsZ0JBQWdCLEVBQUU7Z0JBQ2hCO29CQUNFLFFBQVEsRUFBRSxTQUFTO29CQUNuQixJQUFJLEVBQUUsNEJBQTRCO29CQUNsQyxVQUFVLEVBQUUsSUFBSTtpQkFDakI7Z0JBQ0QsK0VBQStFO2dCQUMvRTtvQkFDRSxRQUFRLEVBQUUsU0FBUztvQkFDbkIsSUFBSSxFQUFFLDZCQUE2QjtvQkFDbkMsVUFBVSxFQUFFLElBQUk7aUJBQ2pCO2dCQUNEO29CQUNFLFFBQVEsRUFBRSxTQUFTO29CQUNuQixJQUFJLEVBQUUseUJBQXlCO29CQUMvQixVQUFVLEVBQUUsSUFBSTtpQkFDakI7Z0JBQ0Q7b0JBQ0UsUUFBUSxFQUFFLFNBQVM7b0JBQ25CLElBQUksRUFBRSw4QkFBOEI7b0JBQ3BDLFVBQVUsRUFBRSxJQUFJO29CQUNoQixPQUFPLEVBQUUsSUFBSTtpQkFDZDthQUNGO1lBQ0Qsa0JBQWtCLEVBQUU7Z0JBQ2xCO29CQUNFLFFBQVEsRUFBRSxXQUFXO29CQUNyQixJQUFJLEVBQUUsdUNBQXVDO29CQUM3QyxPQUFPLEVBQUUsSUFBSTtpQkFDZDthQUNGO1NBQ0Y7S0FDRixDQUFDO0FBQ0osQ0FBQztBQXhFRCw4QkF3RUM7QUFFWSxRQUFBLE1BQU0sR0FBaUIsU0FBUyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdXBwb3J0ZWRSZWdpb24sIFN5c3RlbUNvbmZpZyB9IGZyb20gXCIuLi9saWIvc2hhcmVkL3R5cGVzXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jLCByZWFkRmlsZVN5bmMgfSBmcm9tIFwiZnNcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENvbmZpZygpOiBTeXN0ZW1Db25maWcge1xuICBpZiAoZXhpc3RzU3luYyhcIi4vYmluL2NvbmZpZy5qc29uXCIpKSB7XG4gICAgcmV0dXJuIEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKFwiLi9iaW4vY29uZmlnLmpzb25cIikudG9TdHJpbmcoXCJ1dGY4XCIpKTtcbiAgfVxuICAvLyBEZWZhdWx0IGNvbmZpZ1xuICByZXR1cm4ge1xuICAgIHByZWZpeDogXCJcIixcbiAgICAvKiB2cGM6IHtcbiAgICAgICB2cGNJZDogXCJ2cGMtMDAwMDAwMDAwMDAwMDAwMDBcIixcbiAgICAgICBjcmVhdGVWcGNFbmRwb2ludHM6IHRydWUsXG4gICAgfSwqL1xuICAgIHByaXZhdGVXZWJzaXRlOiBmYWxzZSxcbiAgICBjb21wYW55TmFtZTogXCJBbnlDb21wYW55XCIsXG4gICAgY2VydGlmaWNhdGUgOiBcIlwiLFxuICAgIGNmR2VvUmVzdHJpY3RFbmFibGU6IGZhbHNlLFxuICAgIGNmR2VvUmVzdHJpY3RMaXN0OiBbXSxcbiAgICBiZWRyb2NrOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgcmVnaW9uOiBTdXBwb3J0ZWRSZWdpb24uVVNfRUFTVF8xLFxuICAgIH0sXG4gICAgbGxtczoge1xuICAgICAgLy8gc2FnZW1ha2VyOiBbU3VwcG9ydGVkU2FnZU1ha2VyTW9kZWxzLkZhbGNvbkxpdGVdXG4gICAgICBzYWdlbWFrZXI6IFtdLFxuICAgIH0sXG4gICAgcmFnOiB7XG4gICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgZW5naW5lczoge1xuICAgICAgICBhdXJvcmE6IHtcbiAgICAgICAgICBlbmFibGVkOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgb3BlbnNlYXJjaDoge1xuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIGtlbmRyYToge1xuICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICAgIGNyZWF0ZUluZGV4OiBmYWxzZSxcbiAgICAgICAgICBlbnRlcnByaXNlOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIGVtYmVkZGluZ3NNb2RlbHM6IFsgICAgICAgIFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZXI6IFwiYmVkcm9ja1wiLFxuICAgICAgICAgIG5hbWU6IFwiYW1hem9uLnRpdGFuLWVtYmVkLXRleHQtdjFcIixcbiAgICAgICAgICBkaW1lbnNpb25zOiAxNTM2LFxuICAgICAgICB9LFxuICAgICAgICAvL1N1cHBvcnQgZm9yIGlucHV0SW1hZ2UgaXMgbm90IHlldCBpbXBsZW1lbnRlZCBmb3IgYW1hem9uLnRpdGFuLWVtYmVkLWltYWdlLXYxXG4gICAgICAgIHtcbiAgICAgICAgICBwcm92aWRlcjogXCJiZWRyb2NrXCIsXG4gICAgICAgICAgbmFtZTogXCJhbWF6b24udGl0YW4tZW1iZWQtaW1hZ2UtdjFcIixcbiAgICAgICAgICBkaW1lbnNpb25zOiAxMDI0LFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZXI6IFwiYmVkcm9ja1wiLFxuICAgICAgICAgIG5hbWU6IFwiY29oZXJlLmVtYmVkLWVuZ2xpc2gtdjNcIixcbiAgICAgICAgICBkaW1lbnNpb25zOiAxMDI0LFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZXI6IFwiYmVkcm9ja1wiLFxuICAgICAgICAgIG5hbWU6IFwiY29oZXJlLmVtYmVkLW11bHRpbGluZ3VhbC12M1wiLFxuICAgICAgICAgIGRpbWVuc2lvbnM6IDEwMjQsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICAgIGNyb3NzRW5jb2Rlck1vZGVsczogW1xuICAgICAgICB7XG4gICAgICAgICAgcHJvdmlkZXI6IFwic2FnZW1ha2VyXCIsXG4gICAgICAgICAgbmFtZTogXCJjcm9zcy1lbmNvZGVyL21zLW1hcmNvLU1pbmlMTS1MLTEyLXYyXCIsXG4gICAgICAgICAgZGVmYXVsdDogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSxcbiAgfTtcbn1cblxuZXhwb3J0IGNvbnN0IGNvbmZpZzogU3lzdGVtQ29uZmlnID0gZ2V0Q29uZmlnKCk7Il19