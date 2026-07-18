# Webhook Format

Supported inbound formats:

## JSON

```json
{
  "payload": {
    "action": "buy",
    "symbol": "EURUSD",
    "risk": 1,
    "sl": 1.0865,
    "tp": 1.094
  },
  "strategyId": "breakout-eu-1"
}
```

## KV payload

```text
action=buy,symbol=EURUSD,risk=1,sl=1.0865,tp=1.0940
```

## Compact text

```text
buy symbol:NAS100 risk:1.25 sl:21000 tp:21250
```

All formats normalize into the shared canonical signal schema in `packages/types`.
