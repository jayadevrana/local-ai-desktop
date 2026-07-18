from __future__ import annotations

from .config import load_config
from .service import TradeBridgeWindowsAgent


def main() -> None:
    config = load_config()
    agent = TradeBridgeWindowsAgent(config)
    agent.run_forever()


if __name__ == "__main__":
    main()
