# Local Testing Guide

How to run the Crew Performance Chatbot locally with your RDS (or local PostgreSQL) and where to set database, API, and table configuration.

---

## 1. Where to Add RDS / Database Variables

**File: `.env`** (project root)

Create it from the template:

```bash
cp .env.example .env
```

Then edit `.env` and set:

| Variable       | Description                      | Example (RDS)                    | Example (local) |
|----------------|----------------------------------|----------------------------------|-----------------|
| `DB_HOST`      | PostgreSQL host                  | `mydb.abc123.us-east-1.rds.amazonaws.com` | `localhost`     |
| `DB_PORT`      | Port                             | `5432`                           | `5432`          |
| `DB_NAME`      | Database name                    | `crew_performance`               | `crew_performance` |
| `DB_USER`      | Database user                    | `postgres`                       | `postgres`      |
| `DB_PASSWORD`  | Database password                | your password                    | your password   |
| `DB_SSL`       | Use SSL for DB                   | `true` (RDS)                     | `false` (local) |
| `DB_SCHEMA`    | PostgreSQL schema name           | `csi` (if tables in `csi` schema) | `public` (default) |

**Used by:**

- `src/config/environment.ts` → `getEnvironmentConfig()`
- `amplify/functions/chat/resource.ts`, `generate-summary/resource.ts`, `calculate-kpis/resource.ts`  
  (they read `process.env` when the Amplify sandbox runs; the sandbox script loads `.env` into `process.env`)

---

## 2. Where to Add the API URL (Frontend)

**File: `.env`** (same as above)

| Variable         | Description                    | Example                          |
|------------------|--------------------------------|----------------------------------|
| `VITE_API_URL`   | Backend API base URL for chat  | `https://xxxxx.execute-api.us-east-1.amazonaws.com` or `http://localhost:20002` |

- Used by: `src/services/api.ts`, `src/components/ChatInterface.tsx`
- The sandbox will print the real API URL when it starts; put that value in `VITE_API_URL`, then restart `npm run dev` if it’s already running.

---

## 3. Table Names (Not in Config)

Table names are **not** in `.env` or any config file. They are hardcoded in the SQL inside these repositories:

| Table(s) / area        | Repository file(s) |
|------------------------|--------------------|
| `crew_master`          | `src/services/database/repositories/crewRepository.ts` |
| `kpi_definition`, `kpi_value` | `src/services/database/repositories/kpiRepository.ts` |
| `experience_history`   | `src/services/database/repositories/experienceRepository.ts` |
| `training_certification` | `src/services/database/repositories/trainingRepository.ts` |
| `performance_event`, `failure_events`, `voyage_events`, `voyage_summary`, `monthly_events`, `period_summary`, `clusters`, `cluster_groups` | `src/services/database/repositories/performanceRepository.ts` |
| `appraisal`            | `src/services/database/repositories/crewRepository.ts` |
| `ai_summary`           | `src/services/database/repositories/summaryRepository.ts`, `crewRepository.ts` |
| `chat_session`, `chat_message`, `session_info` | `src/services/database/repositories/chatRepository.ts` |

If your RDS uses **different table or column names**, you must change the SQL strings in those files. The expected schema is in `docs/DATABASE.md`.

---

## 4. Run Locally

### Prerequisites

- Node.js 18+
- PostgreSQL (local or RDS) with the schema from `docs/DATABASE.md`
- Anthropic API key
- AWS CLI configured (for Amplify sandbox)

### Step 1: Install and env

```bash
npm install
cp .env.example .env
# Edit .env with DB_*, ANTHROPIC_API_KEY, and (after sandbox) VITE_API_URL
```

### Step 1.5: Create Chat Tables (Required)

The application requires `chat_session` and `chat_message` tables. Run the SQL script:

```bash
# Connect to your PostgreSQL database and run:
psql -h <DB_HOST> -U <DB_USER> -d <DB_NAME> -f scripts/create-chat-tables.sql
```

Or manually execute the SQL in `scripts/create-chat-tables.sql` against your database.

### Step 2: Start backend (Amplify sandbox)

Load `.env` and start the sandbox:

```bash
npm run sandbox:local
```

Or without loading `.env` (you must have `DB_*`, `ANTHROPIC_API_KEY` etc. in your shell):

```bash
npx ampx sandbox
```

When the sandbox starts, it prints the API URL. Put that in `.env` as `VITE_API_URL=...`.

### Step 3: Start frontend

```bash
npm run dev
```

Open `http://localhost:5173` (or the port Vite prints).

---

## 5. Quick Reference: All `.env` Variables

```env
# Required
DB_HOST=
DB_NAME=
DB_USER=
DB_PASSWORD=
ANTHROPIC_API_KEY=

# For frontend (set after sandbox prints API URL)
VITE_API_URL=

# Optional (defaults in parentheses)
DB_PORT=5432
DB_SSL=true
DB_SCHEMA=public
CLAUDE_MODEL=claude-3-5-sonnet-20241022
NODE_ENV=development
API_URL=http://localhost:3000
ENABLE_SUMMARY_GENERATION=true
ENABLE_RISK_DETECTION=true
SUMMARY_REFRESH_DAYS=15
MAX_TOKENS_PER_REQUEST=4000
MAX_REQUESTS_PER_MINUTE=20
```

---

## 6. Troubleshooting

| Issue | What to check |
|-------|----------------|
| DB connection errors | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL` in `.env`; RDS security group / VPC allows your IP (or Lambda if in VPC). |
| Chat/API 404 or CORS | `VITE_API_URL` in `.env` matches the sandbox API URL; restart `npm run dev` after changing `.env`. |
| “Table does not exist” | Schema in RDS matches `docs/DATABASE.md`; table names in the repository files match your RDS. **If tables are in a custom schema (e.g., `csi`), set `DB_SCHEMA=csi` in `.env`.** **Note: The `chat_session` and `chat_message` tables need to be created - see `scripts/create-chat-tables.sql`.** |
| Sandbox doesn’t see DB vars | Run `npm run sandbox:local` (which loads `.env`) or `export` / `set` the vars in the same shell before `npx ampx sandbox`. |
