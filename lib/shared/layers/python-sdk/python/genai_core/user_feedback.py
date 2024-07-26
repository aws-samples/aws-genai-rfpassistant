import os
import uuid
import boto3
import json
from pydantic import BaseModel
from datetime import datetime
from genai_core.ExcelSXRWv2 import ExcelSXWriter

dynamodb = boto3.resource("dynamodb")
s3_client = boto3.client("s3")
AWS_REGION = os.environ["AWS_REGION"]
USER_FEEDBACK_BUCKET_NAME = os.environ.get("USER_FEEDBACK_BUCKET_NAME")
QUESTIONS_TABLE_NAME = os.environ["QUESTIONS_TABLE_NAME"]
S3_BUCKET_FILESTORE = os.environ["CHATBOT_FILES_BUCKET_NAME"]
QUESTIONS_BY_SESSION_INDEX_NAME = os.environ["QUESTIONS_BY_SESSION_INDEX_NAME"]
#QUESTIONS_BY_SESSION_INDEX_NAME = "SessionId-inbySessionIddex"
s3 = boto3.client('s3', region_name=AWS_REGION)
table = dynamodb.Table(QUESTIONS_TABLE_NAME)

def add_user_feedback(sessionId: str, questionId:str, feedback:str, userId: str):
    
    timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    
    
    # DynamoDB Table, update an existing item
    
    response = table.update_item(
        Key={
            "QuestionId": questionId,
            "SessionId" : sessionId
        },
        UpdateExpression="SET FeedbackResponse = :r",
        ExpressionAttributeValues={
            ":r": feedback,
        },
        ReturnValues="UPDATED_NEW"
    )
    print(response)

    # # S3 Bucket, store the item
    # key = f"{prefix}{feedbackId}.json"
    
    # item = {
    #     "feedbackId": feedbackId,
    #     "sessionId": sessionId,
    #     "userId": userId,
    #     "key": key,
    #     "prompt": prompt,
    #     "completion": completion,
    #     "model": model,
    #     "feedback": feedback,
    #     "createdAt": timestamp
    # }
    
    # response = s3_client.put_object(
    #     Bucket=USER_FEEDBACK_BUCKET_NAME,
    #     Key=f"{prefix}{feedbackId}.json",
    #     Body=json.dumps(item),
    #     ContentType="application/json",
    #     StorageClass='STANDARD_IA',
    # )
    # print(response)
    
    return {
        "sessionId": sessionId,
        "questionId": questionId,
        "message": "Updated Feedback"
    }

def download_file(SessionID: str, S3ObjectKey=None):

    # Add your logic to create excel file and write it back to S3. Return the s3 file.

    questions = []
    last_evaluated_key_question = None
    questiontable = dynamodb.Table(QUESTIONS_TABLE_NAME)
    while True:
        if last_evaluated_key_question:
        #Fetch values from dynamodb table with Sessionid as partition key using LastEvaluatedKey
            response = questiontable.query(
                KeyConditionExpression="SessionId = :SessionId",
                ExpressionAttributeValues={":SessionId": SessionID},
                IndexName=QUESTIONS_BY_SESSION_INDEX_NAME,
                ExclusiveStartKey=last_evaluated_key_question,
            )
        else:
            response = questiontable.query(
                KeyConditionExpression="SessionId = :SessionId",
                ExpressionAttributeValues={":SessionId": SessionID},
                IndexName=QUESTIONS_BY_SESSION_INDEX_NAME,
            )
        questions.extend(response.get("Items", []))
        last_evaluated_key_question = response.get("LastEvaluatedKey")
        if not last_evaluated_key_question:
            break
    #loop through questions and create Json
    #sheets =[]
    sheets=[]
    queries =[]
    for question in questions:
        sheetName= question["Sheet"]
        if(sheetName not in sheets):
            sheets.append(sheetName)
    workbooks=[]
    worksheets=[]
    #print(sheets)
    for sheet in sheets:
        worksheet={}
        #print(sheet)
        for question in questions:
            if sheet== question["Sheet"] and sheet not in worksheet.values():
                worksheet = {
                    "sheet": question["Sheet"],
                    "column": "0",
                    "queries": []         
                }
            #worksheets[sheet]=worksheet
            if sheet== question["Sheet"] and sheet in worksheet.values():  
                worksheet["queries"].append({
                        "row": int(question['Row']),
                        "questionid": question["QuestionId"],
                        "query": question["Query"],
                        "generatedresponse":question["GeneratedResponse"],
                        "feedbackresponse":question["FeedbackResponse"]
                    }),
            #print(worksheets)
                #worksheet["queries"]["questionid"](query)
        worksheets.append(worksheet)
        workbooks.append(worksheets)
    workbook_object = json.dumps(workbooks)
    # why do we do a get here ?
    if S3ObjectKey is None:
        # can we create empty excel file ?
        pass
    else:
        response = s3.get_object(Bucket=S3_BUCKET_FILESTORE, Key="public/" + S3ObjectKey)        
        writer = ExcelSXWriter(response['Body'], query_start_row=1, query_column=0)

    writer.edit_response(workbook_object)
    s3.upload_file('/tmp/output_file.xlsx', Bucket=S3_BUCKET_FILESTORE, Key="public/" + S3ObjectKey)
    result = {"id": SessionID, "s3Uri": S3ObjectKey}
    return result

    

               
           