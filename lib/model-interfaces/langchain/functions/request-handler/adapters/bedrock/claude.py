import genai_core.clients

# from langchain.llms import Bedrock
from langchain.prompts.prompt import PromptTemplate

from .base import Bedrock
from ..base import ModelAdapter
from genai_core.registry import registry


class BedrockClaudeAdapter(ModelAdapter):
    def __init__(self, model_id, *args, **kwargs):
        self.model_id = model_id

        super().__init__(*args, **kwargs)

    def get_llm(self, model_kwargs={}):
        bedrock = genai_core.clients.get_bedrock_client()
        params = {}
        if "temperature" in model_kwargs:
            params["temperature"] = model_kwargs["temperature"]
        if "topP" in model_kwargs:
            params["top_p"] = model_kwargs["topP"]
        if "maxTokens" in model_kwargs:
            params["max_tokens"] = model_kwargs["maxTokens"]

        params["anthropic_version"] = "bedrock-2023-05-31"
        return Bedrock(
            client=bedrock,
            model_id=self.model_id,
            model_kwargs=params,
            streaming=model_kwargs.get("streaming", False),
            callbacks=[self.callback_handler],
        )

    def get_qa_prompt(self,variables=None):
        template = """
            System: Play a role of {CompanyName} RFP FAQ bot. you will answer questions about text in <context> .
            <context>
            {context}
            </context>
            While answering question, Use active voice,instead of {CompanyName} RFP FAQ bot, use we at {CompanyName},
            in the answer don't use phrases like based on context provided,documentation indicates instead use We
            don't generate or propose new actions or new information or new statstics or new metrics that is not in context, don't use numbers from Question
            Instead of I, use we at {CompanyName} 
            if question cannot be answered from context always respond as Unable to answer: No Information available to answer with the current information available to the question {question}
            user: {question}
            """

        return PromptTemplate(
                template=template, input_variables=["context", "question"], partial_variables=variables
            )
                

    def get_prompt(self):
        template = """The following is a friendly conversation between a human and an AI. If the AI does not know the answer to a question, it truthfully says it does not know.

Current conversation:
{chat_history}

Question: {input}"""

        input_variables = ["input", "chat_history"]
        prompt_template_args = {
            "chat_history": "{chat_history}",
            "input_variables": input_variables,
            "template": template,
        }
        prompt_template = PromptTemplate(**prompt_template_args)

        return prompt_template

    def get_condense_question_prompt(self):
        template = """<conv>
{chat_history}
</conv>

<followup>
{question}
</followup>

Given the conversation inside the tags <conv></conv>, rephrase the follow up question you find inside <followup></followup> to be a standalone question, in the same language as the follow up question.
"""

        return PromptTemplate(
            input_variables=["chat_history", "question"],
            chat_history="{chat_history}",
            template=template,
        )


# Register the adapter
registry.register(r"^bedrock.anthropic.claude*", BedrockClaudeAdapter)
