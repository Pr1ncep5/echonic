import { expect, type Locator, type Page } from "@playwright/test";

/** /text-to-speech and the result page /text-to-speech/{generationId}. */
export class TextToSpeechPage {
  readonly textInput: Locator;
  readonly generateButton: Locator;
  readonly playButton: Locator;
  readonly historyTab: Locator;
  readonly history: Locator;
  readonly subscriptionRequired: Locator;
  readonly subscribeButton: Locator;
  readonly generationFailed: Locator;

  constructor(readonly page: Page) {
    this.textInput = page.getByLabel("Text to speech input");
    this.generateButton = page.getByRole("button", { name: "Generate speech" });
    this.playButton = page.getByRole("button", { name: "Play" });
    this.historyTab = page.getByRole("tab", { name: "History" });
    this.history = page.getByRole("tabpanel", { name: "History" });
    this.subscriptionRequired = page.getByText("Subscription required");
    this.subscribeButton = page.getByRole("button", { name: "Subscribe" });
    this.generationFailed = page.getByText("Speech generation failed. Please try again.");
  }

  async goto() {
    await this.page.goto("/text-to-speech");
    await expect(this.textInput).toBeVisible();
  }

  async generate(text: string) {
    await this.textInput.fill(text);
    await this.generateButton.click();
  }

  /** Waits for the result page and returns the new Generation's id. */
  async generationId(): Promise<string> {
    await this.page.waitForURL(/\/text-to-speech\/[a-z0-9]+$/);
    return new URL(this.page.url()).pathname.split("/").at(-1) ?? "";
  }

  async openHistory() {
    await this.historyTab.click();
  }

  /** Still on the form, not on a result page. */
  async expectNoResult() {
    await expect(this.page).toHaveURL(/\/text-to-speech$/);
  }
}
