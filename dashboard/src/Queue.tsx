import { useEffect, useState } from "react";
import { listClaims, runClaim, type QueueClaim, type Stage } from "./api";
import { money, OUTCOMES, STAGES, words } from "./format";

const FILTERS: (Stage | "all")[] = [
  "all",
  "waiting",
  "in_progress",
  "awaiting_signoff",
  "decided",
];

export function Queue() {
  const [claims, setClaims] = useState<QueueClaim[]>([]);
  const [filter, setFilter] = useState<Stage | "all">("all");

  useEffect(() => {
    const load = () => {
      void listClaims()
        .then(setClaims)
        .catch(() => undefined);
    };
    load();
    const timer = setInterval(load, 2000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  const shown =
    filter === "all"
      ? claims
      : claims.filter((claim) => claim.stage === filter);

  const start = (claimId: string) => {
    void runClaim(claimId)
      .then(listClaims)
      .then(setClaims)
      .catch(() => undefined);
  };

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>The queue</h2>
        <div className="filters" role="group" aria-label="Filter by stage">
          {FILTERS.map((stage) => (
            <button
              key={stage}
              type="button"
              className={stage === filter ? "filter on" : "filter"}
              onClick={() => {
                setFilter(stage);
              }}
            >
              {stage === "all" ? "All" : STAGES[stage]}
            </button>
          ))}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Claim</th>
            <th>Customer</th>
            <th>Type</th>
            <th className="amount">Claimed</th>
            <th>Stage</th>
            <th>Decision</th>
            <th className="amount">Payout</th>
            <th>Agent</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((claim) => (
            <tr key={claim.claim_id}>
              <td className="id">{claim.claim_id}</td>
              <td>{claim.customer_name}</td>
              <td>{words(claim.claim_type)}</td>
              <td className="amount">{money(claim.amount_claimed)}</td>
              <td>
                <span className={`chip ${claim.stage}`}>
                  {STAGES[claim.stage]}
                </span>
              </td>
              <td>
                {claim.outcome ? (
                  <span className={`outcome ${claim.outcome}`}>
                    {OUTCOMES[claim.outcome]}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="amount">
                {claim.payout === null ? "—" : money(claim.payout)}
              </td>
              <td>
                {claim.stage === "waiting" && (
                  <button
                    type="button"
                    onClick={() => {
                      start(claim.claim_id);
                    }}
                  >
                    Run agent
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="count">
        {shown.length} {shown.length === 1 ? "claim" : "claims"}
      </p>
    </section>
  );
}
