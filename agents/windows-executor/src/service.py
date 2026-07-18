from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import json
import time

from .api_client import ApiClient
from .config import AgentConfig
from .job_executor import JobExecutor
from .logging_utils import setup_logging
from .mt5_python_adapter import MT5PythonExecutionAdapter
from .terminal_manager import TerminalManager


class TradeBridgeWindowsAgent:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.logger = setup_logging()
        self.api_client = ApiClient(config)
        self.terminal_manager = TerminalManager(config)
        self.adapter = MT5PythonExecutionAdapter()
        self.executor = JobExecutor(self.adapter, self.terminal_manager, self.api_client)
        self.thread_pool = ThreadPoolExecutor(max_workers=4)

    def bootstrap(self) -> None:
        self.config.agent_state_dir.mkdir(parents=True, exist_ok=True)
        state_file = self.config.agent_state_dir / "agent-state.json"
        if state_file.exists():
            state = json.loads(state_file.read_text(encoding="utf-8"))
            self.config.node_id = state.get("node_id", self.config.node_id)
            self.config.auth_token = state.get("auth_token", self.config.auth_token)

        if not self.config.node_id or not self.config.auth_token:
            registration = self.api_client.register_node()
            state_file.write_text(
                json.dumps({"node_id": registration.nodeId, "auth_token": registration.authToken}, indent=2),
                encoding="utf-8",
            )
            self.logger.info("node registered")

    def run_forever(self) -> None:
        self.bootstrap()
        last_heartbeat_at = 0.0

        while True:
            now = time.monotonic()
            if now - last_heartbeat_at >= self.config.heartbeat_interval_seconds:
                health = self.terminal_manager.health_summary()
                self.api_client.send_heartbeat(
                    status="ACTIVE",
                    cpu_load_percent=health["cpuLoadPercent"],
                    memory_used_mb=health["memoryUsedMb"],
                    active_terminal_count=0,
                    queued_job_count=0,
                    diagnostics={"adapter": self.adapter.health_check()},
                )
                last_heartbeat_at = now

            jobs = self.api_client.pull_jobs(limit=10)
            for job in jobs:
                report = self.executor.execute(job)
                self.api_client.push_result(report)
                self.logger.info("job processed", extra={"payload": {"jobId": job.jobId, "status": report.status}})

            time.sleep(self.config.poll_interval_seconds)
