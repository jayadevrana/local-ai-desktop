# Architecture

TradeBridge Cloud splits the platform into a Linux control plane and a Windows execution plane.

## Control plane

- `apps/web`: user and ops dashboards.
- `apps/api`: auth, tenancy, onboarding, webhooks, node APIs, admin surfaces.
- `apps/worker`: queue-driven normalization, routing, and recovery tasks.
- `packages/db`: PostgreSQL schema and Prisma client.
- `packages/types`: canonical zod contracts and deterministic risk/parser helpers.

## Execution plane

- Windows nodes run the Python agent.
- Each MT5 account maps to its own terminal working directory.
- Agents poll the API for claimed jobs and report execution results back.
- RDP is excluded from the execution path and reserved for admin/support only.

## Multi-tenancy

- Organization-scoped queries are explicit in code.
- Roles are enforced with Nest guards.
- Sensitive actions emit audit logs.
- Secrets are encrypted at rest and redacted from logs.
