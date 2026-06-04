# Privacy Compliance Agent — Claude Code Context

## Project Overview

AI-powered privacy compliance SaaS dashboard. Scans websites with a headless browser to capture third-party tracking scripts, uses LLMs to parse privacy policies, and flags compliance violations.

## Tech Stack

- **Frontend/API**: Next.js 16 (App Router, TypeScript, Tailwind CSS v4, shadcn/ui with base-ui primitives)
- **ORM**: Prisma 7 with `@prisma/adapter-pg` (PostgreSQL) — client generated to `src/generated/prisma/`
- **Scanner**: Playwright (`playwright-core`) — runs in a separate Docker container
- **AI**: Anthropic Claude, OpenAI, or Google Gemini — auto-detected from env vars (first key found wins: `ANTHROPIC_API_KEY` → `OPENAI_API_KEY` → `GOOGLE_GEMINI_API_KEY`)
- **Queue**: GCP Cloud Tasks with lazy-loaded `@google-cloud/tasks` client
- **Deployment**: GCP Cloud Run (two services: app + worker)

## Key Architecture Decisions

- **Prisma 7** uses `prisma-client` generator (not `prisma-client-js`). Import from `@/generated/prisma/client`, not `@/generated/prisma`.
- **shadcn/ui** components use `@base-ui/react` (not Radix). No `asChild` prop — use `render` prop for composition or nest children directly.
- **Cloud Tasks client** is lazy-imported (`await import(...)`) to avoid Turbopack bundling issues with dynamic requires. The `dispatchScan()` function gracefully degrades: Cloud Tasks → direct HTTP → queued-only.
- **Multi-tenant**: All data is scoped by `organizationId`. Currently uses a demo org (`demo-org-001`).

## Commands

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev --name <name>  # Create and apply migration
npx prisma studio    # Visual database browser
docker compose up    # Full local stack (Postgres + app + worker)
```

## Project Structure

- `src/app/(dashboard)/` — Dashboard pages behind sidebar layout
- `src/app/api/` — REST API routes (cron, dashboard, scans, websites, webhooks, worker)
- `src/lib/ai/` — LLM client, 3 analysis chains (vendor extraction, PII detection, compliance comparison), health score
- `src/lib/scraper/` — Playwright scanner, request capture, policy extractor, 17 vendor patterns
- `src/lib/queue/` — Cloud Tasks dispatch with fallback chain
- `src/lib/db/` — Prisma client singleton
- `prisma/schema.prisma` — Database schema (7 models, 5 enums)
- `infra/` — GCP deploy and Cloud Scheduler setup scripts

## Environment Variables

All defined in `.env.example`. Required for local dev: `DATABASE_URL`, `CRON_SECRET`. Required for AI (set at least one): `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_GEMINI_API_KEY`. Required for GCP: `GCP_PROJECT_ID`, `GCP_REGION`, `CLOUD_TASKS_QUEUE`, `WORKER_SERVICE_URL`.

## Database Schema

Core entities: `Organization` → `User` → `Website` → `Scan` → (`DisclosedVendor`, `ObservedTag`, `Violation`). Scan status flows: `PENDING → RUNNING → ANALYZING → COMPLETED | FAILED`.

@AGENTS.md
