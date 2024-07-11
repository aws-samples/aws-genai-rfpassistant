import os
import json
import uuid
from datetime import datetime
import boto3
from genai_core.registry import registry
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities import parameters
from aws_lambda_powertools.utilities.batch import BatchProcessor, EventType
from aws_lambda_powertools.utilities.batch.exceptions import BatchProcessingError
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord
from aws_lambda_powertools.utilities.typing import LambdaContext

from indexchat import handle_run as chat_handle_run
import adapters
from genai_core.utils.websocket import send_to_client
from genai_core.types import ChatbotAction
import boto3
import csv
from io import StringIO
from genai_core.ExcelSXRWv2 import ExcelSXReader
from datetime import datetime


processor = BatchProcessor(event_type=EventType.SQS)
tracer = Tracer()
logger = Logger()

AWS_REGION = os.environ["AWS_REGION"]
API_KEYS_SECRETS_ARN = os.environ["API_KEYS_SECRETS_ARN"]
COMPANY_PARAMETER_NAME = os.environ["COMPANY_PARAMETER_NAME"]
S3_BUCKET_FILESTORE = os.environ["CHATBOT_FILES_BUCKET_NAME"]
#S3_BUCKET_FILESTORE = "genaichatbotstack-chatbotapichatbucketsfilesbucket-zkq1gyhnbhbu"
QUESTIONS_TABLE_NAME = os.environ["QUESTIONS_TABLE_NAME"]
QUESTIONS_BY_SESSION_INDEX_NAME = os.environ["QUESTIONS_BY_SESSION_INDEX_NAME"]
SESSIONS_TABLE_NAME = os.environ["SESSIONS_TABLE_NAME"]
sequence_number = 0
s3 = boto3.client('s3', region_name=AWS_REGION)
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
sessionstable = dynamodb.Table(SESSIONS_TABLE_NAME)
table = dynamodb.Table(QUESTIONS_TABLE_NAME)

def on_llm_new_token(user_id, session_id, self, token, run_id, *args, **kwargs):
    if token is None or len(token) == 0:
        return
    global sequence_number
    sequence_number += 1
    run_id = str(run_id)

    # send_to_client(
    #     {
    #         "type": "text",
    #         "action": ChatbotAction.LLM_NEW_TOKEN.value,
    #         "userId": user_id,
    #         "timestamp": str(int(round(datetime.now().timestamp()))),
    #         "data": {
    #             "sessionId": session_id,
    #             "token": {
    #                 "runId": run_id,
    #                 "sequenceNumber": sequence_number,
    #                 "value": token,
    #             },
    #         },
    #     }
    # )


def handle_heartbeat(record):
    user_id = record["userId"]
    session_id = record["data"]["sessionId"]

    send_to_client(
        {
            "type": "text",
            "action": ChatbotAction.HEARTBEAT.value,
            "timestamp": str(int(round(datetime.now().timestamp()))),
            "userId": user_id,
            "data": {
                "sessionId": session_id,
            },
        }
    )


def handle_run(record):
    user_id = record["userId"]
    data = record["data"]
    provider = data["provider"]
    model_id = data["modelName"]
    mode = data["mode"]
    #prompt = data["text"]
    workspace_id = data.get("workspaceId", None)
    session_id = data.get("sessionId")

    sessiontitle= data.get("text")
    companyName = parameters.get_parameter(COMPANY_PARAMETER_NAME)
    #update existing code for session title to be inserted
   
    #s3objectkey="public/SecQA-2.csv"
    #check if data.get("s3objectkey") is empty 
    if data.get("files") is None:
        s3objectkey="public/22037807.csv"
    else:
        s3objectkey="public/" +  data.get("files")[0]["key"]
    # Code to read a csv file located in S3objectkey
    


            

    #df = pd.read_csv(response['Body'])
    #code to read a xlsx file located in S3objectkey using pandas library
    #df = pd.read_excel(response['Body'])

       

    if not session_id:
        session_id = str(uuid.uuid4())
    # Full body of Parse, do on send to client

    adapter = registry.get_adapter(f"{provider}.{model_id}")

    adapter.on_llm_new_token = lambda *args, **kwargs: on_llm_new_token(
        user_id, session_id, *args, **kwargs
    )
    now = datetime.now()
    messages = []
# Insert in to Sessions table
    session ={
                                
            'UserId':user_id,
                #item['History'],
            'S3ObjectKey':s3objectkey,
            'SessionTitle':sessiontitle,
            "SessionType": f"rfp#{session_id}",
            'SessionId':session_id,
            'StartTime': datetime.now().isoformat(),
            'History':messages
    }        
    sessionstable.put_item(Item=session)
# parse csv, Insert response in to DynamoDB and send response to UI
    model = adapter(
        model_id=model_id,
        mode=mode,
        session_id=session_id,
        user_id=user_id,
        session_type = "rfp",
        model_kwargs=data.get("modelKwargs", {}),
    )

   
    rfpquestionworkbook=[]
    #create an object from json dump
    #py_obj = json.loads(json_data) 
    #loop through excel objects and use sheetnames etc..
    sheet_name="sheet1"
    startcolno="0"
    startrowno="0"
    response = {
        "sessionId": session_id,
        "type": "text",
        "content": "process started",        
    }

    send_to_client(
        {
            "type": "text",
            "action": ChatbotAction.STARTED.value,
            "timestamp": str(int(round(datetime.now().timestamp()))),
            "userId": user_id,
            "data": response,
        }
    )
    #iterate through worksheet
    #with open(response['Body'], newline='') as csvfile:
    #    reader = csv.DictReader(csvfile)
    
    response = s3.get_object(Bucket=S3_BUCKET_FILESTORE, Key=s3objectkey)
    
    excelreader = ExcelSXReader(response['Body'], query_start_row=1, query_column=0)
    
    readerlist=excelreader.get_all_queries()
    logger.info(readerlist)
    
    #reader = reader['Sheet1']

