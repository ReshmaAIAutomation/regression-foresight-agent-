# 🏛️ Architecture & Implementation Blueprint: Regression Foresight Agent

This document outlines the detailed system architecture, Pega enterprise mappings, semantic search (RAG) test case matching design, and the phased implementation plan for the public, open-source **Regression Foresight Agent** repository.

---

## 🔍 Core Concept: How the Agent Operates

In high-velocity development pipelines, running massive E2E regression suites for minor changes is a massive bottleneck. **Regression Foresight Agent** automates quality analysis by scanning Git code differences, performing relational dependency lookups on rules metadata, generating targeted functional test plans, and using semantic matching (RAG) to scope automated executions.

```mermaid
graph TD
    A[PR Git Diff / Changed JSON Rules] --> B[Foresight Orchestrator]
    B -->|Queries relational dependencies| C[DuckDB SQL Joins Engine]
    C -->|Relational Lookup| D[(Parquet Rules Database<br>.index/rules_myproject.parquet)]
    B -->|Traces upstream/downstream impact| E[Affected Rules & Functional Areas]
    B -->|Primary REST / Fallback Playwright| F[Jira Cloud Connectivity]
    B -->|Drafts validation points| G[Semantic RAG Engine]
    G -->|Mistral 1024-Dim Embeddings| H[MongoDB Vector Search]
    H -->|Cos-Sim Query| I[Target Test Specs & IDs]
    B -->|GitHub Actions/Octokit| J[PR Comments Dashboard]
    J -->|Post Table 1| K[Comment 1: Functional Test Plan]
    J -->|Post Table 2| L[Comment 2: Automation Scopes & Tagged Runs]
```

---

## 📊 Side-by-Side Architectural Mapping

This comparison maps every proprietary enterprise Pega Customer Decision Hub (CDH) component to its public open-source equivalent:

| Pipeline Dimension | Pega CDH Enterprise Architecture (Private) | ApexDecision Public Architecture (Open-Source Showcase) |
| :--- | :--- | :--- |
| **System Under Test (SUT)** | **Pega Customer Decision Hub (CDH)**<br>Proprietary enterprise decisioning platform serving Next-Best-Actions. | **ApexDecision Portal & Server**<br>Open-source JSON-defined real-time decisioning application and portal. |
| **Business Logic (Rules)** | **Pega Decision Rules**<br>XML-defined Decision Strategies, Decision Tables, and Proposition Filters. | **Decision Strategies Metadata**<br>JSON-defined decision strategies (e.g., `mock-rules/mzAddChannelWrapper.json`). |
| **Developer Code Changes** | A developer checks in a modified XML rule file (e.g., changing eligibility from `Age > 18` to `Age > 21`). | A developer modifies a JSON rule structure (e.g., changing `minAge` parameters inside `CashbackEligibility.json`). |
| **Agile Tracker** | **Pega Agile Studio**<br>Proprietary Jira-like project tracker linking rule files to testing tags. | **Jira Cloud Sandbox Integration**<br>Real JIRA Cloud project tracking sprint user stories, subtasks, and descriptions. |
| **Relational Database** | **`ask-pega-dev` Indexer**<br>Custom parser compiling XML rules metadata into localized Apache Parquet tables. | **Rule Indexer (Python + DuckDB)**<br>`rules_indexer.py` extracts metadata and compiles baseline tables into `.index/rules_myproject.parquet`. |
| **Relational Dependency Engine** | Relational SQL queries tracing rule inheritance and upstream/downstream dependencies. | **DuckDB Relational Engine**<br>`query.py` connects to in-memory DuckDB to execute SQL join queries over compiled Parquet indexes. |
| **Change-Impact Mapping** | Manual lookup or keyword search in Agile Studio to link code changes to E2E test cases. | **Semantic RAG Scoper (Mistral + MongoDB)**<br>Executes a vector cosine-similarity query matching drafted test points to historical JIRA test cases. |
| **Selective Execution** | **Maven Groovy profile compiler**<br>Compiles target tests into dynamic test runner profiles. | **Dynamic Playwright Tag Filter**<br>Compiles matched tests into execution tags (e.g., `npx playwright test --grep @checkout-validation`). |
| **Stakeholder Reporting** | Manual email distribution or Agile Studio comments. | **Octokit PR Markdown Dashboard**<br>Automated publisher posting dual-structured markdown comments directly on GitHub PRs. |

---

## ⚡ The API-First, Browser-Fallback JIRA Integration

To guarantee high execution speeds inside CI pipelines while maintaining robust local developer authentication, the JIRA interface implements a dual-path architecture:

1. **Primary Headless API Path**:
   - The agent reads `JIRA_API_TOKEN`, `JIRA_EMAIL`, and `JIRA_DOMAIN` from the local `.env` file.
   - It performs immediate, sub-second headless REST queries (`GET /rest/api/3/issue/{storyId}`) using base64 Basic Authentication.
