"""The UnderCover backend."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import BackgroundTasks, FastAPI, HTTPException

from agent.main import run
from backend import db, seed, store
from backend.models import (
    Claim,
    Customer,
    Decision,
    Handler,
    NewStep,
    Payment,
    Policy,
    QueueClaim,
    Run,
    SignOff,
    StartClaim,
    Step,
    Text,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Seed the database the first time the backend runs."""
    if not db.path().exists():
        seed.build()
    yield


app = FastAPI(title="UnderCover", lifespan=lifespan)


@app.get("/api/health", operation_id="health")
def health() -> dict[str, str]:
    """Check that the backend is running."""
    return {"status": "ok"}


@app.get("/api/claims", operation_id="list_claims")
def list_claims() -> list[QueueClaim]:
    """List every claim in the queue."""
    return store.list_claims()


def claim_or_404(claim_id: str) -> Claim:
    """Return one claim, or refuse when there is no such claim."""
    claim = store.get_claim(claim_id)
    if claim is None:
        raise HTTPException(404, f"No claim {claim_id}")
    return claim


def money(amount: float) -> str:
    """Return an amount in dollars."""
    return f"${amount:,.2f}"


@app.get("/api/claims/{claim_id}", operation_id="get_claim")
def get_claim(claim_id: str) -> Claim:
    """Return one claim in full, with its decision."""
    return claim_or_404(claim_id)


@app.get("/api/policies/{policy_id}", operation_id="get_policy")
def get_policy(policy_id: str) -> Policy:
    """Return one policy with its plan's limits and add-ons."""
    policy = store.get_policy(policy_id)
    if policy is None:
        raise HTTPException(404, f"No policy {policy_id}")
    return policy


@app.get("/api/customers/{customer_id}", operation_id="get_customer")
def get_customer(customer_id: str) -> Customer:
    """Return one customer with their earlier claims."""
    customer = store.get_customer(customer_id)
    if customer is None:
        raise HTTPException(404, f"No customer {customer_id}")
    return customer


@app.get("/api/policy-wording", operation_id="get_policy_wording")
def get_policy_wording() -> Text:
    """Return the policy wording."""
    return Text(text=store.policy_wording())


@app.get("/api/instructions", operation_id="get_instructions")
def get_instructions() -> Text:
    """Return the agent's instructions."""
    return Text(text=store.instructions())


@app.get("/api/handlers", operation_id="list_handlers")
def list_handlers() -> list[Handler]:
    """List UnderCover's claims handlers."""
    return store.list_handlers()


@app.post("/api/claims/{claim_id}/start", operation_id="start_claim")
def start_claim(claim_id: str, body: StartClaim) -> Claim:
    """Put a claim in progress, clearing what an earlier run left."""
    claim = claim_or_404(claim_id)
    if claim.stage == "in_progress":
        raise HTTPException(409, f"{claim_id} is already in progress")
    if claim.paid_amount is not None:
        raise HTTPException(409, f"{claim_id} has been paid")
    if claim.signed_off_by is not None:
        raise HTTPException(409, f"{claim_id} has been signed off")
    store.start(claim_id, body.thread_id)
    return claim_or_404(claim_id)


@app.post("/api/claims/{claim_id}/stop", operation_id="stop_claim")
def stop_claim(claim_id: str) -> Claim:
    """Put a claim that is in progress back in the queue."""
    claim = claim_or_404(claim_id)
    if claim.stage != "in_progress":
        raise HTTPException(409, f"{claim_id} is not in progress")
    store.stop(claim_id)
    return claim_or_404(claim_id)


@app.post("/api/claims/{claim_id}/steps", operation_id="add_step")
def add_step(claim_id: str, body: NewStep) -> Step:
    """Record one line of what the agent is doing on a claim."""
    claim = claim_or_404(claim_id)
    if claim.stage == "waiting":
        raise HTTPException(409, f"{claim_id} is not in progress")
    return store.add_step(claim_id, body.step)


@app.get("/api/claims/{claim_id}/steps", operation_id="list_steps")
def list_steps(claim_id: str) -> list[Step]:
    """List what the agent did on a claim, oldest first."""
    claim_or_404(claim_id)
    return store.list_steps(claim_id)


@app.post("/api/claims/{claim_id}/decision", operation_id="decide_claim")
def decide_claim(claim_id: str, decision: Decision) -> Claim:
    """Record the agent's decision on a claim."""
    claim = claim_or_404(claim_id)
    if claim.stage != "in_progress":
        raise HTTPException(409, f"{claim_id} is not in progress")
    over_limit = (
        decision.outcome == "approve" and decision.payout > store.approval_limit()
    )
    store.decide(claim_id, decision, "awaiting_signoff" if over_limit else "decided")
    return claim_or_404(claim_id)


@app.post("/api/claims/{claim_id}/sign-off", operation_id="sign_off_claim")
def sign_off_claim(claim_id: str, body: SignOff) -> Claim:
    """Record a handler's sign-off on a payout over the approval limit."""
    claim = claim_or_404(claim_id)
    if claim.stage != "awaiting_signoff":
        raise HTTPException(409, f"{claim_id} is not waiting for sign-off")
    handler = store.get_handler(body.handler_id)
    if handler is None:
        raise HTTPException(404, f"No handler {body.handler_id}")
    if not handler.can_approve_over_limit:
        raise HTTPException(
            409, f"{handler.name} cannot sign off a payout over the limit"
        )
    store.sign_off(claim_id, body.handler_id)
    return claim_or_404(claim_id)


@app.post("/api/claims/{claim_id}/payment", operation_id="pay_claim")
def pay_claim(claim_id: str, payment: Payment) -> Claim:
    """Pay an approved claim, once a handler has signed off when one is needed."""
    claim = claim_or_404(claim_id)
    if claim.outcome != "approve" or claim.payout is None:
        raise HTTPException(409, f"{claim_id} has not been approved")
    if claim.paid_amount is not None:
        raise HTTPException(409, f"{claim_id} has been paid already")
    if round(payment.amount, 2) != round(claim.payout, 2):
        raise HTTPException(409, f"The payment must be {money(claim.payout)}")
    if claim.payout > store.approval_limit() and claim.signed_off_by is None:
        raise HTTPException(409, f"{claim_id} waits for a handler's sign-off")
    store.pay(claim_id, payment.amount)
    return claim_or_404(claim_id)


@app.post("/api/claims/{claim_id}/run", operation_id="run_claim", status_code=202)
def run_claim(claim_id: str, tasks: BackgroundTasks) -> Run:
    """Start the agent on a claim and return while it works."""
    claim = claim_or_404(claim_id)
    if claim.stage == "in_progress":
        raise HTTPException(409, f"{claim_id} is already in progress")
    thread_id = str(uuid4())
    tasks.add_task(run, claim_id, thread_id)
    return Run(claim_id=claim_id, thread_id=thread_id)
