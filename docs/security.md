# Security

## Threat model summary

- Webhook spoofing
- Replay and duplicate delivery
- Tenant data leakage
- Node impersonation
- Secret exposure in logs or responses
- Accidental support overreach

## Mitigations

- Random webhook tokens with rotation support
- Idempotency keys on ingress
- Role guards and organization-scoped queries
- Node bearer tokens hashed at rest
- AES-GCM encryption for MT5 credentials at rest
- Redaction helpers for logs and API metadata
- Audit logs for member invites, account updates, webhook ingress, and job replay
- HTTP-only session cookies
- Helmet headers and CORS restrictions

## Gaps to close before production

- Encrypted webhook signing secret storage for strict HMAC validation
- Dedicated KMS or cloud secret manager instead of app-local master key
- Centralized SIEM/log shipping and alerting
- Stronger support impersonation UX and session lifecycle controls