2. **Fallback Playwright Broker (Headed UI Automation)**:
   - If the REST API returns `401 Unauthorized` or `403 Forbidden` (expired credentials or missing tokens):
   - The orchestrator spawns a headed Chromium browser window using Playwright CLI (`npm run setup-jira`).
   - The user is prompted to complete standard Atlassian login.
   - The Playwright script automatically navigates to Atlassian's **API Token Management** console, generates a new token labeled `RegressionForesightAgent`, copies the secret value, and **commits it securely to the local `.env` file**.
   - **Automatic Retry**: The orchestrator instantly re-triggers the headless REST API using the newly harvested token.
3. **Deep Offline Fallback**:
   - If both the REST client and Playwright automation are offline, the agent automatically loads a local mock JIRA test dataset to ensure the pipeline never crashes.

---

## 🧠 Collaborative RAG (Retrieval-Augmented Generation) Design

The semantic matching engine is a real, operational RAG pipeline. It eliminates the fragile nature of exact keyword matching by performing semantic searches on high-dimensional vectors.

### 👥 Human-in-the-Loop Protocol
Reshma Pathan is the Lead Architect for the RAG engine. We will operate strictly in a **Human-in-the-Loop** model. The agent will pause and request direct approval/clarification from Reshma before executing:
- Metadata field selection.
- MongoDB Vector Index configurations.
- Cosine similarity thresholds and retrieval parameters.
- LLM reranking and summary output formatting.

