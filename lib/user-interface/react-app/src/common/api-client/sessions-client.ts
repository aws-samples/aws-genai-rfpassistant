import { API } from "aws-amplify";
import { GraphQLQuery, GraphQLResult } from "@aws-amplify/api";
import { listSessions, getSession } from "../../graphql/queries";
import { deleteSession, deleteUserSessions } from "../../graphql/mutations";
import {
  ListSessionsQuery,
  GetSessionQuery,
  DeleteSessionMutation,
  DeleteUserSessionsMutation,
} from "../../API";

export class SessionsClient {
  async getSessions(
    sessionType: string
  ): Promise<GraphQLResult<GraphQLQuery<ListSessionsQuery>>> {
    const result = await API.graphql<GraphQLQuery<ListSessionsQuery>>({
      query: listSessions,
      variables: {
        sessionType: sessionType,
      },
    });
    return result;
  }

  async getSession(
    sessionId: string,
    sessionType: string
  ): Promise<GraphQLResult<GraphQLQuery<GetSessionQuery>>> {
    const result = await API.graphql<GraphQLQuery<GetSessionQuery>>({
      query: getSession,
      variables: {
        id: sessionId,
        sessionType: sessionType,
      },
    });
    return result;
  }

  async deleteSession(
    sessionId: string,
    sessionType: string
  ): Promise<GraphQLResult<GraphQLQuery<DeleteSessionMutation>>> {
    const result = await API.graphql<GraphQLQuery<DeleteSessionMutation>>({
      query: deleteSession,
      variables: {
        id: sessionId,
        sessionType: sessionType,
      },
    });
    return result;
  }

  async deleteSessions(
    sessionType: string
  ): Promise<GraphQLResult<GraphQLQuery<DeleteUserSessionsMutation>>> {
    const result = await API.graphql<GraphQLQuery<DeleteUserSessionsMutation>>({
      query: deleteUserSessions,
      variables: {
        sessionType: sessionType,
      },
    });
    return result;
  }
}
