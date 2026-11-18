import type { Claim, Customer, Handler, Policy, QueueClaim, Step } from "./api";

export const waiting: QueueClaim = {
  claim_id: "CLM-1001",
  policy_id: "POL-2001",
  customer_id: "CUS-3001",
  customer_name: "Maya Patel",
  claim_type: "trip_delay",
  submitted_on: "2026-06-24",
  summary: "Flight home canceled by the airline",
  amount_claimed: 420,
  stage: "waiting",
  outcome: null,
  payout: null,
  paid_amount: null,
};

export const awaitingSignoff: QueueClaim = {
  ...waiting,
  claim_id: "CLM-1003",
  policy_id: "POL-2003",
  customer_id: "CUS-3003",
  customer_name: "Tomas Okonkwo",
  claim_type: "emergency_medical",
  summary: "Hospital visit abroad after a fall",
  amount_claimed: 3800,
  stage: "awaiting_signoff",
  outcome: "approve",
  payout: 3750,
};

export const declined: QueueClaim = {
  ...waiting,
  claim_id: "CLM-1012",
  policy_id: "POL-2012",
  customer_id: "CUS-3012",
  customer_name: "Ines Ferreira",
  claim_type: "baggage",
  summary: "Valise stolen from a train",
  amount_claimed: 2900,
  stage: "decided",
  outcome: "decline",
  payout: 0,
};

export const queue: QueueClaim[] = [waiting, awaitingSignoff, declined];

export const claim: Claim = {
  ...waiting,
  incident_date: "2026-06-18",
  incident_location: "Rome, Italy",
  story:
    "My flight home from Rome was canceled about two hours before departure.",
  items: [
    {
      description: "Airport hotel, one night",
      category: "accommodation",
      amount: 245,
    },
    { description: "Dinner and breakfast", category: "meals", amount: 95 },
    {
      description: "Taxis between the airport and the hotel",
      category: "transport",
      amount: 80,
    },
  ],
  documents: [
    {
      name: "Meridian Air cancellation notice",
      type: "carrier_report",
      content: "Flight MA 611 was canceled because of crew availability.",
    },
    {
      name: "Hotel receipt",
      type: "receipt",
      content: "Hotel Aurelia Fiumicino. One night. Total paid: $245.00.",
    },
    {
      name: "Meal receipts",
      type: "receipt",
      content: "Dinner: $62.00. Breakfast: $33.00. Total: $95.00.",
    },
    {
      name: "Taxi receipts",
      type: "receipt",
      content: "Two taxis between the airport and the hotel. Total: $80.00.",
    },
  ],
  thread_id: null,
  reason: null,
  policy_section: null,
  decided_at: null,
  signed_off_by: null,
  signed_off_at: null,
  paid_at: null,
};

export const decidedClaim: Claim = {
  ...claim,
  stage: "decided",
  outcome: "approve",
  payout: 420,
  reason:
    "The airline canceled the flight and the delay was more than six hours. The hotel, the meals and the taxis are the expenses the plan covers. The total is under the Premium trip delay limit.",
  policy_section: "Section 3: Trip Delay",
  decided_at: "2026-06-25T09:30:00+00:00",
  thread_id: "thread-1",
};

export const overLimitClaim: Claim = {
  ...decidedClaim,
  claim_id: "CLM-1003",
  stage: "awaiting_signoff",
  payout: 3750,
  amount_claimed: 3800,
  summary: "Hospital visit abroad after a fall",
  policy_section: "Section 6: Emergency Medical",
};

export const steps: Step[] = [
  {
    step_id: 1,
    claim_id: "CLM-1001",
    thread_id: "thread-1",
    at: "2026-06-25T09:29:40+00:00",
    step: "Read claim CLM-1001",
  },
  {
    step_id: 2,
    claim_id: "CLM-1001",
    thread_id: "thread-1",
    at: "2026-06-25T09:29:48+00:00",
    step: "Read policy POL-2001",
  },
];

export const policy: Policy = {
  policy_id: "POL-2001",
  customer_id: "CUS-3001",
  plan: "premium",
  plan_name: "UnderCover Premium",
  plan_limits: {
    trip_cancellation_max: 5000,
    trip_delay_waiting_hours: 6,
    trip_delay_max: 800,
    baggage_delay_waiting_hours: 12,
    baggage_delay_max: 300,
    baggage_max: 1500,
    per_item_limit: 300,
    passport_max: 250,
    emergency_medical_max: 100000,
    deductible: 50,
  },
  deductible_applies_to: ["baggage", "emergency_medical"],
  add_ons: [],
  purchased_on: "2026-04-22",
  sold_through: "Meridian Air checkout",
  trip: {
    destination: "Rome, Italy",
    departs_on: "2026-06-10",
    returns_on: "2026-06-18",
    trip_cost: 3100,
  },
  travelers: ["Maya Patel"],
  status: "active",
};

export const customer: Customer = {
  customer_id: "CUS-3001",
  name: "Maya Patel",
  email: "maya.patel@example.com",
  phone: "+1 201 555 0143",
  date_of_birth: "1988-03-14",
  address: {
    street: "48 Wayne Street, Apt 5C",
    city: "Jersey City",
    state: "NJ",
    zip: "07302",
  },
  customer_since: "2023-04-11",
  previous_claims: [
    {
      claim_id: "CLM-0412",
      filed_on: "2024-08-19",
      incident_date: "2024-08-09",
      claim_type: "baggage_delay",
      summary: "Checked bag arrived 30 hours late in Lisbon",
      outcome: "approved",
      amount_paid: 140,
    },
  ],
};

export const handlers: Handler[] = [
  {
    handler_id: "HND-01",
    name: "Dana Whitfield",
    role: "Senior Claims Handler",
    email: "dana.whitfield@undercover.example",
    can_approve_over_limit: true,
  },
  {
    handler_id: "HND-02",
    name: "Marcus Oyelaran",
    role: "Claims Handler",
    email: "marcus.oyelaran@undercover.example",
    can_approve_over_limit: true,
  },
];

export const instructionsText =
  "# The UnderCover Agent\n\nYou work a travel insurance claim.";

export function body(path: string, record: Claim, taken: Step[]): unknown {
  if (path.endsWith("/steps")) return taken;
  if (path.startsWith("/api/policies/")) return policy;
  if (path.startsWith("/api/customers/")) return customer;
  if (path === "/api/handlers") return handlers;
  if (path === "/api/instructions") return { text: instructionsText };
  if (path === "/api/claims") return queue;
  return record;
}
