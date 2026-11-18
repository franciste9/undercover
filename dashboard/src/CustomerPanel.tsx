import { useEffect, useState } from "react";
import { getCustomer, type Customer } from "./api";
import { money, words } from "./format";

export function CustomerPanel({
  customerId,
}: Readonly<{ customerId: string }>) {
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    void getCustomer(customerId)
      .then(setCustomer)
      .catch(() => undefined);
  }, [customerId]);

  if (!customer) return null;

  const { address } = customer;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>The customer</h2>
        <span className="id">{customer.customer_id}</span>
      </div>
      <dl className="facts">
        <div>
          <dt>Name</dt>
          <dd>{customer.name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{customer.email}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{customer.phone}</dd>
        </div>
        <div>
          <dt>Date of birth</dt>
          <dd>{customer.date_of_birth}</dd>
        </div>
        <div>
          <dt>Address</dt>
          <dd>
            {address.street}, {address.city}, {address.state} {address.zip}
          </dd>
        </div>
        <div>
          <dt>Customer since</dt>
          <dd>{customer.customer_since}</dd>
        </div>
      </dl>
      <h3>Earlier claims</h3>
      {customer.previous_claims.length === 0 ? (
        <p className="count">None on record.</p>
      ) : (
        <ul className="earlier">
          {customer.previous_claims.map((earlier) => (
            <li key={earlier.claim_id}>
              <p className="earlier-head">
                <span className="id">{earlier.claim_id}</span>{" "}
                {words(earlier.claim_type)}, filed {earlier.filed_on}
              </p>
              <p>{earlier.summary}</p>
              <p className="count">
                {words(earlier.outcome)}, {money(earlier.amount_paid)} paid
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
