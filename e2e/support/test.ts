import { test as base, expect, type Page } from "@playwright/test";

import { OrgSelectionPage } from "../pages/org-selection-page";
import { OrganizationSettingsPage } from "../pages/organization-settings-page";
import { SignInPage } from "../pages/sign-in-page";
import { TextToSpeechPage } from "../pages/text-to-speech-page";
import { VoicesPage } from "../pages/voices-page";
import { polarFor, type FakePolar } from "./fake";
import { createOrganization, type StorageState, type TestOrganization } from "./seed";

interface Fixtures {
  /** This journey's own Organization, subscribed, with `page` signed in as its owner. */
  organization: TestOrganization;
  /** The fake Polar, scoped to this journey's Organization. */
  polar: FakePolar;
  /** Opens a second browser as someone else, e.g. `addMember(organization.id, "member")`. */
  openAs: (user: { storageState: StorageState }) => Promise<Page>;

  textToSpeechPage: TextToSpeechPage;
  voicesPage: VoicesPage;
  organizationSettingsPage: OrganizationSettingsPage;
  orgSelectionPage: OrgSelectionPage;
  signInPage: SignInPage;
}

/**
 * Import `test` and `expect` from here, never from @playwright/test: this `test` gives
 * every journey its own Organization, which is what lets journeys run in parallel.
 */
export const test = base.extend<Fixtures>({
  // Playwright reads the fixtures a fixture needs from this destructuring, so it must be
  // an object pattern even when empty.
  // oxlint-disable-next-line eslint/no-empty-pattern
  organization: async ({}, use) => {
    await use(await createOrganization());
  },

  storageState: async ({ organization }, use) => {
    await use(organization.owner.storageState);
  },

  polar: async ({ organization }, use) => {
    await use(polarFor(organization.id));
  },

  openAs: async ({ browser }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async (user) => {
      const context = await browser.newContext({ storageState: user.storageState });
      contexts.push(context);
      return context.newPage();
    });
    await Promise.all(contexts.map((context) => context.close()));
  },

  textToSpeechPage: async ({ page }, use) => {
    await use(new TextToSpeechPage(page));
  },
  voicesPage: async ({ page }, use) => {
    await use(new VoicesPage(page));
  },
  organizationSettingsPage: async ({ page }, use) => {
    await use(new OrganizationSettingsPage(page));
  },
  orgSelectionPage: async ({ page }, use) => {
    await use(new OrgSelectionPage(page));
  },
  signInPage: async ({ page }, use) => {
    await use(new SignInPage(page));
  },
});

export { expect };
