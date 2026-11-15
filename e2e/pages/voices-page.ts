import { expect, type Locator, type Page } from "@playwright/test";

/** /voices, including the dialog that creates a Custom voice and the sidebar's usage card. */
export class VoicesPage {
  readonly heading: Locator;
  readonly createDialog: Locator;
  readonly created: Locator;
  readonly deleted: Locator;
  readonly useVoiceItem: Locator;
  readonly deleteVoiceItem: Locator;
  readonly currentUsage: Locator;
  readonly manageSubscriptionButton: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Voices", exact: true, level: 2 });
    this.createDialog = page.getByRole("dialog", { name: "Create custom voice" });
    this.created = page.getByText("Voice created successfully!");
    this.deleted = page.getByText("Voice deleted successfully");
    this.useVoiceItem = page.getByRole("menuitem", { name: "Use this voice" });
    this.deleteVoiceItem = page.getByRole("menuitem", { name: "Delete voice" });
    this.currentUsage = page.getByText("Current usage");
    this.manageSubscriptionButton = page.getByRole("button", { name: "Manage subscription" });
  }

  async goto() {
    await this.page.goto("/voices");
    await expect(this.heading).toBeVisible();
  }

  /** The card's play button; present exactly when the Voice is listed. */
  voice(name: string): Locator {
    return this.page.getByRole("button", { name: `Play ${name}` });
  }

  async cloneVoice(name: string, sample: { name: string; mimeType: string; buffer: Buffer }) {
    await this.page.getByRole("button", { name: "Custom voice" }).click();
    // The dropzone's file input is hidden, so it has no role or label to find it by.
    await this.createDialog.locator('input[type="file"]').setInputFiles(sample);
    await this.createDialog.getByLabel("Voice name").fill(name);
    await this.createDialog.getByRole("checkbox").check();
    await this.createDialog.getByRole("button", { name: "Create voice" }).click();
  }

  async closeCreateDialog() {
    await this.page.keyboard.press("Escape");
    await expect(this.createDialog).toBeHidden();
  }

  /** Opens the card's menu and waits for it, so a missing item really is missing. */
  async openMenu(name: string) {
    await this.page.getByRole("button", { name: `More actions for ${name}` }).click();
    await expect(this.useVoiceItem).toBeVisible();
  }

  async deleteVoice(name: string) {
    await this.openMenu(name);
    await this.deleteVoiceItem.click();
    await this.page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  }
}
