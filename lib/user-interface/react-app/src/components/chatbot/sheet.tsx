import {
  SpaceBetween,
  Tabs,
  Grid,
  Textarea,
  Button,
  Flashbar,
  FlashbarProps,
} from "@cloudscape-design/components";
import { useState, useContext } from "react";
import { ApiClient } from "../../common/api-client/api-client";
import { AppContext } from "../../common/app-context";
import { FeedbackData } from "./types";
export default function SheetTabs(props: any) {
  const appContext = useContext(AppContext);
  const [feedbackResponses, setFeedbackResponses] = useState(Object);
  const [statusitems, setStatusItems] = useState<
    FlashbarProps.MessageDefinition[]
  >([]);

  const questions = props.data.questions[0];
  const answers = props.data.answers;
  const getGeneratedResponse = (_sheetid: string, questionId: string) => {
    for (let i = 0; i < answers.length; i++) {
      const ele = answers[i];
      if (ele.QuestionId == questionId) {
        return ele.content.content;
      }
    }

    return "Not yet Generated";
  };

  const handleFeedbackChange = (
    event: any,
    questionId: string,
    sessionId: string
  ) => {
    if (feedbackResponses !== null)
      setFeedbackResponses({
        ...feedbackResponses,
        [questionId]: {
          feedback: event.detail.value,
          sessionId: sessionId,
        },
      });
    else
      setFeedbackResponses({
        [questionId]: {
          feedback: event.detail.value,
          sessionId: sessionId,
        },
      });
  };

  const sendUserFeedback = async (questionId: string) => {
    if (!appContext) return;

    try {
      const key: number = 1;
      const apiClient = new ApiClient(appContext);
      const feedbackData: FeedbackData = {
        sessionId: feedbackResponses[questionId].sessionId as string,
        questionId: questionId as string,
        key: key,
        feedback: feedbackResponses[questionId].feedback as string,
        prompt: "string",
        completion: "string",
        model: "string",
      };
      await apiClient.userFeedback.addUserFeedback({ feedbackData });
      const statusObj: FlashbarProps.MessageDefinition = {
        type: "success",
        header: "Success",
        content: "Feedback Sent Successfully",
        dismissible: true,
        onDismiss: () => {
          setStatusItems([]);
        },
      };
      setStatusItems([statusObj]);
    } catch (error) {
      console.log("Send Feedback Error: ", error);
    }
  };

  return questions && questions.length > 0 ? (
    <>
      <Flashbar items={statusitems} />
      <Tabs
        key={`div_tabs_${props.key}`}
        tabs={questions.map((tabData: any) => {
          return {
            label: tabData.sheet,
            id: tabData.sheet,
            content: (
              <SpaceBetween size="xs" key={`div_sb_${props.key}`}>
                <Grid
                  key={`div_sb_g_${props.key}`}
                  gridDefinition={[
                    { colspan: 4 },
                    { colspan: 4 },
                    { colspan: 3 },
                    { colspan: 1 },
                  ]}
                >
                  <div style={{ textAlign: "center" }}>
                    <h3>Questions</h3>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <h3>Generated Response</h3>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <h3>Feedback</h3>
                  </div>
                  <div></div>
                </Grid>
                {tabData.queries.map((query: any, idx: any) => {
                  return (
                    <>
                      <Grid
                        key={`sheet_row_${idx}`}
                        gridDefinition={[
                          { colspan: 4 },
                          { colspan: 4 },
                          { colspan: 3 },
                          { colspan: 1 },
                        ]}
                      >
                        <div>
                          <h4>{query.Query}</h4>
                        </div>
                        <div>
                          <span>
                            {getGeneratedResponse(
                              tabData.colno,
                              query.QuestionId
                            )}
                          </span>
                        </div>
                        <div>
                          <Textarea
                            value={
                              feedbackResponses
                                ? feedbackResponses[query.QuestionId]
                                  ? feedbackResponses[query.QuestionId].feedback
                                  : ""
                                : ""
                            }
                            onChange={(event) =>
                              handleFeedbackChange(
                                event,
                                query.QuestionId,
                                query.SessionId
                              )
                            }
                          />
                        </div>
                        <div>
                          <Button
                            onClick={() => {
                              sendUserFeedback(query.QuestionId);
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </Grid>
                      <hr />
                    </>
                  );
                })}
              </SpaceBetween>
            ),
          };
        })}
      />
    </>
  ) : (
    <></>
  );
}
