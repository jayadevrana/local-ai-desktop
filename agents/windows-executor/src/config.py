from __future__ import annotations

from pathlib import Path
from pydantic import BaseModel, Field
import os


class AgentConfig(BaseModel):
    api_base_url: str = Field(default="http://localhost:3001/api")
    agent_state_dir: Path = Field(default=Path("C:/TradeBridge/agent"))
    terminal_base_dir: Path = Field(default=Path("C:/TradeBridge/terminals"))
    data_base_dir: Path = Field(default=Path("C:/TradeBridge/data"))
    poll_interval_seconds: int = Field(default=5)
    heartbeat_interval_seconds: int = Field(default=15)
    node_name: str = Field(default_factory=lambda: os.getenv("COMPUTERNAME", "tradebridge-node"))
    hostname: str = Field(default_factory=lambda: os.getenv("COMPUTERNAME", "tradebridge-node"))
    auth_token: str | None = Field(default=None)
    node_id: str | None = Field(default=None)
    max_accounts: int = Field(default=25)
    agent_version: str = Field(default="0.1.0")
    mt5_terminal_path: Path = Field(default=Path("C:/Program Files/MetaTrader 5/terminal64.exe"))


def load_config() -> AgentConfig:
    return AgentConfig(
        api_base_url=os.getenv("TRADEBRIDGE_API_BASE_URL", "http://localhost:3001/api"),
        agent_state_dir=Path(os.getenv("TRADEBRIDGE_AGENT_STATE_DIR", "C:/TradeBridge/agent")),
        terminal_base_dir=Path(os.getenv("TRADEBRIDGE_TERMINAL_BASE_DIR", "C:/TradeBridge/terminals")),
        data_base_dir=Path(os.getenv("TRADEBRIDGE_DATA_BASE_DIR", "C:/TradeBridge/data")),
        poll_interval_seconds=int(os.getenv("TRADEBRIDGE_POLL_INTERVAL_SECONDS", "5")),
        heartbeat_interval_seconds=int(os.getenv("TRADEBRIDGE_HEARTBEAT_INTERVAL_SECONDS", "15")),
        auth_token=os.getenv("TRADEBRIDGE_NODE_AUTH_TOKEN"),
        node_id=os.getenv("TRADEBRIDGE_NODE_ID"),
        max_accounts=int(os.getenv("TRADEBRIDGE_MAX_ACCOUNTS", "25")),
        agent_version=os.getenv("TRADEBRIDGE_AGENT_VERSION", "0.1.0"),
        mt5_terminal_path=Path(os.getenv("TRADEBRIDGE_MT5_TERMINAL_PATH", "C:/Program Files/MetaTrader 5/terminal64.exe")),
    )
