# Runbook

## Local startup

1. Start Postgres and Redis with `docker compose up -d`.
2. Generate Prisma client: `pnpm db:generate`.
3. Run migrations: `pnpm db:migrate`.
4. Seed: `pnpm db:seed`.
5. Start services: `pnpm dev`.

## Failed signal recovery

1. Inspect `/admin/jobs` and `/signals`.
2. Check job status and latest execution result.
3. Verify node heartbeat recency.
4. Replay the job with `/admin/jobs/:jobId/replay`.
5. If terminal health is stale, restart the Windows agent or repair the terminal instance.

## Tenant suspension

1. Mark the organization suspended.
2. Disable or rotate active webhooks.
3. Drain queued execution jobs.
4. Capture audit notes and notify support.
