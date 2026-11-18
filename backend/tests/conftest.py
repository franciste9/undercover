import pytest

from backend import seed


@pytest.fixture(autouse=True)
def database(tmp_path, monkeypatch):
    """Give every test a freshly seeded database of its own."""
    monkeypatch.setenv("UNDERCOVER_DB", str(tmp_path / "undercover.db"))
    seed.build()