#Iterate through reader as list

    #logger.info(readerlist)

    for i in range(len(readerlist)):
        item= readerlist[i]
        queries=[]
    #for item in readerlist:
        #print(item)
        #logger.info(item)
        sheet_name=item[0]["sheet"]
        xlqueries =item[0]["queries"]
        startcolno=item[0]["Column"]

        logger.info(xlqueries)
        for i in range(len(xlqueries)):
            row= xlqueries[i]
        #for row in queries:
        #question_id = str(uuid.uuid4())
            query ={
                "Row":str(row['row']),
                "QuestionId":str(uuid.uuid4()),
                "Query" : row['query'],
                "Sheet":sheet_name,
                'GeneratedResponse':"",
                'FeedbackResponse':"",
                "SessionId":session_id
            }        
            table.put_item(Item=query)
            queries.append(query)

    #create an object rfpquestionworksheet with session_id(rfpid), sheet name and queries
        rfpquestionworksheet={
            "sessionId":session_id,        
            "sheet":sheet_name,
            "colno":startcolno,
            "sessiontitle":sessiontitle,
            "startrowno":startrowno,
            "queries":queries
        }
        rfpquestionworkbook.append(rfpquestionworksheet)
  
    response = {
        "sessionId": session_id,
        "type": "text",
        "content": rfpquestionworkbook,        
    }

    send_to_client(
        {
            "type": "text",
            "action": ChatbotAction.QUESTIONS.value,
            "timestamp": str(int(round(datetime.now().timestamp()))),
            "userId": user_id,
            "data": response,
        }
    )

    #loop through each sheet in workbook 
    for rfpquestionworksheet in rfpquestionworkbook:
        #Iterate through queries within each worksheet and send to llm for processing
        for query in rfpquestionworksheet['queries']:
            #run the model on query['Query']
            response = model.run(
                prompt=query['Query'],
                workspace_id=workspace_id,
                companyName=companyName,
            )
            #update the generated response in the query
            query['GeneratedResponse']=response
            logger.info(response)
            #update the dynamo db, have try catch and send error response
            clientResponse = {
                "sessionId": session_id,
                "type": "text",
                "content": response,   
                "QuestionId":query["QuestionId"],
                "sheet":sheet_name,
            }
            logger.info(clientResponse)
            send_to_client(
                {
                    "type": "text",
                    "action": ChatbotAction.ANSWER.value,
                    "timestamp": str(int(round(datetime.now().timestamp()))),
                    "userId": user_id,
                    "data": clientResponse,
                }
            )
            
            try:
            
                table.update_item(
                    Key={
                        "QuestionId": query["QuestionId"],
                        "SessionId" : session_id
                        
                    },
                    UpdateExpression="SET GeneratedResponse = :r",
                    ExpressionAttributeValues={
                        ":r": clientResponse['content']['content'],
                    },               
                )
            except Exception as e:
                logger.info("An error occurred during update:", e)   

    #Send a message to client after processing is compelete
    response = {
        "sessionId": session_id,
        "type": "text",
        "content": "process complete",        
    }
    send_to_client(
        {
            "type": "text",
            "action": ChatbotAction.FINAL_RESPONSE.value,
            "timestamp": str(int(round(datetime.now().timestamp()))),
            "userId": user_id,
            "data": response,
        }
    )

# #Prased data instead of df..
#     for index, row in df.iterrows():
#         question = row['Question']
#         response = model.run(
#             prompt=prompt,
#             workspace_id=workspace_id,
#         )


#         logger.info(response)
# #update the dynamo db, have try catch and send error response
#         send_to_client(
#             {
#                 "type": "text",
#                 "action": ChatbotAction.FINAL_RESPONSE.value,
#                 "timestamp": str(int(round(datetime.now().timestamp()))),
#                 "userId": user_id,
#                 "data": response,
#             }
#         )
#         #add another send_to_client -> process complete


@tracer.capture_method
def record_handler(record: SQSRecord):
    payload: str = record.body
    message: dict = json.loads(payload)
    detail: dict = json.loads(message["Message"])
    logger.info(detail)

    if detail["action"] == ChatbotAction.RUN.value:
        data = detail["data"]
        print(data)
        if not 'files' in data or len(data['files']) == 0:
            chat_handle_run(detail)
        else:            
            handle_run(detail)
    elif detail["action"] == ChatbotAction.HEARTBEAT.value:
        handle_heartbeat(detail)


def handle_failed_records(records):
    for triplet in records:
        status, error, record = triplet
        payload: str = record.body
        message: dict = json.loads(payload)
        detail: dict = json.loads(message["Message"])
        logger.info(detail)
        user_id = detail["userId"]
        data = detail.get("data", {})
        session_id = data.get("sessionId", "")

        send_to_client(
            {
                "type": "text",
                "action": "error",
                "direction": "OUT",
                "userId": user_id,
                "timestamp": str(int(round(datetime.now().timestamp()))),
                "data": {
                    "sessionId": session_id,
                    "content": str(error),
                    "type": "text",
                },
            }
        )


@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
def handler(event, context: LambdaContext):
    print(event)
    batch = event["Records"]

    api_keys = parameters.get_secret(API_KEYS_SECRETS_ARN, transform="json")
    for key in api_keys:
        os.environ[key] = api_keys[key]

    try:
        with processor(records=batch, handler=record_handler):
            processed_messages = processor.process()
    except BatchProcessingError as e:
        logger.error(e)

    logger.info(processed_messages)
    handle_failed_records(
        message for message in processed_messages if message[0] == "fail"
    )

    return processor.response()
