"""What the API returns and takes."""

from typing import Literal

from pydantic import BaseModel

Outcome = Literal["approve", "decline", "refer"]


class Item(BaseModel):
    description: str
    category: str
    amount: float


class Document(BaseModel):
    name: str
    type: str
    content: str


class QueueClaim(BaseModel):
    claim_id: str
    policy_id: str
    customer_id: str
    customer_name: str
    claim_type: str
    submitted_on: str
    summary: str
    amount_claimed: float
    stage: str
    outcome: Outcome | None
    payout: float | None
    paid_amount: float | None


class Claim(QueueClaim):
    incident_date: str
    incident_location: str
    story: str
    items: list[Item]
    documents: list[Document]
    thread_id: str | None
    reason: str | None
    policy_section: str | None
    decided_at: str | None
    signed_off_by: str | None
    signed_off_at: str | None
    paid_at: str | None


class PlanLimits(BaseModel):
    trip_cancellation_max: float
    trip_delay_waiting_hours: int
    trip_delay_max: float
    baggage_delay_waiting_hours: int
    baggage_delay_max: float
    baggage_max: float
    per_item_limit: float
    passport_max: float
    emergency_medical_max: float
    deductible: float


class AddOn(BaseModel):
    add_on: str
    name: str
    effect: str
    electronics_per_item_limit: float | None = None


class Trip(BaseModel):
    destination: str
    departs_on: str
    returns_on: str
    trip_cost: float


class Policy(BaseModel):
    policy_id: str
    customer_id: str
    plan: str
    plan_name: str
    plan_limits: PlanLimits
    deductible_applies_to: list[str]
    add_ons: list[AddOn]
    purchased_on: str
    sold_through: str
    trip: Trip
    travelers: list[str]
    status: str


class Address(BaseModel):
    street: str
    city: str
    state: str
    zip: str


class PreviousClaim(BaseModel):
    claim_id: str
    filed_on: str
    incident_date: str
    claim_type: str
    summary: str
    outcome: str
    amount_paid: float


class Customer(BaseModel):
    customer_id: str
    name: str
    email: str
    phone: str
    date_of_birth: str
    address: Address
    customer_since: str
    previous_claims: list[PreviousClaim]


class Handler(BaseModel):
    handler_id: str
    name: str
    role: str
    email: str
    can_approve_over_limit: bool


class Step(BaseModel):
    step_id: int
    claim_id: str
    thread_id: str
    at: str
    step: str


class Text(BaseModel):
    text: str
