from fastapi.testclient import TestClient

from backend import main
from backend.main import app

client = TestClient(app)


def test_get_instructions():
    text = client.get("/api/instructions").json()["text"]
    assert text.splitlines()[0] == "# The UnderCover Agent"
    assert "decide_claim" in text


def test_run_starts_the_agent_in_the_background(monkeypatch):
    runs = []
    monkeypatch.setattr(main, "run", lambda claim_id, thread_id: runs.append(thread_id))
    response = client.post("/api/claims/CLM-1001/run")
    assert response.status_code == 202
    assert response.json()["claim_id"] == "CLM-1001"
    assert runs == [response.json()["thread_id"]]


def test_run_is_refused_on_a_claim_in_progress(monkeypatch):
    monkeypatch.setattr(main, "run", lambda claim_id, thread_id: None)
    client.post("/api/claims/CLM-1001/start", json={"thread_id": "thread-1"})
    response = client.post("/api/claims/CLM-1001/run")
    assert response.status_code == 409
    assert response.json()["detail"] == "CLM-1001 is already in progress"


def test_run_needs_a_claim_that_exists():
    assert client.post("/api/claims/CLM-9999/run").status_code == 404
