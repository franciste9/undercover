import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Queue } from "./Queue";
import { queue } from "./claims.fixture";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubFetch(): string[] {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string, options?: RequestInit) => {
      calls.push(`${options?.method ?? "GET"} ${path}`);
      const body = path.endsWith("/run")
        ? { claim_id: "CLM-1001", thread_id: "thread-1" }
        : queue;
      return Promise.resolve(new Response(JSON.stringify(body)));
    }),
  );
  return calls;
}

function row(claimId: string): HTMLElement {
  return screen.getByText(claimId).closest("tr") as HTMLElement;
}

it("shows every claim with its stage and its money", async () => {
  stubFetch();
  render(<Queue />);
  expect(await screen.findByText("3 claims")).toBeDefined();
  expect(within(row("CLM-1001")).getByText("Waiting")).toBeDefined();
  expect(within(row("CLM-1001")).getByText("$420.00")).toBeDefined();
  expect(within(row("CLM-1001")).getByText("Trip delay")).toBeDefined();
  expect(
    within(row("CLM-1003")).getByText("Waiting for sign-off"),
  ).toBeDefined();
  expect(within(row("CLM-1003")).getByText("$3,750.00")).toBeDefined();
  expect(within(row("CLM-1012")).getByText("Declined")).toBeDefined();
});

it("filters the queue by stage", async () => {
  stubFetch();
  render(<Queue />);
  await screen.findByText("3 claims");
  fireEvent.click(screen.getByRole("button", { name: "Waiting for sign-off" }));
  expect(screen.getByText("1 claim")).toBeDefined();
  expect(screen.queryByText("CLM-1001")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "All" }));
  expect(screen.getByText("3 claims")).toBeDefined();
});

it("runs the agent on a waiting claim", async () => {
  const calls = stubFetch();
  render(<Queue />);
  await screen.findByText("3 claims");
  expect(within(row("CLM-1012")).queryByRole("button")).toBeNull();
  fireEvent.click(within(row("CLM-1001")).getByRole("button"));
  await waitFor(() => {
    expect(calls).toContain("POST /api/claims/CLM-1001/run");
  });
});

it("keeps going when a run is refused", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(
        path.endsWith("/run")
          ? new Response(
              JSON.stringify({ detail: "CLM-1001 is already in progress" }),
              { status: 409 },
            )
          : new Response(JSON.stringify(queue)),
      ),
    ),
  );
  render(<Queue />);
  await screen.findByText("3 claims");
  fireEvent.click(within(row("CLM-1001")).getByRole("button"));
  await waitFor(() => {
    expect(screen.getByText("3 claims")).toBeDefined();
  });
});

it("rides out a backend that is not answering", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response("", { status: 502 }))),
  );
  render(<Queue />);
  expect(await screen.findByText("0 claims")).toBeDefined();
});
