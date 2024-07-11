import { GraphQLResult } from "@aws-amplify/api-graphql";
import { API, GraphQLQuery } from "@aws-amplify/api";
import { AddUserFeedbackMutation, DownloadFileMutation } from "../../API.ts";
import {
  addUserFeedback,
  downloadFile
} from "../../graphql/mutations.ts";
import { FeedbackData, DownloadFileData } from "../../components/chatbot/types.ts";

export class UserFeedbackClient {

  async addUserFeedback(params: {
    feedbackData: FeedbackData
  }
  ): Promise<GraphQLResult<GraphQLQuery<AddUserFeedbackMutation>>> {
    const result = API.graphql<GraphQLQuery<AddUserFeedbackMutation>>({
      query: addUserFeedback,
      variables: {
        input: {
          sessionId: params.feedbackData.sessionId,
          questionId: params.feedbackData.questionId,
          feedback: params.feedbackData.feedback
        },
      },
    });
    return result;
  }

  async downloadFile(params: {
    downloadFileData: DownloadFileData
  }): Promise<GraphQLResult<GraphQLQuery<DownloadFileMutation>>> {

    const result = API.graphql<GraphQLQuery<DownloadFileMutation>>({
      query: downloadFile,
      variables: {

        SessionId: params.downloadFileData.SessionId,
        S3ObjectKey: params.downloadFileData.S3ObjectKey

      }
    })
    return result
  }

}
