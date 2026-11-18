import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { instructionsText } from "./claims.fixture";
import { Instructions } from "./Instructions";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows the instructions and nothing to edit them with", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ text: instructionsText }))),
    ),
  );
  const { container } = render(<Instructions />);
  expect(
    await screen.findByText(/You work a travel insurance claim/),
  ).toBeDefined();
  expect(container.querySelectorAll("input, textarea, button")).toHaveLength(0);
});
