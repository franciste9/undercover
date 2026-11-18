import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Claim, Step } from "./api";
import { ClaimPage } from "./ClaimPage";
import { body, claim, decidedClaim, steps } from "./claims.fixture";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stub(record: Claim, taken: Step[]): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(new Response(JSON.stringify(body(path, record, taken)))),
    ),
  );
}

it("shows the claim, the policy and the customer in full", async () => {
  stub(claim, []);
  render(<ClaimPage claimId="CLM-1001" />);

  expect(await screen.findByText(/My flight home from Rome/)).toBeDefined();
  expect(screen.getByText("Trip delay")).toBeDefined();
  expect(screen.getByText("Waiting")).toBeDefined();

  expect(screen.getByText("Airport hotel, one night")).toBeDefined();
  expect(screen.getByText("$245.00")).toBeDefined();
  expect(screen.getByText("Dinner and breakfast")).toBeDefined();
  expect(screen.getByText("$95.00")).toBeDefined();
  expect(screen.getByText("$80.00")).toBeDefined();

  expect(screen.getByText("Meridian Air cancellation notice")).toBeDefined();
  expect(screen.getByText("Hotel receipt")).toBeDefined();
  expect(screen.getByText("Meal receipts")).toBeDefined();
  expect(screen.getByText("Taxi receipts")).toBeDefined();

  expect(await screen.findByText("UnderCover Premium")).toBeDefined();
  expect(screen.getByText("$1,500.00, $300.00 per item")).toBeDefined();
  expect(screen.getByText("$800.00 after 6 hours")).toBeDefined();
  expect(screen.getByText("None on this policy.")).toBeDefined();

  expect(await screen.findByText("+1 201 555 0143")).toBeDefined();
  expect(screen.getByText("CLM-0412")).toBeDefined();
  expect(
    screen.getByText("Checked bag arrived 30 hours late in Lisbon"),
  ).toBeDefined();
  expect(screen.getByText("Approved, $140.00 paid")).toBeDefined();

  expect(screen.getByText("No decision yet.")).toBeDefined();
  expect(screen.getByText("Nothing yet.")).toBeDefined();
});

it("shows the decision the agent recorded", async () => {
  stub(decidedClaim, steps);
  render(<ClaimPage claimId="CLM-1001" />);

  expect(await screen.findByText("Approved")).toBeDefined();
  expect(screen.getAllByText("$420.00").length).toBeGreaterThan(1);
  expect(screen.getByText("Section 3: Trip Delay")).toBeDefined();
  expect(screen.getByText(/more than six hours/)).toBeDefined();
  expect(screen.getByText("Read claim CLM-1001")).toBeDefined();
  expect(screen.getByText("Read policy POL-2001")).toBeDefined();
  expect(screen.getByRole("button", { name: "Pay $420.00" })).toBeDefined();
});

it("picks up a new step without a reload", async () => {
  const taken: Step[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(new Response(JSON.stringify(body(path, claim, taken)))),
    ),
  );
  render(<ClaimPage claimId="CLM-1001" />);
  expect(await screen.findByText("Nothing yet.")).toBeDefined();

  taken.push(steps[0]);
  await waitFor(
    () => {
      expect(screen.getByText("Read claim CLM-1001")).toBeDefined();
    },
    { timeout: 3000 },
  );
});

it("says so when there is no such claim", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ detail: "No claim CLM-9999" }), {
          status: 404,
        }),
      ),
    ),
  );
  render(<ClaimPage claimId="CLM-9999" />);
  expect(await screen.findByText("Claim not found")).toBeDefined();
  expect(screen.getByText("CLM-9999")).toBeDefined();
});