### 📊 MongoDB Vector Index Schema
We will create a MongoDB Atlas Search vector index matching the exact configuration verified in her TestLeaf workspace (`testcases-vector-index.json`):

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "id"
    },
    {
      "type": "filter",
      "path": "module"
    },
    {
      "type": "filter",
      "path": "title"
    },
    {
      "type": "filter",
      "path": "description"
    },
    {
      "type": "filter",
      "path": "steps"
    },
    {
      "type": "filter",
      "path": "expectedResults"
    }
  ]
}
```

### ⚙️ RAG Processing Workflow
1. **Test Case Ingestion (`rule-indexer/rag_ingest.py`)**:
   - Parses the e-commerce test suites (ID, Title, Steps, Expected Results).
   - Combines textual fields into a unified string.
   - Invokes the **Mistral API** (`mistral-embed` model) to generate **1024-dimension** embeddings.
   - Saves the documents along with their embeddings directly into the online **MongoDB Atlas** database.
2. **Semantic Search (`rule-indexer/rag_search.py`)**:
   - The orchestrator drafts plain-English test scenarios (e.g., *"Verify checkout behavior under an expired coupon"*).
   - Generates a 1024-dimensional query vector using Mistral Embeddings.
   - Runs a **cosine similarity vector search** against MongoDB Atlas, retrieving the top matched test cases.
3. **LLM Reranking & Summarization (Groq API)**:
   - Feeds the top results into Groq's high-speed LLaMA3 engine to select the best execution candidates and compile them into clean Markdown.

---

## 🔒 Security & Environment Boundaries

To ensure complete credential security:
- **No Private Tokens in Chat**: Reshma will never paste her private keys (Mistral API key, Groq key, JIRA Token, GitHub PAT) in the conversation.
- **Local Env Management**: All keys must reside strictly inside `C:\Users\lenovo\RegressionForesightAgent\.env` as local environment variables:
  ```env
  GITHUB_TOKEN="your_github_pat"
  JIRA_DOMAIN="your_jira_domain.atlassian.net"
  JIRA_EMAIL="your_jira_email@example.com"
  JIRA_API_TOKEN="your_jira_token"
  MISTRAL_API_KEY="your_mistral_api_key"
  GROQ_API_KEY="your_groq_api_key"
  MONGO_URI="mongodb+srv://reshmapathan2204:install@india.x2injxn.mongodb.net/?appName=India"
  ```

---

## 📁 Project Directory Mapping

The local workspace located at `C:\Users\lenovo\RegressionForesightAgent` contains:

```
RegressionForesightAgent/
│
├── .github/workflows/
│   └── foresight-agent.yml         # GitHub Action to automate execution on PR triggers
│
├── rule-indexer/
│   ├── pega_deserializer.py        # Parses incoming mock JSON rule changes
│   ├── rules_indexer.py            # Compiles rules metadata into Parquet tables
│   ├── query.py                    # Traces relational rule dependencies using DuckDB SQL
│   ├── setup_jira_automation.js    # Playwright headed setup script to fetch JIRA API token
│   ├── rag_ingest.py               # Seeds e-commerce test suites into MongoDB with Mistral embeddings [NEW]
│   ├── rag_search.py               # Executes vector cosine search queries against Atlas database [NEW]
│   └── requirements.txt            # Python dependencies (duckdb, pandas, pyarrow, pymongo, requests)
│
├── mock-rules/
│   ├── mzAddChannelWrapper.json    # Mock campaign rule representing rule structure
│   └── CashbackEligibility.json    # Mock decision rule representing rule logic
│
├── src/
│   ├── jira-client.ts              # Implements API-First, Browser-Fallback JIRA connectivity
│   ├── agent.ts                    # Main 11-step orchestrator linking Git, DuckDB, RAG, and Octokit
│   └── types.ts                    # TypeScript types and interfaces
│
├── mock-pr-diff.txt                # Git diff representing Scenario 1 (Email Campaign change)
├── mock-pr-diff-eligibility.txt    # Git diff representing Scenario 2 (Eligibility rule change)
├── package.json                    # Node dependencies (playwright, @octokit/rest, dotenv)
├── tsconfig.json                   # TS compiler rules
├── FORESIGHT-AGENT-PLAN.md         # Local copy of this architectural blueprint
├── TESTING-GUIDE.md                # Local setup and dry-run execution instructions
└── SKILL.md                        # Preloaded 11-step agent pipeline instructions
```

---

## 📢 LinkedIn Campaign Strategy (5-Day Visibility Build)

To build industry authority and establish her portfolio as state-of-the-art, we staged a high-impact **5-Day LinkedIn Posting Series** showcasing her agent design:
- **Day 1: The Problem Hook** — Highlighting the massive resource wastage of running full-regression cycles for minor rule changes.
- **Day 2: Architecture & Naming** — Introducing **Regression Foresight Agent** with a beautiful Mermaid diagram.
- **Day 3: Relational Rules Dependency** — Sharing Python code snippets displaying DuckDB SQL joins over Parquet-compiled rules.
- **Day 4: Playwright API-First & headed fallback** — Presenting the resilient dual-authentication setup.
- **Day 5: Semantic RAG & PR comments** — Presenting the online MongoDB Atlas/Mistral vector search matching engine and screenshots of structured Octokit PR tables.

---

## 🛠️ Phase-by-Phase Execution Checklist

We will execute this plan strictly in local phases, ensuring everything is verified and 100% operational on your machine before committing any modifications to GitHub:

### Phase 1: Environment & Codebase Setup
- [x] Create the mock rules codebase folder structure under `mock-rules/`.
- [x] Configure standard Playwright TypeScript E2E spec layouts under `tests/`.
- [x] Install Playwright browser binaries locally via `npx playwright install`.

### Phase 2: Relational Indexing Compilation (Python + DuckDB)
- [x] Develop `pega_deserializer.py` to parse incoming JSON rules.
- [x] Develop `rules_indexer.py` to compile rules metadata into compressed Parquet tables (`rules_myproject.parquet`).
- [ ] Configure local python environment to resolve packages (`pip install -r rule-indexer/requirements.txt`) and run indexer to compile `.index/rules_myproject.parquet`.
- [x] Develop `query.py` utilizing in-memory DuckDB SQL join queries.
- [ ] Validate relational dependency tracing by running a local test query on changing rule parameters.

### Phase 3: JIRA Client Integration & Validation
- [x] Develop `jira-client.ts` in `src/` to support headless basic auth fetch requests.
- [x] Develop `setup_jira_automation.js` headed Playwright token harvester.
- [ ] Run `npm run setup-jira` inside `C:\Users\lenovo\RegressionForesightAgent` in her terminal to verify headed login, Atlassian token generation, and secure `.env` write.
- [ ] Verify headless client automatically handles fallback triggers on credential errors.

### Phase 4: RAG Vector Search & Ingestion Setup (Human-in-the-Loop)
- [ ] Review the `testcases-vector-index.json` schema with Reshma.
- [ ] Develop `rule-indexer/rag_ingest.py` to ingest e-commerce test suites into her online MongoDB Atlas database using Mistral Embeddings.
- [ ] Develop `rule-indexer/rag_search.py` to perform 1024-dimension cosine similarity search queries.
- [ ] Seed the database and verify retrieval results return semantically relevant matches (even without keyword overlap).

### Phase 5: Local Orchestration Dry-Runs
- [ ] Run `npm run run-agent` against **Scenario 1** (Email diff) and **Scenario 2** (Eligibility diff) locally.
- [ ] Verify that:
  - Comment 1 (Test Plan & JIRA Story IDs) is correctly outputted as a markdown file inside `dist/`.
  - Comment 2 (Automation Scopes & tagged E2E suites) is correctly generated inside `dist/`.
  - The CI execution `ValidateXxxTests.groovy` profile contains correct targeted tags.

### Phase 6: Live GitHub Pipeline Activation
- [x] Configure `.github/workflows/foresight-agent.yml` to automate execution on GitHub PR triggers.
- [ ] Hook the local workspace folder with her live repository `https://github.com/ReshmaAIAutomation/regression-foresight-agent`.
- [ ] Push all completed files live to master!
