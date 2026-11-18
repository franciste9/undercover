"""Build the UnderCover database from the files in data/."""

import json
from pathlib import Path
from typing import Any

from backend import db

DATA = Path(__file__).resolve().parent.parent / "data"

CLAIMS = """
INSERT INTO claims (
    claim_id, policy_id, customer_id, claim_type, submitted_on, incident_date,
    incident_location, summary, story, items, amount_claimed, documents, stage
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting')
"""

POLICIES = """
INSERT INTO policies (
    policy_id, customer_id, plan, add_ons, purchased_on, sold_through, trip,
    travelers, status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
"""

CUSTOMERS = """
INSERT INTO customers (
    customer_id, name, email, phone, date_of_birth, address, customer_since,
    previous_claims
) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
"""

PLANS = "INSERT INTO plans (plan, name, limits) VALUES (?, ?, ?)"

HANDLERS = """
INSERT INTO handlers (handler_id, name, role, email, can_approve_over_limit)
VALUES (?, ?, ?, ?, ?)
"""

SETTINGS = "INSERT INTO settings (name, value) VALUES (?, ?)"


def read(name: str) -> Any:
    """Return the contents of one of UnderCover's data files."""
    return json.loads((DATA / name).read_text())


def build() -> dict[str, int]:
    """Rebuild the database from data/ and return what went into it."""
    claims = read("claims.json")
    policies = read("policies.json")
    customers = read("customers.json")
    plans = read("plans.json")
    handlers = read("handlers.json")
    company = read("company.json")
    with db.connection() as conn:
        conn.executescript(db.SCHEMA.read_text())
        conn.executemany(
            CLAIMS,
            [
                (
                    claim["claim_id"],
                    claim["policy_id"],
                    claim["customer_id"],
                    claim["claim_type"],
                    claim["submitted_on"],
                    claim["incident_date"],
                    claim["incident_location"],
                    claim["summary"],
                    claim["story"],
                    json.dumps(claim["items"]),
                    claim["amount_claimed"],
                    json.dumps(claim["documents"]),
                )
                for claim in claims
            ],
        )
        conn.executemany(
            POLICIES,
            [
                (
                    policy["policy_id"],
                    policy["customer_id"],
                    policy["plan"],
                    json.dumps(policy["add_ons"]),
                    policy["purchased_on"],
                    policy["sold_through"],
                    json.dumps(policy["trip"]),
                    json.dumps(policy["travelers"]),
                    policy["status"],
                )
                for policy in policies
            ],
        )
        conn.executemany(
            CUSTOMERS,
            [
                (
                    customer["customer_id"],
                    customer["name"],
                    customer["email"],
                    customer["phone"],
                    customer["date_of_birth"],
                    json.dumps(customer["address"]),
                    customer["customer_since"],
                    json.dumps(customer["previous_claims"]),
                )
                for customer in customers
            ],
        )
        conn.executemany(
            PLANS,
            [
                (
                    plan["plan"],
                    plan["name"],
                    json.dumps(
                        {k: v for k, v in plan.items() if k not in ("plan", "name")}
                    ),
                )
                for plan in plans["plans"]
            ],
        )
        conn.executemany(
            HANDLERS,
            [
                (
                    handler["handler_id"],
                    handler["name"],
                    handler["role"],
                    handler["email"],
                    int(handler["can_approve_over_limit"]),
                )
                for handler in handlers
            ],
        )
        conn.executemany(
            SETTINGS,
            [
                ("company", json.dumps(company)),
                ("add_ons", json.dumps(plans["add_ons"])),
                ("deductible_applies_to", json.dumps(plans["deductible_applies_to"])),
            ],
        )
    return {
        "claims": len(claims),
        "policies": len(policies),
        "customers": len(customers),
        "plans": len(plans["plans"]),
        "handlers": len(handlers),
    }


def main() -> None:
    """Rebuild the database and say what went into it."""
    counts = build()
    print("Seeded " + ", ".join(f"{n} {name}" for name, n in counts.items()))


if __name__ == "__main__":
    main()
