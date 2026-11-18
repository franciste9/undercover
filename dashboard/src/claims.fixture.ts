import type { Claim, QueueClaim } from "./api";

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
    { description: "Taxis", category: "transport", amount: 80 },
  ],
  documents: [
    {
      name: "Meridian Air cancellation notice",
      type: "carrier_report",
      content: "Flight MA 611 was canceled because of crew availability.",
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
