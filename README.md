# Privacy Compliance Agent

AI-powered privacy compliance monitoring for web properties. Deploys a headless browser to capture third-party tracking scripts, uses LLMs to parse privacy policies, and flags compliance violations — undisclosed trackers, PII leakage, and policy mismatches.

```
┌──────────────────────────────────────────────────────────────────┐
│  Cloud Scheduler (hourly cron)                                   │
│         │                                                        │
│         ▼                                                        │
│  /api/cron/trigger-scans ──► Cloud Tasks Queue                   │
│                                      │                           │
│                                      ▼                           │
│                             Playwright Worker                    │
│                             ┌────────────────┐                   │
│                             │ 1. Navigate URL │                  │
│                             │ 2. Intercept    │                  │
│                             │    all requests │                  │
│                             │ 3. ID trackers  │                  │
│                             │ 4. Extract      │                  │
│                             │    privacy      │                  │
│                             │    policy text  │                  │
│                             └───────┬────────┘                   │
│                                     │                            │
│                                     ▼                            │
│                             AI Analysis Engine                   │
│                             ┌────────────────┐                   │
│                             │ Chain 1: Extract│                  │
│                             │  disclosed      │                  │
│                             │  vendors        │                  │
│                             │                 │                  │
│                             │ Chain 2: Detect │                  │
│                             │  PII in network │                  │
│                             │  payloads       │                  │
│                             │                 │                  │
│                             │ Chain 3: Compare│                  │
│                             │  observed vs    │                  │
│                             │  disclosed      │                  │
│                             └───────┬────────┘                   │
│                                     │                            │
│                                     ▼                            │
│                             Dashboard (Next.js)                  │
│                             Health score · Violations · Reports  │
└──────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend & API | Next.js 16 (App Router, TypeScript, Tailwind CSS v4, shadcn/ui) |
| Database | PostgreSQL with Prisma 7 ORM |
| Scanner | Playwright (headless Chromium) in a containerized worker |
| AI Engine | Anthropic Claude, OpenAI, or Google Gemini (auto-detected from env vars) |
| Task Queue | GCP Cloud Tasks with Cloud Scheduler |
| Deployment | GCP Cloud Run (app + worker containers) |

## Database Schema

```
Organization ──┬── User (OWNER / ADMIN / MEMBER)
               └── Website (domain, scan frequency, active status)
                      └── Scan (PENDING → RUNNING → ANALYZING → COMPLETED)
                             ├── DisclosedVendor (LLM-extracted from policy)
                             ├── ObservedTag (Playwright-captured requests)
                             └── Violation (severity + category + remediation)
```

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL 16+
- An API key for at least one LLM provider: Anthropic, OpenAI, or Google Gemini

### Local Development

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL, an AI provider key (ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_GEMINI_API_KEY), and CRON_SECRET

# Create database and apply schema
npx prisma migrate dev --name init

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

### Docker Compose (Full Stack)

Runs PostgreSQL, the Next.js app, and the Playwright worker together:

```bash
# Set your AI provider key (pick one)
export ANTHROPIC_API_KEY="sk-ant-..."
# or: export OPENAI_API_KEY="sk-..."
# or: export GOOGLE_GEMINI_API_KEY="..."

# Start all services
docker compose up --build
```

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Dashboard pages (/, /websites, /scans, /settings)
│   └── api/
│       ├── cron/             # Cloud Scheduler webhook
│       ├── dashboard/        # Aggregated stats endpoint
│       ├── scans/            # Scan CRUD + detail
│       ├── webhooks/         # Scan completion callback
│       ├── websites/         # Website CRUD
│       └── worker/           # Playwright scan execution
├── components/
│   ├── dashboard/            # Health ring, severity bar, status badges, nav
│   ├── ui/                   # shadcn/ui primitives
│   └── websites/             # Add website dialog
├── lib/
│   ├── ai/                   # LLM client, 3 analysis chains, health score
│   ├── db/                   # Prisma client singleton
│   ├── queue/                # Cloud Tasks dispatch (with fallbacks)
│   └── scraper/              # Playwright scanner, vendor patterns, policy extractor
├── types/                    # Shared TypeScript types
└── generated/prisma/         # Generated Prisma client (gitignored)

infra/
├── deploy.sh                 # Build + deploy to Cloud Run
└── setup-scheduler.sh        # Create Cloud Tasks queue + Cloud Scheduler job
```

## GCP Deployment

```bash
# Set required variables
export GCP_PROJECT_ID="your-project"
export GCP_REGION="us-central1"
export CRON_SECRET="your-secret"

# Deploy app + worker to Cloud Run
bash infra/deploy.sh

# Set up Cloud Tasks queue + hourly Cloud Scheduler job
bash infra/setup-scheduler.sh
```

The deploy script creates two Cloud Run services:
- **privacy-compliance-app** (512Mi, 1 CPU) — dashboard + API
- **privacy-compliance-worker** (2Gi, 2 CPU, 300s timeout) — Playwright scanner + AI analysis

## Scan Pipeline

1. **Trigger** — Cloud Scheduler calls `/api/cron/trigger-scans` hourly, which checks scan frequencies and creates PENDING scans for due websites.
2. **Dispatch** — Each scan is pushed to Cloud Tasks (or called directly if Cloud Tasks isn't configured).
3. **Capture** — The Playwright worker navigates to the target domain, intercepts all outbound network requests, scrolls to trigger lazy-loaded scripts, and identifies third-party tags against 17 known vendor patterns.
4. **Extract** — The worker finds the privacy policy link on the homepage and extracts its full text.
5. **Analyze** — Three LLM chains run in sequence:
   - **Chain 1**: Extract disclosed vendors from the privacy policy text
   - **Chain 2**: Inspect network payloads for PII leakage (hashed emails, plain-text data)
   - **Chain 3**: Compare observed trackers against disclosed vendors to produce violations
6. **Report** — Results are persisted to the database with a 0–100 health score. The dashboard renders violations with severity badges, remediation steps, and an observed-vs-disclosed comparison table.

## Violation Categories

| Category | Severity | Description |
|----------|----------|-------------|
| `UNDISCLOSED_TRACKER` | HIGH/MEDIUM | Tracking tag detected but not in privacy policy |
| `PII_LEAKAGE` | HIGH/MEDIUM/LOW | PII transmitted in network requests |
| `UNDISCLOSED_DATA_SHARING` | HIGH | Data shared with vendors beyond stated scope |
| `MISSING_CONSENT` | HIGH | Trackers fire before user consent is obtained |
| `POLICY_MISMATCH` | MEDIUM | Observed behavior contradicts policy statements |

## License

[Business Source License 1.1](LICENSE) — free for internal use; commercial hosted privacy compliance services require a separate license. Converts to Apache 2.0 on June 4, 2030.
