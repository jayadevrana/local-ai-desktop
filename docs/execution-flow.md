# Execution Flow

1. TradingView posts to `/api/v1/webhooks/tradingview/:webhookToken`.
2. API validates the token, rate limit, and idempotency key.
3. Raw payload is stored in `SignalEvent`.
4. API enqueues `signal.ingress` to BullMQ and returns immediately.
5. Worker loads the parser template and normalizes the payload into the canonical signal schema.
6. Worker validates account routing state and creates an `ExecutionJob`.
7. The assigned Windows node polls `/nodes/:nodeId/jobs/pull`.
8. Agent prepares or repairs the per-account terminal directory.
9. Agent executes through the `ExecutionAdapter`.
10. Agent posts result metadata back to `/nodes/:nodeId/jobs/:jobId/result`.
11. Dashboard pages query signal and execution history directly from the API.
