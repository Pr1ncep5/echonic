import { CRON_SECRET } from "./support/env";
import { audioExists, putAudio } from "./support/r2";
import { addCustomVoice, organizationExists } from "./support/seed";
import { expect, test } from "./support/test";

test.describe("deleting an Organization", () => {
  test("ends its Subscription, removes it, and removes its audio from R2", async ({
    page,
    organization,
    polar,
    organizationSettingsPage,
    orgSelectionPage,
  }) => {
    const voice = await addCustomVoice(organization.id, "Doomed voice");
    await putAudio(voice.r2ObjectKey);

    await organizationSettingsPage.goto();
    await organizationSettingsPage.deleteOrganization(organization.name);

    await orgSelectionPage.expectLoaded();
    await expect(orgSelectionPage.noOrganizations).toBeVisible();
    await expect(orgSelectionPage.organization(organization.name)).toHaveCount(0);

    expect(await organizationExists(organization.id)).toBe(false);
    expect(await polar.isSubscribed()).toBe(false);

    await test.step("the outbox removes its audio, as the scheduler would in production", async () => {
      expect(await audioExists(voice.r2ObjectKey)).toBe(true);
      const cron = await page.request.get("/api/cron/outbox", {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      });
      expect(cron.status()).toBe(200);
      // Another journey's cron call may have claimed the task, so wait for the effect.
      await expect.poll(() => audioExists(voice.r2ObjectKey)).toBe(false);
    });
  });
});
