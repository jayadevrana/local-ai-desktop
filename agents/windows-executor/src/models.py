from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import BaseModel


class NodeRegistrationResponse(BaseModel):
    nodeId: str
    authToken: str
    heartbeatIntervalSeconds: int


class TerminalDescriptor(BaseModel):
    id: str | None = None
    workingDirectory: str
    dataDirectory: str
    status: str | None = None
    portableMode: bool = True

    @property
    def working_path(self) -> Path:
        return Path(self.workingDirectory)

    @property
    def data_path(self) -> Path:
        return Path(self.dataDirectory)


class ExecutionDispatch(BaseModel):
    jobId: str
    signal: dict[str, Any]
    credentials: dict[str, Any] | None = None
    terminal: TerminalDescriptor | None = None
    symbolMappings: list[dict[str, str]] = []
    riskProfile: dict[str, Any] | None = None


class ExecutionReport(BaseModel):
    jobId: str
    status: str
    message: str
    occurredAt: str
    brokerOrderId: str | None = None
    brokerDealId: str | None = None
    retcode: int | None = None
    details: dict[str, Any] | None = None
