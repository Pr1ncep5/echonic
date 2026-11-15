import type { Locator, Page } from "@playwright/test";

/** /: the dashboard a signed-in user with an active Organization lands on. */
export class DashboardPage {
  constructor(readonly page: Page) {}

  /** The heading that greets the user by first name. */
  greeting(firstName: string): Locator {
    return this.page.getByRole("heading", { name: firstName, level: 1 });
  }
}
