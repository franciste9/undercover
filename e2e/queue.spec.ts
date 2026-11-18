import { expect, test } from "@playwright/test";

test("the queue lists every claim with its stage", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "The queue" })).toBeVisible();
  await expect(page.getByText("25 claims")).toBeVisible();

  const claim = page.getByRole("row").filter({ hasText: "CLM-1001" });
  await expect(claim.getByRole("link", { name: "CLM-1001" })).toBeVisible();
  await expect(claim.getByText("Maya Patel")).toBeVisible();
  await expect(claim.getByText("$420.00")).toBeVisible();
  await expect(claim.getByText("Waiting", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Decided", exact: true }).click();
  await expect(page.getByText("CLM-1001")).toBeHidden();
  await page.getByRole("button", { name: "All" }).click();
  await expect(page.getByText("25 claims")).toBeVisible();
});

test("a claim opens in full from the queue", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "CLM-1001" }).click();

  await expect(page.getByText(/My flight home from Rome/)).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Airport hotel, one night" }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "$245.00" })).toBeVisible();
  await expect(page.getByText("Taxi receipts")).toBeVisible();
  await expect(page.getByText("UnderCover Premium")).toBeVisible();
  await expect(page.getByText("$1,500.00, $300.00 per item")).toBeVisible();
  await expect(page.getByText("CLM-0412")).toBeVisible();
});

test("a claim that does not exist says so", async ({ page }) => {
  await page.goto("/#/claims/CLM-9999");
  await expect(
    page.getByRole("heading", { name: "Claim not found" }),
  ).toBeVisible();
});
