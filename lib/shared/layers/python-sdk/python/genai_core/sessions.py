import os
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key

AWS_REGION = os.environ["AWS_REGION"]
SESSIONS_TABLE_NAME = os.environ["SESSIONS_TABLE_NAME"]
QUESTIONS_TABLE_NAME = os.environ["QUESTIONS_TABLE_NAME"]
QUESTIONS_BY_SESSION_INDEX_NAME = os.environ["QUESTIONS_BY_SESSION_INDEX_NAME"]
SESSIONS_BY_SESSION_ID_INDEX_NAME = os.environ["QUESTIONS_BY_SESSION_INDEX_NAME"]
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(SESSIONS_TABLE_NAME)
questiontable = dynamodb.Table(QUESTIONS_TABLE_NAME)


def get_session(session_id, user_id, sessionType):
    response = {}
    try:
        response = table.get_item(Key={"SessionType": f"{sessionType}#{session_id}", "UserId": user_id})
    except ClientError as error:
        if error.response["Error"]["Code"] == "ResourceNotFoundException":
            print("No record found with session id: %s", session_id)
        else:
            print(error)
    if sessionType == 'rfp':            
        return list_questions_by_session_id(response.get("Item", {}))
    else:
        return response.get("Item", {})

def list_sessions_by_user_id(user_id, sessionType):
    items = []
    try:
        last_evaluated_key = None
        while True:
            if last_evaluated_key:
                response = table.query(
                    KeyConditionExpression=Key('UserId').eq(user_id) & Key('SessionType').begins_with(f"{sessionType}#"),
                    ExclusiveStartKey=last_evaluated_key,
                )
            else:
                response = table.query(
                    KeyConditionExpression=Key('UserId').eq(user_id) & Key('SessionType').begins_with(f"{sessionType}#"),
                )
            print(response)
            for item in response['Items']:
                items.append(item)
            #items['sessiondetails'].extend(response.get("Items", []))
            #loop through items


            last_evaluated_key = response.get("LastEvaluatedKey")
            if not last_evaluated_key:
                break

    except ClientError as error:
        if error.response["Error"]["Code"] == "ResourceNotFoundException":
            print("No record found for user id: %s", user_id)
        else:
            print(error)
 #Loop through items and fetch questions from dynamodb table with Sessionid as sort key
    if sessionType == 'rfp':
        for item in items: 
            list_questions_by_session_id(item)
    return items

def list_questions_by_session_id(item):
    try:
                      
            session_Id = item['SessionId']
            
            item['questions'] = []
            last_evaluated_key_question = None
            while True:
                if last_evaluated_key_question:
                #Fetch values from dynamodb table with Sessionid as partition key using LastEvaluatedKey
                    response = questiontable.query(
                        KeyConditionExpression="SessionId = :SessionId",
                        ExpressionAttributeValues={":SessionId": session_Id},
                        IndexName=QUESTIONS_BY_SESSION_INDEX_NAME,
                        ExclusiveStartKey=last_evaluated_key_question,
                    )
                else:
                    response = questiontable.query(
                        KeyConditionExpression="SessionId = :SessionId",
                        ExpressionAttributeValues={":SessionId": session_Id},
                        IndexName=QUESTIONS_BY_SESSION_INDEX_NAME,
                    )
        
                item['questions'].extend(response.get("Items", []))

                last_evaluated_key_question = response.get("LastEvaluatedKey")
                if not last_evaluated_key_question:
                    break
            #item.questions.extend(questions)
    except ClientError as error:
        if error.response["Error"]["Code"] == "ResourceNotFoundException":
            print("No record found for session id: %s", session_Id)
        else:
            print(error)


def delete_session(session_id, user_id, sessionType):
    try:
        table.delete_item(Key={"SessionType": f"{sessionType}#{session_id}", "UserId": user_id})
    except ClientError as error:
        if error.response["Error"]["Code"] == "ResourceNotFoundException":
            print("No record found with session id: %s", session_id)
        else:
            print(error)

        return {"id": session_id, "deleted": False}

    return {"id": session_id, "deleted": True}


def delete_user_sessions(user_id, sessionType):
    sessions = list_sessions_by_user_id(user_id, sessionType)
    ret_value = []

    for session in sessions:
        result = delete_session(session["SessionId"], user_id, sessionType)
        ret_value.append({"id": session["SessionId"], "deleted": result["deleted"]})

    return ret_value
