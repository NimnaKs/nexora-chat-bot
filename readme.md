# Nexora Campus Copilot

## Project Overview

Nexora Campus Copilot is an AI‑powered assistant designed to restore reliable campus communications at NovaCore University. It provides students with accurate, up‑to‑date information on class schedules, cafeteria menus, bus timetables, events, and administrative procedures. Built with a robust retrieval‑augmented generation (RAG) architecture and integrity checks, Nexora ensures trust, security, and multilingual support.

## Features

### Core Features

- **Accurate Q&A**: Retrieves and answers queries from PDF handbooks, CSV timetables, and official notices.
- **RAG Architecture**: Embeds documents and performs similarity search with OpenAI embeddings and FAISS/Pinecone.
- **Admin Dashboard**: Allows staff to upload or correct content (PDFs, CSVs, Word docs) with audit logging.
- **Multilingual Support**: Seamless switching between English, Sinhala, and Tamil.
- **Voice Interaction**: Speech‑to‑text (Whisper) and optional text‑to‑speech (Web Speech API) for hands‑free use.

### Additional Features

- **Real‑time Updates**: Webhook integrations to ingest campus notices immediately.
- **Analytics Dashboard**: Visualize query trends, usage peaks, and satisfaction metrics.
- **Authentication**: Firebase-based secure authentication for students and staff.

## Tech Stack

- **Frontend**: Next.js, React, TailwindCSS, shadcn/ui, next‑i18next
- **Backend**: Python Flask (app.py, chatbot.py), LangChain orchestration
- **Authentication**: Firebase Auth (email/password, SSO)
- **Vector Store**: Pinecone (or FAISS for local dev)
- **Embeddings & LLM**: OpenAI Embeddings (text‑embedding‑ada‑002) and GPT‑4
- **Database**: Firestore for user data and audit logs
- **Speech Processing**: OpenAI Whisper API, Web Speech API
- **Deployment**: Docker, AWS ECS Fargate, GitHub Actions CI/CD
- **Monitoring**: AWS CloudWatch, Prometheus/Grafana (optional)

## Screenshots / Demo

[📁 Screenshot & Demo Video Folder](https://drive.google.com/drive/folders/1OMj63m396VZDSudR8UlH4NB7Qbnn8VK4?usp=drive_link)


## Setup Instructions

```bash
# Clone the repo
git clone https://github.com/your-org/nexora-campus-copilot.git
cd nexora-campus-copilot

# Install backend dependencies
cd backend
pip install -r requirements.txt
# Set environment variables
export GOOGLE_APPLICATION_CREDENTIALS="firebase_key.json"

# Run the backend
python app.py

# Install frontend dependencies
cd ../frontend
npm install
npm run dev
```

## Branches
- **be**: Backend code branch containing Flask and LangChain services.
- **fe**: Frontend code branch containing Next.js and React components.

## Team

- **Chamika Dilshan** – AI Chatbot Development
- **Thakshana Lakruwan** – RAG Pipeline & Vector DB
- **Uthsara Basnayake** – Speech Processing & Multimodal Interface
- **Nimna Kaveesha Sekara** – Frontend

## Submission

Developed for Nexora 1.0 – Round 2\
Submission Date: 12 June 2025
