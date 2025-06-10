from PyPDF2 import PdfReader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_community.vectorstores import FAISS
import os

class PDFProcessor:
    def __init__(self, google_api_key):
        self.google_api_key = google_api_key
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=google_api_key
        )
    
    def extract_text_from_pdf(self, pdf_path):
        """Extract text from PDF file"""
        text = ""
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PdfReader(file)
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text
        except Exception as e:
            print(f"Error extracting text from PDF: {e}")
        return text
    
    def create_text_chunks(self, text):
        """Split text into chunks for processing"""
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        chunks = text_splitter.split_text(text)
        return chunks
    
    def create_vector_store(self, text_chunks, store_name):
        """Create and save vector store"""
        try:
            vector_store = FAISS.from_texts(text_chunks, embedding=self.embeddings)
            vector_store.save_local(f"vector_stores/{store_name}")
            return True
        except Exception as e:
            print(f"Error creating vector store: {e}")
            return False