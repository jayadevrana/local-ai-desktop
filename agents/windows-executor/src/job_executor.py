from __future__ import annotations

from typing import Any

from .api_client import ApiClient
from .execution_adapter import ExecutionAdapter
from .models import ExecutionDispatch, ExecutionReport
from .terminal_manager import TerminalManager


MARKET_ACTIONS = {"BUY_MARKET", "SELL_MARKET", "BUY_LIMIT", "SELL_LIMIT", "BUY_STOP", "SELL_STOP", "REVERSE_POSITION"}
CLOSE_ACTIONS = {"CLOSE_ALL", "CLOSE_SYMBOL", "CLOSE_BUY", "CLOSE_SELL", "CLOSE_BY_MAGIC", "PARTIAL_CLOSE"}
MODIFY_ACTIONS = {"MOVE_SL", "MOVE_TP", "MOVE_TO_BREAKEVEN"}
CANCEL_ACTIONS = {"CANCEL_PENDING", "CANCEL_ALL_PENDING"}


class JobExecutor:
    def __init__(self, adapter: ExecutionAdapter, terminal_manager: TerminalManager, api_client: ApiClient):
        self.adapter = adapter
        self.terminal_manager = terminal_manager
        self.api_client = api_client

    def execute(self, dispatch: ExecutionDispatch) -> ExecutionReport:
        context: dict[str, Any] = {
            "terminal": dispatch.terminal.model_dump() if dispatch.terminal else None,
            "credentials": dispatch.credentials,
            "symbolMappings": dispatch.symbolMappings,
            "riskProfile": dispatch.riskProfile,
        }

        if dispatch.terminal and dispatch.credentials:
            self.terminal_manager.ensure_terminal_layout(dispatch.terminal, dispatch.credentials)

        action = dispatch.signal.get("action")
        try:
            if action in MARKET_ACTIONS:
                result = self.adapter.place_order(dispatch.signal, context)
            elif action in CLOSE_ACTIONS:
                result = self.adapter.close_positions(dispatch.signal, context)
            elif action in MODIFY_ACTIONS:
                result = self.adapter.modify_position(dispatch.signal, context)
            elif action in CANCEL_ACTIONS:
                result = self.adapter.cancel_pending(dispatch.signal, context)
            else:
                raise ValueError(f"Unsupported action {action}")

            return ExecutionReport(
                jobId=dispatch.jobId,
                status=result.get("status", "FAILED"),
                message=result.get("message", "Execution completed"),
                occurredAt=self.api_client.now_iso(),
                brokerOrderId=result.get("brokerOrderId"),
                brokerDealId=result.get("brokerDealId"),
                retcode=result.get("retcode"),
                details=result,
            )
        except Exception as exc:
            return ExecutionReport(
                jobId=dispatch.jobId,
                status="FAILED",
                message=str(exc),
                occurredAt=self.api_client.now_iso(),
                details={"action": action},
            )
