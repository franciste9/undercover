import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { queue } from "./claims.fixture";
import { Summary } from "./Summary";

afterEach(cleanup);

function tile(stage: string): HTMLElement {
  const found = screen.getByText(stage).closest<HTMLElement>(".tile");
  if (!found) throw new Error(`No tile for ${stage}`);
  return found;
}

it("counts the claims at each stage and what they claim", () => {
  render(<Summary claims={queue} />);

  expect(within(tile("Waiting")).getByText("1")).toBeDefined();
  expect(within(tile("Waiting")).getByText("$420.00 claimed")).toBeDefined();

  expect(within(tile("In progress")).getByText("0")).toBeDefined();
  expect(within(tile("In progress")).getByText("$0.00 claimed")).toBeDefined();

  const signoff = tile("Waiting for sign-off");
  expect(within(signoff).getByText("1")).toBeDefined();
  expect(within(signoff).getByText("$3,800.00 claimed")).toBeDefined();

  expect(within(tile("Decided")).getByText("$2,900.00 claimed")).toBeDefined();
});

it("shows every stage even when the queue is empty", () => {
  render(<Summary claims={[]} />);
  expect(screen.getAllByText("0")).toHaveLength(4);
  expect(screen.getByLabelText("The queue by stage")).toBeDefined();
});
