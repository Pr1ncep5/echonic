import { expect, type Locator, type Page } from "@playwright/test";

/** /auth/sign-in. */
export class SignInPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly signInButton: Locator;

  constructor(readonly page: Page) {
    this.email = page.getByLabel("Email");
    this.password = page.getByLabel("Password");
    this.signInButton = page.getByRole("button", { name: "Sign In", exact: true });
  }

  async expectLoaded() {
    await this.page.waitForURL(/\/auth\/sign-in$/);
    await expect(this.signInButton).toBeVisible();
  }

  async signIn(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.signInButton.click();
  }
}
