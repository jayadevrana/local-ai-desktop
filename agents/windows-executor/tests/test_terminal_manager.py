from pathlib import Path
from tempfile import TemporaryDirectory

from config import AgentConfig
from models import TerminalDescriptor
from terminal_manager import TerminalManager


def test_ensure_terminal_layout_writes_config():
    with TemporaryDirectory() as directory:
        base = Path(directory)
        config = AgentConfig(
            agent_state_dir=base / "agent",
            terminal_base_dir=base / "terminals",
            data_base_dir=base / "data",
            mt5_terminal_path=base / "terminal64.exe",
        )
        manager = TerminalManager(config)
        descriptor = TerminalDescriptor(workingDirectory=str(base / "terminals" / "1"), dataDirectory=str(base / "data" / "1"))
        path = manager.ensure_terminal_layout(descriptor, {"login": "123", "serverName": "demo"})
        assert path.exists()
