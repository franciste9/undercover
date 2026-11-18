from pathlib import Path

from fastapi.testclient import TestClient
from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

from agent import main
from backend.main import app

client = TestClient(app)

REASON = "The carrier canceled the flight, so the extra night is covered."


class StubModel(GenericFakeChatModel):
    """A chat model that gives scripted replies in place of a real model."""

    def bind_tools(self, tools, **kwargs):
        return self


class BrokenModel(StubModel):
    """A chat model that fails the way a rate-limited one does."""

    def _generate(self, *args, **kwargs):
        raise RuntimeError("the model is away")


def call(name: str, **args) -> AIMessage:
    return AIMessage(content="", tool_calls=[{"name": name, "args": args, "id": name}])


def stub(*messages: AIMessage) -> StubModel:
    return StubModel(messages=iter(messages))


def steps(claim_id: str) -> list[str]:
    return [step["step"] for step in client.get(f"/api/claims/{claim_id}/steps").json()]


def test_the_agent_works_a_claim_to_a_decision():
    reply = main.run(
        "CLM-1001",
        "thread-1",
        stub(
            call("get_claim", claim_id="CLM-1001"),
            call("get_policy", policy_id="POL-2001"),
            call("get_claim_history", customer_id="CUS-3001"),
            call("get_policy_wording"),
            call(
                "decide_claim",
                claim_id="CLM-1001",
                outcome="approve",
                payout=420.0,
                reason=REASON,
                policy_section="Section 3: Trip Delay",
            ),
            call("pay_claim", claim_id="CLM-1001", amount=420.0),
            AIMessage(content="I approved the claim and paid $420.00."),
        ),
    )
    assert reply == "I approved the claim and paid $420.00."
    claim = client.get("/api/claims/CLM-1001").json()
    assert claim["stage"] == "decided"
    assert claim["outcome"] == "approve"
    assert claim["payout"] == 420
    assert claim["reason"] == REASON
    assert claim["policy_section"] == "Section 3: Trip Delay"
    assert claim["paid_amount"] == 420
    assert steps("CLM-1001") == [
        "Read claim CLM-1001",
        "Read policy POL-2001",
        "Read the claim history of CUS-3001",
        "Read the policy wording",
        "Decided to approve CLM-1001 with a payout of $420.00",
        "Paid $420.00",
    ]


def test_the_agent_cannot_pay_over_the_limit():
    main.run(
        "CLM-1015",
        "thread-2",
        stub(
            call(
                "decide_claim",
                claim_id="CLM-1015",
                outcome="approve",
                payout=2340.0,
                reason="The interruption is covered and the costs are unrefunded.",
                policy_section="Section 2: Trip Cancellation and Interruption",
            ),
            call("pay_claim", claim_id="CLM-1015", amount=2340.0),
            AIMessage(content="Approved. The payment waits for a handler."),
        ),
    )
    claim = client.get("/api/claims/CLM-1015").json()
    assert claim["stage"] == "awaiting_signoff"
    assert claim["payout"] == 2340
    assert claim["paid_amount"] is None
    assert steps("CLM-1015")[-1] == (
        "The payment of $2,340.00 was refused: CLM-1015 waits for a handler's sign-off"
    )


def test_a_run_that_stops_puts_the_claim_back_in_the_queue():
    reply = main.run("CLM-1001", "thread-3", BrokenModel(messages=iter([])))
    assert reply == "The run stopped: the model is away"
    assert client.get("/api/claims/CLM-1001").json()["stage"] == "waiting"
    assert steps("CLM-1001") == ["The run stopped: the model is away"]


def test_a_claim_that_is_already_in_progress_is_left_alone():
    client.post("/api/claims/CLM-1001/start", json={"thread_id": "someone-else"})
    reply = main.run("CLM-1001", "thread-4", stub(AIMessage(content="hello")))
    assert reply == "The run did not start: CLM-1001 is already in progress"
    assert client.get("/api/claims/CLM-1001").json()["thread_id"] == "someone-else"


def test_the_tools_read_through_the_api():
    client.post("/api/claims/CLM-1001/start", json={"thread_id": "thread-5"})
    token = main.working_on.set("CLM-1001")
    assert main.get_claim.invoke({"claim_id": "CLM-1001"})["amount_claimed"] == 420
    assert main.get_policy.invoke({"policy_id": "POL-2001"})["plan"] == "premium"
    history = main.get_claim_history.invoke({"customer_id": "CUS-3001"})
    assert history[0]["claim_id"] == "CLM-0412"
    wording = main.get_policy_wording.invoke({})
    assert wording.startswith("# UnderCover Travel Insurance: Policy Wording")
    main.working_on.reset(token)
    assert steps("CLM-1001") == [
        "Read claim CLM-1001",
        "Read policy POL-2001",
        "Read the claim history of CUS-3001",
        "Read the policy wording",
    ]


def test_the_tools_do_not_hide_a_refusal():
    token = main.working_on.set("CLM-1001")
    refused = main.decide_claim.invoke(
        {
            "claim_id": "CLM-1001",
            "outcome": "approve",
            "payout": 420.0,
            "reason": REASON,
            "policy_section": "Section 3: Trip Delay",
        }
    )
    assert refused == "The decision was refused: CLM-1001 is not in progress"
    main.working_on.reset(token)


def test_the_agent_reaches_the_records_only_through_the_api():
    source = Path(main.__file__).read_text()
    assert "data/" not in source
    assert "open(" not in source
    assert "sqlite" not in source


def test_the_model_is_the_one_named_in_the_environment(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key")
    monkeypatch.delenv("MODEL_NAME", raising=False)
    assert main.model().model_name == "openai/gpt-6-luna"
    monkeypatch.setenv("MODEL_NAME", "openrouter/free")
    assert main.model().model_name == "openrouter/free"


def test_the_command_line_works_one_claim(monkeypatch, capsys):
    monkeypatch.setattr(main.sys, "argv", ["agent", "CLM-1001"])
    monkeypatch.setattr(main, "run", lambda claim_id, thread_id: "decided it")
    main.main()
    assert capsys.readouterr().out.strip() == "CLM-1001: decided it"


def test_the_command_line_works_the_whole_queue(monkeypatch, capsys):
    monkeypatch.setattr(main.sys, "argv", ["agent"])
    monkeypatch.setattr(main, "run", lambda claim_id, thread_id: "decided it")
    main.main()
    assert capsys.readouterr().out.count("decided it") == 25


def test_a_tool_called_with_the_wrong_id_does_not_stop_the_run():
    reply = main.run(
        "CLM-1001",
        "thread-6",
        stub(
            call("get_claim_history", customer_id="CLM-1001"),
            call("get_claim_history", customer_id="CUS-3001"),
            call(
                "decide_claim",
                claim_id="CLM-1001",
                outcome="refer",
                payout=0.0,
                reason="The documents do not settle how long the delay ran.",
                policy_section="Section 3: Trip Delay",
            ),
            AIMessage(content="I referred the claim."),
        ),
    )
    assert reply == "I referred the claim."
    assert client.get("/api/claims/CLM-1001").json()["outcome"] == "refer"
    assert steps("CLM-1001")[0] == "Read the claim history of CLM-1001"
