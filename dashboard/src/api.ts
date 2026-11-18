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
