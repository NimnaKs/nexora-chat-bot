from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain.chains.question_answering import load_qa_chain
from langchain.prompts import PromptTemplate
import speech_recognition as sr
import os

class ChatBot:
    def __init__(self, google_api_key):
        self.google_api_key = google_api_key
        # 1) Tell the LLM to only return the "content" field
        self.model = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0.3,
            google_api_key=google_api_key,
            llm_kwargs={
                "response_kwargs": {
                    "allowed_response_fields": ["content"]
                }
            }
        )
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=google_api_key
        )
        self.setup_qa_chain()

    def setup_qa_chain(self):
        prompt_template = """
        You are provided with CONTEXT and must answer the QUESTION in detail.
        If the answer is not in the context, say "Answer is not available in the context".

        CONTEXT:
        {context}

        QUESTION:
        {question}

        ANSWER:
        """
        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        self.chain = load_qa_chain(self.model, chain_type="stuff", prompt=prompt)

    def get_answer(self, question, vector_store_name):
        path = f"vector_stores/{vector_store_name}"
        if not os.path.exists(path):
            return "No knowledge base found. Please contact admin."

        store = FAISS.load_local(
            path,
            self.embeddings,
            allow_dangerous_deserialization=True
        )
        docs = store.similarity_search(question)
        print(f"Found {len(docs)} documents for the question: {question}")

        # 2) Use .run() instead of __call__ to avoid parser quirks
        try:
            answer = self.chain.run(input_documents=docs, question=question)
            return answer
        except Exception as e:
            return f"Error during QA chain run: {e}"

    def speech_to_text(self, audio_file):
        recognizer = sr.Recognizer()
        try:
            with sr.AudioFile(audio_file) as src:
                audio = recognizer.record(src)
                return recognizer.recognize_google(audio)
        except Exception as e:
            return f"Error converting speech: {e}"
