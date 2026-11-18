"""The UnderCover Agent."""

import os
import sys
import uuid
from contextvars import ContextVar
from typing import Any

import httpx
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

load_dotenv(override=True)

BACKEND_URL = "http://localhost:8000"
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_MODEL = "openai/gpt-6-luna"

working_on: ContextVar[str] = ContextVar("working_on")


def backend() -> httpx.Client:
    """Return a client for the UnderCover backend."""
    return httpx.Client(base_url=BACKEND_URL, timeout=60)


def fetch(path: str) -> Any:
    """Read from the backend and return its answer, refusal and all."""
    with backend() as client:
        response = client.get(path)
    return response.json()


def send(path: str, body: dict[str, Any]) -> Any:
    """Write to the backend and return its answer, refusal and all."""
    with backend() as client:
        response = client.post(path, json=body)
    return response.json()


def record(step: str) -> None:
    """Tell the backend what the agent is doing on the claim it is working."""
    send(f"/api/claims/{working_on.get()}/steps", {"step": step})


def money(amount: float) -> str:
    """Return an amount in dollars."""
    return f"${amount:,.2f}"


@tool
def get_claim(claim_id: str) -> dict[str, Any]:
    """Read a claim such as CLM-1001: the story, the items and the documents."""
    record(f"Read claim {claim_id}")
    return fetch(f"/api/claims/{claim_id}")


@tool
def get_policy(policy_id: str) -> dict[str, Any]:
    """Read a policy such as POL-2001: the plan's limits, add-ons and trip."""
    record(f"Read policy {policy_id}")
    return fetch(f"/api/policies/{policy_id}")


@tool
def get_claim_history(customer_id: str) -> Any:
    """Read what a customer, such as CUS-3001, has claimed before."""
    record(f"Read the claim history of {customer_id}")
    customer = fetch(f"/api/customers/{customer_id}")
    return customer.get("previous_claims", customer)


@tool
def get_policy_wording() -> str:
    """Read UnderCover's policy wording, the contract with the customer."""
    record("Read the policy wording")
    return fetch("/api/policy-wording")["text"]


@tool
def decide_claim(
    claim_id: str, outcome: str, payout: float, reason: str, policy_section: str
) -> str:
    """Record the decision on a claim: approve, decline or refer."""
    answer = send(
        f"/api/claims/{claim_id}/decision",
        {
            "outcome": outcome,
            "payout": payout,
            "reason": reason,
            "policy_section": policy_section,
        },
    )
    if "detail" in answer:
        record(f"The decision was refused: {answer['detail']}")
        return f"The decision was refused: {answer['detail']}"
    paid = f" with a payout of {money(payout)}" if outcome == "approve" else ""
    record(f"Decided to {outcome} {claim_id}{paid}")
    return f"Recorded the decision to {outcome} {claim_id}{paid}."


@tool
def pay_claim(claim_id: str, amount: float) -> str:
    """Pay a claim that has been approved."""
    answer = send(f"/api/claims/{claim_id}/payment", {"amount": amount})
    if "detail" in answer:
        record(f"The payment of {money(amount)} was refused: {answer['detail']}")
        return f"The payment was refused: {answer['detail']}"
    record(f"Paid {money(amount)}")
    return f"Paid {money(amount)}."


TOOLS = [
    get_claim,
    get_policy,
    get_claim_history,
    get_policy_wording,
    decide_claim,
    pay_claim,
]


def model() -> ChatOpenAI:
    """Return the model named in MODEL_NAME, or GPT-6 Luna by default."""
    name = os.getenv("MODEL_NAME")
    return ChatOpenAI(
        model=name or DEFAULT_MODEL,
        base_url=OPENROUTER_BASE_URL,
        api_key=SecretStr(os.environ["OPENROUTER_API_KEY"]),
        reasoning_effort=None if name else "low",
    )


def run(claim_id: str, thread_id: str, llm: BaseChatModel | None = None) -> str:
    """Run the agent on one claim and return its final reply."""
    instructions = fetch("/api/instructions")["text"]
    started = send(f"/api/claims/{claim_id}/start", {"thread_id": thread_id})
    if "detail" in started:
        return f"The run did not start: {started['detail']}"
    token = working_on.set(claim_id)
    try:
        agent = create_agent(llm or model(), tools=TOOLS, system_prompt=instructions)
        result = agent.invoke(
            {"messages": [{"role": "user", "content": f"Work claim {claim_id}."}]},
            config={"configurable": {"thread_id": thread_id}},
        )
        return result["messages"][-1].text
    except Exception as error:
        record(f"The run stopped: {error}")
        send(f"/api/claims/{claim_id}/stop", {})
        return f"The run stopped: {error}"
    finally:
        working_on.reset(token)


def main() -> None:
    """Work the claims named on the command line, or every claim in the queue."""
    claim_ids = sys.argv[1:] or [
        claim["claim_id"]
        for claim in fetch("/api/claims")
        if claim["stage"] == "waiting"
    ]
    for claim_id in claim_ids:
        print(f"{claim_id}: {run(claim_id, str(uuid.uuid4()))}")


if __name__ == "__main__":
    main()
