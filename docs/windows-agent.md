# Windows Agent

The Windows agent is a Python 3.11 service process that owns terminal lifecycle and trade execution.

## Responsibilities

- Register a node and persist identity
- Emit heartbeats
- Poll for assigned jobs
- Maintain per-account MT5 working directories
- Launch or repair terminal processes
- Execute orders through the current adapter
- Report results and diagnostics back to the API

## Directory strategy

- `C:\TradeBridge\agent`: persistent node state
- `C:\TradeBridge\terminals\<login>`: per-account terminal working directory
- `C:\TradeBridge\data\<login>`: per-account terminal data directory

## Adapter boundary

- `MT5PythonExecutionAdapter`: initial implementation
- `MT5EABridgeAdapter`: future extension point
