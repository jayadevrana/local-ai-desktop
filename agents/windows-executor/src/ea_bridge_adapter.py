from __future__ import annotations

from .execution_adapter import ExecutionAdapter


class MT5EABridgeAdapter(ExecutionAdapter):
    def place_order(self, signal, context):
        raise NotImplementedError("Native EA bridge is a documented extension point, not implemented in v0.1.0")

    def close_positions(self, signal, context):
        raise NotImplementedError("Native EA bridge is a documented extension point, not implemented in v0.1.0")

    def modify_position(self, signal, context):
        raise NotImplementedError("Native EA bridge is a documented extension point, not implemented in v0.1.0")

    def cancel_pending(self, signal, context):
        raise NotImplementedError("Native EA bridge is a documented extension point, not implemented in v0.1.0")

    def health_check(self):
        return {"ok": False, "adapter": "MT5EABridgeAdapter", "implemented": False}
