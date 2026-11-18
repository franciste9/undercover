import { useEffect, useState } from "react";
import { getPolicy, type PlanLimits, type Policy } from "./api";
import { hours, money, words } from "./format";

const LIMITS: { label: string; value: (limits: PlanLimits) => string }[] = [
  { label: "Trip cancellation", value: (l) => money(l.trip_cancellation_max) },
  {
    label: "Trip delay",
    value: (l) =>
      `${money(l.trip_delay_max)} after ${hours(l.trip_delay_waiting_hours)}`,
  },
  {
    label: "Baggage delay",
    value: (l) =>
      `${money(l.baggage_delay_max)} after ${hours(l.baggage_delay_waiting_hours)}`,
  },
  {
    label: "Baggage",
    value: (l) =>
      `${money(l.baggage_max)}, ${money(l.per_item_limit)} per item`,
  },
  { label: "Passport", value: (l) => money(l.passport_max) },
  { label: "Emergency medical", value: (l) => money(l.emergency_medical_max) },
  { label: "Deductible", value: (l) => money(l.deductible) },
];

export function PolicyPanel({ policyId }: Readonly<{ policyId: string }>) {
  const [policy, setPolicy] = useState<Policy | null>(null);

  useEffect(() => {
    void getPolicy(policyId)
      .then(setPolicy)
      .catch(() => undefined);
  }, [policyId]);

  if (!policy) return null;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>The policy</h2>
        <span className="id">{policy.policy_id}</span>
      </div>
      <dl className="facts">
        <div>
          <dt>Plan</dt>
          <dd>{policy.plan_name}</dd>
        </div>
        <div>
          <dt>Trip</dt>
          <dd>{policy.trip.destination}</dd>
        </div>
        <div>
          <dt>Travels</dt>
          <dd>
            {policy.trip.departs_on} to {policy.trip.returns_on}
          </dd>
        </div>
        <div>
          <dt>Trip cost</dt>
          <dd className="amount">{money(policy.trip.trip_cost)}</dd>
        </div>
        <div>
          <dt>Sold through</dt>
          <dd>{policy.sold_through}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{words(policy.status)}</dd>
        </div>
      </dl>
      <h3>The plan&rsquo;s limits</h3>
      <dl className="facts">
        {LIMITS.map((limit) => (
          <div key={limit.label}>
            <dt>{limit.label}</dt>
            <dd>{limit.value(policy.plan_limits)}</dd>
          </div>
        ))}
      </dl>
      <h3>Add-ons</h3>
      {policy.add_ons.length === 0 ? (
        <p className="count">None on this policy.</p>
      ) : (
        <ul className="add-ons">
          {policy.add_ons.map((addOn) => (
            <li key={addOn.add_on}>
              <strong>{addOn.name}</strong> {addOn.effect}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
