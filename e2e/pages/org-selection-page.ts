import { expect, type Locator, type Page } from "@playwright/test";

/** /org-selection: where a session without an active Organization lands. */
export class OrgSelectionPage {
  readonly heading: Locator;
  readonly noOrganizations: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Choose an organization" });
    this.noOrganizations = page.getByText("You're not in an organization yet");
  }

  async expectLoaded() {
    await this.page.waitForURL(/\/org-selection$/);
    await expect(this.heading).toBeVisible();
  }

  organization(name: string): Locator {
    return this.page.getByRole("button", { name: new RegExp(name) });
  }

  async choose(name: string) {
    await this.organization(name).click();
  }
}
