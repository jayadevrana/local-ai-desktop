from job_executor import JobExecutor
from models import ExecutionDispatch, TerminalDescriptor


class FakeAdapter:
    def place_order(self, signal, context):
        return {"status": "SUCCEEDED", "message": "ok", "retcode": 10009}

    def close_positions(self, signal, context):
        return {"status": "SUCCEEDED", "message": "closed"}

    def modify_position(self, signal, context):
        return {"status": "SUCCEEDED", "message": "modified"}

    def cancel_pending(self, signal, context):
        return {"status": "SUCCEEDED", "message": "canceled"}

    def health_check(self):
        return {"ok": True}


class FakeTerminalManager:
    def ensure_terminal_layout(self, descriptor, credentials):
        return descriptor.working_path / "tradebridge-terminal.json"


class FakeApiClient:
    @staticmethod
    def now_iso():
        return "2026-01-01T00:00:00+00:00"


def test_job_executor_routes_market_action():
    executor = JobExecutor(FakeAdapter(), FakeTerminalManager(), FakeApiClient())
    dispatch = ExecutionDispatch(
        jobId="job-1",
        signal={"action": "BUY_MARKET"},
        terminal=TerminalDescriptor(workingDirectory="C:/tmp/one", dataDirectory="C:/tmp/data"),
        credentials={"login": "123", "password": "pw", "serverName": "demo"},
    )
    report = executor.execute(dispatch)
    assert report.status == "SUCCEEDED"


def test_job_executor_rejects_unknown_action():
    executor = JobExecutor(FakeAdapter(), FakeTerminalManager(), FakeApiClient())
    dispatch = ExecutionDispatch(jobId="job-2", signal={"action": "UNKNOWN"})
    report = executor.execute(dispatch)
    assert report.status == "FAILED"
