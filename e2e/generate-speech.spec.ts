import { expect, test } from "./support/test";

test.describe("generating speech", () => {
  test("turns text into audio that plays, is kept in the history and is billed once", async ({
    page,
    organization,
    polar,
    textToSpeechPage,
  }) => {
    await textToSpeechPage.goto();
    await textToSpeechPage.generate("Hello from the end-to-end tests");

    const generationId = await textToSpeechPage.generationId();
    await expect(textToSpeechPage.playButton).toBeVisible();

    await test.step("the audio is in R2 and comes back through our route", async () => {
      const audio = await page.request.get(`/api/audio/${generationId}`);
      expect(audio.status()).toBe(200);
      expect(audio.headers()["content-type"]).toBe("audio/wav");
    });

    await test.step("the Organization is billed for it, once", async () => {
      await expect
        .poll(() => polar.usageEvents())
        .toEqual([
          expect.objectContaining({
            name: "tts_generation",
            external_id: generationId,
            external_customer_id: organization.id,
          }),
        ]);
    });

    await test.step("it is in the history after a reload", async () => {
      await textToSpeechPage.goto();
      await textToSpeechPage.openHistory();
      await expect(
        textToSpeechPage.history.getByText("Hello from the end-to-end tests"),
      ).toBeVisible();
    });
  });

  test("offers to subscribe when the Organization has no Subscription, and bills nothing", async ({
    polar,
    textToSpeechPage,
  }) => {
    await polar.unsubscribe();

    await textToSpeechPage.goto();
    await textToSpeechPage.generate("This should not be generated");

    await expect(textToSpeechPage.subscriptionRequired).toBeVisible();
    await expect(textToSpeechPage.subscribeButton).toBeVisible();
    await textToSpeechPage.expectNoResult();
    expect(await polar.usageEvents()).toEqual([]);
  });

  test("tells the user when speech generation fails, without billing", async ({
    polar,
    textToSpeechPage,
  }) => {
    await textToSpeechPage.goto();
    // The fake Chatterbox rejects any text containing this marker.
    await textToSpeechPage.generate("Please [fail] this one");

    await expect(textToSpeechPage.generationFailed).toBeVisible();
    await textToSpeechPage.expectNoResult();
    expect(await polar.usageEvents()).toEqual([]);
  });
});
