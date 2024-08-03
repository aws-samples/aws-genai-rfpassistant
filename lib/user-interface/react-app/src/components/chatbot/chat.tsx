import { useContext, useEffect, useState } from "react";
import {
  ChatBotConfiguration,
  ChatBotHistoryItem,
  ChatBotMessageType,
  //FeedbackData,
} from "./types";
import {
  SpaceBetween,
  StatusIndicator,
  Button,
  Spinner,
} from "@cloudscape-design/components";
import { v4 as uuidv4 } from "uuid";
import { AppContext } from "../../common/app-context";
import { ApiClient } from "../../common/api-client/api-client";
import ChatMessage from "./chat-message";
import ChatInputPanel, { ChatScrollState } from "./chat-input-panel";
import styles from "../../styles/chat.module.scss";
import { CHATBOT_NAME } from "../../common/constants";
import { DownloadFileData, ImageFile } from "./types";
import { getSignedUrl } from "./utils";

export default function Chat(props: { sessionId?: string }) {
  const appContext = useContext(AppContext);
  const [running, setRunning] = useState<boolean>(false);
  const [session, setSession] = useState<{ id: string; loading: boolean }>({
    id: props.sessionId ?? uuidv4(),
    loading: typeof props.sessionId !== "undefined",
  });
  const [configuration, setConfiguration] = useState<ChatBotConfiguration>(
    () => ({
      streaming: true,
      showMetadata: false,
      maxTokens: 512,
      temperature: 0.6,
      topP: 0.9,
      files: null,
    })
  );

  const [messageHistory, setMessageHistory] = useState<ChatBotHistoryItem[]>(
    []
  );
  const [files, setFiles] = useState<ImageFile[]>([] as ImageFile[]);
  const [downloadResponsesStatus, setDownloadResponsesStatus] = useState(false);
  const [responseFileLink, setResponseFileLink] = useState("");
  const [fileDownloadLoader, setFileDownloadLoader] = useState(false);

  const downloadFile = async (key: string) => {
    if (!appContext) return;

    const downloadFileData: DownloadFileData = {
      SessionId: session.id,
      S3ObjectKey: key,
    };
    const apiClient = new ApiClient(appContext);
    const res = await apiClient.userFeedback.downloadFile({ downloadFileData });
    return res;
  };
  const downloadResponseFile = async () => {
    setFileDownloadLoader(true);
    if (files as ImageFile[]) {
      // const files: ImageFile[] = [];
      for await (const file of files as ImageFile[]) {
        const res = await downloadFile(file.key);
        if (res?.data?.downloadFile?.s3Uri) {
          const s3Uri = res.data.downloadFile.s3Uri;
          const signedUrl = await getSignedUrl(s3Uri);
          setResponseFileLink(signedUrl);
        }
      }
    }
    setFileDownloadLoader(false);
  };

  useEffect(() => {
    if (!appContext) return;
    setMessageHistory([]);

    (async () => {
      if (!props.sessionId) {
        setSession({ id: uuidv4(), loading: false });
        setDownloadResponsesStatus(false);
        setResponseFileLink("");
        return;
      }

      setSession({ id: props.sessionId, loading: true });
      const apiClient = new ApiClient(appContext);
      try {
        const result = await apiClient.sessions.getSession(
          props.sessionId,
          "rfp"
        );

        if (result.data?.getSession?.history) {
          console.log(result.data.getSession);
          ChatScrollState.skipNextHistoryUpdate = true;
          ChatScrollState.skipNextScrollEvent = true;
          console.log("History", result.data.getSession.history);
          setMessageHistory(
            result
              .data!.getSession!.history.filter((x: any) => x !== null)
              .map((x: any) => ({
                type: x!.type as ChatBotMessageType,
                metadata: JSON.parse(x!.metadata!),
                content: x!.content,
                data: x!.data,
              }))
          );

          window.scrollTo({
            top: 0,
            behavior: "instant",
          });
        }
      } catch (error) {
        console.log(error);
      }

      setSession({ id: props.sessionId, loading: false });
      setRunning(false);
    })();
  }, [appContext, props.sessionId]);

  /*
  const handleFeedback = (feedbackType: 1 | 0, idx: number, message: ChatBotHistoryItem) => {
    if (message.metadata.sessionId) {
      
      let prompt = "";
      if (Array.isArray(message.metadata.prompts) && Array.isArray(message.metadata.prompts[0])) { 
          prompt = message.metadata.prompts[0][0];
      }
      const completion = message.content;
      const model = message.metadata.modelId;
      const feedbackData: FeedbackData = {
        sessionId: message.metadata.sessionId as string,
        key: idx,
        feedback: feedbackType,
        prompt: prompt,
        completion: completion,
        model: model as string
      };
      addUserFeedback(feedbackData);
    }
  };


  const addUserFeedback = async (feedbackData: FeedbackData) => {
    if (!appContext) return;

    const apiClient = new ApiClient(appContext);
    await apiClient.userFeedback.addUserFeedback({feedbackData});
  };
*/

  return (
    <div className={styles.chat_container}>
      <div style={{ textAlign: "center" }}>
        {downloadResponsesStatus && (
          <div style={{ display: "inline-block" }}>
            <Button variant="primary" onClick={downloadResponseFile}>
              {fileDownloadLoader && <Spinner />}Generate response file
            </Button>
          </div>
        )}
        {responseFileLink != "" && (
          <div style={{ display: "inline-block" }}>
            <a
              href={responseFileLink as string}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="primary">Download response file</Button>
            </a>
          </div>
        )}
      </div>

      <SpaceBetween direction="vertical" size="m">
        {messageHistory.map((message, idx) => (
          <ChatMessage
            key={`chatmessage_${idx}`}
            message={message}
            showMetadata={configuration.showMetadata}
            files={files}
            setFiles={setFiles}
            //onThumbsUp={() => handleFeedback(1, idx, message)}
            //onThumbsDown={() => handleFeedback(0, idx, message)}
          />
        ))}
      </SpaceBetween>

      <div className={styles.welcome_text}>
        {messageHistory.length == 0 && !session?.loading && (
          <center>{CHATBOT_NAME}</center>
        )}
        {session?.loading && (
          <center>
            <StatusIndicator type="loading">Loading session</StatusIndicator>
          </center>
        )}
      </div>

      <div className={styles.input_container}>
        <ChatInputPanel
          session={session}
          running={running}
          setRunning={setRunning}
          messageHistory={messageHistory}
          setMessageHistory={(history) => setMessageHistory(history)}
          configuration={configuration}
          setConfiguration={setConfiguration}
          setDownloadResponsesStatus={setDownloadResponsesStatus}
        />
      </div>
    </div>
  );
}
