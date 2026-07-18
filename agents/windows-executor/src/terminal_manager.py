from __future__ import annotations

from pathlib import Path
import json
import subprocess
from typing import Any

import psutil

from .config import AgentConfig
from .models import TerminalDescriptor


class TerminalManager:
    def __init__(self, config: AgentConfig):
        self.config = config

    def ensure_terminal_layout(self, descriptor: TerminalDescriptor, credentials: dict[str, Any]) -> Path:
        descriptor.working_path.mkdir(parents=True, exist_ok=True)
        descriptor.data_path.mkdir(parents=True, exist_ok=True)
        config_path = descriptor.working_path / "tradebridge-terminal.json"
        config_path.write_text(
            json.dumps(
                {
                    "login": credentials.get("login"),
                    "serverName": credentials.get("serverName"),
                    "portableMode": descriptor.portableMode,
                    "version": 1,
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        return config_path

    def launch_terminal(self, descriptor: TerminalDescriptor, credentials: dict[str, Any]) -> subprocess.Popen[Any]:
        self.ensure_terminal_layout(descriptor, credentials)
        command = [
            str(self.config.mt5_terminal_path),
            "/portable",
        ]
        return subprocess.Popen(command, cwd=str(descriptor.working_path))

    def is_process_alive(self, process_id: int | None) -> bool:
        if not process_id:
            return False
        return psutil.pid_exists(process_id)

    def health_summary(self) -> dict[str, Any]:
        return {
            "cpuLoadPercent": psutil.cpu_percent(interval=0.1),
            "memoryUsedMb": round(psutil.virtual_memory().used / 1024 / 1024, 2),
        }
