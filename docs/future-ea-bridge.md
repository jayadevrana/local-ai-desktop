# Future EA Bridge

The current execution path uses the official MetaTrader5 Python package. The architecture intentionally keeps a clear adapter boundary so a native MT5 Expert Advisor bridge can be introduced later.

## Why add an EA bridge

- Better terminal-local visibility
- Lower credential handling surface on the control plane
- Richer broker/terminal event callbacks
- Easier symbol and order state reconciliation

## Planned changes

- Replace plaintext credential delivery with a bootstrap trust exchange
- Add EA registration and heartbeat messages
- Extend the adapter contract with terminal-local RPC methods
- Add versioned bridge capabilities and phased rollout controls
