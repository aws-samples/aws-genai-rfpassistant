import genai_core.types
import genai_core.auth
import genai_core.user_feedback
from pydantic import BaseModel
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.appsync import Router

tracer = Tracer()
router = Router()
logger = Logger()


class CreateUserFeedbackRequest(BaseModel):
    sessionId: str    
    questionId: str
    feedback: str
    
    

@router.resolver(field_name="addUserFeedback")
@tracer.capture_method
def user_feedback(input: dict):
    request = CreateUserFeedbackRequest(**input)

        
    userId = genai_core.auth.get_user_id(router)

    if userId is None:
        raise genai_core.types.CommonError("User not found")
    
    result = genai_core.user_feedback.add_user_feedback(
        request.sessionId,request.questionId,request.feedback, userId)

    return {
        "questionId": result["questionId"],
        "sessionId": result["sessionId"],
        "message": result["message"]
    }

@router.resolver(field_name="downloadFile")
@tracer.capture_method
def download_file(SessionId: str, S3ObjectKey: "None"):
    
    # Add your logic to create excel file and write it back to S3. Return the s3 file.
    result = genai_core.user_feedback.download_file(SessionId, S3ObjectKey)

    #result = {"id": "session_id", "S3ObjectKey": "s3ObjectKey"}

    return result

