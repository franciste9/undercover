import { useEffect, useState } from "react";
import {
  listHandlers,
  payClaim,
  signOffClaim,
  type Claim,
  type Handler,
} from "./api";
import { money, OUTCOMES, said, when } from "./format";

function whatStopsThePayment(claim: Claim): string | null {
  if (claim.outcome !== "approve") return "Only an approved claim is paid.";
  if (claim.stage === "awaiting_signoff") {
    return "This payout is over $1,000.00, so it needs a handler's sign-off.";
  }
  return null;
}

export function Decision({
  claim,
  onChange,
}: Readonly<{
  claim: Claim;
  onChange: (claim: Claim) => void;
}>) {
  const [handlers, setHandlers] = useState<Handler[]>([]);
  const [handlerId, setHandlerId] = useState("");
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    void listHandlers()
      .then((found) => {
        setHandlers(found);
        setHandlerId(found.length > 0 ? found[0].handler_id : "");
      })
      .catch(() => undefined);
  }, []);

  const settle = (work: Promise<Claim>) => {
    void work
      .then((next) => {
        setRefused(null);
        onChange(next);
      })
      .catch((reason: unknown) => {
        setRefused(said(reason));
      });
  };

  const named = (id: string) =>
    handlers.find((handler) => handler.handler_id === id)?.name ?? id;

  const payout = claim.payout ?? 0;
  const stopped = whatStopsThePayment(claim);

  return (
    <section className="panel">
      <h2>The decision</h2>
      {claim.outcome === null ? (
        <p className="count">
          {claim.stage === "in_progress"
            ? "The agent is working this claim."
            : "No decision yet."}
        </p>
      ) : (
        <>
          <dl className="facts">
            <div>
              <dt>Outcome</dt>
              <dd className={`outcome ${claim.outcome}`}>
                {OUTCOMES[claim.outcome]}
              </dd>
            </div>
            <div>
              <dt>Payout</dt>
              <dd className="amount">{money(payout)}</dd>
            </div>
            <div>
              <dt>Policy section</dt>
              <dd>{claim.policy_section}</dd>
            </div>
            {claim.decided_at !== null && (
              <div>
                <dt>Decided</dt>
                <dd>{when(claim.decided_at)}</dd>
              </div>
            )}
          </dl>
          <h3>The reason</h3>
          <p className="reason">{claim.reason}</p>
        </>
      )}

      {claim.stage === "awaiting_signoff" && (
        <div className="signoff">
          <h3>Sign-off</h3>
          <div className="row">
            <label htmlFor="handler">Signing off as</label>
            <select
              id="handler"
              value={handlerId}
              onChange={(event) => {
                setHandlerId(event.target.value);
              }}
            >
              {handlers.map((handler) => (
                <option key={handler.handler_id} value={handler.handler_id}>
                  {handler.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                settle(signOffClaim(claim.claim_id, handlerId));
              }}
            >
              Sign off
            </button>
          </div>
        </div>
      )}

      {claim.signed_off_by !== null && claim.signed_off_at !== null && (
        <p className="count">
          Signed off by {named(claim.signed_off_by)} on{" "}
          {when(claim.signed_off_at)}.
        </p>
      )}

      {claim.outcome === "approve" && (
        <div className="payment">
          <h3>Payment</h3>
          {claim.paid_amount === null || claim.paid_at === null ? (
            <div className="row">
              <button
                type="button"
                disabled={stopped !== null}
                onClick={() => {
                  settle(payClaim(claim.claim_id, payout));
                }}
              >
                Pay {money(payout)}
              </button>
              <p className="count">{stopped ?? "Payment due."}</p>
            </div>
          ) : (
            <p className="paid">
              Paid {money(claim.paid_amount)} on {when(claim.paid_at)}.
            </p>
          )}
        </div>
      )}

      {refused !== null && <p className="refused">{refused}</p>}
    </section>
  );
}
