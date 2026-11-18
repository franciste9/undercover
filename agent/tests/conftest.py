import pytest
from fastapi.testclient import TestClient

from agent import main
from backend import seed
from backend.main import app


@pytest.fixture(autouse=True)
def database(tmp_path, monkeypatch):
    """Give every test a freshly seeded database and a backend in process."""
    monkeypatch.setenv("UNDERCOVER_DB", str(tmp_path / "undercover.db"))
    seed.build()
    monkeypatch.setattr(main, "backend", lambda: TestClient(app))
