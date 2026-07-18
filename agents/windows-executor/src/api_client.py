from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import requests

from .config import AgentConfig
from .models import ExecutionDispatch, ExecutionReport, NodeRegistrationResponse


class ApiClient:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.session = requests.Session()

    def _headers(self) -> dict[str, str]:
        headers = {"content-type": "application/json"}
        if self.config.auth_token:
            headers["authorization"] = f"Bearer {self.config.auth_token}"
        return headers

    def register_node(self) -> NodeRegistrationResponse:
        response = self.session.post(
            f"{self.config.api_base_url}/nodes/register",
            json={
                "nodeName": self.config.node_name,
                "hostname": self.config.hostname,
                "capabilities": ["mt5-python"],
                "maxAccounts": self.config.max_accounts,
                "agentVersion": self.config.agent_version,
                "platform": "windows",
                "heartbeatIntervalSeconds": self.config.heartbeat_interval_seconds,
            },
            timeout=20,
        )
        response.raise_for_status()
        data = NodeRegistrationResponse.model_validate(response.json())
        self.config.node_id = data.nodeId
        self.config.auth_token = data.authToken
        self.config.heartbeat_interval_seconds = data.heartbeatIntervalSeconds
        return data

    def send_heartbeat(self, status: str, cpu_load_percent: float, memory_used_mb: float, active_terminal_count: int, queued_job_count: int, diagnostics: dict[str, Any] | None = None) -> None:
        if not self.config.node_id:
          raise RuntimeError("Node must be registered before sending heartbeats")
        response = self.session.post(
            f"{self.config.api_base_url}/nodes/{self.config.node_id}/heartbeat",
            headers=self._headers(),
            json={
                "nodeId": self.config.node_id,
                "status": status,
                "cpuLoadPercent": cpu_load_percent,
                "memoryUsedMb": memory_used_mb,
                "activeTerminalCount": active_terminal_count,
                "queuedJobCount": queued_job_count,
                "diagnostics": diagnostics or {},
            },
            timeout=20,
        )
        response.raise_for_status()

    def pull_jobs(self, limit: int = 10) -> list[ExecutionDispatch]:
        if not self.config.node_id:
            raise RuntimeError("Node must be registered before pulling jobs")
        response = self.session.post(
            f"{self.config.api_base_url}/nodes/{self.config.node_id}/jobs/pull",
            headers=self._headers(),
            json={"limit": limit},
            timeout=30,
        )
        response.raise_for_status()
        return [ExecutionDispatch.model_validate(item) for item in response.json()]

    def push_result(self, report: ExecutionReport) -> None:
        if not self.config.node_id:
            raise RuntimeError("Node must be registered before reporting results")
        response = self.session.post(
            f"{self.config.api_base_url}/nodes/{self.config.node_id}/jobs/{report.jobId}/result",
            headers=self._headers(),
            json=report.model_dump(),
            timeout=30,
        )
        response.raise_for_status()

    @staticmethod
    def now_iso() -> str:
        return datetime.now(timezone.utc).isoformat()
