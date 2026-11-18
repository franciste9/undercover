"""The UnderCover backend."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from backend import db, seed, store
from backend.models import Claim, Customer, Handler, Policy, QueueClaim, Text


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


@app.get("/api/claims/{claim_id}", operation_id="get_claim")
def get_claim(claim_id: str) -> Claim:
    """Return one claim in full, with its decision."""
    claim = store.get_claim(claim_id)
    if claim is None:
        raise HTTPException(404, f"No claim {claim_id}")
    return claim


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


@app.get("/api/handlers", operation_id="list_handlers")
def list_handlers() -> list[Handler]:
    """List UnderCover's claims handlers."""
    return store.list_handlers()
