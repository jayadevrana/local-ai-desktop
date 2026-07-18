from __future__ import annotations

from typing import Any

from .execution_adapter import ExecutionAdapter

try:
    import MetaTrader5 as mt5
except Exception:  # pragma: no cover - dependency is optional outside Windows
    mt5 = None


class MT5PythonExecutionAdapter(ExecutionAdapter):
    def _ensure_mt5(self) -> None:
        if mt5 is None:
            raise RuntimeError("MetaTrader5 package is not available on this host")

    def place_order(self, signal: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        self._ensure_mt5()
        action = signal.get("action", "")
        return {
            "action": action,
            "status": "SUCCEEDED",
            "message": f"Simulated MT5 order request for {action}",
            "retcode": 10009,
        }

    def close_positions(self, signal: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        self._ensure_mt5()
        return {
            "status": "SUCCEEDED",
            "message": f"Simulated close operation for {signal.get('action')}",
            "retcode": 10009,
        }

    def modify_position(self, signal: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        self._ensure_mt5()
        return {
            "status": "SUCCEEDED",
            "message": f"Simulated modify operation for {signal.get('action')}",
            "retcode": 10009,
        }

    def cancel_pending(self, signal: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        self._ensure_mt5()
        return {
            "status": "SUCCEEDED",
            "message": f"Simulated cancel operation for {signal.get('action')}",
            "retcode": 10009,
        }

    def health_check(self) -> dict[str, Any]:
        return {"ok": mt5 is not None, "adapter": "MT5PythonExecutionAdapter"}
