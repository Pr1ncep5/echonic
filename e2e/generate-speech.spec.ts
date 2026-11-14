import { expect, test } from "@playwright/test";

import { fakePolar } from "./support/fake";
import { ORGANIZATION } from "./support/seed";

test.describe("generating speech", () => {
  test.beforeEach(async () => {
    await fakePolar.subscribe(ORGANIZATION.id);
    await fakePolar.clearUsageEvents();
  });

  test("turns text into audio that plays, is kept in the history and is billed once", async ({
    page,
  }) => {
    await page.goto("/text-to-speech");
    await page.getByLabel("Text to speech input").fill("Hello from the end-to-end tests");
    await page.getByRole("button", { name: "Generate speech" }).click();

    await page.waitForURL(/\/text-to-speech\/[a-z0-9]+$/);
    const generationId = page.url().split("/").at(-1) ?? "";
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    // The audio really went to R2 and comes back through our route.
    const audio = await page.request.get(`/api/audio/${generationId}`);
    expect(audio.status()).toBe(200);
    expect(audio.headers()["content-type"]).toBe("audio/wav");

    // The Organization was billed for it, once.
    await expect
      .poll(async () =>
        (await fakePolar.usageEvents()).filter((e) => e.external_id === generationId),
      )
      .toEqual([
        expect.objectContaining({
          name: "tts_generation",
          external_customer_id: ORGANIZATION.id,
        }),
      ]);

    // It is in the history after a reload.
    await page.goto("/text-to-speech");
    await page.getByRole("tab", { name: "History" }).click();
    await expect(
      page.getByRole("tabpanel", { name: "History" }).getByText("Hello from the end-to-end tests"),
    ).toBeVisible();
  });

  test("offers to subscribe when the Organization has no Subscription, and bills nothing", async ({
    page,
  }) => {
    await fakePolar.unsubscribe(ORGANIZATION.id);

    await page.goto("/text-to-speech");
    await page.getByLabel("Text to speech input").fill("This should not be generated");
    await page.getByRole("button", { name: "Generate speech" }).click();

    await expect(page.getByText("Subscription required")).toBeVisible();
    await expect(page.getByRole("button", { name: "Subscribe" })).toBeVisible();
    await expect(page).toHaveURL(/\/text-to-speech$/);
    expect(await fakePolar.usageEvents()).toEqual([]);
  });

  test("tells the user when speech generation fails, without billing", async ({ page }) => {
    await page.goto("/text-to-speech");
    await page.getByLabel("Text to speech input").fill("Please [fail] this one");
    await page.getByRole("button", { name: "Generate speech" }).click();

    await expect(page.getByText("Speech generation failed. Please try again.")).toBeVisible();
    await expect(page).toHaveURL(/\/text-to-speech$/);
    expect(await fakePolar.usageEvents()).toEqual([]);
  });
});
