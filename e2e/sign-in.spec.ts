import { SIGNED_OUT, givePassword } from "./support/seed";
import { expect, test } from "./support/test";

test.describe("signing in", () => {
  // The only journey that starts signed out.
  test.use({ storageState: SIGNED_OUT });

  test("with email and password leads through choosing an Organization to the dashboard", async ({
    page,
    organization,
    signInPage,
    orgSelectionPage,
  }) => {
    const password = await givePassword(organization.owner.id);

    await page.goto("/");
    await signInPage.expectLoaded();
    await signInPage.signIn(organization.owner.email, password);

    // A new session has no active Organization yet.
    await orgSelectionPage.expectLoaded();
    await orgSelectionPage.choose(organization.name);

    await expect(page.getByRole("heading", { name: "Olivia", level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });
});
