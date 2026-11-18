"""Reading and writing UnderCover's records."""

import json
import sqlite3
from pathlib import Path
from typing import Any

from backend import db
from backend.models import (
    AddOn,
    Claim,
    Customer,
    Handler,
    PlanLimits,
    Policy,
    QueueClaim,
    Trip,
)

DATA = Path(__file__).resolve().parent.parent / "data"
WORDING = DATA / "policy_wording.md"

QUEUE = """
SELECT c.*, u.name AS customer_name
FROM claims c JOIN customers u ON u.customer_id = c.customer_id
"""

POLICY = """
SELECT p.*, l.name AS plan_name, l.limits AS limits
FROM policies p JOIN plans l ON l.plan = p.plan
WHERE p.policy_id = ?
"""


def _queue_claim(row: sqlite3.Row) -> QueueClaim:
    return QueueClaim(**{name: row[name] for name in QueueClaim.model_fields})


def _claim(row: sqlite3.Row) -> Claim:
    nested = ("items", "documents")
    fields = {name: row[name] for name in Claim.model_fields if name not in nested} | {
        name: json.loads(row[name]) for name in nested
    }
    return Claim(**fields)


def _setting(conn: sqlite3.Connection, name: str) -> Any:
    row = conn.execute("SELECT value FROM settings WHERE name = ?", (name,)).fetchone()
    return json.loads(row["value"])


def setting(name: str) -> Any:
    """Return one of UnderCover's settings."""
    with db.connection() as conn:
        return _setting(conn, name)


def approval_limit() -> float:
    """Return the payout above which a handler must sign off."""
    return setting("company")["payout_approval_limit"]


def list_claims() -> list[QueueClaim]:
    """Return every claim in the queue."""
    with db.connection() as conn:
        rows = conn.execute(f"{QUEUE} ORDER BY c.claim_id").fetchall()
    return [_queue_claim(row) for row in rows]


def get_claim(claim_id: str) -> Claim | None:
    """Return one claim, or None when there is no such claim."""
    with db.connection() as conn:
        row = conn.execute(f"{QUEUE} WHERE c.claim_id = ?", (claim_id,)).fetchone()
    return _claim(row) if row else None


def get_policy(policy_id: str) -> Policy | None:
    """Return one policy with its plan's limits, or None."""
    with db.connection() as conn:
        row = conn.execute(POLICY, (policy_id,)).fetchone()
        if row is None:
            return None
        catalog = {entry["add_on"]: entry for entry in _setting(conn, "add_ons")}
        deductible_applies_to = _setting(conn, "deductible_applies_to")
    return Policy(
        policy_id=row["policy_id"],
        customer_id=row["customer_id"],
        plan=row["plan"],
        plan_name=row["plan_name"],
        plan_limits=PlanLimits(**json.loads(row["limits"])),
        deductible_applies_to=deductible_applies_to,
        add_ons=[AddOn(**catalog[name]) for name in json.loads(row["add_ons"])],
        purchased_on=row["purchased_on"],
        sold_through=row["sold_through"],
        trip=Trip(**json.loads(row["trip"])),
        travelers=json.loads(row["travelers"]),
        status=row["status"],
    )


def get_customer(customer_id: str) -> Customer | None:
    """Return one customer with their earlier claims, or None."""
    with db.connection() as conn:
        row = conn.execute(
            "SELECT * FROM customers WHERE customer_id = ?", (customer_id,)
        ).fetchone()
    if row is None:
        return None
    nested = ("address", "previous_claims")
    fields = {
        name: row[name] for name in Customer.model_fields if name not in nested
    } | {name: json.loads(row[name]) for name in nested}
    return Customer(**fields)


def list_handlers() -> list[Handler]:
    """Return UnderCover's claims handlers."""
    with db.connection() as conn:
        rows = conn.execute("SELECT * FROM handlers ORDER BY handler_id").fetchall()
    return [Handler(**dict(row)) for row in rows]


def policy_wording() -> str:
    """Return the policy wording."""
    return WORDING.read_text()
