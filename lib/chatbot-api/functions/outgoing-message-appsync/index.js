"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const batch_1 = require("@aws-lambda-powertools/batch");
const logger_1 = require("@aws-lambda-powertools/logger");
const graphql_1 = require("./graphql");
const processor = new batch_1.BatchProcessor(batch_1.EventType.SQS);
const logger = new logger_1.Logger();
const recordHandler = async (record) => {
    const payload = record.body;
    if (payload) {
        const item = JSON.parse(payload);
        const req = JSON.parse(item.Message);
        logger.debug("Processed message", req);
        /***
         * Payload format
         *
          payload: str = record.body
          message: dict = json.loads(payload)
          detail: dict = json.loads(message["Message"])
          logger.info(detail)
          user_id = detail["userId"]
        */
        const query = /* GraphQL */ `
        mutation Mutation {
          publishResponse (data: ${JSON.stringify(item.Message)}, sessionId: "${req.data.sessionId}", userId: "${req.userId}") {
            data
            sessionId
            userId
          }
        }
    `;
        //logger.info(query);
        const resp = await graphql_1.graphQlQuery(query);
        //logger.info(resp);
    }
};
const handler = async (event, context) => {
    logger.debug("Event", { event });
    event.Records = event.Records.sort((a, b) => {
        try {
            const x = JSON.parse(a.body).Message.data?.token?.sequenceNumber;
            const y = JSON.parse(b.body).Message.data?.token?.sequenceNumber;
            return x - y;
        }
        catch {
            return 0;
        }
    });
    return batch_1.processPartialResponse(event, recordHandler, processor, {
        context,
    });
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3REFJc0M7QUFDdEMsMERBQXVEO0FBT3ZELHVDQUF5QztBQUV6QyxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFjLENBQUMsaUJBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQU0sRUFBRSxDQUFDO0FBRTVCLE1BQU0sYUFBYSxHQUFHLEtBQUssRUFBRSxNQUFpQixFQUFpQixFQUFFO0lBQy9ELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDNUIsSUFBSSxPQUFPLEVBQUU7UUFDWCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWpDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkM7Ozs7Ozs7O1VBUUU7UUFFRixNQUFNLEtBQUssR0FBRyxhQUFhLENBQUM7O21DQUVHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFDbkQsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUNYLGVBQWUsR0FBRyxDQUFDLE1BQU07Ozs7OztLQU05QixDQUFDO1FBQ0YscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLE1BQU0sc0JBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxvQkFBb0I7S0FDckI7QUFDSCxDQUFDLENBQUM7QUFFSyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQWUsRUFDZixPQUFnQixFQUNXLEVBQUU7SUFDN0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ2pDLEtBQUssQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDMUMsSUFBSTtZQUNGLE1BQU0sQ0FBQyxHQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLGNBQWMsQ0FBQztZQUN6RSxNQUFNLENBQUMsR0FBVyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxjQUFjLENBQUM7WUFDekUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2Q7UUFBQyxNQUFNO1lBQ04sT0FBTyxDQUFDLENBQUM7U0FDVjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyw4QkFBc0IsQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRTtRQUM3RCxPQUFPO0tBQ1IsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBakJXLFFBQUEsT0FBTyxXQWlCbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBCYXRjaFByb2Nlc3NvcixcbiAgRXZlbnRUeXBlLFxuICBwcm9jZXNzUGFydGlhbFJlc3BvbnNlLFxufSBmcm9tIFwiQGF3cy1sYW1iZGEtcG93ZXJ0b29scy9iYXRjaFwiO1xuaW1wb3J0IHsgTG9nZ2VyIH0gZnJvbSBcIkBhd3MtbGFtYmRhLXBvd2VydG9vbHMvbG9nZ2VyXCI7XG5pbXBvcnQgdHlwZSB7XG4gIFNRU0V2ZW50LFxuICBTUVNSZWNvcmQsXG4gIENvbnRleHQsXG4gIFNRU0JhdGNoUmVzcG9uc2UsXG59IGZyb20gXCJhd3MtbGFtYmRhXCI7XG5pbXBvcnQgeyBncmFwaFFsUXVlcnkgfSBmcm9tIFwiLi9ncmFwaHFsXCI7XG5cbmNvbnN0IHByb2Nlc3NvciA9IG5ldyBCYXRjaFByb2Nlc3NvcihFdmVudFR5cGUuU1FTKTtcbmNvbnN0IGxvZ2dlciA9IG5ldyBMb2dnZXIoKTtcblxuY29uc3QgcmVjb3JkSGFuZGxlciA9IGFzeW5jIChyZWNvcmQ6IFNRU1JlY29yZCk6IFByb21pc2U8dm9pZD4gPT4ge1xuICBjb25zdCBwYXlsb2FkID0gcmVjb3JkLmJvZHk7XG4gIGlmIChwYXlsb2FkKSB7XG4gICAgY29uc3QgaXRlbSA9IEpTT04ucGFyc2UocGF5bG9hZCk7XG5cbiAgICBjb25zdCByZXEgPSBKU09OLnBhcnNlKGl0ZW0uTWVzc2FnZSk7XG4gICAgbG9nZ2VyLmRlYnVnKFwiUHJvY2Vzc2VkIG1lc3NhZ2VcIiwgcmVxKTtcbiAgICAvKioqXG4gICAgICogUGF5bG9hZCBmb3JtYXRcbiAgICAgKiBcbiAgICAgIHBheWxvYWQ6IHN0ciA9IHJlY29yZC5ib2R5XG4gICAgICBtZXNzYWdlOiBkaWN0ID0ganNvbi5sb2FkcyhwYXlsb2FkKVxuICAgICAgZGV0YWlsOiBkaWN0ID0ganNvbi5sb2FkcyhtZXNzYWdlW1wiTWVzc2FnZVwiXSlcbiAgICAgIGxvZ2dlci5pbmZvKGRldGFpbClcbiAgICAgIHVzZXJfaWQgPSBkZXRhaWxbXCJ1c2VySWRcIl1cbiAgICAqL1xuXG4gICAgY29uc3QgcXVlcnkgPSAvKiBHcmFwaFFMICovIGBcbiAgICAgICAgbXV0YXRpb24gTXV0YXRpb24ge1xuICAgICAgICAgIHB1Ymxpc2hSZXNwb25zZSAoZGF0YTogJHtKU09OLnN0cmluZ2lmeShpdGVtLk1lc3NhZ2UpfSwgc2Vzc2lvbklkOiBcIiR7XG4gICAgICAgICAgICByZXEuZGF0YS5zZXNzaW9uSWRcbiAgICAgICAgICB9XCIsIHVzZXJJZDogXCIke3JlcS51c2VySWR9XCIpIHtcbiAgICAgICAgICAgIGRhdGFcbiAgICAgICAgICAgIHNlc3Npb25JZFxuICAgICAgICAgICAgdXNlcklkXG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgYDtcbiAgICAvL2xvZ2dlci5pbmZvKHF1ZXJ5KTtcbiAgICBjb25zdCByZXNwID0gYXdhaXQgZ3JhcGhRbFF1ZXJ5KHF1ZXJ5KTtcbiAgICAvL2xvZ2dlci5pbmZvKHJlc3ApO1xuICB9XG59O1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcbiAgZXZlbnQ6IFNRU0V2ZW50LFxuICBjb250ZXh0OiBDb250ZXh0XG4pOiBQcm9taXNlPFNRU0JhdGNoUmVzcG9uc2U+ID0+IHtcbiAgbG9nZ2VyLmRlYnVnKFwiRXZlbnRcIiwgeyBldmVudCB9KTtcbiAgZXZlbnQuUmVjb3JkcyA9IGV2ZW50LlJlY29yZHMuc29ydCgoYSwgYikgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB4OiBudW1iZXIgPSBKU09OLnBhcnNlKGEuYm9keSkuTWVzc2FnZS5kYXRhPy50b2tlbj8uc2VxdWVuY2VOdW1iZXI7XG4gICAgICBjb25zdCB5OiBudW1iZXIgPSBKU09OLnBhcnNlKGIuYm9keSkuTWVzc2FnZS5kYXRhPy50b2tlbj8uc2VxdWVuY2VOdW1iZXI7XG4gICAgICByZXR1cm4geCAtIHk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gcHJvY2Vzc1BhcnRpYWxSZXNwb25zZShldmVudCwgcmVjb3JkSGFuZGxlciwgcHJvY2Vzc29yLCB7XG4gICAgY29udGV4dCxcbiAgfSk7XG59O1xuIl19