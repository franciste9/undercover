import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import type { Claim } from "./api";
import { body, claim, overLimitClaim } from "./claims.fixture";
import { Decision } from "./Decision";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Holder({ start }: Readonly<{ start: Claim }>) {
  const [record, setRecord] = useState(start);
  return <Decision claim={record} onChange={setRecord} />;
}

function stub(start: Claim): void {
  let record = start;
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) => {
      if (path.endsWith("/sign-off")) {
        record = {
          ...record,
          stage: "decided",
          signed_off_by: "HND-01",
          signed_off_at: "2026-06-25T10:02:00+00:00",
        };
      }
      if (path.endsWith("/payment")) {
        record = {
          ...record,
          paid_amount: record.payout,
          paid_at: "2026-06-25T10:04:00+00:00",
        };
      }
      return Promise.resolve(
        new Response(JSON.stringify(body(path, record, []))),
      );
    }),
  );
}

function payButton(): HTMLElement {
  return screen.getByRole("button", { name: "Pay $3,750.00" });
}

it("holds the payment until a handler signs off, then pays", async () => {
  stub(overLimitClaim);
  render(<Holder start={overLimitClaim} />);

  await waitFor(() => {
    expect(payButton().hasAttribute("disabled")).toBe(true);
  });
  expect(screen.getByText(/needs a handler's sign-off/)).toBeDefined();
  expect(
    await screen.findByRole("option", { name: "Dana Whitfield" }),
  ).toBeDefined();

  fireEvent.click(screen.getByRole("button", { name: "Sign off" }));
  await waitFor(() => {
    expect(payButton().hasAttribute("disabled")).toBe(false);
  });
  expect(screen.getByText(/Signed off by Dana Whitfield/)).toBeDefined();

  fireEvent.click(payButton());
  expect(await screen.findByText(/Paid \$3,750\.00 on/)).toBeDefined();
});

it("signs off as another handler", async () => {
  stub(overLimitClaim);
  render(<Holder start={overLimitClaim} />);
  const select = await screen.findByLabelText("Signing off as");
  fireEvent.change(select, { target: { value: "HND-02" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign off" }));
  await waitFor(() => {
    expect(payButton().hasAttribute("disabled")).toBe(false);
  });
});

it("shows what the backend said when it refuses", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, options?: RequestInit) =>
      Promise.resolve(
        options?.method === "POST"
          ? new Response(
              JSON.stringify({
                detail: "CLM-1003 waits for a handler's sign-off",
              }),
              { status: 409 },
            )
          : new Response(JSON.stringify(body(path, overLimitClaim, []))),
      ),
    ),
  );
  render(<Holder start={{ ...overLimitClaim, stage: "decided" }} />);
  fireEvent.click(payButton());
  expect(
    await screen.findByText("CLM-1003 waits for a handler's sign-off"),
  ).toBeDefined();
});

it("says the agent is working a claim that has no decision", () => {
  stub(claim);
  render(<Holder start={{ ...claim, stage: "in_progress" }} />);
  expect(screen.getByText("The agent is working this claim.")).toBeDefined();
  expect(screen.queryByRole("button")).toBeNull();
});
