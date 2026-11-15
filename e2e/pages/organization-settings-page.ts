import { expect, type Locator, type Page } from "@playwright/test";

/** /settings/organization. */
export class OrganizationSettingsPage {
  readonly heading: Locator;
  readonly leaveButton: Locator;
  readonly deleteButton: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Organization", level: 1 });
    this.leaveButton = page.getByRole("button", { name: /Leave organization/ });
    this.deleteButton = page.getByRole("button", { name: /Delete organization/ });
  }

  async goto() {
    await this.page.goto("/settings/organization");
    await expect(this.heading).toBeVisible();
    // The role-dependent rows only settle once the Organization has loaded.
    await expect(this.leaveButton).toBeEnabled();
  }

  async deleteOrganization(name: string) {
    await this.deleteButton.click();
    await this.page
      .getByRole("alertdialog", { name: `Delete ${name}?` })
      .getByRole("button", { name: "Delete organization" })
      .click();
  }
}
