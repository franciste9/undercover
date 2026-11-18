import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { body, claim } from "./claims.fixture";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.location.hash = "";
});

function stub(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((path: string) =>
      Promise.resolve(new Response(JSON.stringify(body(path, claim, [])))),
    ),
  );
}

it("shows the queue under the UnderCover heading", async () => {
  stub();
  render(<App />);
  expect(screen.getByRole("heading", { name: "UnderCover" })).toBeDefined();
  expect(await screen.findByText("The queue")).toBeDefined();
});

it("opens a claim from its address", async () => {
  stub();
  window.location.hash = "#/claims/CLM-1001";
  render(<App />);
  expect(await screen.findByText(/My flight home from Rome/)).toBeDefined();
});

it("follows the hash to the instructions and back", async () => {
  stub();
  render(<App />);
  await screen.findByText("The queue");

  window.location.hash = "#/instructions";
  expect(
    await screen.findByText(/You work a travel insurance claim/),
  ).toBeDefined();

  window.location.hash = "#/";
  await waitFor(() => {
    expect(screen.getByRole("columnheader", { name: "Claim" })).toBeDefined();
  });
});
