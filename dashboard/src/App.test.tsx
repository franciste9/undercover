import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { queue } from "./claims.fixture";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows the queue under the UnderCover heading", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(queue)))),
  );
  render(<App />);
  expect(screen.getByRole("heading", { name: "UnderCover" })).toBeDefined();
  expect(await screen.findByText("The queue")).toBeDefined();
});
