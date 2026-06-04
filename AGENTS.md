# Agent Guidelines — Privacy Compliance Agent

## Framework: Next.js 16 with App Router

This project uses **Next.js 16** with Turbopack. Key differences from earlier versions:

- **shadcn/ui** uses `@base-ui/react` primitives, not Radix. There is no `asChild` prop. Use `render` prop or nest children directly inside trigger components like `DialogTrigger`, `SheetTrigger`, etc.
- **Prisma 7** generates to `src/generated/prisma/`. Import from `@/generated/prisma/client` — there is no `index.ts` barrel file.
- **Route params** in dynamic routes are `Promise`-based: `{ params }: { params: Promise<{ id: string }> }`, must be awaited.
- **Select `onValueChange`** signature is `(value: string | null, eventDetails) => void` — handle the `null` case.

## Code Conventions

- TypeScript strict mode. No `any` types.
- Tailwind CSS v4 (CSS-first config, no `tailwind.config.ts`).
- API routes use Zod for input validation.
- Database access only through `prisma` singleton from `@/lib/db`.
- All API routes that accept external calls check `Authorization: Bearer $CRON_SECRET`.

## Build & Test

```bash
npm run dev          # Dev server with Turbopack
npm run build        # Verify production build passes
npx prisma generate  # After any schema.prisma change
```

Always run `npm run build` before committing to verify TypeScript compilation and static page generation succeed.

## Folder Ownership

| Path | Purpose |
|------|---------|
| `src/lib/ai/` | LLM integration — prompts, client, analysis chains |
| `src/lib/scraper/` | Playwright scanner, vendor fingerprints, policy extraction |
| `src/lib/queue/` | Cloud Tasks dispatch with graceful degradation |
| `src/lib/db/` | Prisma client singleton |
| `src/app/api/worker/` | Scan execution endpoint (called by Cloud Tasks) |
| `src/app/api/cron/` | Cloud Scheduler webhook |
| `infra/` | GCP deployment scripts |

## Important Gotchas

- `@google-cloud/tasks` must be lazy-imported (`await import(...)`) — static import breaks Turbopack.
- The `turbopack.root` is explicitly set in `next.config.ts` to avoid workspace root inference issues.
- `output: "standalone"` is enabled for Docker deployment — the Dockerfile copies from `.next/standalone`.
- Vendor patterns in `src/lib/scraper/vendor-patterns.ts` match by hostname suffix — adding new vendors is just appending to the `KNOWN_VENDORS` array.
