# SignalStack ⚡

An asynchronous B2B lead enrichment pipeline that takes a raw company name, runs it through a multi-step AI research and scoring engine, and streams every step to a real-time observability dashboard.

**🔗 Live Demo:** [signalstack-pearl.vercel.app/telemetry](https://vercel.app)

---

## 📷 Visual Previews

### Live Systems Telemetry Panel
Below is the live dark-mode platform interface mapping incoming asynchronous request footprints in real time:

![SignalStack Telemetry UI Dashboard](https://github.com)

### Multi-Step Pipeline Execution Sequence
This console display captures our event-driven worker engine successfully resolving background operations sequentially:

![SignalStack Successful Pipeline Stream](https://github.com)

---

## The Problem It Solves

Sales teams waste hours manually researching companies before outreach. SignalStack automates that process — input a company name, and the pipeline autonomously researches the company, extracts its tech stack profile, scores the lead, and writes the result to a database. Every step is logged in real time so operators can see exactly what the system is doing and why.

---

## Architecture

SignalStack uses a decoupled, event-driven pattern designed for reliability and observability.

```
POST /api/enrich { company: "Acme Corp" }
        ↓
  [Ingestion Route] → validates payload, returns 202 Accepted immediately
        ↓
  [Background Queue] → fires asynchronously, no thread blocking
        ↓
  [Research Step] → fetches company data
        ↓
  [Extraction Step] → OpenAI structured JSON parsing
        ↓
  [Scoring Step] → deterministic lead score (0–100) + confidence %
        ↓
  [DB Write] → idempotent upsert to Supabase (enrichment_jobs)
        ↓
  [Telemetry Log] → every step timed and persisted (pipeline_telemetry)
```

The frontend long-polls the telemetry table and streams each step to the terminal dashboard in real time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Node.js, TypeScript, Vercel Edge Functions |
| AI Orchestration | OpenAI SDK (structured JSON output) |
| Database | Supabase (PostgreSQL) |
| Deployment | Vercel |

---

## Key Engineering Features

### 1. Non-Blocking Async Pipeline
The `/api/enrich` route validates the incoming payload and immediately returns a `202 Accepted` response. The full enrichment job runs in the background via an unawaited queue runner — the client never waits on AI processing time.

### 2. Real-Time Observability Dashboard
Every pipeline step (EXTRACTION, SCORING, ORCHESTRATION) is written to a `pipeline_telemetry` Postgres table with timestamps and status. The frontend streams these logs to a live terminal UI, giving operators full visibility into the system's behavior — not just the final output.

### 3. Structured AI Output
The OpenAI integration uses strict JSON mode to enforce schema-compliant responses. Raw unstructured data is extracted into typed fields before any scoring logic runs, preventing downstream failures from malformed AI output.

### 4. State Machine Job Tracking
Each enrichment job moves through explicit states: `pending → processing → completed`. State transitions are written to the `enrichment_jobs` table, making every job auditable and recoverable.

### 5. Rate Limiting & Retry Handling
The pipeline includes graceful error handling for API failures. On rate limit errors, the system logs the retry attempt to Postgres and waits before re-queuing — preventing cascading failures under load.

---

## Database Schema

```sql
-- Tracks each enrichment job and its result
CREATE TABLE enrichment_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  status job_status DEFAULT 'pending',
  lead_score INTEGER,
  confidence NUMERIC,
  tech_stack JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Writes a telemetry log entry at every pipeline step
CREATE TABLE pipeline_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  message TEXT NOT NULL,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Running Locally

```bash
git clone https://github.com/yourusername/signalstack
cd signalstack
npm install
```

Create a `.env.local` file:

```env
OPENAI_API_KEY=your_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

```bash
npm run dev
```

Open [http://localhost:3000/telemetry](http://localhost:3000/telemetry)

---

## Project Structure

```
signalstack/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── enrich/
│   │   │       └── route.ts        # Ingestion endpoint
│   │   └── telemetry/
│   │       └── page.tsx            # Observability dashboard
│   ├── services/
│   │   ├── queue.ts                # Async pipeline runner
│   │   ├── research.ts             # Company research step
│   │   ├── extraction.ts           # OpenAI structured extraction
│   │   └── scoring.ts              # Lead scoring logic
│   └── lib/
│       └── supabase.ts             # Database client
├── .env.local.example
└── README.md
```

---

## Git Workflow

This project follows a feature-branch workflow to simulate professional team development:

- All features developed on isolated branches (`feature/core-clients`, `feature/ai-extraction`, `feature/ai-scoring`)
- Each branch merged via Pull Request with documented descriptions
- No direct commits to `main`

---

## Engineering Tradeoffs

### Why polling instead of WebSockets?

Long-polling was chosen deliberately for this implementation:

- Simpler deployment model
- Fewer moving parts
- Easier debugging
- Adequate for low-volume telemetry workloads

A future iteration could migrate to Server-Sent Events (SSE) or WebSockets
for lower latency and reduced polling overhead.

## About

SignalStack is production-inspired AI operations platform focused on
asynchronous enrichment pipelines, observability, and structured AI
workflows.

The project was built to explore production-style patterns including
queue processing, telemetry, state-machine orchestration, and resilient
AI integrations.

**Portfolio:** [your portfolio link]  
**LinkedIn:** [your LinkedIn]