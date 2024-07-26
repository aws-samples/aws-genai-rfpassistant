import genai_core.sessions
import genai_core.types
import genai_core.auth
import genai_core.utils.json
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.appsync import Router
import json
from boto3.dynamodb.conditions import Key

tracer = Tracer()
router = Router()
logger = Logger()


@router.resolver(field_name="listSessions")
@tracer.capture_method
def get_sessions(sessionType: str):
    user_id = genai_core.auth.get_user_id(router)
    if user_id is None:
        raise genai_core.types.CommonError("User not found")

    sessions = genai_core.sessions.list_sessions_by_user_id(user_id, sessionType)
    if sessionType == "rfp":
            
        return [
            {
                "id": session.get("SessionId"),
                "title": session.get("SessionTitle"),
                "startTime": f'{session.get("StartTime")}Z',
                "s3ObjectKey" : session.get("S3ObjectKey"),
            }
            for session in sessions
        ]
    else:
        return [
            {
                "id": session.get("SessionId"),
                "title": session.get("History", [{}])[0]
                .get("data", {})
                .get("content", "<no title>"),
                "startTime": f'{session.get("StartTime")}Z',
            }
            for session in sessions
         ]
    


@router.resolver(field_name="getSession")
@tracer.capture_method
def get_session(id: str, sessionType: str):
    user_id = genai_core.auth.get_user_id(router)
    if user_id is None:
        raise genai_core.types.CommonError("User not found")

    session = genai_core.sessions.get_session(id, user_id, sessionType)
    if not session:
        return None
    if sessionType == "rfp":
        return {
                "id": session.get("SessionId"),
                "title": session.get("SessionTitle"),
                "startTime": f'{session.get("StartTime")}Z',
                "s3ObjectKey" : session.get("S3ObjectKey"),
            }
            
    else:
        return {
            "id": session.get("SessionId"),
            "title": session.get("History", [{}])[0]
            .get("data", {})
            .get("content", "<no title>"),
            "startTime": f'{session.get("StartTime")}Z',
            "history": [
                {
                    "type": item.get("type"),
                    "content": item.get("data", {}).get("content"),
                    "metadata": json.dumps(
                        item.get("data", {}).get("additional_kwargs"),
                        cls=genai_core.utils.json.CustomEncoder,
                    ),
                }
                for item in session.get("History")
            ],
            #Get questions
        }


@router.resolver(field_name="deleteUserSessions")
@tracer.capture_method
def delete_user_sessions(sessionType: str):
    user_id = genai_core.auth.get_user_id(router)
    if user_id is None:
        raise genai_core.types.CommonError("User not found")

    result = genai_core.sessions.delete_user_sessions(user_id, sessionType)

    return result


@router.resolver(field_name="deleteSession")
@tracer.capture_method
def delete_session(id: str, sessionType: str):
    user_id = genai_core.auth.get_user_id(router)
    if user_id is None:
        raise genai_core.types.CommonError("User not found")

    result = genai_core.sessions.delete_session(id, user_id, sessionType)

    return result
