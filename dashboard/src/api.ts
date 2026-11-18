export type Stage = "waiting" | "in_progress" | "awaiting_signoff" | "decided";
export type Outcome = "approve" | "decline" | "refer";

export interface QueueClaim {
  claim_id: string;
  policy_id: string;
  customer_id: string;
  customer_name: string;
  claim_type: string;
  submitted_on: string;
  summary: string;
  amount_claimed: number;
  stage: Stage;
  outcome: Outcome | null;
  payout: number | null;
  paid_amount: number | null;
}

export interface Item {
  description: string;
  category: string;
  amount: number;
}

export interface Document {
  name: string;
  type: string;
  content: string;
}

export interface Claim extends QueueClaim {
  incident_date: string;
  incident_location: string;
  story: string;
  items: Item[];
  documents: Document[];
  thread_id: string | null;
  reason: string | null;
  policy_section: string | null;
  decided_at: string | null;
  signed_off_by: string | null;
  signed_off_at: string | null;
  paid_at: string | null;
}

async function detail(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (typeof body === "object" && body !== null && "detail" in body) {
    return String(body.detail);
  }
  return response.statusText;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`);
  if (!response.ok) throw new Error(await detail(response));
  return (await response.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await detail(response));
  return (await response.json()) as T;
}

export function listClaims(): Promise<QueueClaim[]> {
  return get<QueueClaim[]>("/claims");
}

export function runClaim(claimId: string): Promise<{ thread_id: string }> {
  return post<{ thread_id: string }>(`/claims/${claimId}/run`, {});
}

export interface PlanLimits {
  trip_cancellation_max: number;
  trip_delay_waiting_hours: number;
  trip_delay_max: number;
  baggage_delay_waiting_hours: number;
  baggage_delay_max: number;
  baggage_max: number;
  per_item_limit: number;
  passport_max: number;
  emergency_medical_max: number;
  deductible: number;
}

export interface AddOn {
  add_on: string;
  name: string;
  effect: string;
  electronics_per_item_limit: number | null;
}

export interface Trip {
  destination: string;
  departs_on: string;
  returns_on: string;
  trip_cost: number;
}

export interface Policy {
  policy_id: string;
  customer_id: string;
  plan: string;
  plan_name: string;
  plan_limits: PlanLimits;
  deductible_applies_to: string[];
  add_ons: AddOn[];
  purchased_on: string;
  sold_through: string;
  trip: Trip;
  travelers: string[];
  status: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface PreviousClaim {
  claim_id: string;
  filed_on: string;
  incident_date: string;
  claim_type: string;
  summary: string;
  outcome: string;
  amount_paid: number;
}

export interface Customer {
  customer_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  address: Address;
  customer_since: string;
  previous_claims: PreviousClaim[];
}

export interface Handler {
  handler_id: string;
  name: string;
  role: string;
  email: string;
  can_approve_over_limit: boolean;
}

export interface Step {
  step_id: number;
  claim_id: string;
  thread_id: string;
  at: string;
  step: string;
}

export function getClaim(claimId: string): Promise<Claim> {
  return get<Claim>(`/claims/${claimId}`);
}

export function listSteps(claimId: string): Promise<Step[]> {
  return get<Step[]>(`/claims/${claimId}/steps`);
}

export function getPolicy(policyId: string): Promise<Policy> {
  return get<Policy>(`/policies/${policyId}`);
}

export function getCustomer(customerId: string): Promise<Customer> {
  return get<Customer>(`/customers/${customerId}`);
}

export function listHandlers(): Promise<Handler[]> {
  return get<Handler[]>("/handlers");
}

export function getInstructions(): Promise<{ text: string }> {
  return get<{ text: string }>("/instructions");
}

export function signOffClaim(
  claimId: string,
  handlerId: string,
): Promise<Claim> {
  return post<Claim>(`/claims/${claimId}/sign-off`, { handler_id: handlerId });
}

export function payClaim(claimId: string, amount: number): Promise<Claim> {
  return post<Claim>(`/claims/${claimId}/payment`, { amount });
}
