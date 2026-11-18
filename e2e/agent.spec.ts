import { expect, test, type APIRequestContext } from "@playwright/test";

const REASON =
  "The airline canceled the flight and the wait was over six hours. " +
  "The hotel and the meals are what the section covers.";

async function decide(
  request: APIRequestContext,
  claimId: string,
  payout: number,
): Promise<void> {
  await request.post(`/api/claims/${claimId}/start`, {
    data: { thread_id: `e2e-${claimId}` },
  });
  await request.post(`/api/claims/${claimId}/decision`, {
    data: {
      outcome: "approve",
      payout,
      reason: REASON,
      policy_section: "Section 3: Trip Delay",
    },
  });
}

test("the steps of a run appear while the agent works", async ({
  page,
  request,
}) => {
  await request.post("/api/claims/CLM-1013/start", {
    data: { thread_id: "e2e-steps" },
  });
  await page.goto("/#/claims/CLM-1013");
  await expect(page.getByText("Starting the run.")).toBeVisible();

  await request.post("/api/claims/CLM-1013/steps", {
    data: { step: "Read claim CLM-1013" },
  });
  await expect(page.getByText("Read claim CLM-1013")).toBeVisible();

  await request.post("/api/claims/CLM-1013/steps", {
    data: { step: "Read the policy wording" },
  });
  await expect(page.getByText("Read the policy wording")).toBeVisible();
});

test("a payment over the limit is blocked until a handler signs off", async ({
  page,
  request,
}) => {
  await decide(request, "CLM-1015", 2340);

  const refused = await request.post("/api/claims/CLM-1015/payment", {
    data: { amount: 2340 },
  });
  expect(refused.status()).toBe(409);
  expect(await refused.text()).toContain("sign-off");

  await page.goto("/#/claims/CLM-1015");
  await expect(page.getByText("Waiting for sign-off")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pay $2,340.00" }),
  ).toBeDisabled();
  await expect(page.getByText(/needs a handler's sign-off/)).toBeVisible();
  await expect(page.getByText(/^Paid /)).toBeHidden();
});

test("a handler signs off a payout over the limit and pays it", async ({
  page,
  request,
}) => {
  await decide(request, "CLM-1003", 3750);
  await page.goto("/#/claims/CLM-1003");

  const pay = page.getByRole("button", { name: "Pay $3,750.00" });
  await expect(pay).toBeDisabled();

  await page
    .getByLabel("Signing off as")
    .selectOption({ label: "Dana Whitfield" });
  await page.getByRole("button", { name: "Sign off" }).click();
  await expect(page.getByText(/Signed off by Dana Whitfield/)).toBeVisible();

  await expect(pay).toBeEnabled();
  await pay.click();
  await expect(page.getByText(/Paid \$3,750\.00 on/)).toBeVisible();
});

test("the instructions page is read only", async ({ page }) => {
  await page.goto("/#/instructions");
  await expect(page.getByText("You are the UnderCover Agent")).toBeVisible();
  await expect(
    page.locator("main input, main textarea, main button"),
  ).toHaveCount(0);
});
