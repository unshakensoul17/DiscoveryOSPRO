# DiscoveryOS Pro 🛡️

DiscoveryOS Pro is an AI-driven, multi-tenant product discovery intelligence engine. It structures, processes, and validates product hypotheses, customer pain points, and empirical metric evidence in real-time. The system processes incoming user feedback, synthesizes facts using structured LLM agents, and flags validation anomalies, research biases, and belief drifts.

---

## 🏗️ Architecture & Component Overview

```mermaid
graph TD
    UI[React/Vite Frontend] -->|REST API + JWT| API[FastAPI Gateway]
    API -->|Read/Write| DB[(Primary PostgreSQL / SQLite fallback)]
    API -->|Dispatch Ingestion Task| Broker[Redis Broker]
    Broker -->|Execute Process| Worker[Celery Worker]
    Worker -->|Extract Text| DocProc[Document Processor]
    Worker -->|Synthesize Evidence| Agent[LLM Evidence Synthesis Agent]
    Agent -->|Evaluate Confidence| KSE[Knowledge State Engine]
    KSE -->|Verify Contradictions| DE[Discovery Engine]
    DE -->|Store Discoveries| DB
```

### 1. Frontend Client (`/src`)
A modern, lightweight React + Vite interface with Outfit typography and cobalt styling ("The Clinical Ledger" theme).
* **State Management:** Zustand with persistence middleware (`discoveryos-auth-storage`) to maintain session tokens across reloads.
* **Data Fetching:** React Query (TanStack Query) for cache management and optimistic updates.
* **Views:** Isolated workspace boards, interactive hypothesis explorer, validation feed, and document upload hub.

### 2. Backend Gateway (`/backend`)
A high-performance FastAPI server managing routing, multi-tenant session isolation, and database access.
* **Authentication:** Password hashing (bcrypt) and secure JWT access tokens.
* **Session Isolation:** Workspace ownership validation middleware (`verify_workspace`) guarding nested resources (Claims, Evidence, Discoveries, Documents).
* **Seeded Sandbox:** Auto-seeds isolated workspaces (`Acme Corp R&D` & `BioTech Innovations`) for newly registered users.

### 3. Asynchronous Pipeline & Workers (`/backend/tasks` & `/backend/services`)
* **Document Processing:** Custom parsers for binary `.pdf`, `.docx`, and `.txt` files to strip formatting and extract structural text.
* **LLM Synthesis Agent:** Employs a structured JSON regex extractor to map text snippets into claims, assumptions, and counter-claims using Google's generative models.
* **Knowledge State & Discovery Engines:** Validates and decays claim certitude levels based on the age of evidence, detecting anomalies (e.g., belief drifts or methodology bias).

---

## 🛠️ Technology Stack

* **Frontend:** React, TypeScript, Vite, TailwindCSS (for utility styling), Zustand, TanStack Query, Framer Motion.
* **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL (SQLite fallback).
* **Asynchronous Queue:** Celery, Redis.
* **Packaging:** Poetry (Python dependency manager), npm (Frontend packaging).

---

## 🚀 Getting Started

### 📋 Prerequisites
Ensure you have the following installed:
* Node.js (version 18 or higher)
* Python (version 3.12 or higher)
* Redis (for Celery broker)

---

### ⚙️ Backend Setup & Run

1. **Install Dependencies:**
   ```bash
   cd backend
   poetry install
   # Or using the local virtual env directly
   ../.venv/bin/pip install -r requirements.txt
   ```

2. **Configure Environment Variables (`backend/.env`):**
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/discoveryos
   REDIS_URL=redis://localhost:6379/0
   JWT_SECRET_KEY=your-secure-secret-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

3. **Start the API Server:**
   ```bash
   .venv/bin/uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
   ```

4. **Start the Celery Background Task Worker:**
   ```bash
   cd backend
   ../.venv/bin/celery -A celery_app worker --loglevel=info
   ```

---

### 💻 Frontend Setup & Run

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment (`.env`):**
   ```env
   VITE_API_URL=http://localhost:8000/v1
   ```

3. **Run Dev Server:**
   ```bash
   npm run dev
   ```

4. **Build Production Bundle:**
   ```bash
   npm run build
   ```

---

## 🧪 Running Integration Tests

Run the integration suite to verify database connection, password hashing, workspace seeding, document ingestion, and claim state logic:
```bash
.venv/bin/python backend/test_api_integration.py
```

---

## 📝 Directory Tree Highlights

```
DiscoveryOSPRO/
├── backend/                  # FastAPI & Worker codebase
│   ├── agents/               # LLM Agent configurations
│   ├── models/               # SQLAlchemy Database schemas
│   ├── routes/               # API routes (Auth, Claims, Discoveries, Workspaces)
│   ├── services/             # Document parsers, discovery algorithms
│   ├── tasks/                # Celery async ingestion tasks
│   └── database.py           # Engine config & schema auto-migrations
├── src/                      # React / TypeScript SPA
│   ├── api/                  # Axios clients and React Query custom hooks
│   ├── components/           # Reusable UI widgets
│   ├── store/                # Zustand persistent store modules
│   └── pages/                # Main view pages
├── Dockerfile                # Release image instructions
├── package.json              # Vite & frontend library packages
└── pyproject.toml            # Poetry dependencies
```
