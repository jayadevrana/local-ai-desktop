from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class ExecutionAdapter(ABC):
    @abstractmethod
    def place_order(self, signal: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def close_positions(self, signal: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def modify_position(self, signal: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def cancel_pending(self, signal: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def health_check(self) -> dict[str, Any]:
        raise NotImplementedError
