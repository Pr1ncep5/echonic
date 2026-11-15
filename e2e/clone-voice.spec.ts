import { wavOfSeconds } from "@/tests/audio";
import { audioExists } from "./support/r2";
import { customVoicesOf } from "./support/seed";
import { expect, test } from "./support/test";

test.describe("cloning a voice", () => {
  test("creates a Custom voice from an uploaded sample, plays it, and deletes it again", async ({
    page,
    organization,
    polar,
    voicesPage,
  }) => {
    const name = "My cloned voice";

    await voicesPage.goto();
    await voicesPage.cloneVoice(name, {
      name: "sample.wav",
      mimeType: "audio/wav",
      buffer: wavOfSeconds(12),
    });
    await expect(voicesPage.created).toBeVisible();
    await voicesPage.closeCreateDialog();
    await expect(voicesPage.voice(name)).toBeVisible();

    const [created] = await customVoicesOf(organization.id);
    expect(created?.r2ObjectKey, "the Custom voice row and its R2 key").toBeTruthy();
    const sampleKey = created?.r2ObjectKey ?? "";

    await test.step("the sample is in R2 and comes back through our route", async () => {
      expect(await audioExists(sampleKey)).toBe(true);
      const sample = await page.request.get(`/api/voices/${created?.id}`);
      expect(sample.status()).toBe(200);
      expect(sample.headers()["content-type"]).toBe("audio/wav");
    });

    await test.step("the Organization is billed for it, once", async () => {
      await expect
        .poll(() => polar.usageEvents())
        .toEqual([
          expect.objectContaining({
            name: "voice_creation",
            external_id: created?.id,
            external_customer_id: organization.id,
          }),
        ]);
    });

    await test.step("deleting it removes the card and the sample", async () => {
      await voicesPage.deleteVoice(name);
      await expect(voicesPage.deleted).toBeVisible();
      await expect(voicesPage.voice(name)).toHaveCount(0);
      // The sample leaves R2 through the outbox, shortly after the response.
      await expect.poll(() => audioExists(sampleKey)).toBe(false);
    });
  });
});
