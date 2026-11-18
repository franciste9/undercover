import { useEffect, useState } from "react";
import { getClaim, listSteps, type Claim, type Stage, type Step } from "./api";
import { CustomerPanel } from "./CustomerPanel";
import { Decision } from "./Decision";
import { PolicyPanel } from "./PolicyPanel";
import { clock, money, said, STAGES, words } from "./format";

function Steps({ steps, stage }: Readonly<{ steps: Step[]; stage: Stage }>) {
  return (
    <section className="panel">
      <h2>What the agent did</h2>
      {steps.length === 0 ? (
        <p className="count">
          {stage === "in_progress" ? "Starting the run." : "Nothing yet."}
        </p>
      ) : (
        <ol className="steps">
          {steps.map((step) => (
            <li key={step.step_id}>
              <span className="at">{clock(step.at)}</span>
              <span>{step.step}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function NotFound({ claimId }: Readonly<{ claimId: string }>) {
  return (
    <section className="panel">
      <h2>Claim not found</h2>
      <p>
        There is no claim <span className="id">{claimId}</span>.{" "}
        <a href="#/">Back to the queue</a>
      </p>
    </section>
  );
}

export function ClaimPage({ claimId }: Readonly<{ claimId: string }>) {
  const [claim, setClaim] = useState<Claim | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [refused, setRefused] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      void getClaim(claimId)
        .then((next) => {
          setClaim(next);
          setRefused(null);
        })
        .catch((reason: unknown) => {
          setRefused(said(reason));
        });
      void listSteps(claimId)
        .then(setSteps)
        .catch(() => undefined);
    };
    load();
    const timer = setInterval(load, 2000);
    return () => {
      clearInterval(timer);
    };
  }, [claimId]);

  if (claim === null) {
    return refused === null ? (
      <p className="count">Loading {claimId}.</p>
    ) : (
      <NotFound claimId={claimId} />
    );
  }

  return (
    <>
      <p className="crumbs">
        <a href="#/">The queue</a> /{" "}
        <span className="id">{claim.claim_id}</span>
      </p>
      <div className="claim">
        <div className="column">
          <section className="panel">
            <div className="panel-head">
              <h2>{claim.summary}</h2>
              <span className={`chip ${claim.stage}`}>
                {STAGES[claim.stage]}
              </span>
            </div>
            <dl className="facts">
              <div>
                <dt>Customer</dt>
                <dd>{claim.customer_name}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{words(claim.claim_type)}</dd>
              </div>
              <div>
                <dt>Incident</dt>
                <dd>
                  {claim.incident_date}, {claim.incident_location}
                </dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{claim.submitted_on}</dd>
              </div>
              <div>
                <dt>Claimed</dt>
                <dd className="amount">{money(claim.amount_claimed)}</dd>
              </div>
            </dl>
            <h3>The story</h3>
            <p className="story">{claim.story}</p>
          </section>

          <section className="panel">
            <h2>What is claimed</h2>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th className="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {claim.items.map((item) => (
                  <tr key={item.description}>
                    <td>{item.description}</td>
                    <td>{words(item.category)}</td>
                    <td className="amount">{money(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Claimed</td>
                  <td className="amount">{money(claim.amount_claimed)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="panel">
            <h2>The documents</h2>
            <ul className="documents">
              {claim.documents.map((document) => (
                <li key={document.name}>
                  <p className="document-head">
                    <strong>{document.name}</strong>{" "}
                    <span className="count">{words(document.type)}</span>
                  </p>
                  <p>{document.content}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="column">
          <Decision claim={claim} onChange={setClaim} />
          <Steps steps={steps} stage={claim.stage} />
          <PolicyPanel policyId={claim.policy_id} />
          <CustomerPanel customerId={claim.customer_id} />
        </div>
      </div>
    </>
  );
}
